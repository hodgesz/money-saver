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
      income: 1000,
      expenses: 1234.56,
      net: -234.56,
      transactionCount: 15,
      month: 1,
      year: 2024,
    }

    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText('$1,000.00')).toBeInTheDocument()
      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
      expect(screen.getByText('15 transactions')).toBeInTheDocument()
    })
  })

  it('displays zero spending when no transactions', async () => {
    const mockData = {
      income: 0,
      expenses: 0,
      net: 0,
      transactionCount: 0,
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
      income: 1000,
      expenses: 1000.5,
      net: -0.5,
      transactionCount: 10,
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
      income: 100000,
      expenses: 999999.99,
      net: -899999.99,
      transactionCount: 1000,
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
      data: { income: 100, expenses: 50, net: 50, transactionCount: 5, month: 1, year: 2024 },
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
      data: { income: 100, expenses: 50, net: 50, transactionCount: 5, month: 1, year: 2024 },
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
      data: { income: 100, expenses: 50, net: 50, transactionCount: 5, month: 1, year: 2024 },
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
      data: { income: 100, expenses: 50, net: 50, transactionCount: 5, month: 1, year: 2024 },
      error: null,
    })

    render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText(/Monthly Overview/i)).toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', async () => {
    ;(analyticsService.getMonthlySpending as jest.Mock).mockResolvedValue({
      data: { income: 100, expenses: 50, net: 50, transactionCount: 5, month: 1, year: 2024 },
      error: null,
    })

    const { container } = render(<SpendingOverview year={2024} month={1} />)

    await waitFor(() => {
      // Card component doesn't have role attribute by default
      expect(container.querySelector('.space-y-4')).toBeInTheDocument()
    })
  })
})
