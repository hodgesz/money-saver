import { createClient } from '@/lib/supabase/client'
import { authService } from '../auth'
import type { User } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

describe('Auth Service', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock Supabase client with auth methods
    mockSupabaseClient = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('signUp', () => {
    it('should create a new user account', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token123' },
        },
        error: null,
      })

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'SecurePass123!',
      })

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
      })
      expect(result.data?.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle signup errors (email already exists)', async () => {
      const mockError = {
        message: 'User already registered',
        status: 400,
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      const result = await authService.signUp({
        email: 'existing@example.com',
        password: 'password123',
      })

      expect(result.data?.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('should handle weak password errors', async () => {
      const mockError = {
        message: 'Password should be at least 6 characters',
        status: 422,
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      const result = await authService.signUp({
        email: 'test@example.com',
        password: '123',
      })

      expect(result.data?.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('signIn', () => {
    it('should sign in an existing user', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token123' },
        },
        error: null,
      })

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'SecurePass123!',
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
      })
      expect(result.data?.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle invalid credentials', async () => {
      const mockError = {
        message: 'Invalid login credentials',
        status: 400,
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      expect(result.data?.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('should handle user not found', async () => {
      const mockError = {
        message: 'User not found',
        status: 400,
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      const result = await authService.signIn({
        email: 'nonexistent@example.com',
        password: 'password123',
      })

      expect(result.data?.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('signOut', () => {
    it('should sign out the current user', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      const result = await authService.signOut()

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(result.error).toBeNull()
    })

    it('should handle signout errors', async () => {
      const mockError = {
        message: 'Session not found',
        status: 400,
      }

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: mockError,
      })

      const result = await authService.signOut()

      expect(result.error).toEqual(mockError)
    })
  })

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await authService.resetPassword('test@example.com')

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: expect.stringContaining('/reset-password'),
        }
      )
      expect(result.error).toBeNull()
    })

    it('should handle errors when email does not exist', async () => {
      const mockError = {
        message: 'User not found',
        status: 400,
      }

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await authService.resetPassword('nonexistent@example.com')

      expect(result.error).toEqual(mockError)
    })

    it('should handle rate limit errors', async () => {
      const mockError = {
        message: 'Too many requests',
        status: 429,
      }

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await authService.resetPassword('test@example.com')

      expect(result.error).toEqual(mockError)
    })
  })

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await authService.updatePassword('NewSecurePass123!')

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewSecurePass123!',
      })
      expect(result.data?.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle weak password errors', async () => {
      const mockError = {
        message: 'Password should be at least 6 characters',
        status: 422,
      }

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      const result = await authService.updatePassword('123')

      expect(result.data?.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('should handle unauthenticated errors', async () => {
      const mockError = {
        message: 'Not authenticated',
        status: 401,
      }

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      const result = await authService.updatePassword('NewPass123!')

      expect(result.error).toEqual(mockError)
    })
  })

  describe('getCurrentUser', () => {
    it('should get the current authenticated user', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await authService.getCurrentUser()

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
      expect(result.data?.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should return null when no user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await authService.getCurrentUser()

      expect(result.data?.user).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should handle token expired errors', async () => {
      const mockError = {
        message: 'Token expired',
        status: 401,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      const result = await authService.getCurrentUser()

      expect(result.data?.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('getSession', () => {
    it('should get the current session', async () => {
      const mockSession = {
        access_token: 'token123',
        refresh_token: 'refresh123',
        expires_at: Date.now() + 3600000,
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await authService.getSession()

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      expect(result.data?.session).toEqual(mockSession)
      expect(result.error).toBeNull()
    })

    it('should return null when no session exists', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await authService.getSession()

      expect(result.data?.session).toBeNull()
      expect(result.error).toBeNull()
    })
  })
})
