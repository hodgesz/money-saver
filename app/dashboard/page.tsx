'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  async function handleSignOut() {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={handleSignOut} variant="secondary">
            Sign out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                You are successfully authenticated!
              </p>
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm font-medium">User ID:</p>
                <p className="text-sm font-mono text-gray-600">{user.id}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm font-medium">Email:</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🎉 Authentication Works!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              This is a protected page. You can only see this because you are logged in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
