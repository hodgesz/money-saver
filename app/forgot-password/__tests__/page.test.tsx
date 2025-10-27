import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import ForgotPasswordPage from '../page'
import { useAuth } from '@/contexts/AuthContext'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

describe('ForgotPasswordPage', () => {
  const mockPush = jest.fn()
  const mockResetPassword = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useAuth as jest.Mock).mockReturnValue({
      resetPassword: mockResetPassword,
    })
  })

  describe('Rendering', () => {
    it('renders forgot password form with all elements', () => {
      render(<ForgotPasswordPage />)

      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
      expect(screen.getByText(/back to login/i)).toBeInTheDocument()
    })

    it('renders email input with correct attributes', () => {
      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      expect(emailInput).toBeRequired()
    })

    it('renders helper text explaining the process', () => {
      render(<ForgotPasswordPage />)

      expect(
        screen.getByText(/enter your email address and we'll send you a link to reset your password/i)
      ).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('allows user to type in email field', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('navigates to login page when back link is clicked', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordPage />)

      const backLink = screen.getByText(/back to login/i)
      await user.click(backLink)

      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Form Submission - Success', () => {
    it('calls resetPassword with email on form submission', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({ error: null })

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com')
      })
    })

    it('displays success message after successful submission', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({ error: null })

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/check your email for a link to reset your password/i)
        ).toBeInTheDocument()
      })
    })

    it('hides form after successful submission', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({ error: null })

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
      })
    })

    it('shows return to login button after successful submission', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({ error: null })

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText(/return to login/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission - Errors', () => {
    it('displays error message when reset fails', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({
        error: { message: 'User not found' },
      })

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument()
      })
    })

    it('displays generic error message when unexpected error occurs', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockRejectedValue(new Error('Network error'))

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
      })
    })

    it('keeps form visible when submission fails', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({
        error: { message: 'Invalid email' },
      })

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'invalid@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid email')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('clears previous error when submitting again', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValueOnce({
        error: { message: 'First error' },
      })

      render(<ForgotPasswordPage />)

      // First submission with error
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second submission should clear error first
      mockResetPassword.mockResolvedValueOnce({ error: null })
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state during form submission', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      expect(screen.getByText('Sending...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
    })

    it('disables form inputs during submission', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByText(/back to login/i)).toBeDisabled()
    })

    it('re-enables form after submission completes', async () => {
      const user = userEvent.setup()
      mockResetPassword.mockResolvedValue({
        error: { message: 'Invalid email' },
      })

      render(<ForgotPasswordPage />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid email')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/email/i)).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /send reset link/i })).not.toBeDisabled()
    })
  })

  describe('Validation', () => {
    it('requires email field to be filled', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.click(screen.getByRole('button', { name: /send reset link/i }))

      // HTML5 validation should prevent submission
      expect(mockResetPassword).not.toHaveBeenCalled()
    })

    it('requires valid email format', () => {
      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
    })
  })
})
