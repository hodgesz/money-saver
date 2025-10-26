import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { SavingsRateCard } from '../SavingsRateCard'
import { analyticsService } from '@/lib/services/analytics'

jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getSavingsRate: jest.fn(),
  },
}))

describe('SavingsRateCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays loading state initially', () => {
    ;(analyticsService.getSavingsRate as jest.Mock).mockReturnValue(
      new Promise(() => {}) // Never resolves
    )

    render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays savings rate with positive savings', async () => {
    const mockData = {
      savingsRate: 30,
      totalIncome: 5000,
      totalExpenses: 3500,
      netSavings: 1500,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(screen.getAllByText(/Savings Rate/i)[0]).toBeInTheDocument()
      expect(container.textContent).toContain('30.0%')
      expect(screen.getByText('$5,000.00')).toBeInTheDocument() // Income
      expect(screen.getByText('$3,500.00')).toBeInTheDocument() // Expenses
      expect(screen.getByText('$1,500.00')).toBeInTheDocument() // Net Savings
    })
  })

  it('displays negative savings rate when expenses exceed income', async () => {
    const mockData = {
      savingsRate: -50,
      totalIncome: 1000,
      totalExpenses: 1500,
      netSavings: -500,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(container.textContent).toContain('-50.0%')
      // Check for negative amount display
      expect(screen.getByText(/\$500\.00/)).toBeInTheDocument()
    })
  })

  it('displays 0% savings rate when income equals expenses', async () => {
    const mockData = {
      savingsRate: 0,
      totalIncome: 1000,
      totalExpenses: 1000,
      netSavings: 0,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(container.textContent).toContain('0.0%')
      // $1,000.00 appears twice (Income and Expenses)
      expect(screen.getAllByText('$1,000.00').length).toBe(2)
    })
  })

  it('displays 100% savings rate when no expenses', async () => {
    const mockData = {
      savingsRate: 100,
      totalIncome: 5000,
      totalExpenses: 0,
      netSavings: 5000,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(container.textContent).toContain('100.0%')
      // $5,000.00 appears twice (Income and Net Savings when expenses are $0)
      expect(screen.getAllByText('$5,000.00').length).toBe(2)
    })
  })

  it('displays 0% when no income', async () => {
    const mockData = {
      savingsRate: 0,
      totalIncome: 0,
      totalExpenses: 500,
      netSavings: -500,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(container.textContent).toContain('0.0%')
      expect(screen.getByText('$500.00')).toBeInTheDocument()
    })
  })

  it('handles multiple income and expense transactions', async () => {
    const mockData = {
      savingsRate: 60,
      totalIncome: 5000,
      totalExpenses: 2000,
      netSavings: 3000,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(container.textContent).toContain('60.0%')
      expect(screen.getByText('$5,000.00')).toBeInTheDocument()
      expect(screen.getByText('$2,000.00')).toBeInTheDocument()
      expect(screen.getByText('$3,000.00')).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('displays empty state when no data available', async () => {
    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    })

    render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(screen.getByText(/no data available/i)).toBeInTheDocument()
    })
  })

  it('refetches data when date range changes', async () => {
    const mockGetSavingsRate = jest.fn().mockResolvedValue({
      data: { savingsRate: 30, totalIncome: 5000, totalExpenses: 3500, netSavings: 1500 },
      error: null,
    })

    ;(analyticsService.getSavingsRate as jest.Mock) = mockGetSavingsRate

    const { rerender } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(mockGetSavingsRate).toHaveBeenCalledWith('2024-03-01', '2024-03-31')
    })

    rerender(<SavingsRateCard startDate="2024-04-01" endDate="2024-04-30" />)

    await waitFor(() => {
      expect(mockGetSavingsRate).toHaveBeenCalledWith('2024-04-01', '2024-04-30')
      expect(mockGetSavingsRate).toHaveBeenCalledTimes(2)
    })
  })

  it('displays correct color for positive savings (green)', async () => {
    const mockData = {
      savingsRate: 40,
      totalIncome: 5000,
      totalExpenses: 3000,
      netSavings: 2000,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      // Check for green color classes indicating positive savings
      const greenElements = container.querySelectorAll('.text-green-600, .bg-green-50')
      expect(greenElements.length).toBeGreaterThan(0)
    })
  })

  it('displays correct color for negative savings (red)', async () => {
    const mockData = {
      savingsRate: -30,
      totalIncome: 1000,
      totalExpenses: 1300,
      netSavings: -300,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      // Check for red color classes indicating negative savings
      const redElements = container.querySelectorAll('.text-red-600, .bg-red-50')
      expect(redElements.length).toBeGreaterThan(0)
    })
  })

  it('formats large amounts correctly', async () => {
    const mockData = {
      savingsRate: 45,
      totalIncome: 100000,
      totalExpenses: 55000,
      netSavings: 45000,
    }

    ;(analyticsService.getSavingsRate as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<SavingsRateCard startDate="2024-03-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(screen.getByText('$100,000.00')).toBeInTheDocument()
      expect(screen.getByText('$55,000.00')).toBeInTheDocument()
      expect(screen.getByText('$45,000.00')).toBeInTheDocument()
    })
  })
})
