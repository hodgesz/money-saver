import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { RecentTransactionsList } from '../RecentTransactionsList'
import { transactionService } from '@/lib/services/transactions'

jest.mock('@/lib/services/transactions', () => ({
  transactionService: {
    getTransactions: jest.fn(),
  },
}))

describe('RecentTransactionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays loading state initially', () => {
    ;(transactionService.getTransactions as jest.Mock).mockReturnValue(
      new Promise(() => {})
    )

    render(<RecentTransactionsList limit={5} />)

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

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      expect(screen.getByText('Grocery Store')).toBeInTheDocument()
      expect(screen.getByText('Gas Station')).toBeInTheDocument()
      expect(screen.getByText('$75.50')).toBeInTheDocument()
      expect(screen.getByText('$45.00')).toBeInTheDocument()
    })
  })

  it('displays empty state when no transactions', async () => {
    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      expect(screen.getByText(/no transactions/i)).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch transactions' },
    })

    render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
    })
  })

  it('limits the number of transactions displayed', async () => {
    const mockTransactions = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      description: `Transaction ${i + 1}`,
      amount: 100,
      date: '2024-01-15',
      category_id: 'Category',
      is_income: false,
    }))

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList limit={3} />)

    await waitFor(() => {
      expect(screen.getByText('Transaction 1')).toBeInTheDocument()
      expect(screen.getByText('Transaction 2')).toBeInTheDocument()
      expect(screen.getByText('Transaction 3')).toBeInTheDocument()
      expect(screen.queryByText('Transaction 4')).not.toBeInTheDocument()
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

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      expect(screen.getByText('+$3,000.00')).toBeInTheDocument()
      expect(screen.getByText('+$3,000.00')).toHaveClass('text-green-600')
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

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      expect(screen.getByText('-$1,200.00')).toBeInTheDocument()
      expect(screen.getByText('-$1,200.00')).toHaveClass('text-red-600')
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

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
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

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })
  })

  it('sorts transactions by date descending', async () => {
    const mockTransactions = [
      {
        id: '1',
        description: 'Oldest',
        amount: 100,
        date: '2024-01-01',
        category_id: 'Category',
        is_income: false,
      },
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
    ]

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    render(<RecentTransactionsList limit={5} />)

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

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    const { container } = render(<RecentTransactionsList limit={5} />)

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

    ;(transactionService.getTransactions as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    const { container } = render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      const list = container.querySelector('[role="list"]')
      expect(list).toHaveAttribute('aria-label', 'Recent transactions')
    })
  })

  it('fetches transactions on mount', async () => {
    const mockGetTransactions = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    ;(transactionService.getTransactions as jest.Mock) = mockGetTransactions

    render(<RecentTransactionsList limit={5} />)

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalledTimes(1)
    })
  })
})
