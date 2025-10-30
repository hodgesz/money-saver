import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionsPage from '../page'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import { accountsService } from '@/lib/services/accounts'
import { useAuth } from '@/contexts/AuthContext'

// Mock services
jest.mock('@/lib/services/transactions')
jest.mock('@/lib/services/categories')
jest.mock('@/lib/services/accounts')
jest.mock('@/contexts/AuthContext')

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
  usePathname: jest.fn(() => '/transactions'),
}))

const mockTransactions = [
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
]

const mockCategories = [
  {
    id: '1',
    user_id: 'user-1',
    name: 'Groceries',
    color: '#4CAF50',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

describe('TransactionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authenticated user
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    })

    // Mock successful data fetching with pagination
    ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      error: null,
    })
    ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
      data: mockCategories,
      error: null,
    })
    ;(accountsService.getAccounts as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })
  })

  describe('Page Rendering', () => {
    it('renders page title', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^transactions$/i, level: 1 })).toBeInTheDocument()
      })
    })

    it('renders TransactionForm component', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument()
      })
    })

    it('renders TransactionList component', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      })
    })
  })

  describe('Data Fetching', () => {
    it('fetches transactions on mount with pagination', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        expect(transactionService.getTransactionsWithFilters).toHaveBeenCalledWith({
          page: 1,
          limit: 25,
        })
      })
    })

    it('fetches categories on mount', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        expect(categoryService.getCategories).toHaveBeenCalled()
      })
    })

    it('displays loading state while fetching data', () => {
      render(<TransactionsPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('displays transactions after loading', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      })
    })

    it('handles transaction fetch error', async () => {
      ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch transactions' },
      })

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load transactions/i)).toBeInTheDocument()
      })
    })

    it('handles category fetch error', async () => {
      ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch categories' },
      })

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument()
      })
    })
  })

  describe('Adding Transactions', () => {
    it('adds a new transaction when form is submitted', async () => {
      const user = userEvent.setup()

      ;(transactionService.createTransaction as jest.Mock).mockResolvedValue({
        data: {
          id: '2',
          user_id: 'user-1',
          amount: 50,
          date: '2024-03-16',
          category_id: '1',
          description: 'Test transaction',
          merchant: '',
          is_income: false,
          created_at: '2024-03-16T10:00:00Z',
          updated_at: '2024-03-16T10:00:00Z',
        },
        error: null,
      })

      render(<TransactionsPage />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      })

      // Fill out form - wait a bit for the form to be interactive
      await waitFor(() => {
        const amountInput = document.querySelector('#amount') as HTMLInputElement
        expect(amountInput).not.toBeNull()
      })

      const amountInput = document.querySelector('#amount') as HTMLInputElement
      const categorySelect = document.querySelector('#category_id') as HTMLSelectElement
      const descriptionInput = document.querySelector('#description') as HTMLInputElement

      await user.clear(amountInput)
      await user.type(amountInput, '50')
      await user.selectOptions(categorySelect, '1')
      await user.type(descriptionInput, 'Test transaction')

      // Submit
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      await waitFor(() => {
        expect(transactionService.createTransaction).toHaveBeenCalledWith({
          amount: 50,
          date: expect.any(String),
          category_id: '1',
          description: 'Test transaction',
          merchant: '',
          is_income: false,
        })
      })
    })

    it('refreshes transaction list after adding', async () => {
      const user = userEvent.setup()

      ;(transactionService.createTransaction as jest.Mock).mockResolvedValue({
        data: { id: '2' },
        error: null,
      })

      render(<TransactionsPage />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      })

      // Wait for form to be interactive
      await waitFor(() => {
        const amountInput = document.querySelector('#amount') as HTMLInputElement
        expect(amountInput).not.toBeNull()
      })

      // Clear mock to track new calls
      ;(transactionService.getTransactionsWithFilters as jest.Mock).mockClear()

      const amountInput = document.querySelector('#amount') as HTMLInputElement
      const categorySelect = document.querySelector('#category_id') as HTMLSelectElement
      const descriptionInput = document.querySelector('#description') as HTMLInputElement

      await user.clear(amountInput)
      await user.type(amountInput, '50')
      await user.selectOptions(categorySelect, '1')
      await user.type(descriptionInput, 'Test')
      await user.click(screen.getByRole('button', { name: /add transaction/i }))

      // Should fetch transactions again (reset to page 1)
      await waitFor(() => {
        expect(transactionService.getTransactionsWithFilters).toHaveBeenCalledWith({
          page: 1,
          limit: 25,
        })
      })
    })
  })

  describe('Deleting Transactions', () => {
    it('deletes transaction when delete button is clicked', async () => {
      const user = userEvent.setup()

      ;(transactionService.deleteTransaction as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      })

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      })

      const deleteButton = screen.getByRole('button', { name: /delete.*weekly groceries/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(transactionService.deleteTransaction).toHaveBeenCalledWith('1')
      })
    })

    it('refreshes list after deleting', async () => {
      const user = userEvent.setup()

      ;(transactionService.deleteTransaction as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      })

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
      })

      // Clear mock to track new calls
      ;(transactionService.getTransactionsWithFilters as jest.Mock).mockClear()

      const deleteButton = screen.getByRole('button', { name: /delete.*weekly groceries/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(transactionService.getTransactionsWithFilters).toHaveBeenCalledWith({
          page: 1,
          limit: 25,
        })
      })
    })
  })

  describe('Authentication', () => {
    it('redirects to login when not authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
      })

      const mockPush = jest.fn()
      require('next/navigation').useRouter.mockReturnValue({
        push: mockPush,
      })

      render(<TransactionsPage />)

      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('shows loading while checking authentication', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true,
      })

      render(<TransactionsPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })
})
