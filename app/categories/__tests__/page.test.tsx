import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoriesPage from '../page'
import { categoryService } from '@/lib/services/categories'
import { useAuth } from '@/contexts/AuthContext'

// Mock services
jest.mock('@/lib/services/categories')
jest.mock('@/contexts/AuthContext')

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}))

const mockCategories = [
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
    name: 'Entertainment',
    color: '#8b5cf6',
    icon: 'film',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

describe('CategoriesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authenticated user
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
    })

    // Mock successful data fetching
    ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
      data: mockCategories,
      error: null,
    })
  })

  describe('Page Rendering', () => {
    it('renders page title', async () => {
      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^categories$/i, level: 1 })).toBeInTheDocument()
      })
    })

    it('renders CategoryForm component', async () => {
      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText(/category name/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument()
      })
    })

    it('renders CategoryList component', async () => {
      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })
    })
  })

  describe('Data Fetching', () => {
    it('fetches categories on mount', async () => {
      render(<CategoriesPage />)

      await waitFor(() => {
        expect(categoryService.getCategories).toHaveBeenCalled()
      })
    })

    it('displays loading state while fetching data', () => {
      render(<CategoriesPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('displays categories after loading', async () => {
      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })
    })

    it('handles category fetch error', async () => {
      ;(categoryService.getCategories as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch categories' },
      })

      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load categories/i)).toBeInTheDocument()
      })
    })
  })

  describe('Adding Categories', () => {
    it('adds a new category when form is submitted', async () => {
      const user = userEvent.setup()

      ;(categoryService.createCategory as jest.Mock).mockResolvedValue({
        data: {
          id: '3',
          user_id: 'user-123',
          name: 'Transportation',
          color: '#3b82f6',
          icon: 'car',
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
        error: null,
      })

      render(<CategoriesPage />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
      })

      // Fill out form
      await user.type(screen.getByLabelText(/category name/i), 'Transportation')

      const colorInput = screen.getByLabelText(/^color$/i)
      fireEvent.change(colorInput, { target: { value: '#3b82f6' } })

      await user.type(screen.getByLabelText(/icon \(optional\)/i), 'car')

      // Submit
      await user.click(screen.getByRole('button', { name: /add category/i }))

      await waitFor(() => {
        expect(categoryService.createCategory).toHaveBeenCalledWith({
          name: 'Transportation',
          color: '#3b82f6',
          icon: 'car',
        })
      })
    })

    it('refreshes category list after adding', async () => {
      const user = userEvent.setup()

      ;(categoryService.createCategory as jest.Mock).mockResolvedValue({
        data: { id: '3' },
        error: null,
      })

      render(<CategoriesPage />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument()
      })

      // Clear mock to track new calls
      ;(categoryService.getCategories as jest.Mock).mockClear()

      await user.type(screen.getByLabelText(/category name/i), 'Test')
      await user.click(screen.getByRole('button', { name: /add category/i }))

      // Should fetch categories again
      await waitFor(() => {
        expect(categoryService.getCategories).toHaveBeenCalled()
      })
    })
  })

  describe('Editing Categories', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const user = userEvent.setup()

      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })

      // Click edit button for user category
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      // Should show update button and cancel button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update category/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })

      // Form should be pre-filled with category data
      expect(screen.getByLabelText(/category name/i)).toHaveValue('Entertainment')
    })

    it('updates category when update button is clicked', async () => {
      const user = userEvent.setup()

      ;(categoryService.updateCategory as jest.Mock).mockResolvedValue({
        data: {
          id: '2',
          user_id: 'user-123',
          name: 'Fun & Entertainment',
          color: '#8b5cf6',
          icon: 'film',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
        error: null,
      })

      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })

      // Click edit
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update category/i })).toBeInTheDocument()
      })

      // Update name
      const nameInput = screen.getByLabelText(/category name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Fun & Entertainment')

      // Submit
      await user.click(screen.getByRole('button', { name: /update category/i }))

      await waitFor(() => {
        expect(categoryService.updateCategory).toHaveBeenCalledWith('2', {
          name: 'Fun & Entertainment',
          color: '#8b5cf6',
          icon: 'film',
        })
      })
    })

    it('cancels edit mode when cancel button is clicked', async () => {
      const user = userEvent.setup()

      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })

      // Click edit
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })

      // Click cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      // Should return to add mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
      })
    })

    it('refreshes list after updating', async () => {
      const user = userEvent.setup()

      ;(categoryService.updateCategory as jest.Mock).mockResolvedValue({
        data: { id: '2' },
        error: null,
      })

      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })

      // Click edit
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update category/i })).toBeInTheDocument()
      })

      // Clear mock to track new calls
      ;(categoryService.getCategories as jest.Mock).mockClear()

      // Submit
      await user.click(screen.getByRole('button', { name: /update category/i }))

      await waitFor(() => {
        expect(categoryService.getCategories).toHaveBeenCalled()
      })
    })
  })

  describe('Deleting Categories', () => {
    it('deletes category when delete button is clicked', async () => {
      const user = userEvent.setup()

      ;(categoryService.deleteCategory as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      })

      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(categoryService.deleteCategory).toHaveBeenCalledWith('2')
      })
    })

    it('refreshes list after deleting', async () => {
      const user = userEvent.setup()

      ;(categoryService.deleteCategory as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      })

      render(<CategoriesPage />)

      await waitFor(() => {
        expect(screen.getByText('Entertainment')).toBeInTheDocument()
      })

      // Clear mock to track new calls
      ;(categoryService.getCategories as jest.Mock).mockClear()

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(categoryService.getCategories).toHaveBeenCalled()
      })
    })
  })

  describe('Authentication', () => {
    it('redirects to login when not authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
      })

      const mockPush = jest.fn()
      require('next/navigation').useRouter.mockReturnValue({
        push: mockPush,
      })

      render(<CategoriesPage />)

      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('shows loading while checking authentication', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true,
      })

      render(<CategoriesPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })
})
