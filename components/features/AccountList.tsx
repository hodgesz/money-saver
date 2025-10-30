'use client'

import { Button } from '@/components/ui/Button'
import type { Account } from '@/types'

interface AccountListProps {
  accounts: Account[]
  onEdit: (account: Account) => void
  onDelete: (id: string) => void
  isLoading?: boolean
  error?: string
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  investment: 'Investment',
  other: 'Other',
}

export function AccountList({ accounts, onEdit, onDelete, isLoading, error }: AccountListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading accounts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-2">No accounts yet</p>
        <p className="text-sm text-gray-500">Add your first account to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {ACCOUNT_TYPE_LABELS[account.type] || account.type}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(account.balance)}
              </p>
              <p className="text-sm text-gray-500">
                Created {formatDate(account.created_at)}
              </p>
              {account.last_synced && (
                <p className="text-sm text-gray-500">
                  Last synced {formatDate(account.last_synced)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(account)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${account.name}"?`)) {
                  onDelete(account.id)
                }
              }}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
