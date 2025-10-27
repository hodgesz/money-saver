import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetForm } from '../BudgetForm'
import type { Budget, Category } from '@/types'

// Mock categories for dropdown
const mockCategories: Category[] = [
  {
    id: 'cat-1',
    user_id: 'user-123',
    name: 'Groceries',
    color: '#10b981',
    icon: 'shopping-cart',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    user_id: 'user-123',
    name: 'Entertainment',
    color: '#8b5cf6',
    icon: 'film',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

// Mock existing budget for edit mode
const mockBudget: Budget = {
  id: '1',
  user_id: 'user-123',
  category_id: 'cat-1',
  amount: 500,
  period: 'monthly',
  start_date: '2024-01-01',
  end_date: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('BudgetForm', () => {
  describe('Form Rendering - Create Mode', () => {
    it('renders all form fields for creating new budget', () => {
      render(<BudgetForm onSubmit={jest.fn()} categories={mockCategories} />)

      expect(screen.getByLabelText(/category \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/amount \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/period \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/start date \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end date \(optional\)/i)).toBeInTheDocument()
    })

    it('renders submit button with "Add Budget" text', () => {
      render(<BudgetForm onSubmit={jest.fn()} categories={mockCategories} />)

      expect(screen.getByRole('button', { name: /add budget/i })).toBeInTheDocument()
    })

    it('shows all fields as empty or default in create mode', () => {
      render(<BudgetForm onSubmit={jest.fn()} categories={mockCategories} />)

      expect(screen.getByLabelText(/category \*/i)).toHaveValue('')
      expect(screen.getByLabelText(/amount \*/i)).toHaveValue(null)
      expect(screen.getByLabelText(/period \*/i)).toHaveValue('monthly') // Default period
      expect(screen.getByLabelText(/start date \*/i)).toHaveValue('')
      expect(screen.getByLabelText(/end date \(optional\)/i)).toHaveValue('')
    })

    it('renders category dropdown with all available categories', () => {
      render(<BudgetForm onSubmit={jest.fn()} categories={mockCategories} />)

      expect(screen.getByRole('option', { name: /groceries/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /entertainment/i })).toBeInTheDocument()
    })

    it('renders period dropdown with all period options', () => {
      render(<BudgetForm onSubmit={jest.fn()} categories={mockCategories} />)

      expect(screen.getByRole('option', { name: /daily/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /weekly/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /monthly/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /quarterly/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /yearly/i })).toBeInTheDocument()
    })
  })

  describe('Form Rendering - Edit Mode', () => {
    it('renders all form fields with existing budget data', () => {
      render(
        <BudgetForm
          onSubmit={jest.fn()}
          categories={mockCategories}
          budget={mockBudget}
        />
      )

      expect(screen.getByLabelText(/category \*/i)).toHaveValue('cat-1')
      expect(screen.getByLabelText(/amount \*/i)).toHaveValue(500)
      expect(screen.getByLabelText(/period \*/i)).toHaveValue('monthly')
      expect(screen.getByLabelText(/start date \*/i)).toHaveValue('2024-01-01')
      expect(screen.getByLabelText(/end date \(optional\)/i)).toHaveValue('')
    })

    it('renders submit button with "Update Budget" text in edit mode', () => {
      render(
        <BudgetForm
          onSubmit={jest.fn()}
          categories={mockCategories}
          budget={mockBudget}
        />
      )

      expect(screen.getByRole('button', { name: /update budget/i })).toBeInTheDocument()
    })

    it('renders cancel button in edit mode', () => {
      render(
        <BudgetForm
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
          categories={mockCategories}
          budget={mockBudget}
        />
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Form Submission - Valid Data', () => {
    it('submits form with valid data for new budget', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Fill out the form
      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.selectOptions(screen.getByLabelText(/period \*/i), 'monthly')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')

      // Submit
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          category_id: 'cat-1',
          amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: undefined,
        })
      })
    })

    it('submits form with end date when provided', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Fill out the form with end date
      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.selectOptions(screen.getByLabelText(/period \*/i), 'monthly')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')
      await user.type(screen.getByLabelText(/end date \(optional\)/i), '2024-12-31')

      // Submit
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          category_id: 'cat-1',
          amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        })
      })
    })

    it('submits form with updated data in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(
        <BudgetForm
          onSubmit={onSubmit}
          categories={mockCategories}
          budget={mockBudget}
        />
      )

      // Update the amount
      await user.clear(screen.getByLabelText(/amount \*/i))
      await user.type(screen.getByLabelText(/amount \*/i), '750')

      // Submit
      await user.click(screen.getByRole('button', { name: /update budget/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          category_id: 'cat-1',
          amount: 750,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: undefined,
        })
      })
    })

    it('submits with different period options', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-2')
      await user.type(screen.getByLabelText(/amount \*/i), '100')
      await user.selectOptions(screen.getByLabelText(/period \*/i), 'weekly')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')

      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          category_id: 'cat-2',
          amount: 100,
          period: 'weekly',
          start_date: '2024-01-01',
          end_date: undefined,
        })
      })
    })
  })

  describe('Form Validation', () => {
    it('shows error when category is not selected', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Try to submit without category
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(screen.getByText(/category is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when amount is empty', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when amount is zero', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '0')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount must be greater than zero/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when amount is negative', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')

      // Clear the field first, then type negative value
      const amountInput = screen.getByLabelText(/amount \*/i)
      await user.clear(amountInput)
      // Directly set the value to bypass browser validation for testing
      fireEvent.change(amountInput, { target: { value: '-100' } })

      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount must be greater than zero/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when start date is empty', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when end date is before start date', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-12-31')
      await user.type(screen.getByLabelText(/end date \(optional\)/i), '2024-01-01')
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('clears error when user fixes invalid field', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Trigger validation error
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(screen.getByText(/category is required/i)).toBeInTheDocument()
      })

      // Fix the error
      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')

      await waitFor(() => {
        expect(screen.queryByText(/category is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Fill out form
      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')

      // Submit
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      // Should show loading state
      expect(screen.getByText(/adding.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
    })

    it('shows correct loading text in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(
        <BudgetForm
          onSubmit={onSubmit}
          categories={mockCategories}
          budget={mockBudget}
        />
      )

      // Submit
      await user.click(screen.getByRole('button', { name: /update budget/i }))

      // Should show loading state
      expect(screen.getByText(/updating.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /updating.../i })).toBeDisabled()
    })

    it('disables form fields during submission', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Fill out form
      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')

      // Submit
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      // Check that form fields are disabled
      expect(screen.getByLabelText(/category \*/i)).toBeDisabled()
      expect(screen.getByLabelText(/amount \*/i)).toBeDisabled()
      expect(screen.getByLabelText(/period \*/i)).toBeDisabled()
      expect(screen.getByLabelText(/start date \*/i)).toBeDisabled()
      expect(screen.getByLabelText(/end date \(optional\)/i)).toBeDisabled()
    })
  })

  describe('Form Reset', () => {
    it('resets form after successful submission in create mode', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockResolvedValue(undefined)

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Fill out form
      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')

      // Submit
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })

      // Form should be reset
      await waitFor(() => {
        expect(screen.getByLabelText(/category \*/i)).toHaveValue('')
        expect(screen.getByLabelText(/amount \*/i)).toHaveValue(null)
        expect(screen.getByLabelText(/start date \*/i)).toHaveValue('')
      })
    })

    it('does not reset form after successful submission in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockResolvedValue(undefined)

      render(
        <BudgetForm
          onSubmit={onSubmit}
          categories={mockCategories}
          budget={mockBudget}
        />
      )

      // Update amount
      await user.clear(screen.getByLabelText(/amount \*/i))
      await user.type(screen.getByLabelText(/amount \*/i), '750')

      // Submit
      await user.click(screen.getByRole('button', { name: /update budget/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })

      // Form should still have the updated data (not reset)
      expect(screen.getByLabelText(/amount \*/i)).toHaveValue(750)
    })
  })

  describe('Error Handling', () => {
    it('displays error message when submission fails', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockRejectedValue(new Error('Database error'))

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Fill out form
      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')

      // Submit
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to save budget/i)).toBeInTheDocument()
      })
    })

    it('re-enables form after submission failure', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockRejectedValue(new Error('Database error'))

      render(<BudgetForm onSubmit={onSubmit} categories={mockCategories} />)

      // Fill out form
      await user.selectOptions(screen.getByLabelText(/category \*/i), 'cat-1')
      await user.type(screen.getByLabelText(/amount \*/i), '500')
      await user.type(screen.getByLabelText(/start date \*/i), '2024-01-01')

      // Submit
      await user.click(screen.getByRole('button', { name: /add budget/i }))

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/failed to save budget/i)).toBeInTheDocument()
      })

      // Form should be re-enabled
      expect(screen.getByLabelText(/category \*/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/amount \*/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/period \*/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/start date \*/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/end date \(optional\)/i)).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /add budget/i })).not.toBeDisabled()
    })
  })

  describe('Cancel Button', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = jest.fn()

      render(
        <BudgetForm
          onSubmit={jest.fn()}
          onCancel={onCancel}
          categories={mockCategories}
          budget={mockBudget}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalled()
    })

    it('does not call onSubmit when cancel is clicked', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      const onCancel = jest.fn()

      render(
        <BudgetForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          categories={mockCategories}
          budget={mockBudget}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onSubmit).not.toHaveBeenCalled()
      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Empty Categories Handling', () => {
    it('shows message when no categories are available', () => {
      render(<BudgetForm onSubmit={jest.fn()} categories={[]} />)

      expect(screen.getByText(/no categories available/i)).toBeInTheDocument()
    })

    it('disables form when no categories are available', () => {
      render(<BudgetForm onSubmit={jest.fn()} categories={[]} />)

      // When no categories, form doesn't render - only message is shown
      expect(screen.queryByLabelText(/category \*/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /add budget/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible labels for all form fields', () => {
      render(<BudgetForm onSubmit={jest.fn()} categories={mockCategories} />)

      expect(screen.getByLabelText(/category \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/amount \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/period \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/start date \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end date \(optional\)/i)).toBeInTheDocument()
    })

    it('associates error messages with inputs', async () => {
      const user = userEvent.setup()
      render(<BudgetForm onSubmit={jest.fn()} categories={mockCategories} />)

      await user.click(screen.getByRole('button', { name: /add budget/i }))

      await waitFor(() => {
        const categorySelect = screen.getByLabelText(/category \*/i)
        const errorMessage = screen.getByText(/category is required/i)

        expect(categorySelect).toHaveAccessibleDescription(/category is required/i)
      })
    })
  })
})
