import { createClient } from '@/lib/supabase/client'
import type { AuthError, User, Session } from '@supabase/supabase-js'

/**
 * Authentication credentials for sign up and sign in
 */
export interface AuthCredentials {
  email: string
  password: string
}

/**
 * Result type for auth operations that return user data
 */
export interface AuthResult {
  data: {
    user: User | null
    session?: Session | null
  } | null
  error: AuthError | null
}

/**
 * Result type for auth operations that only return session
 */
export interface SessionResult {
  data: {
    session: Session | null
  } | null
  error: AuthError | null
}

/**
 * Result type for auth operations with no return data
 */
export interface VoidAuthResult {
  error: AuthError | null
}

/**
 * Authentication service for managing user authentication
 */
class AuthService {
  /**
   * Create a new user account
   */
  async signUp(credentials: AuthCredentials): Promise<AuthResult> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    })

    return { data, error }
  }

  /**
   * Sign in an existing user
   */
  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    return { data, error }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<VoidAuthResult> {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    return { error }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<VoidAuthResult> {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    return { error }
  }

  /**
   * Update the current user's password
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    return { data, error }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<AuthResult> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getUser()

    return { data, error }
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<SessionResult> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getSession()

    return { data, error }
  }

  /**
   * Update user profile metadata (name, etc.)
   */
  async updateProfile(updates: { name?: string }): Promise<AuthResult> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    })

    return { data, error }
  }
}

// Export a singleton instance
export const authService = new AuthService()
