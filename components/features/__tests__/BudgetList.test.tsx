import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetList } from '../BudgetList'
import type { Budget, Category } from '@/types'

// Mock categories for display
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
  {
    id: 'cat-3',
    user_id: 'user-123',
    name: 'Transportation',
    color: '#f59e0b',
    icon: 'car',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
]

// Mock budget data
const mockBudgets: Budget[] = [
  {
    id: '1',
    user_id: 'user-123',
    category_id: 'cat-1',
    amount: 500,
    period: 'monthly',
    start_date: '2024-01-01',
    end_date: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-123',
    category_id: 'cat-2',
    amount: 200,
    period: 'weekly',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    user_id: 'user-123',
    category_id: 'cat-3',
    amount: 300,
    period: 'monthly',
    start_date: '2024-01-01',
    end_date: null,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
]

describe('BudgetList', () => {
  describe('Rendering', () => {
    it('renders budget list with data', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
      expect(screen.getByText('Transportation')).toBeInTheDocument()
    })

    it('displays budget amounts correctly', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText('$500.00')).toBeInTheDocument()
      expect(screen.getByText('$200.00')).toBeInTheDocument()
      expect(screen.getByText('$300.00')).toBeInTheDocument()
    })

    it('displays budget periods', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getAllByText(/monthly/i)).toHaveLength(2)
      expect(screen.getByText(/weekly/i)).toBeInTheDocument()
    })

    it('displays start and end dates', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // All budgets start on 2024-01-01
      expect(screen.getAllByText(/2024-01-01/)).toHaveLength(3)

      // One budget has an end date
      expect(screen.getByText(/2024-12-31/)).toBeInTheDocument()

      // Two budgets show "Ongoing"
      expect(screen.getAllByText(/ongoing/i)).toHaveLength(2)
    })

    it('displays category names from categories prop', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Should show category names, not IDs
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
      expect(screen.getByText('Transportation')).toBeInTheDocument()
    })

    it('shows "Unknown Category" when category not found', () => {
      const budgetWithUnknownCategory: Budget = {
        ...mockBudgets[0],
        category_id: 'unknown-cat-id',
      }

      render(
        <BudgetList
          budgets={[budgetWithUnknownCategory]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/unknown category/i)).toBeInTheDocument()
    })

    it('renders edit and delete buttons for each budget', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })

      expect(editButtons).toHaveLength(3)
      expect(deleteButtons).toHaveLength(3)
    })
  })

  describe('Empty State', () => {
    it('shows empty state message when no budgets', () => {
      render(
        <BudgetList
          budgets={[]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/no budgets found/i)).toBeInTheDocument()
    })

    it('shows helpful message in empty state', () => {
      render(
        <BudgetList
          budgets={[]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/add your first budget/i)).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(
        <BudgetList
          budgets={[]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          isLoading={true}
        />
      )

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('does not show budgets when loading', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          isLoading={true}
        />
      )

      expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      render(
        <BudgetList
          budgets={[]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          error="Failed to load budgets"
        />
      )

      expect(screen.getByText(/failed to load budgets/i)).toBeInTheDocument()
    })

    it('does not show budgets when there is an error', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          error="Some error"
        />
      )

      expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onEdit with budget when edit button is clicked', async () => {
      const user = userEvent.setup()
      const onEdit = jest.fn()

      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      expect(onEdit).toHaveBeenCalledWith(mockBudgets[0])
    })

    it('calls onDelete with budget id when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onDelete = jest.fn()

      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      )

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      expect(onDelete).toHaveBeenCalledWith(mockBudgets[0].id)
    })
  })

  describe('Sorting', () => {
    it('renders sort dropdown', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
    })

    it('has sort options for amount, period, and created date', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByRole('option', { name: /amount/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /period/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /created/i })).toBeInTheDocument()
    })

    it('sorts budgets by amount (highest first) by default', () => {
      const { container } = render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const budgetItems = container.querySelectorAll('[data-testid="budget-item"]')

      // Check order: $500, $300, $200 (highest first)
      expect(budgetItems[0]).toHaveTextContent('$500.00')
      expect(budgetItems[1]).toHaveTextContent('$300.00')
      expect(budgetItems[2]).toHaveTextContent('$200.00')
    })

    it('sorts budgets by period when period sort is selected', async () => {
      const user = userEvent.setup()

      const { container } = render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      await user.selectOptions(screen.getByLabelText(/sort by/i), 'period')

      await waitFor(() => {
        const budgetItems = container.querySelectorAll('[data-testid="budget-item"]')

        // Should be sorted alphabetically by period: monthly, monthly, weekly
        expect(budgetItems[0]).toHaveTextContent(/monthly/i)
        expect(budgetItems[1]).toHaveTextContent(/monthly/i)
        expect(budgetItems[2]).toHaveTextContent(/weekly/i)
      })
    })

    it('sorts budgets by created date when created sort is selected', async () => {
      const user = userEvent.setup()

      const { container } = render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      await user.selectOptions(screen.getByLabelText(/sort by/i), 'created')

      await waitFor(() => {
        const budgetItems = container.querySelectorAll('[data-testid="budget-item"]')

        // Newest first (id 3, 2, 1)
        expect(budgetItems[0]).toHaveTextContent('Transportation')
      })
    })
  })

  describe('Filtering', () => {
    it('renders search input', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByPlaceholderText(/search budgets/i)).toBeInTheDocument()
    })

    it('filters budgets by category name', async () => {
      const user = userEvent.setup()

      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search budgets/i)
      await user.type(searchInput, 'groceries')

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
        expect(screen.queryByText('Entertainment')).not.toBeInTheDocument()
        expect(screen.queryByText('Transportation')).not.toBeInTheDocument()
      })
    })

    it('filters budgets case-insensitively', async () => {
      const user = userEvent.setup()

      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search budgets/i)
      await user.type(searchInput, 'ENTERTAINMENT')

      await waitFor(() => {
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })
    })

    it('shows empty state when search returns no results', async () => {
      const user = userEvent.setup()

      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search budgets/i)
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/no budgets found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Budget Count', () => {
    it('displays total budget count', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/3 budgets/i)).toBeInTheDocument()
    })

    it('displays singular form for one budget', () => {
      render(
        <BudgetList
          budgets={[mockBudgets[0]]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/1 budget/i)).toBeInTheDocument()
    })

    it('updates count when filtering', async () => {
      const user = userEvent.setup()

      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search budgets/i)
      await user.type(searchInput, 'Groceries')

      await waitFor(() => {
        expect(screen.getByText(/1 budget/i)).toBeInTheDocument()
      })
    })
  })

  describe('Period Display', () => {
    it('displays different period types correctly', () => {
      const budgetsWithDifferentPeriods: Budget[] = [
        { ...mockBudgets[0], period: 'daily' },
        { ...mockBudgets[1], period: 'weekly' },
        { ...mockBudgets[2], period: 'monthly' },
      ]

      // Add quarterly and yearly
      const quarterlyBudget: Budget = {
        id: '4',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: 1000,
        period: 'quarterly',
        start_date: '2024-01-01',
        end_date: null,
        created_at: '2024-01-04T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z',
      }

      const yearlyBudget: Budget = {
        id: '5',
        user_id: 'user-123',
        category_id: 'cat-2',
        amount: 5000,
        period: 'yearly',
        start_date: '2024-01-01',
        end_date: null,
        created_at: '2024-01-05T00:00:00Z',
        updated_at: '2024-01-05T00:00:00Z',
      }

      render(
        <BudgetList
          budgets={[...budgetsWithDifferentPeriods, quarterlyBudget, yearlyBudget]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/daily/i)).toBeInTheDocument()
      expect(screen.getByText(/weekly/i)).toBeInTheDocument()
      expect(screen.getByText(/monthly/i)).toBeInTheDocument()
      expect(screen.getByText(/quarterly/i)).toBeInTheDocument()
      expect(screen.getByText(/yearly/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible list structure', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Check for list role
      const listElements = screen.getAllByRole('list')
      expect(listElements.length).toBeGreaterThan(0)
    })

    it('has proper list items', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })

    it('has accessible labels for interactive elements', () => {
      render(
        <BudgetList
          budgets={mockBudgets}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search budgets/i)).toBeInTheDocument()
    })
  })
})
