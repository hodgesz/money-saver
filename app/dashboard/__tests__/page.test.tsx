import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '../page'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsService } from '@/lib/services/analytics'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import { useRouter, usePathname } from 'next/navigation'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

// Mock services
jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getMonthlySpending: jest.fn(),
    getCategoryBreakdown: jest.fn(),
    getSpendingTrends: jest.fn(),
    getBudgetSummary: jest.fn(),
  },
}))

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

describe('DashboardPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

    // Default categoryService mock
    ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
      data: [
        { id: 'Groceries', name: 'Groceries', icon: '🛒' },
        { id: 'Transport', name: 'Transport', icon: '🚗' },
        { id: 'Category', name: 'Category', icon: '📁' },
      ],
      error: null,
    })
  })

  describe('Authentication', () => {
    it('displays loading state when auth is loading', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true,
      })

      render(<DashboardPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('redirects to login when user is not authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
      })

      render(<DashboardPage />)

      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })

    it('renders dashboard when user is authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
      })

      render(<DashboardPage />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  describe('Data Fetching', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
      })
    })

    it('fetches all analytics data on mount', async () => {
      const mockGetMonthlySpending = jest.fn().mockResolvedValue({
        data: { income: 500, expenses: 400, net: 100, transactionCount: 10, month: 1, year: 2024 },
        error: null,
      })
      const mockGetCategoryBreakdown = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      })
      const mockGetSpendingTrends = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })
      const mockGetBudgetSummary = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })
      const mockGetTransactions = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      ;(analyticsService.getMonthlySpending as jest.Mock) = mockGetMonthlySpending
      ;(analyticsService.getCategoryBreakdown as jest.Mock) = mockGetCategoryBreakdown
      ;(analyticsService.getSpendingTrends as jest.Mock) = mockGetSpendingTrends
      ;(analyticsService.getBudgetSummary as jest.Mock) = mockGetBudgetSummary
      ;(transactionService.getTransactionsWithFilters as jest.Mock) = mockGetTransactions

      render(<DashboardPage />)

      await waitFor(() => {
        expect(mockGetMonthlySpending).toHaveBeenCalled()
        expect(mockGetCategoryBreakdown).toHaveBeenCalled()
        expect(mockGetSpendingTrends).toHaveBeenCalled()
        expect(mockGetBudgetSummary).toHaveBeenCalled()
        expect(mockGetTransactions).toHaveBeenCalled()
      })
    })

    it('displays spending overview component', async () => {
      ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
        data: { income: 2000, expenses: 1234.56, net: 765.44, transactionCount: 15, month: 1, year: 2024 },
        error: null,
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('spending-overview')).toBeInTheDocument()
      })
    })

    it('displays category chart component', async () => {
      ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
        data: {
          'Groceries': { total: 500, count: 10, percentage: 50 },
          'Transport': { total: 500, count: 10, percentage: 50 },
        },
        error: null,
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('category-chart')).toBeInTheDocument()
      })
    })

    it('displays trends chart component', async () => {
      ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
        data: [
          { month: '2024-01', total: 500, count: 10 },
          { month: '2024-02', total: 600, count: 12 },
        ],
        error: null,
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('trends-chart')).toBeInTheDocument()
      })
    })

    it('displays budget status grid component', async () => {
      ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
        data: [
          {
            budget: {
              id: '1',
              category_id: 'Groceries',
              amount: 500,
              period: 'monthly',
            },
            spent: 300,
            remaining: 200,
            percentage: 60,
            status: 'under',
          },
        ],
        error: null,
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-status-grid')).toBeInTheDocument()
      })
    })

    it('displays recent transactions list component', async () => {
      ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
        data: [
          {
            id: '1',
            description: 'Transaction',
            amount: 100,
            date: '2024-01-15',
            category_id: 'Category',
            is_income: false,
          },
        ],
        error: null,
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('recent-transactions')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
      })
    })

    it('shows loading skeleton while fetching data', () => {
      ;(analyticsService.getMonthlySpending as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      )
      ;(analyticsService.getCategoryBreakdown as jest.Mock).mockReturnValue(
        new Promise(() => {})
      )
      ;(analyticsService.getSpendingTrends as jest.Mock).mockReturnValue(
        new Promise(() => {})
      )
      ;(analyticsService.getBudgetSummary as jest.Mock).mockReturnValue(
        new Promise(() => {})
      )
      ;(transactionService.getTransactionsWithFilters as jest.Mock).mockReturnValue(
        new Promise(() => {})
      )

      render(<DashboardPage />)

      expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(5)
    })
  })

  describe('Error States', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
      })
    })

    it('displays error when monthly spending fetch fails', async () => {
      ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch spending' },
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch spending/i)).toBeInTheDocument()
      })
    })

    it('displays error when category breakdown fetch fails', async () => {
      ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch categories' },
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch categories/i)).toBeInTheDocument()
      })
    })

    it('displays error when trends fetch fails', async () => {
      ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch trends' },
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch trends/i)).toBeInTheDocument()
      })
    })

    it('displays error when budget summary fetch fails', async () => {
      ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch budgets' },
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch budgets/i)).toBeInTheDocument()
      })
    })

    it('displays error when transactions fetch fails', async () => {
      ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch transactions' },
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch transactions/i)).toBeInTheDocument()
      })
    })

    it('displays partial content when some fetches succeed', async () => {
      ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
        data: { income: 600, expenses: 500, net: 100, transactionCount: 10, month: 1, year: 2024 },
        error: null,
      })
      ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch categories' },
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('spending-overview')).toBeInTheDocument()
        expect(screen.getByText(/failed to fetch categories/i)).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
      })
    })

    it('displays empty state when no transactions exist', async () => {
      ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
        data: { income: 0, expenses: 0, net: 0, transactionCount: 0, month: 1, year: 2024 },
        error: null,
      })
      ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      })
      ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })
      ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })
      ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/no transactions/i)).toBeInTheDocument()
        expect(screen.getByText(/no budgets/i)).toBeInTheDocument()
      })
    })

    it('shows empty state message for new users', async () => {
      ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
        data: { income: 0, expenses: 0, net: 0, transactionCount: 0, month: 1, year: 2024 },
        error: null,
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/get started by adding your first transaction/i)).toBeInTheDocument()
      })
    })
  })

  describe('Component Integration', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
      })

      // Mock all services with successful responses
      ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
        data: { income: 1500, expenses: 1000, net: 500, transactionCount: 20, month: 1, year: 2024 },
        error: null,
      })
      ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
        data: {
          'Groceries': { total: 500, count: 10, percentage: 50 },
          'Transport': { total: 500, count: 10, percentage: 50 },
        },
        error: null,
      })
      ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
        data: [
          { month: '2024-01', total: 1000, count: 20 },
        ],
        error: null,
      })
      ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
        data: [
          {
            budget: {
              id: '1',
              category_id: 'Groceries',
              amount: 600,
              period: 'monthly',
            },
            spent: 500,
            remaining: 100,
            percentage: 83.33,
            status: 'under',
          },
        ],
        error: null,
      })
      ;(transactionService.getTransactionsWithFilters as jest.Mock).mockResolvedValue({
        data: [
          {
            id: '1',
            description: 'Transaction',
            amount: 100,
            date: '2024-01-15',
            category_id: 'Category',
            is_income: false,
          },
        ],
        error: null,
      })
    })

    it('renders all dashboard components together', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('spending-overview')).toBeInTheDocument()
        expect(screen.getByTestId('category-chart')).toBeInTheDocument()
        expect(screen.getByTestId('trends-chart')).toBeInTheDocument()
        expect(screen.getByTestId('budget-status-grid')).toBeInTheDocument()
        expect(screen.getByTestId('recent-transactions')).toBeInTheDocument()
      })
    })

    it('displays navigation component', () => {
      render(<DashboardPage />)

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('has proper page layout structure', () => {
      const { container } = render(<DashboardPage />)

      expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
      expect(container.querySelector('.bg-gray-50')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
      })
    })

    it('has proper heading hierarchy', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1).toHaveTextContent('Dashboard')
      })
    })

    it('has accessible navigation', () => {
      render(<DashboardPage />)

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')
    })
  })
})
