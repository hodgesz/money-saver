import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import ResetPasswordPage from '../page'
import { useAuth } from '@/contexts/AuthContext'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

describe('ResetPasswordPage', () => {
  const mockPush = jest.fn()
  const mockUpdatePassword = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useAuth as jest.Mock).mockReturnValue({
      updatePassword: mockUpdatePassword,
    })
  })

  describe('Rendering', () => {
    it('renders reset password form with all elements', () => {
      render(<ResetPasswordPage />)

      expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
    })

    it('renders password inputs with correct attributes', () => {
      render(<ResetPasswordPage />)

      const newPasswordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      expect(newPasswordInput).toHaveAttribute('type', 'password')
      expect(newPasswordInput).toBeRequired()
      expect(newPasswordInput).toHaveAttribute('minLength', '6')

      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toBeRequired()
      expect(confirmPasswordInput).toHaveAttribute('minLength', '6')
    })

    it('renders helper text for password requirements', () => {
      render(<ResetPasswordPage />)

      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('allows user to type in password fields', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const newPasswordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(newPasswordInput, 'newpassword123')
      await user.type(confirmPasswordInput, 'newpassword123')

      expect(newPasswordInput).toHaveValue('newpassword123')
      expect(confirmPasswordInput).toHaveValue('newpassword123')
    })
  })

  describe('Form Validation', () => {
    it('displays error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'different123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })

      expect(mockUpdatePassword).not.toHaveBeenCalled()
    })

    it('displays error when password is too short', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'short')
      await user.type(screen.getByLabelText(/confirm password/i), 'short')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      // HTML5 validation should prevent submission or show error
      expect(mockUpdatePassword).not.toHaveBeenCalled()
    })

    it('requires both password fields to be filled', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      await user.click(screen.getByRole('button', { name: /reset password/i }))

      // HTML5 validation should prevent submission
      expect(mockUpdatePassword).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission - Success', () => {
    it('calls updatePassword with new password on form submission', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({ error: null })

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalledWith('newpassword123')
      })
    })

    it('displays success message after successful password reset', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({ error: null })

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/your password has been reset successfully/i)
        ).toBeInTheDocument()
      })
    })

    it('redirects to login page after successful reset', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({ error: null })

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('hides form after successful submission', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({ error: null })

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission - Errors', () => {
    it('displays error message when password update fails', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({
        error: { message: 'Invalid or expired reset token' },
      })

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset token')).toBeInTheDocument()
      })
    })

    it('displays generic error message when unexpected error occurs', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockRejectedValue(new Error('Network error'))

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
      })
    })

    it('keeps form visible when submission fails', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({
        error: { message: 'Password too weak' },
      })

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'weak12')
      await user.type(screen.getByLabelText(/confirm password/i), 'weak12')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText('Password too weak')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    it('clears previous error when submitting again', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValueOnce({
        error: { message: 'First error' },
      })

      render(<ResetPasswordPage />)

      // First submission with error
      await user.type(screen.getByLabelText(/^new password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second submission should clear error first
      mockUpdatePassword.mockResolvedValueOnce({ error: null })
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })

    it('does not redirect when submission fails', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({
        error: { message: 'Update failed' },
      })

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('shows loading state during form submission', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      expect(screen.getByText('Resetting...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /resetting/i })).toBeDisabled()
    })

    it('disables form inputs during submission', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      expect(screen.getByLabelText(/^new password$/i)).toBeDisabled()
      expect(screen.getByLabelText(/confirm password/i)).toBeDisabled()
    })

    it('re-enables form after submission completes', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({
        error: { message: 'Update failed' },
      })

      render(<ResetPasswordPage />)

      await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/^new password$/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/confirm password/i)).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /reset password/i })).not.toBeDisabled()
    })
  })

  describe('Password Strength Indicator', () => {
    it('displays password strength indicator', () => {
      render(<ResetPasswordPage />)

      expect(screen.getByText(/password strength:/i)).toBeInTheDocument()
    })

    it('shows weak strength for short passwords', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      await user.type(passwordInput, 'pass12')

      expect(screen.getByText(/weak/i)).toBeInTheDocument()
    })

    it('shows medium strength for moderate passwords', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      await user.type(passwordInput, 'password123')

      expect(screen.getByText(/medium/i)).toBeInTheDocument()
    })

    it('shows strong strength for complex passwords', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      await user.type(passwordInput, 'StrongP@ssw0rd!')

      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })
})
