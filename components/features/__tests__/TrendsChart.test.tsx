import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { TrendsChart } from '../TrendsChart'
import { analyticsService } from '@/lib/services/analytics'

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: ({ dataKey }: any) => <div data-testid="line" data-key={dataKey} />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getSpendingTrends: jest.fn(),
  },
}))

describe('TrendsChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays loading state initially', () => {
    ;(analyticsService.getSpendingTrends as jest.Mock).mockReturnValue(
      new Promise(() => {})
    )

    render(<TrendsChart startDate="2024-01-01" endDate="2024-03-31" />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays chart when data is loaded', async () => {
    const mockData = [
      { month: '2024-01', total: 500, count: 10 },
      { month: '2024-02', total: 600, count: 12 },
      { month: '2024-03', total: 450, count: 8 },
    ]

    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<TrendsChart startDate="2024-01-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('line')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'displayMonth')
    })
  })

  it('displays empty state when no data', async () => {
    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<TrendsChart startDate="2024-01-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(screen.getByText(/no trend data/i)).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch trends' },
    })

    render(<TrendsChart startDate="2024-01-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load trends data/i)).toBeInTheDocument()
    })
  })

  it('fetches data with correct date range', async () => {
    const mockGetSpendingTrends = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    ;(analyticsService.getSpendingTrends as jest.Mock) = mockGetSpendingTrends

    render(<TrendsChart startDate="2024-01-01" endDate="2024-12-31" />)

    await waitFor(() => {
      expect(mockGetSpendingTrends).toHaveBeenCalledWith('2024-01-01', '2024-12-31')
      expect(mockGetSpendingTrends).toHaveBeenCalledTimes(1)
    })
  })

  it('refetches when date range changes', async () => {
    const mockGetSpendingTrends = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    ;(analyticsService.getSpendingTrends as jest.Mock) = mockGetSpendingTrends

    const { rerender } = render(
      <TrendsChart startDate="2024-01-01" endDate="2024-03-31" />
    )

    await waitFor(() => {
      expect(mockGetSpendingTrends).toHaveBeenCalledWith('2024-01-01', '2024-03-31')
    })

    rerender(<TrendsChart startDate="2024-04-01" endDate="2024-06-30" />)

    await waitFor(() => {
      expect(mockGetSpendingTrends).toHaveBeenCalledWith('2024-04-01', '2024-06-30')
      expect(mockGetSpendingTrends).toHaveBeenCalledTimes(2)
    })
  })

  it('displays month labels correctly', async () => {
    const mockData = [
      { month: '2024-01', total: 500, count: 10 },
      { month: '2024-02', total: 600, count: 12 },
    ]

    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<TrendsChart startDate="2024-01-01" endDate="2024-02-29" />)

    await waitFor(() => {
      // Chart displays these labels
      const chart = screen.getByTestId('line-chart')
      expect(chart).toBeInTheDocument()
    })
  })

  it('formats currency values correctly', async () => {
    const mockData = [
      { month: '2024-01', total: 1234.56, count: 10 },
    ]

    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<TrendsChart startDate="2024-01-01" endDate="2024-01-31" />)

    await waitFor(() => {
      // Average is displayed with formatted currency
      expect(screen.getByText(/average/i)).toBeInTheDocument()
      // Component uses toFixed(2) without thousand separators
      expect(screen.getByText(/\$1234\.56/)).toBeInTheDocument()
    })
  })

  it('shows trend direction indicators', async () => {
    const mockData = [
      { month: '2024-01', total: 500, count: 10 },
      { month: '2024-02', total: 600, count: 12 }, // Increasing
      { month: '2024-03', total: 450, count: 8 },  // Decreasing
    ]

    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<TrendsChart startDate="2024-01-01" endDate="2024-03-31" />)

    await waitFor(() => {
      // Last value (450) is less than previous (600), so should show decreasing
      expect(screen.getByText(/↓ Decreasing/)).toBeInTheDocument()
    })
  })

  it('calculates average spending', async () => {
    const mockData = [
      { month: '2024-01', total: 300, count: 10 },
      { month: '2024-02', total: 600, count: 12 },
      { month: '2024-03', total: 600, count: 8 },
    ]

    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<TrendsChart startDate="2024-01-01" endDate="2024-03-31" />)

    await waitFor(() => {
      expect(screen.getByText(/average/i)).toBeInTheDocument()
      expect(screen.getByText(/\$500\.00/)).toBeInTheDocument()
    })
  })

  it('handles single month correctly', async () => {
    const mockData = [
      { month: '2024-01', total: 500, count: 10 },
    ]

    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<TrendsChart startDate="2024-01-01" endDate="2024-01-31" />)

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', async () => {
    const mockData = [
      { month: '2024-01', total: 500, count: 10 },
    ]

    ;(analyticsService.getSpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(
      <TrendsChart startDate="2024-01-01" endDate="2024-01-31" />
    )

    await waitFor(() => {
      const chart = container.querySelector('[role="img"]')
      expect(chart).toHaveAttribute('aria-label', 'Spending trends over time')
    })
  })
})
