'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/services/auth'
import type { User } from '@supabase/supabase-js'
import type { AuthCredentials, AuthResult, VoidAuthResult } from '@/lib/services/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (credentials: AuthCredentials) => Promise<AuthResult>
  signUp: (credentials: AuthCredentials) => Promise<AuthResult>
  signOut: () => Promise<VoidAuthResult>
  resetPassword: (email: string) => Promise<VoidAuthResult>
  updatePassword: (newPassword: string) => Promise<AuthResult>
  updateProfile: (updates: { name?: string }) => Promise<AuthResult>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load user on mount
  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      try {
        // First check if we have a session to avoid "Auth session missing!" warning
        const { data: sessionData } = await authService.getSession()

        if (!isMounted) return

        // If no session, set user to null and skip getUser() call
        if (!sessionData?.session) {
          setUser(null)
          if (isMounted) {
            setLoading(false)
          }
          return
        }

        // We have a session, now get the full user data
        const { data, error } = await authService.getCurrentUser()

        if (!isMounted) return

        if (error) {
          console.error('Error loading user:', error)
          setUser(null)
        } else {
          setUser(data?.user || null)
        }
      } catch (error) {
        if (!isMounted) return

        console.error('Unexpected error loading user:', error)
        setUser(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [])

  async function signIn(credentials: AuthCredentials): Promise<AuthResult> {
    const result = await authService.signIn(credentials)

    if (result.error) {
      return result
    }

    setUser(result.data?.user || null)
    return result
  }

  async function signUp(credentials: AuthCredentials): Promise<AuthResult> {
    const result = await authService.signUp(credentials)

    if (result.error) {
      return result
    }

    setUser(result.data?.user || null)
    return result
  }

  async function signOut(): Promise<VoidAuthResult> {
    const result = await authService.signOut()

    if (!result.error) {
      setUser(null)
      router.push('/login')
    }

    return result
  }

  async function resetPassword(email: string): Promise<VoidAuthResult> {
    return await authService.resetPassword(email)
  }

  async function updatePassword(newPassword: string): Promise<AuthResult> {
    const result = await authService.updatePassword(newPassword)
    if (!result.error && result.data?.user) {
      setUser(result.data.user)
    }
    return result
  }

  async function updateProfile(updates: { name?: string }): Promise<AuthResult> {
    const result = await authService.updateProfile(updates)
    if (!result.error && result.data?.user) {
      setUser(result.data.user)
    }
    return result
  }

  async function refreshUser(): Promise<void> {
    const { data } = await authService.getCurrentUser()
    if (data?.user) {
      setUser(data.user)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
