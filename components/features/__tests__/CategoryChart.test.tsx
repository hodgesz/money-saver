import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { CategoryChart } from '../CategoryChart'
import { analyticsService } from '@/lib/services/analytics'

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => <div data-testid="pie" data-length={data?.length} />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

jest.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getCategoryBreakdown: jest.fn(),
  },
}))

describe('CategoryChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays loading state initially', () => {
    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockReturnValue(
      new Promise(() => {})
    )

    render(<CategoryChart year={2024} month={1} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays chart when data is loaded', async () => {
    const mockData = {
      'cat-1': { total: 500, count: 10, percentage: 50, name: 'Category 1' },
      'cat-2': { total: 300, count: 5, percentage: 30, name: 'Category 2' },
      'cat-3': { total: 200, count: 3, percentage: 20, name: 'Category 3' },
    }

    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '3')
    })
  })

  it('displays empty state when no categories', async () => {
    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    })

    render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText(/no spending data/i)).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch categories' },
    })

    render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load category data/i)).toBeInTheDocument()
    })
  })

  it('renders correct number of categories', async () => {
    const mockData = {
      'cat-1': { total: 100, count: 2, percentage: 33.33, name: 'Category 1' },
      'cat-2': { total: 100, count: 2, percentage: 33.33, name: 'Category 2' },
      'cat-3': { total: 100, count: 2, percentage: 33.34, name: 'Category 3' },
    }

    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      const pie = screen.getByTestId('pie')
      expect(pie).toHaveAttribute('data-length', '3')
    })
  })

  it('displays category names and amounts', async () => {
    const mockData = {
      'cat-groceries': { total: 500, count: 10, percentage: 50, name: 'Groceries' },
      'cat-transport': { total: 300, count: 5, percentage: 30, name: 'Transport' },
    }

    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('$500.00')).toBeInTheDocument()
      expect(screen.getByText('(50%)')).toBeInTheDocument()
      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('$300.00')).toBeInTheDocument()
      expect(screen.getByText('(30%)')).toBeInTheDocument()
    })
  })

  it('fetches data on mount', async () => {
    const mockGetCategoryBreakdown = jest.fn().mockResolvedValue({
      data: {},
      error: null,
    })

    ;(analyticsService.getCategoryBreakdown as jest.Mock) = mockGetCategoryBreakdown

    render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      expect(mockGetCategoryBreakdown).toHaveBeenCalledWith(2024, 1)
      expect(mockGetCategoryBreakdown).toHaveBeenCalledTimes(1)
    })
  })

  it('refetches when year or month changes', async () => {
    const mockGetCategoryBreakdown = jest.fn().mockResolvedValue({
      data: {},
      error: null,
    })

    ;(analyticsService.getCategoryBreakdown as jest.Mock) = mockGetCategoryBreakdown

    const { rerender } = render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      expect(mockGetCategoryBreakdown).toHaveBeenCalledWith(2024, 1)
    })

    rerender(<CategoryChart year={2024} month={2} />)

    await waitFor(() => {
      expect(mockGetCategoryBreakdown).toHaveBeenCalledWith(2024, 2)
      expect(mockGetCategoryBreakdown).toHaveBeenCalledTimes(2)
    })
  })

  it('formats large amounts correctly', async () => {
    const mockData = {
      'cat-large': { total: 12345.67, count: 100, percentage: 100, name: 'Category' },
    }

    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      // Component uses toFixed(2) without thousand separators
      expect(screen.getByText(/\$12345\.67/)).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
    })
  })

  it('sorts categories by total amount descending', async () => {
    const mockData = {
      'cat-small': { total: 100, count: 5, percentage: 10, name: 'Small' },
      'cat-large': { total: 800, count: 20, percentage: 80, name: 'Large' },
      'cat-medium': { total: 100, count: 5, percentage: 10, name: 'Medium' },
    }

    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      const categoryTexts = screen.getAllByText(/\$\d+/)
      expect(categoryTexts[0]).toHaveTextContent('$800.00')
      expect(categoryTexts[1]).toHaveTextContent('$100.00')
      expect(categoryTexts[2]).toHaveTextContent('$100.00')
    })
  })

  it('has proper accessibility attributes', async () => {
    const mockData = {
      'cat-test': { total: 100, count: 5, percentage: 100, name: 'Category' },
    }

    ;(analyticsService.getCategoryBreakdown as jest.Mock).mockResolvedValue({
      data: mockData,
      error: null,
    })

    const { container } = render(<CategoryChart year={2024} month={1} />)

    await waitFor(() => {
      const chart = container.querySelector('[role="img"]')
      expect(chart).toHaveAttribute('aria-label', 'Category spending breakdown')
    })
  })
})
