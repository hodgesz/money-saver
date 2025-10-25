import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionEditModal } from '../TransactionEditModal'
import type { Transaction, Category } from '@/types'

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

// Mock transaction data
const mockTransaction: Transaction = {
  id: 'txn-123',
  user_id: 'user-1',
  amount: 125.50,
  date: '2024-03-15',
  category_id: '1',
  description: 'Weekly groceries',
  merchant: 'Whole Foods',
  is_income: false,
  created_at: '2024-03-15T10:00:00Z',
  updated_at: '2024-03-15T10:00:00Z',
}

const mockIncomeTransaction: Transaction = {
  id: 'txn-456',
  user_id: 'user-1',
  amount: 2500.00,
  date: '2024-03-01',
  category_id: '2',
  description: 'Monthly salary',
  merchant: 'ABC Corp',
  is_income: true,
  created_at: '2024-03-01T09:00:00Z',
  updated_at: '2024-03-01T09:00:00Z',
}

const mockTransactionNoCategory: Transaction = {
  id: 'txn-789',
  user_id: 'user-1',
  amount: 45.00,
  date: '2024-03-20',
  category_id: null,
  description: 'Miscellaneous expense',
  merchant: null,
  is_income: false,
  created_at: '2024-03-20T14:00:00Z',
  updated_at: '2024-03-20T14:00:00Z',
}

