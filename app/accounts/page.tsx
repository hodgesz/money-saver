'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { accountsService } from '@/lib/services/accounts'
import { AccountForm } from '@/components/features/AccountForm'
import { AccountList } from '@/components/features/AccountList'
import { Card } from '@/components/ui/Card'
import type { Account } from '@/types'

export default function AccountsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const isMountedRef = useRef(false)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch data on mount
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      if (cancelled) return

      if (!cancelled) {
        setLoading(true)
        setError(null)
      }

      try {
        const accountsResult = await accountsService.getAccounts()

        if (cancelled) return

        const newAccounts = accountsResult.error ? [] : (accountsResult.data || [])
        const newError = accountsResult.error ? 'Failed to load accounts' : null

        if (!cancelled) {
          setAccounts(newAccounts)
          setError(newError)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError('An unexpected error occurred')
          setLoading(false)
        }
      }
    }

    if (user) {
      fetchData()
    }

    return () => {
      cancelled = true
    }
  }, [user])

  const fetchData = async () => {
    if (!isMountedRef.current) return

    if (isMountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const accountsResult = await accountsService.getAccounts()

      if (!isMountedRef.current) return

      const newAccounts = accountsResult.error ? [] : (accountsResult.data || [])
      const newError = accountsResult.error ? 'Failed to load accounts' : null

      if (isMountedRef.current) {
        setAccounts(newAccounts)
        setError(newError)
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('An unexpected error occurred')
        setLoading(false)
      }
    }
  }

  const handleAddAccount = async (accountData: {
    name: string
    type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other'
    balance: number
  }) => {
    const result = await accountsService.createAccount(accountData)

    if (result.error) {
      throw new Error('Failed to create account')
    }

    // Refresh the account list and clear edit mode
    setEditingAccount(undefined)
    await fetchData()
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
  }

  const handleUpdateAccount = async (accountData: {
    name: string
    type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other'
    balance: number
  }) => {
    if (!editingAccount) return

    const result = await accountsService.updateAccount(editingAccount.id, accountData)

    if (result.error) {
      throw new Error('Failed to update account')
    }

    // Refresh the account list and clear edit mode
    setEditingAccount(undefined)
    await fetchData()
  }

  const handleCancelEdit = () => {
    setEditingAccount(undefined)
  }

  const handleDeleteAccount = async (id: string) => {
    const result = await accountsService.deleteAccount(id)

    if (result.error) {
      setError('Failed to delete account. It may have associated transactions.')
      return
    }

    // Refresh the account list
    await fetchData()
  }

  // Show loading while checking authentication
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Accounts</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Account Form - Left side on large screens */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </h2>
              <AccountForm
                onSubmit={editingAccount ? handleUpdateAccount : handleAddAccount}
                onCancel={editingAccount ? handleCancelEdit : undefined}
                account={editingAccount}
              />
            </Card>
          </div>

          {/* Account List - Right side on large screens */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Your Accounts
              </h2>
              <AccountList
                accounts={accounts}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
                isLoading={loading}
                error={error || undefined}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
