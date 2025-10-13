import { renderHook, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { authService } from '@/lib/services/auth'
import type { User } from '@supabase/supabase-js'

// Mock the auth service
jest.mock('@/lib/services/auth', () => ({
  authService: {
    getCurrentUser: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
}))

describe('AuthContext', () => {
  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('AuthProvider', () => {
    it('should provide initial loading state', () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
    })

    it('should load current user on mount', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
    })

    it('should handle no user on mount', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
    })

    it('should handle error loading user', async () => {
      const mockError = { message: 'Network error' }
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
    })
  })

  describe('signIn', () => {
    it('should sign in user and update state', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      ;(authService.signIn as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'test@example.com',
          password: 'password',
        })
      })

      expect(signInResult.error).toBeNull()
      expect(result.current.user).toEqual(mockUser)
    })

    it('should handle sign in errors', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const mockError = { message: 'Invalid credentials' }
      ;(authService.signIn as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      })

      expect(signInResult.error).toEqual(mockError)
      expect(result.current.user).toBeNull()
    })
  })

  describe('signUp', () => {
    it('should sign up user and update state', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      ;(authService.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signUpResult
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'new@example.com',
          password: 'password',
        })
      })

      expect(signUpResult.error).toBeNull()
      expect(result.current.user).toEqual(mockUser)
    })

    it('should handle sign up errors', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const mockError = { message: 'Email already registered' }
      ;(authService.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signUpResult
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'existing@example.com',
          password: 'password',
        })
      })

      expect(signUpResult.error).toEqual(mockError)
      expect(result.current.user).toBeNull()
    })
  })

  describe('signOut', () => {
    it('should sign out user and clear state', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(authService.signOut as jest.Mock).mockResolvedValue({
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.user).toBeNull()
      expect(authService.signOut).toHaveBeenCalled()
    })

    it('should handle sign out errors', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockError = { message: 'Sign out failed' }
      ;(authService.signOut as jest.Mock).mockResolvedValue({
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signOutResult
      await act(async () => {
        signOutResult = await result.current.signOut()
      })

      expect(signOutResult.error).toEqual(mockError)
    })
  })

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      ;(authService.resetPassword as jest.Mock).mockResolvedValue({
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let resetResult
      await act(async () => {
        resetResult = await result.current.resetPassword('test@example.com')
      })

      expect(resetResult.error).toBeNull()
      expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com')
    })
  })

  describe('updatePassword', () => {
    it('should update user password', async () => {
      ;(authService.getCurrentUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(authService.updatePassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let updateResult
      await act(async () => {
        updateResult = await result.current.updatePassword('newpassword')
      })

      expect(updateResult.error).toBeNull()
      expect(authService.updatePassword).toHaveBeenCalledWith('newpassword')
    })
  })
})
