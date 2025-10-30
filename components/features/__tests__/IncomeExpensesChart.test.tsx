/**
 * IncomeExpensesChart Component Tests - Phase 2.3
 * Area chart showing income vs expenses timeline
 */

import { render, screen, waitFor } from '@testing-library/react'
import { IncomeExpensesChart } from '../IncomeExpensesChart'
import { analyticsService } from '@/lib/services/analytics'

jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getIncomeExpenseTimeline: jest.fn(),
  },
}))

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts')
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

describe('IncomeExpensesChart', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should display loading state', () => {
    ;(analyticsService.getIncomeExpenseTimeline as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(<IncomeExpensesChart startDate="2024-01-01" endDate="2024-12-31" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display income vs expenses timeline', async () => {
    const mockData = [
      { month: '2024-01', monthLabel: 'Jan 2024', income: 3000, expenses: 2000, net: 1000 },
    ]

    ;(analyticsService.getIncomeExpenseTimeline as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<IncomeExpensesChart startDate="2024-01-01" endDate="2024-01-31" />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText(/income vs expenses/i)).toBeInTheDocument()
  })

  it('should display error message on failure', async () => {
    ;(analyticsService.getIncomeExpenseTimeline as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed' },
    })

    render(<IncomeExpensesChart startDate="2024-01-01" endDate="2024-12-31" />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no data', async () => {
    ;(analyticsService.getIncomeExpenseTimeline as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<IncomeExpensesChart startDate="2024-01-01" endDate="2024-12-31" />)

    await waitFor(() => {
      expect(screen.getByText(/no data available/i)).toBeInTheDocument()
    })
  })
})
