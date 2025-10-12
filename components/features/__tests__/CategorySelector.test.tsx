import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySelector } from '../CategorySelector'
import { categoryService } from '@/lib/services/categories'
import type { Category } from '@/types'

// Mock category service
jest.mock('@/lib/services/categories', () => ({
  categoryService: {
    getCategories: jest.fn(),
  },
}))

describe('CategorySelector', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      user_id: null,
      name: 'Groceries',
      color: '#10b981',
      icon: 'shopping-cart',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cat-2',
      user_id: null,
      name: 'Dining',
      color: '#f59e0b',
      icon: 'utensils',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cat-3',
      user_id: 'user-123',
      name: 'Custom Category',
      color: '#8b5cf6',
      icon: 'star',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ]

  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
      data: mockCategories,
      error: null,
    })
  })

  it('should render loading state initially', async () => {
    render(<CategorySelector value="" onChange={mockOnChange} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Wait for loading to complete to avoid act() warnings
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  it('should load and display categories', async () => {
    render(<CategorySelector value="" onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    expect(categoryService.getCategories).toHaveBeenCalled()
  })

  it('should display all categories in the dropdown', async () => {
    render(<CategorySelector value="" onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')

    expect(screen.getByText(/Groceries/i)).toBeInTheDocument()
    expect(screen.getByText(/Dining/i)).toBeInTheDocument()
    expect(screen.getByText(/Custom Category/i)).toBeInTheDocument()
  })

  it('should call onChange when a category is selected', async () => {
    const user = userEvent.setup()
    render(<CategorySelector value="" onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'cat-1')

    expect(mockOnChange).toHaveBeenCalledWith('cat-1')
  })

  it('should display the selected category', async () => {
    render(<CategorySelector value="cat-2" onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('cat-2')
  })

  it('should display error message when loading fails', async () => {
    const mockError = { message: 'Failed to load categories' }
    ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
      data: null,
      error: mockError,
    })

    render(<CategorySelector value="" onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument()
    })
  })

  it('should include a placeholder option when no value is selected', async () => {
    render(<CategorySelector value="" onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    expect(screen.getByText(/select a category/i)).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', async () => {
    render(<CategorySelector value="" onChange={mockOnChange} disabled />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
  })

  it('should display label when provided', async () => {
    render(
      <CategorySelector
        value=""
        onChange={mockOnChange}
        label="Transaction Category"
      />
    )

    // Label is rendered immediately
    expect(screen.getByText('Transaction Category')).toBeInTheDocument()

    // Wait for component to finish loading to avoid act() warnings
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  it('should display error message when error prop is provided', async () => {
    render(
      <CategorySelector
        value=""
        onChange={mockOnChange}
        error="Category is required"
      />
    )

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    // Error message should be displayed
    expect(screen.getByText('Category is required')).toBeInTheDocument()
  })

  it('should group system and custom categories', async () => {
    render(<CategorySelector value="" onChange={mockOnChange} showGroups />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    // Check for optgroup elements
    const select = screen.getByRole('combobox')
    const groups = select.querySelectorAll('optgroup')

    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveAttribute('label', 'System Categories')
    expect(groups[1]).toHaveAttribute('label', 'Custom Categories')
  })

  it('should handle empty categories list', async () => {
    ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<CategorySelector value="" onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByText(/no categories available/i)).toBeInTheDocument()
    })
  })
})
