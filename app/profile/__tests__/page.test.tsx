import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import ProfilePage from '../page'
import { useAuth } from '@/contexts/AuthContext'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

describe('ProfilePage', () => {
  const mockPush = jest.fn()
  const mockUpdatePassword = jest.fn()
  const mockUpdateProfile = jest.fn()

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
    },
    created_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  describe('Authentication Requirements', () => {
    it('redirects to login when user is not authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })

      render(<ProfilePage />)

      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('does not redirect when user is authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })

      render(<ProfilePage />)

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('shows loading state while checking authentication', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })

      render(<ProfilePage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('Profile View - Read-Only Mode', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('renders profile page heading', () => {
      render(<ProfilePage />)

      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })

    it('displays user email', () => {
      render(<ProfilePage />)

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('displays user name when available', () => {
      render(<ProfilePage />)

      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('displays placeholder when name is not set', () => {
      const userWithoutName = {
        ...mockUser,
        user_metadata: {},
      }

      ;(useAuth as jest.Mock).mockReturnValue({
        user: userWithoutName,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })

      render(<ProfilePage />)

      expect(screen.getByText(/not set/i)).toBeInTheDocument()
    })

    it('displays account creation date', () => {
      render(<ProfilePage />)

      // Should display formatted date
      expect(screen.getByText(/member since/i)).toBeInTheDocument()
      expect(screen.getByText(/january 1, 2024/i)).toBeInTheDocument()
    })

    it('shows edit profile button', () => {
      render(<ProfilePage />)

      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
    })

    it('shows change password button', () => {
      render(<ProfilePage />)

      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
    })
  })

  describe('Profile Edit Mode', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('switches to edit mode when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      expect(screen.getByRole('heading', { name: /edit profile/i })).toBeInTheDocument()
    })

    it('displays edit form with pre-populated name field', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      const nameInput = screen.getByLabelText(/name/i)
      expect(nameInput).toHaveValue('Test User')
    })

    it('displays email as read-only in edit mode', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    })

    it('allows user to update their name', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Name')

      expect(nameInput).toHaveValue('Updated Name')
    })

    it('shows save and cancel buttons in edit mode', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Profile Update Validation', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('validates name is not empty', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
    })

    it('validates name maximum length', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      const nameInput = screen.getByLabelText(/name/i)
      expect(nameInput).toHaveAttribute('maxLength', '50')
    })

    it('disables save button during submission', async () => {
      const user = userEvent.setup()
      // Make updateProfile resolve slowly to see loading state
      mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { user: mockUser }, error: null }), 100)))

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })
  })

  describe('Profile Update Success', () => {
    beforeEach(() => {
      mockUpdateProfile.mockResolvedValue({ data: { user: { ...mockUser, user_metadata: { name: 'New Name' } } }, error: null })
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('shows success message after successful update', async () => {
      const user = userEvent.setup()

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument()
      })
    })

    it('returns to view mode after successful update', async () => {
      const user = userEvent.setup()

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
      })
    })

    it('updates displayed name after successful save', async () => {
      const user = userEvent.setup()
      const updatedUser = { ...mockUser, user_metadata: { name: 'New Name' } }

      // Mock updateProfile to return updated user
      mockUpdateProfile.mockResolvedValue({ data: { user: updatedUser }, error: null })

      // Re-render after profile update by updating the mock
      let currentUser = mockUser
      ;(useAuth as jest.Mock).mockImplementation(() => ({
        user: currentUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: async (updates: any) => {
          const result = await mockUpdateProfile(updates)
          if (!result.error) {
            currentUser = result.data.user
          }
          return result
        },
      }))

      const { rerender } = render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(screen.getByText('New Name')).toBeInTheDocument()
      })
    })
  })

  describe('Profile Update Errors', () => {
    beforeEach(() => {
      mockUpdateProfile.mockResolvedValue({ data: null, error: { message: 'Update failed' } })
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('displays error message when update fails', async () => {
      const user = userEvent.setup()

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument()
      })
    })

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      mockUpdateProfile.mockRejectedValue(new Error('Network error'))

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument()
      })
    })

    it('stays in edit mode when update fails', async () => {
      const user = userEvent.setup()

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      })

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    })
  })

  describe('Profile Edit Cancel', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('returns to view mode when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
    })

    it('discards changes when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Changed Name')

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      // Should still show original name
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  describe('Password Change - Display', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('shows change password form when button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument()
    })

    it('displays current password field', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    })

    it('displays new password field', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    it('displays confirm password field', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    })

    it('shows password strength indicator', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByText(/password strength/i)).toBeInTheDocument()
    })
  })

  describe('Password Change - Validation', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('requires current password', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/current password is required/i)).toBeInTheDocument()
      })
    })

    it('requires new password minimum length', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      const newPasswordInput = screen.getByLabelText(/^new password$/i)
      expect(newPasswordInput).toHaveAttribute('minLength', '6')
    })

    it('validates new password is at least 6 characters', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), '12345')
      await user.type(screen.getByLabelText(/confirm new password/i), '12345')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        const errorMessages = screen.getAllByText(/password must be at least 6 characters/i)
        // Should find at least 2: helper text + error message
        expect(errorMessages.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('validates passwords match', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'different123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('shows weak password strength for short passwords', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/^new password$/i), '123456')

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })
    })

    it('shows strong password strength for complex passwords', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/^new password$/i), 'StrongP@ss123!')

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Change - Success', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('calls updatePassword with new password', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({ error: null })

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpass123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalledWith('newpass123')
      })
    })

    it('shows success message after password change', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({ error: null })

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpass123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument()
      })
    })

    it('clears password form after successful change', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({ error: null })

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpass123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/current password/i)).toHaveValue('')
      expect(screen.getByLabelText(/^new password$/i)).toHaveValue('')
      expect(screen.getByLabelText(/confirm new password/i)).toHaveValue('')
    })

    it('returns to profile view after successful password change', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({ error: null })

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpass123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      // Wait for success message first
      await waitFor(() => {
        expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument()
      })

      // Then wait for form to close (1 second timeout)
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })
  })

  describe('Password Change - Errors', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('shows error for incorrect current password', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({
        error: { message: 'Invalid current password' },
      })

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'wrongpass')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpass123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid current password/i)).toBeInTheDocument()
      })
    })

    it('handles network errors during password change', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockRejectedValue(new Error('Network error'))

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpass123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument()
      })
    })

    it('stays in password change mode after error', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockResolvedValue({
        error: { message: 'Password change failed' },
      })

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpass123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/password change failed/i)).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    })

    it('disables form during password update', async () => {
      const user = userEvent.setup()
      mockUpdatePassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'oldpass123')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass123')
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpass123')
      await user.click(screen.getByRole('button', { name: /update password/i }))

      expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled()
      expect(screen.getByLabelText(/current password/i)).toBeDisabled()
      expect(screen.getByLabelText(/^new password$/i)).toBeDisabled()
      expect(screen.getByLabelText(/confirm new password/i)).toBeDisabled()
    })
  })

  describe('Password Change - Cancel', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updatePassword: mockUpdatePassword,
        updateProfile: mockUpdateProfile,
      })
    })

    it('shows cancel button in password change form', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('returns to profile view when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
    })

    it('clears password form when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<ProfilePage />)

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await user.type(screen.getByLabelText(/current password/i), 'somepass')
      await user.type(screen.getByLabelText(/^new password$/i), 'newpass')
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      // Re-open password change form
      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByLabelText(/current password/i)).toHaveValue('')
      expect(screen.getByLabelText(/^new password$/i)).toHaveValue('')
    })
  })
})
