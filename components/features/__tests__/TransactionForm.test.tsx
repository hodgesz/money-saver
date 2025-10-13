import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionForm } from '../TransactionForm'
import type { Category } from '@/types'

// Mock category data
const mockCategories: Category[] = [
  {
    id: '1',
    user_id: 'user-1',
    name: 'Groceries',
    color: '#4CAF50',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '2',
    user_id: 'user-1',
    name: 'Transportation',
    color: '#2196F3',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '3',
    user_id: 'user-1',
    name: 'Entertainment',
    color: '#FF9800',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

describe('TransactionForm', () => {
  describe('Form Rendering', () => {
    it('renders all required form fields', () => {
      render(<TransactionForm categories={mockCategories} onSubmit={jest.fn()} />)

      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/merchant/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<TransactionForm categories={mockCategories} onSubmit={jest.fn()} />)

      expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument()
    })

    it('renders income/expense toggle', () => {
      render(<TransactionForm categories={mockCategories} onSubmit={jest.fn()} />)

      expect(screen.getByLabelText(/income/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/expense/i)).toBeInTheDocument()
    })

    it('renders categories in dropdown', () => {
      render(<TransactionForm categories={mockCategories} onSubmit={jest.fn()} />)

      const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement

      // Check for placeholder option
      expect(categorySelect).toHaveDisplayValue('Select a category')

      // Check that categories are available in the select
      mockCategories.forEach((category) => {
        expect(screen.getByRole('option', { name: category.name })).toBeInTheDocument()
      })
    })

    it('defaults to expense type', () => {
      render(<TransactionForm categories={mockCategories} onSubmit={jest.fn()} />)

      const expenseRadio = screen.getByLabelText(/expense/i) as HTMLInputElement
      expect(expenseRadio).toBeChecked()
    })

    it('defaults date to today', () => {
      render(<TransactionForm categories={mockCategories} onSubmit={jest.fn()} />)

      const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement
      const today = new Date().toISOString().split('T')[0]
      expect(dateInput.value).toBe(today)
    })
  })

  describe('Form Submission - Valid Data', () => {
    it('submits form with valid expense data', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Fill out the form
      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '45.99')

      await user.clear(screen.getByLabelText(/date/i))
      await user.type(screen.getByLabelText(/date/i), '2024-03-15')

      await user.selectOptions(screen.getByLabelText(/category/i), '1')

      await user.type(screen.getByLabelText(/description/i), 'Weekly groceries')
      await user.type(screen.getByLabelText(/merchant/i), 'Whole Foods')

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          amount: 45.99,
          date: '2024-03-15',
          category_id: '1',
          description: 'Weekly groceries',
          merchant: 'Whole Foods',
          is_income: false,
        })
      })
    })

    it('submits form with valid income data', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Switch to income
      await user.click(screen.getByLabelText(/income/i))

      // Fill out the form
      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '2500.00')

      await user.clear(screen.getByLabelText(/date/i))
      await user.type(screen.getByLabelText(/date/i), '2024-03-01')

      await user.selectOptions(screen.getByLabelText(/category/i), '1')

      await user.type(screen.getByLabelText(/description/i), 'Monthly salary')

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          amount: 2500.00,
          date: '2024-03-01',
          category_id: '1',
          description: 'Monthly salary',
          merchant: '',
          is_income: true,
        })
      })
    })

    it('submits form without optional merchant field', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '20.00')

      await user.clear(screen.getByLabelText(/date/i))
      await user.type(screen.getByLabelText(/date/i), '2024-03-10')

      await user.selectOptions(screen.getByLabelText(/category/i), '2')
      await user.type(screen.getByLabelText(/description/i), 'Bus fare')

      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          amount: 20.00,
          date: '2024-03-10',
          category_id: '2',
          description: 'Bus fare',
          merchant: '',
          is_income: false,
        })
      })
    })
  })

  describe('Form Validation', () => {
    it('shows error when amount is empty', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Clear amount and try to submit
      await user.clear(screen.getByLabelText(/amount/i))
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when amount is zero', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '0')
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount must be greater than 0/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when amount is negative', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '-50')
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount must be greater than 0/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when date is empty', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      await user.clear(screen.getByLabelText(/date/i))
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/date is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when category is not selected', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/amount/i), '50')
      await user.type(screen.getByLabelText(/description/i), 'Test')
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/category is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when description is empty', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/amount/i), '50')
      await user.selectOptions(screen.getByLabelText(/category/i), '1')
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows multiple validation errors at once', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Clear all fields
      await user.clear(screen.getByLabelText(/amount/i))
      await user.clear(screen.getByLabelText(/date/i))

      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
        expect(screen.getByText(/date is required/i)).toBeInTheDocument()
        expect(screen.getByText(/category is required/i)).toBeInTheDocument()
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('clears errors when user fixes invalid fields', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Trigger validation error
      await user.clear(screen.getByLabelText(/amount/i))
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
      })

      // Fix the error
      await user.type(screen.getByLabelText(/amount/i), '50')

      await waitFor(() => {
        expect(screen.queryByText(/amount is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Fill out form
      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '50')
      await user.selectOptions(screen.getByLabelText(/category/i), '1')
      await user.type(screen.getByLabelText(/description/i), 'Test')

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      // Should show loading state
      expect(screen.getByText(/adding.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
    })

    it('disables form fields during submission', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Fill out form
      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '50')
      await user.selectOptions(screen.getByLabelText(/category/i), '1')
      await user.type(screen.getByLabelText(/description/i), 'Test')

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      // Check that form fields are disabled
      expect(screen.getByLabelText(/amount/i)).toBeDisabled()
      expect(screen.getByLabelText(/date/i)).toBeDisabled()
      expect(screen.getByLabelText(/category/i)).toBeDisabled()
      expect(screen.getByLabelText(/description/i)).toBeDisabled()
      expect(screen.getByLabelText(/merchant/i)).toBeDisabled()
    })
  })

  describe('Form Reset', () => {
    it('resets form after successful submission', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockResolvedValue(undefined)

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Fill out form
      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '50')
      await user.selectOptions(screen.getByLabelText(/category/i), '1')
      await user.type(screen.getByLabelText(/description/i), 'Test transaction')
      await user.type(screen.getByLabelText(/merchant/i), 'Test Store')

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })

      // Form should be reset
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toHaveValue(null)
        expect(screen.getByLabelText(/category/i)).toHaveDisplayValue('Select a category')
        expect(screen.getByLabelText(/description/i)).toHaveValue('')
        expect(screen.getByLabelText(/merchant/i)).toHaveValue('')
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when submission fails', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockRejectedValue(new Error('Database error'))

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Fill out form
      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '50')
      await user.selectOptions(screen.getByLabelText(/category/i), '1')
      await user.type(screen.getByLabelText(/description/i), 'Test')

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to add transaction/i)).toBeInTheDocument()
      })
    })

    it('re-enables form after submission failure', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockRejectedValue(new Error('Database error'))

      render(<TransactionForm categories={mockCategories} onSubmit={onSubmit} />)

      // Fill out form
      await user.clear(screen.getByLabelText(/amount/i))
      await user.type(screen.getByLabelText(/amount/i), '50')
      await user.selectOptions(screen.getByLabelText(/category/i), '1')
      await user.type(screen.getByLabelText(/description/i), 'Test')

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/failed to add transaction/i)).toBeInTheDocument()
      })

      // Form should be re-enabled
      expect(screen.getByLabelText(/amount/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/category/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/description/i)).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /add transaction/i })).not.toBeDisabled()
    })
  })

  describe('No Categories Available', () => {
    it('shows message when no categories are available', () => {
      render(<TransactionForm categories={[]} onSubmit={jest.fn()} />)

      expect(screen.getByText(/no categories available/i)).toBeInTheDocument()
    })

    it('disables submit button when no categories are available', () => {
      render(<TransactionForm categories={[]} onSubmit={jest.fn()} />)

      expect(screen.getByRole('button', { name: /add transaction/i })).toBeDisabled()
    })
  })
})
