/**
 * CategoryTrendsChart Component Tests - Phase 2.3
 * Line chart showing category spending trends over time
 */

import { render, screen, waitFor } from '@testing-library/react'
import { CategoryTrendsChart } from '../CategoryTrendsChart'
import { analyticsService } from '@/lib/services/analytics'

jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getCategoryTrends: jest.fn(),
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

describe('CategoryTrendsChart', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should display loading state', () => {
    ;(analyticsService.getCategoryTrends as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(<CategoryTrendsChart startDate="2024-01-01" endDate="2024-12-31" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display category trends data', async () => {
    const mockData = [
      {
        month: '2024-01',
        monthLabel: 'Jan 2024',
        categories: {
          'cat-1': { name: 'Groceries', total: 500, color: '#10b981' },
        },
      },
    ]

    ;(analyticsService.getCategoryTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<CategoryTrendsChart startDate="2024-01-01" endDate="2024-01-31" />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText(/category spending trends/i)).toBeInTheDocument()
  })

  it('should display error message on failure', async () => {
    ;(analyticsService.getCategoryTrends as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed' },
    })

    render(<CategoryTrendsChart startDate="2024-01-01" endDate="2024-12-31" />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no data', async () => {
    ;(analyticsService.getCategoryTrends as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<CategoryTrendsChart startDate="2024-01-01" endDate="2024-12-31" />)

    await waitFor(() => {
      expect(screen.getByText(/no data available/i)).toBeInTheDocument()
    })
  })
})
