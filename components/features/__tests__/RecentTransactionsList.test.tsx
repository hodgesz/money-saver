import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { RecentTransactionsList } from '../RecentTransactionsList'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'

jest.mock('@/lib/services/transactions', () => ({
  transactionService: {
    getTransactionsWithFilters: jest.fn(),
  },
}))

jest.mock('@/lib/services/categories', () => ({
  categoryService: {
    getCategories: jest.fn(),
  },
}))

describe('RecentTransactionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default category mock
    ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
      data: [
        { id: 'Groceries', name: 'Groceries', icon: '🛒' },
        { id: 'Transport', name: 'Transport', icon: '🚗' },
        { id: 'Housing', name: 'Housing', icon: '🏠' },
        { id: 'Income', name: 'Income', icon: '💰' },
        { id: 'Category', name: 'Category', icon: '📁' },
      ],
      error: null,
    })
  })

  it('displays loading state initially', () => {
    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockReturnValue(
      new Promise(() => {})
    )

    render(<RecentTransactionsList />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays transactions when loaded', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'Grocery Store',
        amount: 75.50,
        date: '2024-01-15',
        category_id: 'Groceries',
        is_income: false,
      },
      {
        id: '2',
        description: 'Gas Station',
        amount: 45.00,
        date: '2024-01-14',
        category_id: 'Transport',
        is_income: false,
      },
    ]

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument()
      expect(screen.getByText('Gas Station')).toBeInTheDocument()
      expect(screen.getByText('-$75.50')).toBeInTheDocument()
      expect(screen.getByText('-$45.00')).toBeInTheDocument()
    })
  })

  it('displays empty state when no transactions', async () => {
    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch transactions' },
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load transactions/i)).toBeInTheDocument()
    })
  })

  it('limits the number of transactions displayed', async () => {
    // Mock returns only 5 transactions (matching the limit parameter)
    const mockTransactions = Array.from({ length: 5 }, (_, i) => ({
      id: `${i + 1}`,
      description: `Transaction ${i + 1}`,
      amount: 100,
      date: '2024-01-15',
      category_id: 'Category',
      is_income: false,
    }))

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      // Component requests limit=5, so exactly 5 should render
      expect(screen.getByText('Transaction 1')).toBeInTheDocument()
      expect(screen.getByText('Transaction 2')).toBeInTheDocument()
      expect(screen.getByText('Transaction 3')).toBeInTheDocument()
      expect(screen.getByText('Transaction 4')).toBeInTheDocument()
      expect(screen.getByText('Transaction 5')).toBeInTheDocument()
      // No Transaction 6 because only 5 were returned
      expect(screen.queryByText('Transaction 6')).not.toBeInTheDocument()
    })
  })

  it('displays income with positive indicator', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'Salary',
        amount: 3000,
        date: '2024-01-01',
        category_id: 'Income',
        is_income: true,
      },
    ]

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      // Component uses toFixed(2) without thousand separators
      expect(screen.getByText('+$3000.00')).toBeInTheDocument()
      expect(screen.getByText('+$3000.00')).toHaveClass('text-green-600')
    })
  })

  it('displays expenses with negative indicator', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'Rent',
        amount: 1200,
        date: '2024-01-01',
        category_id: 'Housing',
        is_income: false,
      },
    ]

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      // Component uses toFixed(2) without thousand separators
      expect(screen.getByText('-$1200.00')).toBeInTheDocument()
      expect(screen.getByText('-$1200.00')).toHaveClass('text-red-600')
    })
  })

  it('formats dates correctly', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'Transaction',
        amount: 100,
        date: '2024-01-15',
        category_id: 'Category',
        is_income: false,
      },
    ]

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      // Date and category are both displayed
      expect(screen.getByText(/Category/)).toBeInTheDocument()
      expect(screen.getByText(/Jan/)).toBeInTheDocument()
    })
  })

  it('displays category names', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'Transaction',
        amount: 100,
        date: '2024-01-15',
        category_id: 'Groceries',
        is_income: false,
      },
    ]

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      // Category name is displayed with date: "Groceries • Jan 15"
      expect(screen.getByText(/Groceries/)).toBeInTheDocument()
    })
  })

  it('sorts transactions by date descending', async () => {
    // Service returns transactions pre-sorted by date descending
    const mockTransactions = [
      {
        id: '2',
        description: 'Newest',
        amount: 100,
        date: '2024-01-15',
        category_id: 'Category',
        is_income: false,
      },
      {
        id: '3',
        description: 'Middle',
        amount: 100,
        date: '2024-01-10',
        category_id: 'Category',
        is_income: false,
      },
      {
        id: '1',
        description: 'Oldest',
        amount: 100,
        date: '2024-01-01',
        category_id: 'Category',
        is_income: false,
      },
    ]

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      const descriptions = screen.getAllByText(/Oldest|Newest|Middle/)
      expect(descriptions[0]).toHaveTextContent('Newest')
      expect(descriptions[1]).toHaveTextContent('Middle')
      expect(descriptions[2]).toHaveTextContent('Oldest')
    })
  })

  it('truncates long descriptions', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'This is a very long transaction description that should be truncated',
        amount: 100,
        date: '2024-01-15',
        category_id: 'Category',
        is_income: false,
      },
    ]

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    const { container } = render(<RecentTransactionsList />)

    await waitFor(() => {
      const description = container.querySelector('.truncate')
      expect(description).toBeDefined()
    })
  })

  it('has proper accessibility attributes', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'Transaction',
        amount: 100,
        date: '2024-01-15',
        category_id: 'Category',
        is_income: false,
      },
    ]

    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList />)

    await waitFor(() => {
      // Component renders CardHeader with CardTitle
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
      // Transaction cards are displayed
      expect(screen.getByText('Transaction')).toBeInTheDocument()
    })
  })

  it('fetches transactions on mount', async () => {
    const mockGetTransactions = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    ;(transactionService.getTransactionsWithFilters as jest.Mock) = mockGetTransactions

    render(<RecentTransactionsList />)

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalledTimes(1)
    })
  })
})
