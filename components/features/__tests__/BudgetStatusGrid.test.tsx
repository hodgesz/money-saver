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
      // Component uses toFixed(2)
      expect(screen.getByText(/\$300\.00/)).toBeInTheDocument()
      expect(screen.getByText(/\$500\.00/)).toBeInTheDocument()
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
      expect(screen.getByText(/no active budgets/i)).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(analyticsService.getBudgetSummary as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch budget summary' },
    })

    render(<BudgetStatusGrid />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load budget data/i)).toBeInTheDocument()
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
      // Component applies bg-green-500 to progress bar inner div for under 80% usage
      const progressBar = container.querySelector('.bg-green-500')
      expect(progressBar).toBeInTheDocument()
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
      // Component applies bg-red-500 to progress bar inner div for 100%+ usage
      const progressBar = container.querySelector('.bg-red-500')
      expect(progressBar).toBeInTheDocument()
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
      // Component applies bg-red-500 to progress bar inner div for 100% usage
      const progressBar = container.querySelector('.bg-red-500')
      expect(progressBar).toBeInTheDocument()
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
      // Component displays "Remaining" and amount separately
      expect(screen.getByText(/Remaining/i)).toBeInTheDocument()
      expect(screen.getByText(/\$200\.00/)).toBeInTheDocument()
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
      // Component displays "Over budget" and amount separately
      expect(screen.getByText(/Over budget/i)).toBeInTheDocument()
      expect(screen.getByText(/\$50\.00/)).toBeInTheDocument()
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
      // Component renders progress bar as inner div with width style
      const progressBar = container.querySelector('.bg-green-500')
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
      // Component caps width at 100% using Math.min
      const progressBar = container.querySelector('.bg-red-500')
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

  it('displays budgets in vertical layout', async () => {
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
      // Component uses space-y-4 container for vertical spacing
      const layoutContainer = container.querySelector('.space-y-4')
      expect(layoutContainer).toBeInTheDocument()
      expect(layoutContainer?.children).toHaveLength(2)
    })
  })

  it('displays budget information clearly', async () => {
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
      // Component displays all key budget information
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
      expect(screen.getByText(/\$300\.00/)).toBeInTheDocument()
      expect(screen.getByText(/\$500\.00/)).toBeInTheDocument()
    })
  })
})
