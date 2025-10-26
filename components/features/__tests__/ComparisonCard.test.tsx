import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ComparisonCard } from '../ComparisonCard'
import { analyticsService } from '@/lib/services/analytics'

jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getYearOverYearComparison: jest.fn(),
    getMonthOverMonthComparison: jest.fn(),
  },
}))

describe('ComparisonCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Year-over-Year Comparison', () => {
    it('displays loading state initially', () => {
      ;(analyticsService.getYearOverYearComparison as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      )

      render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('displays year-over-year comparison with increasing trend', async () => {
      const mockData = {
        current: {
          income: 5000,
          expenses: 500,
          net: 4500,
          transactionCount: 10,
          month: 3,
          year: 2024,
        },
        previous: {
          income: 4000,
          expenses: 400,
          net: 3600,
          transactionCount: 8,
          month: 3,
          year: 2023,
        },
        percentChange: 25,
        trend: 'increasing' as const,
      }

      ;(analyticsService.getYearOverYearComparison as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      const { container } = render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      await waitFor(() => {
        expect(screen.getByText(/Year-over-Year/i)).toBeInTheDocument()
        // Check for percentage in container text (handles split text nodes)
        expect(container.textContent).toContain('+25.0%')
        expect(screen.getByText('↑')).toBeInTheDocument()
        expect(screen.getByText(/Mar 2024/)).toBeInTheDocument()
        expect(screen.getByText(/Mar 2023/)).toBeInTheDocument()
        expect(screen.getByText('$500.00')).toBeInTheDocument()
        expect(screen.getByText('$400.00')).toBeInTheDocument()
      })
    })

    it('displays year-over-year comparison with decreasing trend', async () => {
      const mockData = {
        current: {
          income: 3000,
          expenses: 300,
          net: 2700,
          transactionCount: 5,
          month: 3,
          year: 2024,
        },
        previous: {
          income: 5000,
          expenses: 500,
          net: 4500,
          transactionCount: 10,
          month: 3,
          year: 2023,
        },
        percentChange: -40,
        trend: 'decreasing' as const,
      }

      ;(analyticsService.getYearOverYearComparison as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      const { container } = render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      await waitFor(() => {
        expect(container.textContent).toContain('-40.0%')
        expect(screen.getByText('↓')).toBeInTheDocument()
      })
    })

    it('displays stable trend with no change', async () => {
      const mockData = {
        current: {
          income: 5000,
          expenses: 500,
          net: 4500,
          transactionCount: 10,
          month: 3,
          year: 2024,
        },
        previous: {
          income: 5000,
          expenses: 500,
          net: 4500,
          transactionCount: 10,
          month: 3,
          year: 2023,
        },
        percentChange: 0,
        trend: 'stable' as const,
      }

      ;(analyticsService.getYearOverYearComparison as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      const { container } = render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      await waitFor(() => {
        expect(container.textContent).toContain('0.0%')
        expect(screen.getByText('→')).toBeInTheDocument()
      })
    })

    it('displays no data message when previous year has no data', async () => {
      const mockData = {
        current: {
          income: 5000,
          expenses: 500,
          net: 4500,
          transactionCount: 10,
          month: 3,
          year: 2024,
        },
        previous: {
          income: 0,
          expenses: 0,
          net: 0,
          transactionCount: 0,
          month: 3,
          year: 2023,
        },
        percentChange: 0,
        trend: 'no-data' as const,
      }

      ;(analyticsService.getYearOverYearComparison as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      await waitFor(() => {
        expect(screen.getByText(/No previous year data/i)).toBeInTheDocument()
      })
    })
  })

  describe('Month-over-Month Comparison', () => {
    it('displays month-over-month comparison', async () => {
      const mockData = {
        current: {
          income: 5000,
          expenses: 600,
          net: 4400,
          transactionCount: 12,
          month: 3,
          year: 2024,
        },
        previous: {
          income: 4500,
          expenses: 500,
          net: 4000,
          transactionCount: 10,
          month: 2,
          year: 2024,
        },
        percentChange: 20,
        trend: 'increasing' as const,
      }

      ;(analyticsService.getMonthOverMonthComparison as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      const { container } = render(<ComparisonCard type="month-over-month" year={2024} month={3} />)

      await waitFor(() => {
        expect(screen.getByText(/Month-over-Month/i)).toBeInTheDocument()
        expect(container.textContent).toContain('+20.0%')
        expect(screen.getByText(/Mar 2024/)).toBeInTheDocument()
        expect(screen.getByText(/Feb 2024/)).toBeInTheDocument()
      })
    })

    it('handles year boundary correctly (Jan comparing to Dec)', async () => {
      const mockData = {
        current: {
          income: 3000,
          expenses: 400,
          net: 2600,
          transactionCount: 8,
          month: 1,
          year: 2024,
        },
        previous: {
          income: 5000,
          expenses: 500,
          net: 4500,
          transactionCount: 10,
          month: 12,
          year: 2023,
        },
        percentChange: -20,
        trend: 'decreasing' as const,
      }

      ;(analyticsService.getMonthOverMonthComparison as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      })

      render(<ComparisonCard type="month-over-month" year={2024} month={1} />)

      await waitFor(() => {
        expect(screen.getByText(/Jan 2024/)).toBeInTheDocument()
        expect(screen.getByText(/Dec 2023/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when YoY fetch fails', async () => {
      ;(analyticsService.getYearOverYearComparison as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      })
    })

    it('displays error message when MoM fetch fails', async () => {
      ;(analyticsService.getMonthOverMonthComparison as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      render(<ComparisonCard type="month-over-month" year={2024} month={3} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Refetch', () => {
    it('refetches data when year changes', async () => {
      const mockGetYoY = jest.fn().mockResolvedValue({
        data: {
          current: { income: 5000, expenses: 500, net: 4500, transactionCount: 10, month: 3, year: 2024 },
          previous: { income: 4000, expenses: 400, net: 3600, transactionCount: 8, month: 3, year: 2023 },
          percentChange: 25,
          trend: 'increasing' as const,
        },
        error: null,
      })

      ;(analyticsService.getYearOverYearComparison as jest.Mock) = mockGetYoY

      const { rerender } = render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      await waitFor(() => {
        expect(mockGetYoY).toHaveBeenCalledWith(2024, 3)
      })

      rerender(<ComparisonCard type="year-over-year" year={2025} month={3} />)

      await waitFor(() => {
        expect(mockGetYoY).toHaveBeenCalledWith(2025, 3)
        expect(mockGetYoY).toHaveBeenCalledTimes(2)
      })
    })

    it('refetches data when month changes', async () => {
      const mockGetYoY = jest.fn().mockResolvedValue({
        data: {
          current: { income: 5000, expenses: 500, net: 4500, transactionCount: 10, month: 3, year: 2024 },
          previous: { income: 4000, expenses: 400, net: 3600, transactionCount: 8, month: 3, year: 2023 },
          percentChange: 25,
          trend: 'increasing' as const,
        },
        error: null,
      })

      ;(analyticsService.getYearOverYearComparison as jest.Mock) = mockGetYoY

      const { rerender } = render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      await waitFor(() => {
        expect(mockGetYoY).toHaveBeenCalledWith(2024, 3)
      })

      rerender(<ComparisonCard type="year-over-year" year={2024} month={4} />)

      await waitFor(() => {
        expect(mockGetYoY).toHaveBeenCalledWith(2024, 4)
        expect(mockGetYoY).toHaveBeenCalledTimes(2)
      })
    })

    it('refetches data when comparison type changes', async () => {
      const mockGetYoY = jest.fn().mockResolvedValue({
        data: {
          current: { income: 5000, expenses: 500, net: 4500, transactionCount: 10, month: 3, year: 2024 },
          previous: { income: 4000, expenses: 400, net: 3600, transactionCount: 8, month: 3, year: 2023 },
          percentChange: 25,
          trend: 'increasing' as const,
        },
        error: null,
      })

      const mockGetMoM = jest.fn().mockResolvedValue({
        data: {
          current: { income: 5000, expenses: 500, net: 4500, transactionCount: 10, month: 3, year: 2024 },
          previous: { income: 4500, expenses: 450, net: 4050, transactionCount: 9, month: 2, year: 2024 },
          percentChange: 11.11,
          trend: 'increasing' as const,
        },
        error: null,
      })

      ;(analyticsService.getYearOverYearComparison as jest.Mock) = mockGetYoY
      ;(analyticsService.getMonthOverMonthComparison as jest.Mock) = mockGetMoM

      const { rerender } = render(<ComparisonCard type="year-over-year" year={2024} month={3} />)

      await waitFor(() => {
        expect(mockGetYoY).toHaveBeenCalledTimes(1)
      })

      rerender(<ComparisonCard type="month-over-month" year={2024} month={3} />)

      await waitFor(() => {
        expect(mockGetMoM).toHaveBeenCalledTimes(1)
      })
    })
  })
})
