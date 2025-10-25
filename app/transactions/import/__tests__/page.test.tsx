// RED PHASE: Write tests for TransactionImport page
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionImportPage from '../page'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import { duplicateDetectionService } from '@/lib/services/duplicateDetection'

// Mock services
jest.mock('@/lib/services/transactions', () => ({
  transactionService: {
    createTransaction: jest.fn(),
  },
}))
jest.mock('@/lib/services/categories', () => ({
  categoryService: {
    getCategories: jest.fn(),
    createCategory: jest.fn(),
  },
}))
jest.mock('@/lib/services/duplicateDetection', () => ({
  duplicateDetectionService: {
    batchCheckDuplicates: jest.fn(),
  },
}))
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}))

const mockCreateTransaction = transactionService.createTransaction as jest.Mock
const mockGetCategories = categoryService.getCategories as jest.Mock
const mockCreateCategory = categoryService.createCategory as jest.Mock
const mockBatchCheckDuplicates = duplicateDetectionService.batchCheckDuplicates as jest.Mock

describe('TransactionImportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockCreateTransaction.mockResolvedValue({
      data: { id: '1', date: '2024-01-15', amount: 45.99, merchant: 'Store', description: 'Test', category_id: null, user_id: 'test-user-123', is_income: false, created_at: '2024-01-01', updated_at: '2024-01-01', receipt_url: null, account_id: null },
      error: null,
    })

    mockGetCategories.mockResolvedValue({
      data: [],
      error: null,
    })

    mockCreateCategory.mockResolvedValue({
      data: { id: 'cat-1', name: 'Test Category', user_id: 'test-user-123', created_at: '2024-01-01', updated_at: '2024-01-01' },
      error: null,
    })

    // Mock duplicate detection to return no duplicates by default
    mockBatchCheckDuplicates.mockResolvedValue([
      { isDuplicate: false, confidence: 0, matchedTransactionId: null },
    ])
  })

  describe('rendering', () => {
    it('renders page title and instructions', () => {
      render(<TransactionImportPage />)

      expect(screen.getByRole('heading', { name: /import transactions/i })).toBeInTheDocument()
      expect(screen.getByText(/upload.*csv.*excel/i)).toBeInTheDocument()
    })

    it('renders FileUpload component', () => {
      render(<TransactionImportPage />)

      expect(screen.getByTestId('upload-area')).toBeInTheDocument()
    })
  })

  describe('file upload and parsing', () => {
    it('parses CSV file and displays preview', async () => {
      render(<TransactionImportPage />)

      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Whole Foods,Groceries
2024-01-16,30.00,Gas Station,Fuel`

      const file = new File([csvContent], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByText('Whole Foods')).toBeInTheDocument()
        expect(screen.getByText('Gas Station')).toBeInTheDocument()
      })
    })

    it('shows transaction count in preview', async () => {
      render(<TransactionImportPage />)

      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store A,Item A
2024-01-16,30.00,Store B,Item B
2024-01-17,20.00,Store C,Item C`

      const file = new File([csvContent], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByText(/3.*transactions/i)).toBeInTheDocument()
      })
    })

    it('displays parsing errors if any', async () => {
      render(<TransactionImportPage />)

      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store A,Valid
invalid-date,invalid-amount,Store B,Invalid`

      const file = new File([csvContent], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByText(/parsing errors/i)).toBeInTheDocument()
      })
    })
  })

  describe('transaction import', () => {
    it('enables import button when transactions are parsed', async () => {
      render(<TransactionImportPage />)

      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Whole Foods,Groceries`

      const file = new File([csvContent], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        const importButton = screen.getByRole('button', { name: /import.*transaction/i })
        expect(importButton).toBeEnabled()
      })
    })

    it('imports transactions to database', async () => {
      const user = userEvent.setup()
      render(<TransactionImportPage />)

      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Whole Foods,Groceries`

      const file = new File([csvContent], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      const importButton = await screen.findByRole('button', { name: /import.*transaction/i })
      await user.click(importButton)

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalledWith({
          date: '2024-01-15',
          amount: 45.99,
          merchant: 'Whole Foods',
          description: 'Groceries',
          category_id: null,
          is_income: false,
        })
      })
    })

    it('shows success message after import', async () => {
      const user = userEvent.setup()
      render(<TransactionImportPage />)

      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store,Item`

      const file = new File([csvContent], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      const importButton = await screen.findByRole('button', { name: /import.*transaction/i })
      await user.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/successfully imported/i)).toBeInTheDocument()
      })
    })

    it('displays import progress during batch import', async () => {
      const user = userEvent.setup()

      // Mock slow import to capture progress state
      mockCreateTransaction.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: {
                id: '1',
                date: '2024-01-15',
                amount: 45.99,
                merchant: 'Store',
                description: 'Test',
                category_id: null,
                user_id: 'test-user-123',
                is_income: false,
                created_at: '2024-01-01',
                updated_at: '2024-01-01',
                receipt_url: null,
                account_id: null
              },
              error: null,
            })
          }, 200) // 200ms delay to ensure progress state is visible
        })
      })

      render(<TransactionImportPage />)

      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store A,Item A
2024-01-16,30.00,Store B,Item B
2024-01-17,20.00,Store C,Item C`

      const file = new File([csvContent], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      const importButton = await screen.findByRole('button', { name: /import.*transaction/i })

      // Click button and immediately check for importing state (don't await)
      user.click(importButton)

      // Wait for importing text to appear
      await waitFor(() => {
        expect(screen.getByText(/importing.*transactions/i)).toBeInTheDocument()
      }, { timeout: 500 })

      // Wait for import to complete
      await waitFor(() => {
        expect(screen.getByText(/successfully imported/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('error handling', () => {
    it('displays error if import fails', async () => {
      const user = userEvent.setup()
      mockCreateTransaction.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      render(<TransactionImportPage />)

      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store,Item`

      const file = new File([csvContent], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      const importButton = await screen.findByRole('button', { name: /import.*transaction/i })
      await user.click(importButton)

      await waitFor(() => {
        expect(screen.getByText(/error.*importing/i)).toBeInTheDocument()
      })
    })
  })
})
