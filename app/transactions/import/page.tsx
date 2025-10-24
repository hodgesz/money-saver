'use client'

// GREEN PHASE: Implement TransactionImport page with multi-format support
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/features/FileUpload'
import { parseCSV, ParsedTransaction } from '@/lib/utils/csvParser'
import { detectCSVFormat, getFormatName, CSVFormat } from '@/lib/utils/formatDetector'
import { parseAmazonCSV, AmazonTransaction } from '@/lib/utils/parsers/amazonParser'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import { duplicateDetectionService, DuplicateCheckResult } from '@/lib/services/duplicateDetection'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Card } from '@/components/ui'
import type { Category } from '@/types'

// Extended transaction type to include category info and duplicate status
interface ExtendedTransaction extends ParsedTransaction {
  category?: string
  subcategory?: string
  duplicateCheck?: DuplicateCheckResult
}

export default function TransactionImportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [parsedTransactions, setParsedTransactions] = useState<ExtendedTransaction[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [detectedFormat, setDetectedFormat] = useState<CSVFormat | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  // Load categories on mount for matching during import
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await categoryService.getCategories()
      if (!error && data) {
        setCategories(data)
      }
    }
    loadCategories()
  }, [])

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setParsedTransactions([])
      setParseErrors([])
      setDetectedFormat(null)
      return
    }

    try {
      // Read file content
      const content = await file.text()

      // Detect CSV format from headers
      const lines = content.trim().split('\n')
      if (lines.length === 0) {
        setParseErrors(['Empty CSV file'])
        return
      }

      const headerLine = lines[0]
      const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
      const format = detectCSVFormat(headers)
      setDetectedFormat(format)

      // Parse CSV based on detected format
      let result: { success: boolean; transactions: any[]; errors: string[] }

      if (format === CSVFormat.AMAZON) {
        // Use Amazon parser
        const amazonResult = parseAmazonCSV(content)
        result = {
          success: amazonResult.success,
          transactions: amazonResult.transactions.map((t: AmazonTransaction) => ({
            date: t.date,
            amount: t.amount,
            merchant: t.merchant,
            description: t.description,
            category: t.category,
            subcategory: t.subcategory,
          })),
          errors: amazonResult.errors,
        }
      } else {
        // Use generic parser
        result = parseCSV(content)
      }

      setParsedTransactions(result.transactions)
      setParseErrors(result.errors)
      setImportSuccess(false)
      setImportError(null)

      // Check for duplicates after parsing
      if (result.transactions.length > 0) {
        await checkForDuplicates(result.transactions)
      }
    } catch (error) {
      setParseErrors(['Failed to read file'])
      setParsedTransactions([])
      setDetectedFormat(null)
    }
  }

  const checkForDuplicates = async (transactions: ExtendedTransaction[]) => {
    setIsCheckingDuplicates(true)
    try {
      // Check all transactions for duplicates
      const duplicateResults = await duplicateDetectionService.batchCheckDuplicates(
        transactions.map(t => ({
          date: t.date,
          amount: t.amount,
          merchant: t.merchant,
          description: t.description,
        }))
      )

      // Add duplicate check results to transactions
      const transactionsWithDuplicates = transactions.map((t, index) => ({
        ...t,
        duplicateCheck: duplicateResults[index],
      }))

      setParsedTransactions(transactionsWithDuplicates)
    } catch (error) {
      console.error('Error checking duplicates:', error)
      // Continue without duplicate checking
    } finally {
      setIsCheckingDuplicates(false)
    }
  }

  const handleImport = async () => {
    if (!user || parsedTransactions.length === 0) return

    setIsImporting(true)
    setImportError(null)
    setImportProgress(0)

    const total = parsedTransactions.length
    let imported = 0
    const errors: string[] = []

    try {
      // Helper function to find or create category by name (case-insensitive)
      const findOrCreateCategory = async (categoryName?: string): Promise<string | null> => {
        if (!categoryName) return null

        const normalizedName = categoryName.toLowerCase().trim()

        // First, try to find existing category
        let match = categories.find(
          (cat) => cat.name.toLowerCase() === normalizedName
        )

        // If not found, create new category
        if (!match) {
          const { data: newCategory, error } = await categoryService.createCategory({
            name: categoryName.trim(),
            description: `Auto-created from CSV import`,
          })

          if (!error && newCategory) {
            // Add to local categories array for future lookups in this batch
            const newCat: Category = {
              id: newCategory.id,
              name: newCategory.name,
              description: newCategory.description,
              user_id: newCategory.user_id,
              created_at: newCategory.created_at,
            }
            categories.push(newCat)
            match = newCat
          }
        }

        return match ? match.id : null
      }

      // Batch transactions into groups of 50 for parallel processing
      const BATCH_SIZE = 50
      const batches: ExtendedTransaction[][] = []

      for (let i = 0; i < parsedTransactions.length; i += BATCH_SIZE) {
        batches.push(parsedTransactions.slice(i, i + BATCH_SIZE))
      }

      // Filter out duplicates if skipDuplicates is enabled
      let transactionsToImport = parsedTransactions
      if (skipDuplicates) {
        transactionsToImport = parsedTransactions.filter(
          t => !t.duplicateCheck?.isDuplicate
        )
      }

      // Update total count for progress calculation
      const totalToImport = transactionsToImport.length

      // Re-batch the filtered transactions
      const filteredBatches: ExtendedTransaction[][] = []
      for (let i = 0; i < transactionsToImport.length; i += BATCH_SIZE) {
        filteredBatches.push(transactionsToImport.slice(i, i + BATCH_SIZE))
      }

      // Process each batch in parallel
      for (const batch of filteredBatches) {
        // First, resolve all category IDs for this batch
        const categoryPromises = batch.map((transaction) =>
          findOrCreateCategory(transaction.category)
        )
        const categoryIds = await Promise.all(categoryPromises)

        // Then create all transactions with resolved category IDs
        const transactionPromises = batch.map((transaction, index) =>
          transactionService.createTransaction({
            date: transaction.date,
            amount: transaction.amount,
            merchant: transaction.merchant,
            description: transaction.description,
            category_id: categoryIds[index],
            is_income: false,
          })
        )

        const results = await Promise.all(transactionPromises)

        // Process results
        results.forEach((result, index) => {
          if (result.error) {
            errors.push(
              `Failed to import ${batch[index].merchant}: ${result.error.message}`
            )
          } else {
            imported++
          }
        })

        setImportProgress(Math.round((imported / totalToImport) * 100))
      }

      const skippedCount = parsedTransactions.length - transactionsToImport.length

      if (errors.length > 0) {
        const message = skipDuplicates
          ? `Imported ${imported} of ${totalToImport} transactions. ${skippedCount} duplicates skipped. ${errors.length} failed.`
          : `Imported ${imported} of ${total} transactions. ${errors.length} failed.`
        setImportError(message)
      } else {
        setImportSuccess(true)
        setParsedTransactions([])
        setParseErrors([])

        // Redirect to transactions page after successful import
        setTimeout(() => {
          router.push('/transactions')
        }, 2000)
      }
    } catch (error) {
      setImportError('Error importing transactions. Please try again.')
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Import Transactions</h1>
      <p className="text-gray-600 mb-8">
        Upload a CSV or Excel file to import your transactions
      </p>

      {/* File Upload */}
      <Card className="mb-6">
        <FileUpload onFileSelect={handleFileSelect} />
        {detectedFormat && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center text-sm">
              <svg
                className="w-5 h-5 text-blue-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-700">
                <span className="font-medium">Detected format:</span>{' '}
                {getFormatName(detectedFormat)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Parsing Errors ({parseErrors.length})
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {parseErrors.slice(0, 5).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
            {parseErrors.length > 5 && (
              <li className="font-medium">... and {parseErrors.length - 5} more</li>
            )}
          </ul>
        </Card>
      )}

      {/* Transaction Preview */}
      {parsedTransactions.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Preview ({parsedTransactions.length} transactions)
              </h3>
              {!isCheckingDuplicates && parsedTransactions[0]?.duplicateCheck && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">
                    {parsedTransactions.filter(t => !t.duplicateCheck?.isDuplicate).length} New
                  </span>
                  <span className="text-orange-600 font-medium">
                    {parsedTransactions.filter(t => t.duplicateCheck?.isDuplicate).length} Duplicates
                  </span>
                </div>
              )}
              {isCheckingDuplicates && (
                <span className="text-sm text-gray-500">Checking for duplicates...</span>
              )}
            </div>
            <Button
              onClick={handleImport}
              disabled={isImporting || parsedTransactions.length === 0 || isCheckingDuplicates}
            >
              {isImporting ? 'Importing...' : 'Import Transactions'}
            </Button>
          </div>

          {/* Skip Duplicates Checkbox */}
          {!isCheckingDuplicates && parsedTransactions.some(t => t.duplicateCheck?.isDuplicate) && (
            <div className="mb-4 pb-4 border-b">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Skip duplicate transactions (recommended)
                </span>
              </label>
            </div>
          )}

          {/* Progress Bar */}
          {isImporting && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Importing transactions...</span>
                <span className="text-sm font-medium">{importProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Transaction Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-left py-2 px-4">Date</th>
                  <th className="text-right py-2 px-4">Amount</th>
                  <th className="text-left py-2 px-4">Merchant</th>
                  <th className="text-left py-2 px-4">Description</th>
                  {detectedFormat === CSVFormat.AMAZON && (
                    <th className="text-left py-2 px-4">Category</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parsedTransactions.slice(0, 10).map((transaction, index) => {
                  const isDuplicate = transaction.duplicateCheck?.isDuplicate
                  const rowClass = isDuplicate
                    ? "border-b bg-orange-50 hover:bg-orange-100"
                    : "border-b hover:bg-gray-50"

                  return (
                    <tr key={index} className={rowClass}>
                      <td className="py-2 px-4 text-sm">
                        {isCheckingDuplicates ? (
                          <span className="text-gray-400">Checking...</span>
                        ) : isDuplicate ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            New
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-sm">{transaction.date}</td>
                      <td className="py-2 px-4 text-sm text-right">
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-4 text-sm">{transaction.merchant}</td>
                      <td className="py-2 px-4 text-sm text-gray-600">
                        {transaction.description}
                      </td>
                      {detectedFormat === CSVFormat.AMAZON && (
                        <td className="py-2 px-4 text-sm">
                          {transaction.category && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {transaction.category}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
                {parsedTransactions.length > 10 && (
                  <tr>
                    <td
                      colSpan={detectedFormat === CSVFormat.AMAZON ? 6 : 5}
                      className="py-2 px-4 text-sm text-gray-500 text-center"
                    >
                      ... and {parsedTransactions.length - 10} more transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Success Message */}
      {importSuccess && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-green-600 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-green-800">Successfully imported!</p>
              <p className="text-sm text-green-700">
                Redirecting to transactions page...
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {importError && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-red-600 mr-3 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-red-800">Error importing transactions</p>
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
