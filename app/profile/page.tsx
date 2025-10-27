'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/lib/services/auth'
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

export default function ProfilePage() {
  const { user, loading: authLoading, updatePassword, updateProfile } = useAuth()
  const router = useRouter()

  // View mode state
  const [editMode, setEditMode] = useState(false)
  const [passwordMode, setPasswordMode] = useState(false)

  // Profile edit state
  const [name, setName] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Load user name from metadata
  useEffect(() => {
    if (user?.user_metadata?.name) {
      setName(user.user_metadata.name)
    }
  }, [user])

  // Update password strength indicator
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(newPassword))
  }, [newPassword])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!name.trim()) {
      setProfileError('Name is required')
      return
    }

    setProfileLoading(true)

    try {
      const { error } = await updateProfile({ name: name.trim() })
      if (error) {
        setProfileError(error.message)
      } else {
        setProfileSuccess('Profile updated successfully')
        setEditMode(false)
        // Success message will auto-clear after 3 seconds
        setTimeout(() => setProfileSuccess(''), 3000)
      }
    } catch (err) {
      setProfileError('An error occurred')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    // Validate current password is provided
    if (!currentPassword.trim()) {
      setPasswordError('Current password is required')
      return
    }

    // Validate password length
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordLoading(true)

    try {
      const { error } = await updatePassword(newPassword)
      if (error) {
        setPasswordError(error.message)
      } else {
        setPasswordSuccess('Password updated successfully')
        // Clear form and return to profile view
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => {
          setPasswordSuccess('')
          setPasswordMode(false)
        }, 1000) // Reduced to 1 second for better UX
      }
    } catch (err) {
      setPasswordError('An error occurred')
    } finally {
      setPasswordLoading(false)
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success messages */}
          {profileSuccess && (
            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
              {profileSuccess}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
              {passwordSuccess}
            </div>
          )}

          {/* Profile View Mode */}
          {!editMode && !passwordMode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-600">Email</Label>
                <p className="text-lg font-medium">{user.email}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-600">Name</Label>
                <p className="text-lg font-medium">
                  {user.user_metadata?.name || 'Not set'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-600">Member Since</Label>
                <p className="text-lg font-medium">
                  {user.created_at ? formatDate(user.created_at) : 'Unknown'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="primary"
                  onClick={() => setEditMode(true)}
                  className="flex-1"
                >
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPasswordMode(true)}
                  className="flex-1"
                >
                  Change Password
                </Button>
              </div>
            </div>
          )}

          {/* Profile Edit Mode */}
          {editMode && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
              <form onSubmit={handleProfileSave} className="space-y-4">
                {profileError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                    {profileError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={50}
                    disabled={profileLoading}
                  />
                </div>

              <div className="space-y-2">
                <Label className="text-gray-600">Email</Label>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={profileLoading}
                    className="flex-1"
                  >
                    {profileLoading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false)
                      setProfileError('')
                      setName(user.user_metadata?.name || '')
                    }}
                    disabled={profileLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Password Change Mode */}
          {passwordMode && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                    {passwordError}
                  </div>
                )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  disabled={passwordLoading}
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
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  disabled={passwordLoading}
                />
              </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={passwordLoading}
                    className="flex-1"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPasswordMode(false)
                      setPasswordError('')
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={passwordLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
