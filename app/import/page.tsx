'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { parseChaseCSV, type ChaseTransaction } from '@/lib/utils/parsers/chaseParser'
import { parseAmazonCSV, type AmazonTransaction } from '@/lib/utils/parsers/amazonParser'
import { transactionService } from '@/lib/services/transactions'
import { autoLinkAmazonTransactions } from '@/lib/services/automaticLinking'

type ImportType = 'chase' | 'amazon'

export default function ImportPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const chaseFileInput = useRef<HTMLInputElement>(null)
  const amazonFileInput = useRef<HTMLInputElement>(null)

  const [chaseFile, setChaseFile] = useState<File | null>(null)
  const [amazonFile, setAmazonFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    type: ImportType
    imported: number
    errors: string[]
    autoLinked?: number
    suggested?: number
  } | null>(null)

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  const handleFileChange = (type: ImportType, file: File | null) => {
    setError(null)
    setResult(null)

    if (type === 'chase') {
      setChaseFile(file)
    } else {
      setAmazonFile(file)
    }
  }

  const handleImport = async (type: ImportType) => {
    const file = type === 'chase' ? chaseFile : amazonFile

    if (!file) {
      setError('Please select a file to import')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      // Read file content
      const content = await file.text()

      // Parse CSV
      let transactions: Array<ChaseTransaction | AmazonTransaction> = []
      let parseErrors: string[] = []

      if (type === 'chase') {
        const parseResult = parseChaseCSV(content)
        transactions = parseResult.transactions
        parseErrors = parseResult.errors

        if (!parseResult.success) {
          setError(`Failed to parse Chase CSV: ${parseErrors.join(', ')}`)
          setImporting(false)
          return
        }
      } else {
        const parseResult = parseAmazonCSV(content)
        transactions = parseResult.transactions
        parseErrors = parseResult.errors

        if (!parseResult.success) {
          setError(`Failed to parse Amazon CSV: ${parseErrors.join(', ')}`)
          setImporting(false)
          return
        }
      }

      if (transactions.length === 0) {
        setError('No transactions found in CSV file')
        setImporting(false)
        return
      }

      // Import transactions to database
      let importedCount = 0
      const importErrors: string[] = []

      for (const transaction of transactions) {
        try {
          // Determine if it's income (for Chase, check originalAmount)
          const isIncome =
            'originalAmount' in transaction ? transaction.originalAmount > 0 : false

          const result = await transactionService.createTransaction({
            amount: transaction.amount,
            date: transaction.date,
            category_id: null, // User can categorize later
            description: transaction.description,
            merchant: transaction.merchant,
            is_income: isIncome,
          })

          if (!result.error) {
            importedCount++
          } else {
            importErrors.push(`Failed to import ${transaction.description}: ${result.error}`)
          }
        } catch (err) {
          importErrors.push(
            `Failed to import ${transaction.description}: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      }

      // Run automatic linking after import
      const autoLinkResult = await autoLinkAmazonTransactions(user.id)

      setResult({
        type,
        imported: importedCount,
        errors: [...parseErrors, ...importErrors],
        autoLinked: autoLinkResult.autoLinkedCount,
        suggested: autoLinkResult.suggestedCount,
      })

      // Clear file input
      if (type === 'chase') {
        setChaseFile(null)
        if (chaseFileInput.current) chaseFileInput.current.value = ''
      } else {
        setAmazonFile(null)
        if (amazonFileInput.current) amazonFileInput.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import transactions')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Import Transactions</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Chase Import */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Chase Credit Card</h2>
            <p className="text-sm text-gray-600 mb-4">
              Import transactions from your Chase credit card statement CSV file.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Chase CSV File
                </label>
                <input
                  ref={chaseFileInput}
                  type="file"
                  accept=".csv"
                  onChange={e => handleFileChange('chase', e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <Button
                onClick={() => handleImport('chase')}
                disabled={!chaseFile || importing}
                className="w-full"
              >
                {importing && result?.type === 'chase' ? 'Importing...' : 'Import Chase Transactions'}
              </Button>
            </div>
          </Card>

          {/* Amazon Import */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Amazon Orders</h2>
            <p className="text-sm text-gray-600 mb-4">
              Import order items from your Amazon order history CSV file.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Amazon CSV File
                </label>
                <input
                  ref={amazonFileInput}
                  type="file"
                  accept=".csv"
                  onChange={e => handleFileChange('amazon', e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <Button
                onClick={() => handleImport('amazon')}
                disabled={!amazonFile || importing}
                className="w-full"
              >
                {importing && result?.type === 'amazon' ? 'Importing...' : 'Import Amazon Transactions'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mt-8 p-6 bg-red-50 border-red-200">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Import Failed</h3>
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Success Message */}
        {result && (
          <Card className="mt-8 p-6 bg-green-50 border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Import Successful</h3>
            <div className="space-y-2 text-green-700">
              <p>
                ✓ Imported {result.imported} {result.type === 'chase' ? 'Chase' : 'Amazon'}{' '}
                transactions
              </p>
              {result.autoLinked !== undefined && result.autoLinked > 0 && (
                <p>✓ Automatically linked {result.autoLinked} Amazon order items to credit card charges</p>
              )}
              {result.suggested !== undefined && result.suggested > 0 && (
                <p className="text-yellow-700">
                  ⚠ Found {result.suggested} potential matches for manual review (view on Transactions page)
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-yellow-700">Warnings:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-600">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Button
              onClick={() => router.push('/transactions')}
              variant="secondary"
              className="mt-4"
            >
              View Transactions
            </Button>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Import</h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold text-gray-900">Chase Credit Card:</h4>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Log in to Chase.com</li>
                <li>Go to your credit card account</li>
                <li>Click "Download transactions" or "Export"</li>
                <li>Select CSV format and date range</li>
                <li>Upload the downloaded file here</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900">Amazon Orders:</h4>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to amazon.com/your-orders</li>
                <li>Click "Download order reports"</li>
                <li>Select date range and request report</li>
                <li>Wait for email notification (may take a few minutes)</li>
                <li>Download the CSV file and upload it here</li>
              </ol>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="font-semibold text-gray-900">Automatic Linking:</p>
              <p className="mt-2">
                After importing, the system will automatically link Amazon order items to their
                corresponding credit card charges if they match with high confidence (90%+ match score).
                Lower confidence matches will be shown as suggestions on the Transactions page for manual review.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
