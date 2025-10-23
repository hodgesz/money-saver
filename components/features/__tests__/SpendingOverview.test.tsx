import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { SpendingOverview } from '../SpendingOverview'
import { analyticsService } from '@/lib/services/analytics'

jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getMonthlySpending: jest.fn(),
  },
}))

describe('SpendingOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays loading state initially', () => {
    ;(analyticsService.getMonthlySpending as jest.Mock).mockReturnValue(
      new Promise(() => {}) // Never resolves
    )

    render(<SpendingOverview year={2024} month={1} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays spending data when loaded successfully', async () => {
    const mockData = {
      total: 1234.56,
      count: 15,
      month: 1,
      year: 2024,
    }

    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
      expect(screen.getByText('15 transactions')).toBeInTheDocument()
    })
  })

  it('displays zero spending when no transactions', async () => {
    const mockData = {
      total: 0,
      count: 0,
      month: 1,
      year: 2024,
    }

    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText('$0.00')).toBeInTheDocument()
      expect(screen.getByText('0 transactions')).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch spending data' },
    })

    render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
    })
  })

  it('formats currency correctly', async () => {
    const mockData = {
      total: 1000.5,
      count: 10,
      month: 1,
      year: 2024,
    }

    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText('$1,000.50')).toBeInTheDocument()
    })
  })

  it('handles large amounts correctly', async () => {
    const mockData = {
      total: 999999.99,
      count: 1000,
      month: 12,
      year: 2024,
    }

    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<SpendingOverview year={2024} month={12} />)

    await waitFor(() => {
      expect(screen.getByText('$999,999.99')).toBeInTheDocument()
      expect(screen.getByText('1,000 transactions')).toBeInTheDocument()
    })
  })

  it('fetches data on mount', async () => {
    const mockGetMonthlySpending = jest.fn().mockResolvedValue({
      data: { total: 100, count: 5, month: 1, year: 2024 },
      error: null,
    })

    ;(analyticsService.getMonthlySpending as jest.Mock) = mockGetMonthlySpending

    render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(mockGetMonthlySpending).toHaveBeenCalledWith(2024, 1)
      expect(mockGetMonthlySpending).toHaveBeenCalledTimes(1)
    })
  })

  it('refetches data when year changes', async () => {
    const mockGetMonthlySpending = jest.fn().mockResolvedValue({
      data: { total: 100, count: 5, month: 1, year: 2024 },
      error: null,
    })

    ;(analyticsService.getMonthlySpending as jest.Mock) = mockGetMonthlySpending

    const { rerender } = render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(mockGetMonthlySpending).toHaveBeenCalledWith(2024, 1)
    })

    rerender(<SpendingOverview year={2025} month={1} />)

    await waitFor(() => {
      expect(mockGetMonthlySpending).toHaveBeenCalledWith(2025, 1)
      expect(mockGetMonthlySpending).toHaveBeenCalledTimes(2)
    })
  })

  it('refetches data when month changes', async () => {
    const mockGetMonthlySpending = jest.fn().mockResolvedValue({
      data: { total: 100, count: 5, month: 1, year: 2024 },
      error: null,
    })

    ;(analyticsService.getMonthlySpending as jest.Mock) = mockGetMonthlySpending

    const { rerender } = render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(mockGetMonthlySpending).toHaveBeenCalledWith(2024, 1)
    })

    rerender(<SpendingOverview year={2024} month={2} />)

    await waitFor(() => {
      expect(mockGetMonthlySpending).toHaveBeenCalledWith(2024, 2)
      expect(mockGetMonthlySpending).toHaveBeenCalledTimes(2)
    })
  })

  it('displays month name in heading', async () => {
    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: { total: 100, count: 5, month: 1, year: 2024 },
      error: null,
    })

    render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText(/January 2024/i)).toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', async () => {
    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: { total: 100, count: 5, month: 1, year: 2024 },
      error: null,
    })

    const { container } = render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      const card = container.querySelector('[role="region"]')
      expect(card).toHaveAttribute('aria-label', 'Spending overview')
    })
  })
})
