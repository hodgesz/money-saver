'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import type { Account, AccountType } from '@/types'

interface AccountFormProps {
  onSubmit: (data: { name: string; type: AccountType; balance: number }) => Promise<void>
  onCancel?: () => void
  account?: Account
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
]

export function AccountForm({ onSubmit, onCancel, account }: AccountFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (account) {
      setName(account.name)
      setType(account.type)
      setBalance(account.balance.toString())
    } else {
      setName('')
      setType('checking')
      setBalance('0')
    }
    setError(null)
  }, [account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const balanceNum = parseFloat(balance)
      if (isNaN(balanceNum)) {
        throw new Error('Balance must be a valid number')
      }

      await onSubmit({
        name: name.trim(),
        type,
        balance: balanceNum,
      })

      // Reset form if not editing
      if (!account) {
        setName('')
        setType('checking')
        setBalance('0')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Account Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Chase Checking"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Account Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={loading}
        >
          {ACCOUNT_TYPES.map((accountType) => (
            <option key={accountType.value} value={accountType.value}>
              {accountType.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">
          Current Balance
        </label>
        <input
          type="number"
          id="balance"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0.00"
          required
          disabled={loading}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving...' : account ? 'Update Account' : 'Add Account'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
