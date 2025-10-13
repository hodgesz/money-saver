import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import SignUpPage from '../page'
import { useAuth } from '@/contexts/AuthContext'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

describe('SignUpPage', () => {
  const mockPush = jest.fn()
  const mockSignUp = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useAuth as jest.Mock).mockReturnValue({
      signUp: mockSignUp,
    })
  })

  describe('Rendering', () => {
    it('renders signup form with all elements', () => {
      render(<SignUpPage />)

      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
      expect(screen.getByText(/already have an account\? sign in/i)).toBeInTheDocument()
    })

    it('renders email input with correct attributes', () => {
      render(<SignUpPage />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      expect(emailInput).toBeRequired()
    })

    it('renders password input with correct attributes', () => {
      render(<SignUpPage />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('minLength', '6')
      expect(passwordInput).toBeRequired()
    })

    it('displays password requirement hint', () => {
      render(<SignUpPage />)

      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('allows user to type in email and password fields', async () => {
      const user = userEvent.setup()
      render(<SignUpPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })

    it('navigates to login page when sign in link is clicked', async () => {
      const user = userEvent.setup()
      render(<SignUpPage />)

      const loginLink = screen.getByText(/already have an account\? sign in/i)
      await user.click(loginLink)

      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Form Submission - Success', () => {
    it('calls signUp with email and password on form submission', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
        })
      })
    })

    it('redirects to dashboard on successful signup', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('accepts password with exactly 6 characters', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), '123456')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: '123456',
        })
      })
    })
  })

  describe('Form Submission - Errors', () => {
    it('displays error message when signup fails', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({
        error: { message: 'Email already registered' },
      })

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument()
      })
    })

    it('displays generic error message when unexpected error occurs', async () => {
      const user = userEvent.setup()
      mockSignUp.mockRejectedValue(new Error('Network error'))

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
      })
    })

    it('does not redirect on failed signup', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({
        error: { message: 'Email already in use' },
      })

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('clears previous error when submitting again', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValueOnce({
        error: { message: 'First error' },
      })

      render(<SignUpPage />)

      // First submission with error
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second submission should clear error first
      mockSignUp.mockResolvedValueOnce({ error: null })
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state during form submission', async () => {
      const user = userEvent.setup()
      mockSignUp.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      expect(screen.getByText('Creating account...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
    })

    it('disables form inputs during submission', async () => {
      const user = userEvent.setup()
      mockSignUp.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/password/i)).toBeDisabled()
      expect(screen.getByText(/already have an account\? sign in/i)).toBeDisabled()
    })

    it('re-enables form after submission completes', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({
        error: { message: 'Email already in use' },
      })

      render(<SignUpPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/email/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/password/i)).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /sign up/i })).not.toBeDisabled()
    })
  })

  describe('Password Validation', () => {
    it('enforces minimum password length via HTML5 validation', () => {
      render(<SignUpPage />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('minLength', '6')
    })

    it('displays password requirement hint to user', () => {
      render(<SignUpPage />)

      const hint = screen.getByText(/password must be at least 6 characters/i)
      expect(hint).toBeInTheDocument()
      expect(hint).toHaveClass('text-xs')
    })
  })
})
