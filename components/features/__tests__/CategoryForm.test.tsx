import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryForm } from '../CategoryForm'
import type { Category } from '@/types'

// Mock existing category for edit mode
const mockCategory: Category = {
  id: '1',
  user_id: 'user-123',
  name: 'Entertainment',
  color: '#8b5cf6',
  icon: 'film',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('CategoryForm', () => {
  describe('Form Rendering - Create Mode', () => {
    it('renders all form fields for creating new category', () => {
      render(<CategoryForm onSubmit={jest.fn()} />)

      expect(screen.getByLabelText(/category name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^color$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/icon \(optional\)/i)).toBeInTheDocument()
    })

    it('renders submit button with "Add Category" text', () => {
      render(<CategoryForm onSubmit={jest.fn()} />)

      expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument()
    })

    it('shows all fields as empty in create mode', () => {
      render(<CategoryForm onSubmit={jest.fn()} />)

      expect(screen.getByLabelText(/category name/i)).toHaveValue('')
      expect(screen.getByLabelText(/^color$/i)).toHaveValue('#3b82f6') // Default color
      expect(screen.getByLabelText(/icon \(optional\)/i)).toHaveValue('')
    })
  })

  describe('Form Rendering - Edit Mode', () => {
    it('renders all form fields with existing category data', () => {
      render(<CategoryForm onSubmit={jest.fn()} category={mockCategory} />)

      expect(screen.getByLabelText(/category name/i)).toHaveValue('Entertainment')
      expect(screen.getByLabelText(/^color$/i)).toHaveValue('#8b5cf6')
      expect(screen.getByLabelText(/icon \(optional\)/i)).toHaveValue('film')
    })

    it('renders submit button with "Update Category" text in edit mode', () => {
      render(<CategoryForm onSubmit={jest.fn()} category={mockCategory} />)

      expect(screen.getByRole('button', { name: /update category/i })).toBeInTheDocument()
    })

    it('renders cancel button in edit mode', () => {
      render(<CategoryForm onSubmit={jest.fn()} onCancel={jest.fn()} category={mockCategory} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Form Submission - Valid Data', () => {
    it('submits form with valid data for new category', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} />)

      // Fill out the form
      await user.type(screen.getByLabelText(/category name/i), 'Groceries')

      // For color input, fireEvent is appropriate as color inputs don't support keyboard input
      const colorInput = screen.getByLabelText(/^color$/i)
      fireEvent.change(colorInput, { target: { value: '#10b981' } })

      await user.type(screen.getByLabelText(/icon \(optional\)/i), 'shopping-cart')

      // Submit
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'Groceries',
          color: '#10b981',
          icon: 'shopping-cart',
        })
      })
    })

    it('submits form with only name (optional fields empty)', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} />)

      // Fill out only required field
      await user.type(screen.getByLabelText(/category name/i), 'Transportation')

      // Submit
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'Transportation',
          color: '#3b82f6', // Default color
          icon: '',
        })
      })
    })

    it('submits form with updated data in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} category={mockCategory} />)

      // Update the name
      await user.clear(screen.getByLabelText(/category name/i))
      await user.type(screen.getByLabelText(/category name/i), 'Fun & Entertainment')

      // Submit
      await user.click(screen.getByRole('button', { name: /update category/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'Fun & Entertainment',
          color: '#8b5cf6',
          icon: 'film',
        })
      })
    })
  })

  describe('Form Validation', () => {
    it('shows error when name is empty', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} />)

      // Try to submit without name
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(screen.getByText(/category name is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when name is only whitespace', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/category name/i), '   ')
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(screen.getByText(/category name is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when name exceeds maximum length', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} />)

      // Type a very long name (> 50 characters)
      const longName = 'A'.repeat(51)
      await user.type(screen.getByLabelText(/category name/i), longName)
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(screen.getByText(/category name must be 50 characters or less/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('clears error when user fixes invalid field', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} />)

      // Trigger validation error
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(screen.getByText(/category name is required/i)).toBeInTheDocument()
      })

      // Fix the error
      await user.type(screen.getByLabelText(/category name/i), 'Groceries')

      await waitFor(() => {
        expect(screen.queryByText(/category name is required/i)).not.toBeInTheDocument()
      })
    })

    it('accepts valid hex color format', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/category name/i), 'Test')

      // Valid color should be accepted
      const colorInput = screen.getByLabelText(/^color$/i)
      fireEvent.change(colorInput, { target: { value: '#ff5733' } })

      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'Test',
          color: '#ff5733',
          icon: '',
        })
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<CategoryForm onSubmit={onSubmit} />)

      // Fill out form
      await user.type(screen.getByLabelText(/category name/i), 'Groceries')

      // Submit
      await user.click(screen.getByRole('button', { name: /add category/i }))

      // Should show loading state
      expect(screen.getByText(/adding.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
    })

    it('shows correct loading text in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<CategoryForm onSubmit={onSubmit} category={mockCategory} />)

      // Submit
      await user.click(screen.getByRole('button', { name: /update category/i }))

      // Should show loading state
      expect(screen.getByText(/updating.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /updating.../i })).toBeDisabled()
    })

    it('disables form fields during submission', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<CategoryForm onSubmit={onSubmit} />)

      // Fill out form
      await user.type(screen.getByLabelText(/category name/i), 'Groceries')

      // Submit
      await user.click(screen.getByRole('button', { name: /add category/i }))

      // Check that form fields are disabled
      expect(screen.getByLabelText(/category name/i)).toBeDisabled()
      expect(screen.getByLabelText(/^color$/i)).toBeDisabled()
      expect(screen.getByLabelText(/icon \(optional\)/i)).toBeDisabled()
    })
  })

  describe('Form Reset', () => {
    it('resets form after successful submission in create mode', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockResolvedValue(undefined)

      render(<CategoryForm onSubmit={onSubmit} />)

      // Fill out form
      await user.type(screen.getByLabelText(/category name/i), 'Groceries')
      await user.type(screen.getByLabelText(/icon \(optional\)/i), 'shopping-cart')

      // Submit
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })

      // Form should be reset
      await waitFor(() => {
        expect(screen.getByLabelText(/category name/i)).toHaveValue('')
        expect(screen.getByLabelText(/icon \(optional\)/i)).toHaveValue('')
      })
    })

    it('does not reset form after successful submission in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockResolvedValue(undefined)

      render(<CategoryForm onSubmit={onSubmit} category={mockCategory} />)

      // Update the name
      await user.clear(screen.getByLabelText(/category name/i))
      await user.type(screen.getByLabelText(/category name/i), 'Updated Name')

      // Submit
      await user.click(screen.getByRole('button', { name: /update category/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })

      // Form should still have the updated data (not reset)
      expect(screen.getByLabelText(/category name/i)).toHaveValue('Updated Name')
    })
  })

  describe('Error Handling', () => {
    it('displays error message when submission fails', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockRejectedValue(new Error('Database error'))

      render(<CategoryForm onSubmit={onSubmit} />)

      // Fill out form
      await user.type(screen.getByLabelText(/category name/i), 'Groceries')

      // Submit
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to save category/i)).toBeInTheDocument()
      })
    })

    it('re-enables form after submission failure', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockRejectedValue(new Error('Database error'))

      render(<CategoryForm onSubmit={onSubmit} />)

      // Fill out form
      await user.type(screen.getByLabelText(/category name/i), 'Groceries')

      // Submit
      await user.click(screen.getByRole('button', { name: /add category/i }))

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/failed to save category/i)).toBeInTheDocument()
      })

      // Form should be re-enabled
      expect(screen.getByLabelText(/category name/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/^color$/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/icon \(optional\)/i)).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /add category/i })).not.toBeDisabled()
    })
  })

  describe('Cancel Button', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = jest.fn()

      render(<CategoryForm onSubmit={jest.fn()} onCancel={onCancel} category={mockCategory} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalled()
    })

    it('does not call onSubmit when cancel is clicked', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      const onCancel = jest.fn()

      render(<CategoryForm onSubmit={onSubmit} onCancel={onCancel} category={mockCategory} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onSubmit).not.toHaveBeenCalled()
      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Color Picker', () => {
    it('renders color input with type="color"', () => {
      render(<CategoryForm onSubmit={jest.fn()} />)

      const colorInput = screen.getByLabelText(/^color$/i)
      expect(colorInput).toHaveAttribute('type', 'color')
    })

    it('shows color preview', () => {
      const { container } = render(<CategoryForm onSubmit={jest.fn()} category={mockCategory} />)

      const colorPreview = container.querySelector('[data-testid="color-preview"]')
      expect(colorPreview).toBeInTheDocument()
      expect(colorPreview).toHaveStyle({ backgroundColor: '#8b5cf6' })
    })

    it('updates color preview when color changes', async () => {
      const user = userEvent.setup()
      const { container } = render(<CategoryForm onSubmit={jest.fn()} />)

      const colorInput = screen.getByLabelText(/^color$/i)
      fireEvent.change(colorInput, { target: { value: '#10b981' } })

      await waitFor(() => {
        const colorPreview = container.querySelector('[data-testid="color-preview"]')
        expect(colorPreview).toHaveStyle({ backgroundColor: 'rgb(16, 185, 129)' })
      })
    })
  })

  describe('Accessibility', () => {
    it('has accessible labels for all form fields', () => {
      render(<CategoryForm onSubmit={jest.fn()} />)

      expect(screen.getByLabelText(/category name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^color$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/icon \(optional\)/i)).toBeInTheDocument()
    })

    it('associates error messages with inputs', async () => {
      const user = userEvent.setup()
      render(<CategoryForm onSubmit={jest.fn()} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/category name/i)
        const errorMessage = screen.getByText(/category name is required/i)

        expect(nameInput).toHaveAccessibleDescription(/category name is required/i)
      })
    })
  })
})
