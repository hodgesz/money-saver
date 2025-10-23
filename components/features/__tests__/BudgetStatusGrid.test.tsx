import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BudgetStatusGrid } from '../BudgetStatusGrid'
import { analyticsService } from '@/lib/services/analytics'

jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getBudgetSummary: jest.fn(),
  },
}))

describe('BudgetStatusGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays loading state initially', () => {
    ;(analyticsService.getBudgetSummary as jest.Mock).mockReturnValue(
      new Promise(() => {})
    )

    render(<BudgetStatusGrid />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays budget status cards when loaded', async () => {
    const mockData = [
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
      {
        budget: {
          id: '2',
          category_id: 'Transport',
          amount: 200,
          period: 'monthly',
        },
        spent: 250,
        remaining: -50,
        percentage: 125,
        status: 'over',
      },
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<BudgetStatusGrid />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('$300')).toBeInTheDocument()
      expect(screen.getByText('$500')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
      expect(screen.getByText('125%')).toBeInTheDocument()
    })
  })

  it('displays empty state when no budgets', async () => {
    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<BudgetStatusGrid />)

    await waitFor(() => {
      expect(screen.getByText(/no budgets/i)).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch budget summary' },
    })

    render(<BudgetStatusGrid />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
    })
  })

  it('applies correct status colors for under budget', async () => {
    const mockData = [
      {
        budget: {
          id: '1',
          category_id: 'Groceries',
          amount: 500,
          period: 'monthly',
        },
        spent: 250,
        remaining: 250,
        percentage: 50,
        status: 'under',
      },
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<BudgetStatusGrid />)

    await waitFor(() => {
      const statusBar = container.querySelector('[data-status="under"]')
      expect(statusBar).toHaveClass('bg-green-500')
    })
  })

  it('applies correct status colors for over budget', async () => {
    const mockData = [
      {
        budget: {
          id: '1',
          category_id: 'Groceries',
          amount: 500,
          period: 'monthly',
        },
        spent: 600,
        remaining: -100,
        percentage: 120,
        status: 'over',
      },
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<BudgetStatusGrid />)

    await waitFor(() => {
      const statusBar = container.querySelector('[data-status="over"]')
      expect(statusBar).toHaveClass('bg-red-500')
    })
  })

  it('applies correct status colors for at budget', async () => {
    const mockData = [
      {
        budget: {
          id: '1',
          category_id: 'Groceries',
          amount: 500,
          period: 'monthly',
        },
        spent: 500,
        remaining: 0,
        percentage: 100,
        status: 'at',
      },
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<BudgetStatusGrid />)

    await waitFor(() => {
      const statusBar = container.querySelector('[data-status="at"]')
      expect(statusBar).toHaveClass('bg-yellow-500')
    })
  })

  it('displays remaining amount correctly', async () => {
    const mockData = [
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
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<BudgetStatusGrid />)

    await waitFor(() => {
      expect(screen.getByText('$200 remaining')).toBeInTheDocument()
    })
  })

  it('displays overspent amount with negative indicator', async () => {
    const mockData = [
      {
        budget: {
          id: '1',
          category_id: 'Transport',
          amount: 200,
          period: 'monthly',
        },
        spent: 250,
        remaining: -50,
        percentage: 125,
        status: 'over',
      },
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<BudgetStatusGrid />)

    await waitFor(() => {
      expect(screen.getByText('$50 over')).toBeInTheDocument()
    })
  })

  it('renders progress bars with correct width', async () => {
    const mockData = [
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
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<BudgetStatusGrid />)

    await waitFor(() => {
      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toHaveStyle('width: 60%')
    })
  })

  it('caps progress bar at 100% for overspent budgets', async () => {
    const mockData = [
      {
        budget: {
          id: '1',
          category_id: 'Transport',
          amount: 200,
          period: 'monthly',
        },
        spent: 300,
        remaining: -100,
        percentage: 150,
        status: 'over',
      },
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<BudgetStatusGrid />)

    await waitFor(() => {
      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toHaveStyle('width: 100%')
    })
  })

  it('displays budget period', async () => {
    const mockData = [
      {
        budget: {
          id: '1',
          category_id: 'Groceries',
          amount: 500,
          period: 'weekly',
        },
        spent: 300,
        remaining: 200,
        percentage: 60,
        status: 'under',
      },
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<BudgetStatusGrid />)

    await waitFor(() => {
      expect(screen.getByText(/weekly/i)).toBeInTheDocument()
    })
  })

  it('displays budgets in grid layout', async () => {
    const mockData = [
      {
        budget: { id: '1', category_id: 'Cat1', amount: 500, period: 'monthly' },
        spent: 100,
        remaining: 400,
        percentage: 20,
        status: 'under',
      },
      {
        budget: { id: '2', category_id: 'Cat2', amount: 300, period: 'monthly' },
        spent: 200,
        remaining: 100,
        percentage: 66.67,
        status: 'under',
      },
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<BudgetStatusGrid />)

    await waitFor(() => {
      const grid = container.querySelector('[role="list"]')
      expect(grid).toHaveClass('grid')
      expect(grid?.children).toHaveLength(2)
    })
  })

  it('has proper accessibility attributes', async () => {
    const mockData = [
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
    ]

    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<BudgetStatusGrid />)

    await waitFor(() => {
      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toHaveAttribute('aria-valuenow', '60')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Budget progress for Groceries')
    })
  })
})
