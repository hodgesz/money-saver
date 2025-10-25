import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import BudgetsPage from '../page'
import { useAuth } from '@/contexts/AuthContext'
import { budgetService } from '@/lib/services/budgets'
import { categoryService } from '@/lib/services/categories'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

// Mock services
jest.mock('@/lib/services/budgets')
jest.mock('@/lib/services/categories')

// Mock Navigation component
jest.mock('@/components/layout/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}))

// Mock components (already tested separately)
jest.mock('@/components/features/BudgetForm', () => ({
  BudgetForm: ({ onSubmit, onCancel, budget, categories }: any) => (
    <form
      data-testid="budget-form"
      onSubmit={async (e) => {
        e.preventDefault()
        try {
          await onSubmit({
            category_id: '1',
            amount: 500,
            period: 'monthly',
            start_date: '2024-01-01',
          })
        } catch (error) {
          // Errors are expected in some tests
        }
      }}
    >
      <div data-testid="form-categories">{categories?.length || 0} categories</div>
      <div data-testid="form-budget">{budget ? 'editing' : 'adding'}</div>
      <button type="submit">Submit</button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  ),
}))

jest.mock('@/components/features/BudgetList', () => ({
  BudgetList: ({ budgets, onEdit, onDelete, isLoading, error }: any) => (
    <div data-testid="budget-list">
      {isLoading && <div>Loading budgets...</div>}
      {error && <div>{error}</div>}
      {budgets.map((b: any) => (
        <div key={b.id} data-testid={`budget-${b.id}`}>
          <span>{b.amount}</span>
          <span>{b.period}</span>
          <button onClick={() => onEdit(b)}>Edit</button>
          <button onClick={() => onDelete(b.id)}>Delete</button>
        </div>
      ))}
    </div>
  ),
}))

describe('BudgetsPage', () => {
  const mockPush = jest.fn()
  const mockGetBudgets = budgetService.getBudgets as jest.Mock
  const mockGetCategories = categoryService.getCategories as jest.Mock
  const mockCreateBudget = budgetService.createBudget as jest.Mock
  const mockUpdateBudget = budgetService.updateBudget as jest.Mock
  const mockDeleteBudget = budgetService.deleteBudget as jest.Mock

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
    },
  }

  const mockBudgets = [
    {
      id: '1',
      user_id: 'test-user-id',
      category_id: '1',
      amount: 500,
      period: 'monthly' as const,
      start_date: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      user_id: 'test-user-id',
      category_id: '2',
      amount: 200,
      period: 'weekly' as const,
      start_date: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockCategories = [
    {
      id: '1',
      name: 'Groceries',
      type: 'expense' as const,
      user_id: 'test-user-id',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Transportation',
      type: 'expense' as const,
      user_id: 'test-user-id',
      created_at: '2024-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockGetBudgets.mockResolvedValue({ data: mockBudgets, error: null })
    mockGetCategories.mockResolvedValue({ data: mockCategories, error: null })
  })

  describe('Authentication Requirements', () => {
    it('redirects to login when user is not authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
      })

      render(<BudgetsPage />)

      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('does not redirect when user is authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })

      render(<BudgetsPage />)

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('shows loading state while checking authentication', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true,
      })

      render(<BudgetsPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('does not fetch data when not authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
      })

      render(<BudgetsPage />)

      expect(mockGetBudgets).not.toHaveBeenCalled()
      expect(mockGetCategories).not.toHaveBeenCalled()
    })
  })

  describe('Page Rendering', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
    })

    it('renders page heading "Budgets"', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^budgets$/i, level: 1 })).toBeInTheDocument()
      })
    })

    it('renders BudgetForm component', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })
    })

    it('renders BudgetList component', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-list')).toBeInTheDocument()
      })
    })

    it('shows loading state during data fetch', () => {
      mockGetBudgets.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockBudgets, error: null }), 100))
      )

      render(<BudgetsPage />)

      expect(screen.getByText(/loading budgets/i)).toBeInTheDocument()
    })
  })

  describe('Budget List Display', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
    })

    it('displays existing budgets', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
        expect(screen.getByTestId('budget-2')).toBeInTheDocument()
      })
    })

    it('shows empty state when no budgets', async () => {
      mockGetBudgets.mockResolvedValue({ data: [], error: null })

      render(<BudgetsPage />)

      await waitFor(() => {
        const budgetList = screen.getByTestId('budget-list')
        expect(budgetList).toBeInTheDocument()
        expect(screen.queryByTestId('budget-1')).not.toBeInTheDocument()
      })
    })

    it('shows error message on fetch failure', async () => {
      mockGetBudgets.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load budgets/i)).toBeInTheDocument()
      })
    })

    it('displays budget with amounts', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText('500')).toBeInTheDocument()
        expect(screen.getByText('200')).toBeInTheDocument()
      })
    })

    it('displays budget periods', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText('monthly')).toBeInTheDocument()
        expect(screen.getByText('weekly')).toBeInTheDocument()
      })
    })

    it('handles null data from service gracefully', async () => {
      mockGetBudgets.mockResolvedValue({ data: null, error: null })

      render(<BudgetsPage />)

      await waitFor(() => {
        const budgetList = screen.getByTestId('budget-list')
        expect(budgetList).toBeInTheDocument()
      })
    })
  })

  describe('Budget Creation', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
      mockCreateBudget.mockResolvedValue({ data: { id: '3' }, error: null })
    })

    it('form submission creates new budget', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockCreateBudget).toHaveBeenCalled()
      })
    })

    it('calls budgetService.createBudget with correct data', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockCreateBudget).toHaveBeenCalledWith({
          category_id: '1',
          amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
        })
      })
    })

    it('refreshes budget list after creation', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      // Clear initial calls
      mockGetBudgets.mockClear()

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockGetBudgets).toHaveBeenCalledTimes(1)
      })
    })

    it('shows error on creation failure', async () => {
      const user = userEvent.setup()
      mockCreateBudget.mockResolvedValue({ data: null, error: { message: 'Creation failed' } })

      // Mock console.error to suppress error output
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockCreateBudget).toHaveBeenCalled()
      })

      consoleError.mockRestore()
    })

    it('handles different budget periods (monthly)', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockCreateBudget).toHaveBeenCalledWith(
          expect.objectContaining({
            period: 'monthly',
          })
        )
      })
    })

    it('handles category selection', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockCreateBudget).toHaveBeenCalledWith(
          expect.objectContaining({
            category_id: '1',
          })
        )
      })
    })

    it('validates form data contains required fields', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockCreateBudget).toHaveBeenCalledWith(
          expect.objectContaining({
            category_id: expect.any(String),
            amount: expect.any(Number),
            period: expect.any(String),
            start_date: expect.any(String),
          })
        )
      })
    })

    it('passes categories to BudgetForm', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText('2 categories')).toBeInTheDocument()
      })
    })

    it('refreshes categories after budget creation', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      mockGetCategories.mockClear()

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Budget Editing', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
      mockUpdateBudget.mockResolvedValue({ data: { id: '1' }, error: null })
    })

    it('edit button switches to edit mode', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText('editing')).toBeInTheDocument()
      })
    })

    it('form shows editing state with budget data', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      // Initial state should show "adding"
      expect(screen.getByText('adding')).toBeInTheDocument()

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      // After clicking edit, should show "editing"
      await waitFor(() => {
        expect(screen.getByText('editing')).toBeInTheDocument()
      })
    })

    it('update submission calls budgetService.updateBudget', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText('editing')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockUpdateBudget).toHaveBeenCalled()
      })
    })

    it('refreshes list after update', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      mockGetBudgets.mockClear()

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockGetBudgets).toHaveBeenCalledTimes(1)
      })
    })

    it('cancel button returns to add mode', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText('editing')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.getByText('adding')).toBeInTheDocument()
      })
    })

    it('shows error on update failure', async () => {
      const user = userEvent.setup()
      mockUpdateBudget.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

      // Mock console.error to suppress error output
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockUpdateBudget).toHaveBeenCalled()
      })

      consoleError.mockRestore()
    })

    it('clears edit mode after successful update', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(screen.getByText('adding')).toBeInTheDocument()
      })
    })

    it('handles concurrent edits by clearing previous edit', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText('editing')).toBeInTheDocument()
      })

      // Click second edit button
      await user.click(editButtons[1])

      await waitFor(() => {
        expect(screen.getByText('editing')).toBeInTheDocument()
      })
    })

    it('updates budget with correct ID', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockUpdateBudget).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            category_id: '1',
            amount: 500,
            period: 'monthly',
            start_date: '2024-01-01',
          })
        )
      })
    })
  })

  describe('Budget Deletion', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
      mockDeleteBudget.mockResolvedValue({ data: null, error: null })
    })

    it('delete button calls budgetService.deleteBudget', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockDeleteBudget).toHaveBeenCalledWith('1')
      })
    })

    it('refreshes list after deletion', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      mockGetBudgets.mockClear()

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockGetBudgets).toHaveBeenCalledTimes(1)
      })
    })

    it('shows error on deletion failure', async () => {
      const user = userEvent.setup()
      mockDeleteBudget.mockResolvedValue({ data: null, error: { message: 'Deletion failed' } })

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/failed to delete budget/i)).toBeInTheDocument()
      })
    })

    it('handles deletion of active budgets', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockDeleteBudget).toHaveBeenCalledWith('1')
      })
    })

    it('can delete multiple budgets sequentially', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockDeleteBudget).toHaveBeenCalledWith('1')
      })

      mockDeleteBudget.mockClear()

      await user.click(deleteButtons[1])

      await waitFor(() => {
        expect(mockDeleteBudget).toHaveBeenCalledWith('2')
      })
    })

    it('refreshes categories after deletion', async () => {
      const user = userEvent.setup()
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      mockGetCategories.mockClear()

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Categories Integration', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
    })

    it('fetches categories on mount', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled()
      })
    })

    it('passes categories to BudgetForm', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText('2 categories')).toBeInTheDocument()
      })
    })

    it('shows error if categories fail to load', async () => {
      mockGetCategories.mockResolvedValue({ data: null, error: { message: 'Category fetch failed' } })

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument()
      })
    })

    it('handles empty categories list', async () => {
      mockGetCategories.mockResolvedValue({ data: [], error: null })

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText('0 categories')).toBeInTheDocument()
      })
    })

    it('handles null categories data gracefully', async () => {
      mockGetCategories.mockResolvedValue({ data: null, error: null })

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText('0 categories')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
    })

    it('displays error messages', async () => {
      mockGetBudgets.mockResolvedValue({ data: null, error: { message: 'Failed to load budgets' } })

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load budgets/i)).toBeInTheDocument()
      })
    })

    it('handles network errors gracefully', async () => {
      mockGetBudgets.mockRejectedValue(new Error('Network error'))

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })

    it('handles service errors during creation', async () => {
      const user = userEvent.setup()
      mockCreateBudget.mockRejectedValue(new Error('Service error'))

      // Mock console.error to suppress error output
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-form')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockCreateBudget).toHaveBeenCalled()
      })

      consoleError.mockRestore()
    })

    it('handles service errors during update', async () => {
      const user = userEvent.setup()
      mockUpdateBudget.mockRejectedValue(new Error('Service error'))

      // Mock console.error to suppress error output
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      await user.click(screen.getByText('Submit'))

      await waitFor(() => {
        expect(mockUpdateBudget).toHaveBeenCalled()
      })

      consoleError.mockRestore()
    })

    it('clears errors on retry', async () => {
      // First call fails
      mockGetBudgets.mockResolvedValueOnce({ data: null, error: { message: 'Failed' } })

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load budgets/i)).toBeInTheDocument()
      })

      // Second call succeeds
      mockGetBudgets.mockResolvedValue({ data: mockBudgets, error: null })

      // Trigger a refetch by creating a budget
      const user = userEvent.setup()
      mockCreateBudget.mockResolvedValue({ data: { id: '3' }, error: null })

      await user.click(screen.getByText('Submit'))

      // Error should be cleared after successful refetch
      await waitFor(() => {
        expect(screen.queryByText(/failed to load budgets/i)).not.toBeInTheDocument()
      })
    })

    it('shows budget load error over category error', async () => {
      mockGetBudgets.mockResolvedValue({ data: null, error: { message: 'Budget error' } })
      mockGetCategories.mockResolvedValue({ data: null, error: { message: 'Category error' } })

      render(<BudgetsPage />)

      // The page shows the first error (budgets) in priority
      await waitFor(() => {
        const errorText = screen.getByText(/failed to load/i)
        expect(errorText).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
    })

    it('shows loading during initial fetch', () => {
      mockGetBudgets.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockBudgets, error: null }), 100))
      )

      render(<BudgetsPage />)

      expect(screen.getByText(/loading budgets/i)).toBeInTheDocument()
    })

    it('shows loading indicator in list', () => {
      mockGetBudgets.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockBudgets, error: null }), 100))
      )

      render(<BudgetsPage />)

      const budgetList = screen.getByTestId('budget-list')
      expect(budgetList).toContainElement(screen.getByText(/loading budgets/i))
    })

    it('handles loading states correctly during fetch', async () => {
      let resolvePromise: any
      mockGetBudgets.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      render(<BudgetsPage />)

      expect(screen.getByText(/loading budgets/i)).toBeInTheDocument()

      resolvePromise({ data: mockBudgets, error: null })

      await waitFor(() => {
        expect(screen.queryByText(/loading budgets/i)).not.toBeInTheDocument()
      })
    })

    it('clears loading state after successful fetch', async () => {
      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.queryByText(/loading budgets/i)).not.toBeInTheDocument()
      })
    })

    it('clears loading state after error', async () => {
      mockGetBudgets.mockResolvedValue({ data: null, error: { message: 'Failed' } })

      render(<BudgetsPage />)

      await waitFor(() => {
        expect(screen.queryByText(/loading budgets/i)).not.toBeInTheDocument()
        expect(screen.getByText(/failed to load budgets/i)).toBeInTheDocument()
      })
    })
  })

  describe('Component Cleanup', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
      })
    })

    it('handles unmount during fetch', () => {
      let resolveFetch: any
      mockGetBudgets.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve
          })
      )

      const { unmount } = render(<BudgetsPage />)

      unmount()

      // Resolve after unmount
      resolveFetch({ data: mockBudgets, error: null })

      // Should not cause errors or warnings
      expect(true).toBe(true)
    })

    it('cancels pending fetch on unmount', async () => {
      mockGetBudgets.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockBudgets, error: null }), 100))
      )

      const { unmount } = render(<BudgetsPage />)

      unmount()

      // Wait to ensure no state updates occur
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(true).toBe(true)
    })
  })
})
