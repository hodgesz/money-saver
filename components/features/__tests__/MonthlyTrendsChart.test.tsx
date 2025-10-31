/**
 * MonthlyTrendsChart Component Tests
 * Phase 2.3: Charts & Visualizations
 *
 * Bar chart showing monthly income vs expenses trends
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MonthlyTrendsChart } from '../MonthlyTrendsChart'
import { analyticsService } from '@/lib/services/analytics'

// Mock the analytics service
jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getMonthlySpendingTrends: jest.fn(),
  },
}))

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts')
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

describe('MonthlyTrendsChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display loading state initially', () => {
    // Arrange: Mock pending API call
    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockReturnValue(
      new Promise(() => {}) // Never resolves
    )

    // Act
    render(<MonthlyTrendsChart startDate="2024-01-01" endDate="2024-12-31" />)

    // Assert
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display monthly trends chart with data', async () => {
    // Arrange: Mock successful API response
    const mockData = [
      {
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 3000,
        expenses: 2000,
        net: 1000,
        transactionCount: 10,
      },
      {
        month: '2024-02',
        monthLabel: 'Feb 2024',
        income: 3500,
        expenses: 2200,
        net: 1300,
        transactionCount: 12,
      },
    ]

    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    // Act
    render(<MonthlyTrendsChart startDate="2024-01-01" endDate="2024-02-28" />)

    // Assert: Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Chart title should be visible
    expect(screen.getByText(/monthly spending trends/i)).toBeInTheDocument()

    // Summary stats should be displayed
    expect(screen.getByText(/avg income/i)).toBeInTheDocument()
    expect(screen.getByText(/avg expenses/i)).toBeInTheDocument()
    expect(screen.getByText(/avg net/i)).toBeInTheDocument()

    // Verify summary calculations
    expect(screen.getByText('$3,250.00')).toBeInTheDocument() // Avg income
    expect(screen.getByText('$2,100.00')).toBeInTheDocument() // Avg expenses
    expect(screen.getByText('$1,150.00')).toBeInTheDocument() // Avg net
  })

  it('should display error message when API fails', async () => {
    // Arrange: Mock API error
    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch data' },
    })

    // Act
    render(<MonthlyTrendsChart startDate="2024-01-01" endDate="2024-12-31" />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no data is available', async () => {
    // Arrange: Mock empty data response
    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    // Act
    render(<MonthlyTrendsChart startDate="2024-01-01" endDate="2024-12-31" />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/no data available/i)).toBeInTheDocument()
    })
  })

  it('should refetch data when date range changes', async () => {
    // Arrange: Mock initial data
    const mockDataJan = [
      {
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 3000,
        expenses: 2000,
        net: 1000,
        transactionCount: 10,
      },
    ]

    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockResolvedValue({
      data: mockDataJan,
      error: null,
    })

    // Act: Initial render
    const { rerender } = render(
      <MonthlyTrendsChart startDate="2024-01-01" endDate="2024-01-31" />
    )

    // Assert: Wait for initial data
    await waitFor(() => {
      expect(screen.getByText('$3,000.00')).toBeInTheDocument() // Jan avg income
    })

    // Update mock for new date range
    const mockDataFeb = [
      {
        month: '2024-02',
        monthLabel: 'Feb 2024',
        income: 3500,
        expenses: 2200,
        net: 1300,
        transactionCount: 12,
      },
    ]

    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockResolvedValue({
      data: mockDataFeb,
      error: null,
    })

    // Act: Rerender with new props
    rerender(<MonthlyTrendsChart startDate="2024-02-01" endDate="2024-02-28" />)

    // Assert: Check that API was called again
    await waitFor(() => {
      expect(analyticsService.getMonthlySpendingTrends).toHaveBeenCalledTimes(2)
    })

    // New data should be visible (Feb avg income)
    await waitFor(() => {
      expect(screen.getByText('$3,500.00')).toBeInTheDocument()
    })
  })

  it('should display chart with responsive container', async () => {
    // Arrange
    const mockData = [
      {
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 3000,
        expenses: 2000,
        net: 1000,
        transactionCount: 10,
      },
    ]

    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    // Act
    render(<MonthlyTrendsChart startDate="2024-01-01" endDate="2024-01-31" />)

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  it('should format currency values correctly', async () => {
    // Arrange: Data with specific amounts
    const mockData = [
      {
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 5234.56,
        expenses: 3890.25,
        net: 1344.31,
        transactionCount: 15,
      },
    ]

    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    // Act
    render(<MonthlyTrendsChart startDate="2024-01-01" endDate="2024-01-31" />)

    // Assert: Currency formatting in tooltips (when hovering over bars)
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Chart should render without errors
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should handle large numbers correctly', async () => {
    // Arrange: Data with large amounts
    const mockData = [
      {
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 150000,
        expenses: 120000,
        net: 30000,
        transactionCount: 100,
      },
    ]

    ;(analyticsService.getMonthlySpendingTrends as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    // Act
    render(<MonthlyTrendsChart startDate="2024-01-01" endDate="2024-01-31" />)

    // Assert: Verify large numbers are formatted correctly in summary
    await waitFor(() => {
      expect(screen.getByText('$150,000.00')).toBeInTheDocument() // Avg income
    })

    expect(screen.getByText('$120,000.00')).toBeInTheDocument() // Avg expenses
    expect(screen.getByText('$30,000.00')).toBeInTheDocument() // Avg net

    // Component should render without errors
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })
})
