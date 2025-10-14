import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, usePathname } from 'next/navigation'
import DashboardPage from '../page'
import { useAuth } from '@/contexts/AuthContext'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

describe('DashboardPage', () => {
  const mockPush = jest.fn()
  const mockSignOut = jest.fn()
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
  })

  describe('Authentication - Authenticated User', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: mockSignOut,
      })
    })

    it('renders dashboard for authenticated user', () => {
      render(<DashboardPage />)

      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByText(/you are successfully authenticated!/i)).toBeInTheDocument()
    })

    it('displays user information', () => {
      render(<DashboardPage />)

      expect(screen.getByText(/user id:/i)).toBeInTheDocument()
      expect(screen.getByText(mockUser.id)).toBeInTheDocument()
      expect(screen.getByText(/email:/i)).toBeInTheDocument()
      expect(screen.getByText(mockUser.email)).toBeInTheDocument()
    })

    it('displays sign out button', () => {
      render(<DashboardPage />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
    })

    it('displays welcome card', () => {
      render(<DashboardPage />)

      expect(screen.getByRole('heading', { name: /welcome!/i })).toBeInTheDocument()
    })

    it('displays authentication success card', () => {
      render(<DashboardPage />)

      expect(screen.getByRole('heading', { name: /🎉 authentication works!/i })).toBeInTheDocument()
      expect(screen.getByText(/this is a protected page/i)).toBeInTheDocument()
    })

    it('calls signOut when sign out button is clicked', async () => {
      const user = userEvent.setup()
      mockSignOut.mockResolvedValue(undefined)

      render(<DashboardPage />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      await user.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('Authentication - Unauthenticated User', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
        signOut: mockSignOut,
      })
    })

    it('redirects to login page when not authenticated', () => {
      render(<DashboardPage />)

      waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('does not render dashboard content when not authenticated', () => {
      render(<DashboardPage />)

      expect(screen.queryByRole('heading', { name: /dashboard/i })).not.toBeInTheDocument()
      expect(screen.queryByText(/you are successfully authenticated!/i)).not.toBeInTheDocument()
    })

    it('returns null when not authenticated and not loading', () => {
      const { container } = render(<DashboardPage />)

      // Component returns null, so container should be empty
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Loading State', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true,
        signOut: mockSignOut,
      })
    })

    it('displays loading indicator when auth is loading', () => {
      render(<DashboardPage />)

      expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument()
    })

    it('does not redirect while loading', () => {
      render(<DashboardPage />)

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('does not display dashboard content while loading', () => {
      render(<DashboardPage />)

      expect(screen.queryByRole('heading', { name: /dashboard/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
    })

    it('centers loading indicator on screen', () => {
      render(<DashboardPage />)

      const loadingContainer = screen.getByText(/loading\.\.\./i).parentElement
      expect(loadingContainer).toHaveClass('min-h-screen')
      expect(loadingContainer).toHaveClass('flex')
      expect(loadingContainer).toHaveClass('items-center')
      expect(loadingContainer).toHaveClass('justify-center')
    })
  })

  describe('User State Transitions', () => {
    it('handles transition from loading to authenticated', async () => {
      const { rerender } = render(<DashboardPage />)

      // Start with loading state
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true,
        signOut: mockSignOut,
      })
      rerender(<DashboardPage />)
      expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument()

      // Transition to authenticated
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: mockSignOut,
      })
      rerender(<DashboardPage />)

      await waitFor(() => {
        expect(screen.queryByText(/loading\.\.\./i)).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
      })
    })

    it('handles transition from loading to unauthenticated', async () => {
      const { rerender } = render(<DashboardPage />)

      // Start with loading state
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true,
        signOut: mockSignOut,
      })
      rerender(<DashboardPage />)
      expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument()

      // Transition to unauthenticated
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
        signOut: mockSignOut,
      })
      rerender(<DashboardPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Layout and Styling', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: mockSignOut,
      })
    })

    it('applies correct layout classes', () => {
      const { container } = render(<DashboardPage />)

      const mainContainer = container.firstChild
      expect(mainContainer).toHaveClass('min-h-screen')
      expect(mainContainer).toHaveClass('bg-gray-50')
    })

    it('renders sign out button in navigation', () => {
      render(<DashboardPage />)

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
    })
  })

  describe('Sign Out Flow', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: mockSignOut,
      })
    })

    it('handles successful sign out', async () => {
      const user = userEvent.setup()
      mockSignOut.mockResolvedValue(undefined)

      render(<DashboardPage />)

      await user.click(screen.getByRole('button', { name: /sign out/i }))

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
      })
    })
  })
})
