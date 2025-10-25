'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

type PasswordStrength = 'weak' | 'medium' | 'strong'

function calculatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 'weak'

  let score = 0

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Character variety checks
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak')
  const { updatePassword } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(newPassword))
  }, [newPassword])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate password length
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await updatePassword(newPassword)
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        router.push('/login')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStrengthColor = (strength: PasswordStrength) => {
    switch (strength) {
      case 'weak':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'strong':
        return 'text-green-600'
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Password Reset Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 text-sm text-green-600 bg-green-50 rounded-md text-center">
              Your password has been reset successfully. Redirecting to login...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Set New Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
              />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">Password Strength:</span>
                {newPassword && (
                  <span className={`font-semibold capitalize ${getStrengthColor(passwordStrength)}`}>
                    {passwordStrength}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Password must be at least 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
