import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryList } from '../CategoryList'
import type { Category } from '@/types'

// Mock category data
const mockCategories: Category[] = [
  {
    id: '1',
    user_id: null, // System category
    name: 'Groceries',
    color: '#10b981',
    icon: 'shopping-cart',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-123',
    name: 'Custom Category',
    color: '#3b82f6',
    icon: 'star',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    user_id: 'user-123',
    name: 'Entertainment',
    color: '#8b5cf6',
    icon: 'film',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
]

describe('CategoryList', () => {
  describe('Rendering', () => {
    it('renders category list with data', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Custom Category')).toBeInTheDocument()
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
    })

    it('displays category colors', () => {
      const { container } = render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Check that color indicators are present
      const colorElements = container.querySelectorAll('[data-testid="category-color"]')
      expect(colorElements.length).toBe(3)
    })

    it('distinguishes between system and user categories', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // System categories should show "System" badge
      expect(screen.getByText('System')).toBeInTheDocument()

      // Check data attributes on category items
      const groceriesItem = screen.getByText('Groceries').closest('[data-testid="category-item"]')
      expect(groceriesItem).toHaveAttribute('data-is-system', 'true')

      const customItem = screen.getByText('Custom Category').closest('[data-testid="category-item"]')
      expect(customItem).toHaveAttribute('data-is-system', 'false')
    })

    it('renders edit and delete buttons for user categories only', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })

      // Should have 2 edit and 2 delete buttons (only for user categories)
      expect(editButtons).toHaveLength(2)
      expect(deleteButtons).toHaveLength(2)
    })

    it('does not render edit/delete buttons for system categories', () => {
      render(
        <CategoryList
          categories={[mockCategories[0]]} // Only system category
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state message when no categories', () => {
      render(
        <CategoryList
          categories={[]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/no categories found/i)).toBeInTheDocument()
    })

    it('shows helpful message in empty state', () => {
      render(
        <CategoryList
          categories={[]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/add your first custom category/i)).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(
        <CategoryList
          categories={[]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          isLoading={true}
        />
      )

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('does not show categories when loading', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          isLoading={true}
        />
      )

      expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      render(
        <CategoryList
          categories={[]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          error="Failed to load categories"
        />
      )

      expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument()
    })

    it('does not show categories when there is an error', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          error="Some error"
        />
      )

      expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onEdit with category when edit button is clicked', async () => {
      const user = userEvent.setup()
      const onEdit = jest.fn()

      render(
        <CategoryList
          categories={mockCategories}
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      expect(onEdit).toHaveBeenCalledWith(mockCategories[1]) // First user category
    })

    it('calls onDelete with category id when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onDelete = jest.fn()

      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      )

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      expect(onDelete).toHaveBeenCalledWith(mockCategories[1].id) // First user category
    })
  })

  describe('Sorting', () => {
    it('renders sort dropdown', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
    })

    it('has sort options for name and created date', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByRole('option', { name: /name/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /created/i })).toBeInTheDocument()
    })

    it('sorts categories by name alphabetically by default', () => {
      const { container } = render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const categoryItems = container.querySelectorAll('[data-testid="category-item"]')

      // Check order: Custom Category, Entertainment, Groceries (alphabetical)
      expect(categoryItems[0]).toHaveTextContent('Custom Category')
      expect(categoryItems[1]).toHaveTextContent('Entertainment')
      expect(categoryItems[2]).toHaveTextContent('Groceries')
    })

    it('sorts categories by created date when created sort is selected', async () => {
      const user = userEvent.setup()

      const { container } = render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      await user.selectOptions(screen.getByLabelText(/sort by/i), 'created')

      await waitFor(() => {
        const categoryItems = container.querySelectorAll('[data-testid="category-item"]')

        // Newest first (2024-01-03, 2024-01-02, 2024-01-01)
        expect(categoryItems[0]).toHaveTextContent('Entertainment')
      })
    })
  })

  describe('Filtering', () => {
    it('renders search input', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByPlaceholderText(/search categories/i)).toBeInTheDocument()
    })

    it('filters categories by search term', async () => {
      const user = userEvent.setup()

      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search categories/i)
      await user.type(searchInput, 'groceries')

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
        expect(screen.queryByText('Custom Category')).not.toBeInTheDocument()
        expect(screen.queryByText('Entertainment')).not.toBeInTheDocument()
      })
    })

    it('filters categories case-insensitively', async () => {
      const user = userEvent.setup()

      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search categories/i)
      await user.type(searchInput, 'CUSTOM')

      await waitFor(() => {
        expect(screen.getByText('Custom Category')).toBeInTheDocument()
      })
    })

    it('shows empty state when search returns no results', async () => {
      const user = userEvent.setup()

      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search categories/i)
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/no categories found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Category Count', () => {
    it('displays total category count', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/3 categories/i)).toBeInTheDocument()
    })

    it('displays singular form for one category', () => {
      render(
        <CategoryList
          categories={[mockCategories[0]]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByText(/1 category/i)).toBeInTheDocument()
    })

    it('updates count when filtering', async () => {
      const user = userEvent.setup()

      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search categories/i)
      await user.type(searchInput, 'Custom')

      await waitFor(() => {
        expect(screen.getByText(/1 category/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has accessible list structure', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      // Check for list role
      const listElements = screen.getAllByRole('list')
      expect(listElements.length).toBeGreaterThan(0)
    })

    it('has proper list items', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })

    it('has accessible labels for interactive elements', () => {
      render(
        <CategoryList
          categories={mockCategories}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      )

      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search categories/i)).toBeInTheDocument()
    })
  })
})
