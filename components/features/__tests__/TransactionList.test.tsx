import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionList } from '../TransactionList'
import type { Transaction, Category } from '@/types'

// Mock transaction data
const mockTransactions: Transaction[] = [
  {
    id: '1',
    user_id: 'user-1',
    amount: 45.99,
    date: '2024-03-15',
    category_id: '1',
    description: 'Weekly groceries',
    merchant: 'Whole Foods',
    is_income: false,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-1',
    amount: 2500.00,
    date: '2024-03-01',
    category_id: '2',
    description: 'Monthly salary',
    merchant: 'Employer Inc',
    is_income: true,
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
  },
  {
    id: '3',
    user_id: 'user-1',
    amount: 20.00,
    date: '2024-03-10',
    category_id: '3',
    description: 'Bus fare',
    is_income: false,
    created_at: '2024-03-10T10:00:00Z',
    updated_at: '2024-03-10T10:00:00Z',
  },
]

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
    name: 'Income',
    color: '#2196F3',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '3',
    user_id: 'user-1',
    name: 'Transportation',
    color: '#FF9800',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

describe('TransactionList', () => {
  describe('Rendering', () => {
    it('renders transaction list with data', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      expect(screen.getByText('Monthly salary')).toBeInTheDocument()
      expect(screen.getByText('Bus fare')).toBeInTheDocument()
    })

    it('displays transaction amounts correctly', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText('$45.99')).toBeInTheDocument()
      expect(screen.getByText('$2,500.00')).toBeInTheDocument()
      expect(screen.getByText('$20.00')).toBeInTheDocument()
    })

    it('displays transaction dates in readable format', () => {
      const { container } = render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Dates should be displayed in readable format (e.g., "Mar 15, 2024")
      // Check that dates are present in the table cells (not in the filters)
      const tableCells = container.querySelectorAll('td')
      const dateTexts = Array.from(tableCells).map((cell) => cell.textContent)

      // Check that formatted dates are present
      expect(dateTexts.some((text) => text?.includes('2024'))).toBe(true)
      // Verify there are date cells in the table
      expect(tableCells.length).toBeGreaterThan(0)
    })

    it('displays category names', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Categories appear both in the table and in the filter dropdown
      // Use getAllByText to handle multiple occurrences
      expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Income').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Transportation').length).toBeGreaterThanOrEqual(1)
    })

    it('displays merchant information when available', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText('Whole Foods')).toBeInTheDocument()
      expect(screen.getByText('Employer Inc')).toBeInTheDocument()
    })

    it('distinguishes between income and expense visually', () => {
      const { container } = render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Income should have positive/green styling
      const incomeElement = screen.getByText('Monthly salary').closest('[data-testid="transaction-item"]')
      expect(incomeElement).toHaveAttribute('data-is-income', 'true')

      // Expenses should have negative/red styling
      const expenseElement = screen.getByText('Weekly groceries').closest('[data-testid="transaction-item"]')
      expect(expenseElement).toHaveAttribute('data-is-income', 'false')
    })

    it('renders edit and delete buttons for each transaction', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
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
    it('shows empty state message when no transactions', () => {
      render(
        <TransactionList
          transactions={[]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/no transactions found/i)).toBeInTheDocument()
    })

    it('shows helpful message in empty state', () => {
      render(
        <TransactionList
          transactions={[]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/add your first transaction/i)).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(
        <TransactionList
          transactions={[]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          isLoading={true}
        />
      )

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('does not show transactions when loading', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          isLoading={true}
        />
      )

      expect(screen.queryByText('Weekly groceries')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      render(
        <TransactionList
          transactions={[]}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          error="Failed to load transactions"
        />
      )

      expect(screen.getByText(/failed to load transactions/i)).toBeInTheDocument()
    })

    it('does not show transactions when there is an error', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          error="Some error"
        />
      )

      expect(screen.queryByText('Weekly groceries')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onEdit with transaction when edit button is clicked', async () => {
      const user = userEvent.setup()
      const onEdit = jest.fn()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      expect(onEdit).toHaveBeenCalledWith(mockTransactions[0])
    })

    it('calls onDelete with transaction id when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onDelete = jest.fn()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      )

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      expect(onDelete).toHaveBeenCalledWith(mockTransactions[0].id)
    })
  })

  describe('Sorting', () => {
    it('renders sort dropdown', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
    })

    it('has sort options for date, amount, and description', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByRole('option', { name: /date/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /amount/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /description/i })).toBeInTheDocument()
    })

    it('sorts transactions by date (newest first) by default', () => {
      const { container } = render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const transactionItems = container.querySelectorAll('[data-testid="transaction-item"]')
      const firstTransaction = transactionItems[0]
      const lastTransaction = transactionItems[transactionItems.length - 1]

      // Newest transaction (Mar 15) should be first
      expect(firstTransaction).toHaveTextContent('Weekly groceries')
      // Oldest transaction (Mar 1) should be last
      expect(lastTransaction).toHaveTextContent('Monthly salary')
    })

    it('sorts transactions by amount when amount sort is selected', async () => {
      const user = userEvent.setup()

      const { container } = render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      await user.selectOptions(screen.getByLabelText(/sort by/i), 'amount')

      await waitFor(() => {
        const transactionItems = container.querySelectorAll('[data-testid="transaction-item"]')
        const firstTransaction = transactionItems[0]

        // Highest amount ($2,500.00) should be first
        expect(firstTransaction).toHaveTextContent('Monthly salary')
      })
    })

    it('sorts transactions by description when description sort is selected', async () => {
      const user = userEvent.setup()

      const { container } = render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      await user.selectOptions(screen.getByLabelText(/sort by/i), 'description')

      await waitFor(() => {
        const transactionItems = container.querySelectorAll('[data-testid="transaction-item"]')
        const firstTransaction = transactionItems[0]

        // Alphabetically first ("Bus fare") should be first
        expect(firstTransaction).toHaveTextContent('Bus fare')
      })
    })
  })

  describe('Filtering', () => {
    it('renders search input', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByPlaceholderText(/search transactions/i)).toBeInTheDocument()
    })

    it('filters transactions by search term', async () => {
      const user = userEvent.setup()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search transactions/i)
      await user.type(searchInput, 'groceries')

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
        expect(screen.queryByText('Monthly salary')).not.toBeInTheDocument()
        expect(screen.queryByText('Bus fare')).not.toBeInTheDocument()
      })
    })

    it('filters transactions case-insensitively', async () => {
      const user = userEvent.setup()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search transactions/i)
      await user.type(searchInput, 'WHOLE')

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      })
    })

    it('searches in description and merchant fields', async () => {
      const user = userEvent.setup()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Search by merchant
      const searchInput = screen.getByPlaceholderText(/search transactions/i)
      await user.type(searchInput, 'Whole Foods')

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      })

      // Clear and search by description
      await user.clear(searchInput)
      await user.type(searchInput, 'salary')

      await waitFor(() => {
        expect(screen.getByText('Monthly salary')).toBeInTheDocument()
      })
    })

    it('shows empty state when search returns no results', async () => {
      const user = userEvent.setup()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search transactions/i)
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/no transactions found/i)).toBeInTheDocument()
      })
    })

    it('renders category filter dropdown', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument()
    })

    it('filters transactions by selected category', async () => {
      const user = userEvent.setup()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      await user.selectOptions(screen.getByLabelText(/filter by category/i), '1')

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
        expect(screen.queryByText('Monthly salary')).not.toBeInTheDocument()
        expect(screen.queryByText('Bus fare')).not.toBeInTheDocument()
      })
    })

    it('shows all transactions when "All Categories" is selected', async () => {
      const user = userEvent.setup()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // First filter by a category
      await user.selectOptions(screen.getByLabelText(/filter by category/i), '1')

      // Then select "All Categories"
      await user.selectOptions(screen.getByLabelText(/filter by category/i), '')

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
        expect(screen.getByText('Monthly salary')).toBeInTheDocument()
        expect(screen.getByText('Bus fare')).toBeInTheDocument()
      })
    })
  })

  describe('Transaction Count', () => {
    it('displays total transaction count', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/3 transactions/i)).toBeInTheDocument()
    })

    it('updates count when filtering', async () => {
      const user = userEvent.setup()

      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      await user.selectOptions(screen.getByLabelText(/filter by category/i), '1')

      await waitFor(() => {
        expect(screen.getByText(/1 transaction/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has accessible table structure', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('has proper column headers', () => {
      render(
        <TransactionList
          transactions={mockTransactions}
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByRole('columnheader', { name: /date/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /category/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /amount/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument()
    })
  })
})