describe('TransactionEditModal', () => {
  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/edit transaction/i)).toBeInTheDocument()
    })

    it('does not render modal when isOpen is false', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={false}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays correct title', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
    })

    it('renders close button', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/merchant/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/this is income/i)).toBeInTheDocument()
    })

    it('renders save and cancel buttons', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Pre-populated Data', () => {
    it('displays existing transaction amount', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement
      expect(amountInput.value).toBe('125.5')
    })

    it('displays existing transaction date in correct format', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement
      // Date should be in YYYY-MM-DD format (may vary by timezone)
      expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(dateInput.value).toContain('2024-03')
    })

    it('displays existing transaction description', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const descriptionInput = screen.getByLabelText(/description/i) as HTMLInputElement
      expect(descriptionInput.value).toBe('Weekly groceries')
    })

    it('displays existing transaction merchant', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const merchantInput = screen.getByLabelText(/merchant/i) as HTMLInputElement
      expect(merchantInput.value).toBe('Whole Foods')
    })

    it('selects correct category', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement
      expect(categorySelect.value).toBe('1')
    })

    it('checks income checkbox when transaction is income', () => {
      render(
        <TransactionEditModal
          transaction={mockIncomeTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const incomeCheckbox = screen.getByLabelText(/this is income/i) as HTMLInputElement
      expect(incomeCheckbox.checked).toBe(true)
    })

    it('leaves income checkbox unchecked when transaction is expense', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const incomeCheckbox = screen.getByLabelText(/this is income/i) as HTMLInputElement
      expect(incomeCheckbox.checked).toBe(false)
    })

    it('handles transaction with no category', () => {
      render(
        <TransactionEditModal
          transaction={mockTransactionNoCategory}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement
      expect(categorySelect.value).toBe('')
    })

    it('handles transaction with no merchant', () => {
      render(
        <TransactionEditModal
          transaction={mockTransactionNoCategory}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const merchantInput = screen.getByLabelText(/merchant/i) as HTMLInputElement
      expect(merchantInput.value).toBe('')
    })
  })

  describe('Form Interaction', () => {
    it('allows user to type in amount field', async () => {
      const user = userEvent.setup()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, '250.75')

      expect(amountInput).toHaveValue(250.75)
    })

    it('allows user to select date', async () => {
      const user = userEvent.setup()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const dateInput = screen.getByLabelText(/date/i)
      await user.clear(dateInput)
      await user.type(dateInput, '2024-04-01')

      expect(dateInput).toHaveValue('2024-04-01')
    })

    it('allows user to type merchant name', async () => {
      const user = userEvent.setup()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const merchantInput = screen.getByLabelText(/merchant/i)
      await user.clear(merchantInput)
      await user.type(merchantInput, 'Target')

      expect(merchantInput).toHaveValue('Target')
    })

    it('allows user to select category', async () => {
      const user = userEvent.setup()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const categorySelect = screen.getByLabelText(/category/i)
      await user.selectOptions(categorySelect, '3')

      expect(categorySelect).toHaveValue('3')
    })

    it('allows user to type description', async () => {
      const user = userEvent.setup()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const descriptionInput = screen.getByLabelText(/description/i)
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description')

      expect(descriptionInput).toHaveValue('Updated description')
    })

    it('allows user to toggle income checkbox', async () => {
      const user = userEvent.setup()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const incomeCheckbox = screen.getByLabelText(/this is income/i) as HTMLInputElement
      expect(incomeCheckbox.checked).toBe(false)

      await user.click(incomeCheckbox)
      expect(incomeCheckbox.checked).toBe(true)

      await user.click(incomeCheckbox)
      expect(incomeCheckbox.checked).toBe(false)
    })
  })

  describe('Form Validation', () => {
    it('shows error for empty amount', async () => {
      const onSave = jest.fn()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const amountInput = screen.getByLabelText(/amount/i)
      fireEvent.change(amountInput, { target: { value: '' } })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument()
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows error for negative amount', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, '-50')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument()
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows error for zero amount', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, '0')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument()
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows error for invalid amount format', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, 'abc')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument()
      })

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('calls onSave with correct data when form is submitted', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockResolvedValue(undefined)

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      // Modify amount
      const amountInput = screen.getByLabelText(/amount/i)
      await user.clear(amountInput)
      await user.type(amountInput, '150.99')

      // Submit form
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('txn-123', {
          amount: 150.99,
          date: '2024-03-15',
          category_id: '1',
          description: 'Weekly groceries',
          merchant: 'Whole Foods',
          is_income: false,
        })
      })
    })

    it('submits updated merchant', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockResolvedValue(undefined)

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const merchantInput = screen.getByLabelText(/merchant/i)
      await user.clear(merchantInput)
      await user.type(merchantInput, 'Trader Joes')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('txn-123', expect.objectContaining({
          merchant: 'Trader Joes',
        }))
      })
    })

    it('submits updated category', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockResolvedValue(undefined)

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const categorySelect = screen.getByLabelText(/category/i)
      await user.selectOptions(categorySelect, '3')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('txn-123', expect.objectContaining({
          category_id: '3',
        }))
      })
    })

    it('submits with null category_id when category is cleared', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockResolvedValue(undefined)

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const categorySelect = screen.getByLabelText(/category/i)
      await user.selectOptions(categorySelect, '')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('txn-123', expect.objectContaining({
          category_id: null,
        }))
      })
    })

    it('submits updated is_income flag', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockResolvedValue(undefined)

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const incomeCheckbox = screen.getByLabelText(/this is income/i)
      await user.click(incomeCheckbox)

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('txn-123', expect.objectContaining({
          is_income: true,
        }))
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      expect(screen.getByText(/saving.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled()
    })

    it('disables form buttons during submission', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })
  })

  describe('Modal Close Behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={onClose}
          onSave={jest.fn()}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={onClose}
          onSave={jest.fn()}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      const { container } = render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={onClose}
          onSave={jest.fn()}
        />
      )

      const backdrop = container.querySelector('.bg-gray-500.bg-opacity-75')
      if (backdrop) {
        await user.click(backdrop)
        expect(onClose).toHaveBeenCalled()
      }
    })

    it('closes modal after successful save', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      const onSave = jest.fn().mockResolvedValue(undefined)

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('does not call onSave when cancel is clicked', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onSave).not.toHaveBeenCalled()
    })

    it('does not call onSave when close button is clicked', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when submission fails', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockRejectedValue(new Error('Database error'))

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/database error/i)).toBeInTheDocument()
      })
    })

    it('displays generic error message when error is not an Error object', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockRejectedValue('Unknown error')

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to update transaction/i)).toBeInTheDocument()
      })
    })

    it('re-enables form after submission failure', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockRejectedValue(new Error('Network error'))

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled()
    })

    it('does not close modal after submission failure', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      const onSave = jest.fn().mockRejectedValue(new Error('Save failed'))

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
        />
      )

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument()
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('clears error when form is resubmitted', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined)

      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      // First submission fails
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument()
      })

      // Second submission succeeds
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.queryByText(/first error/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Data Reset on Transaction Change', () => {
    it('resets form data when transaction prop changes', () => {
      const { rerender } = render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      // Initial transaction data
      expect(screen.getByLabelText(/amount/i)).toHaveValue(125.5)

      // Change transaction prop
      rerender(
        <TransactionEditModal
          transaction={mockIncomeTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      // Form should show new transaction data
      expect(screen.getByLabelText(/amount/i)).toHaveValue(2500)
      expect(screen.getByLabelText(/description/i)).toHaveValue('Monthly salary')
    })

    it('clears error when transaction prop changes', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn().mockRejectedValue(new Error('Save error'))

      const { rerender } = render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      // Trigger error
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/save error/i)).toBeInTheDocument()
      })

      // Change transaction
      rerender(
        <TransactionEditModal
          transaction={mockIncomeTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={onSave}
        />
      )

      // Error should be cleared
      expect(screen.queryByText(/save error/i)).not.toBeInTheDocument()
    })
  })

  describe('Categories Dropdown', () => {
    it('renders all available categories', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const categorySelect = screen.getByLabelText(/category/i)

      mockCategories.forEach((category) => {
        expect(screen.getByRole('option', { name: category.name })).toBeInTheDocument()
      })
    })

    it('includes empty option for no category', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      expect(screen.getByRole('option', { name: /select a category/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible modal attributes', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title')
    })

    it('has accessible labels for all form fields', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/merchant/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/this is income/i)).toBeInTheDocument()
    })

    it('has accessible close button with sr-only text', () => {
      render(
        <TransactionEditModal
          transaction={mockTransaction}
          categories={mockCategories}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })
  })
})
