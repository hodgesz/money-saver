// RED PHASE: Write failing tests for FileUpload component
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload } from '../FileUpload'

describe('FileUpload', () => {
  const mockOnFileSelect = jest.fn()

  beforeEach(() => {
    mockOnFileSelect.mockClear()
  })

  describe('rendering', () => {
    it('renders upload area with instructions', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument()
      expect(screen.getByText(/click to browse/i)).toBeInTheDocument()
    })

    it('displays accepted file types', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      expect(screen.getByText(/CSV.*Excel/i)).toBeInTheDocument()
    })

    it('displays maximum file size', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      expect(screen.getByText(/10.*MB/i)).toBeInTheDocument()
    })

    it('renders file input element', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('accept', '.csv,.xls,.xlsx')
    })
  })

  describe('file selection via click', () => {
    it('triggers file input when upload area is clicked', async () => {
      const user = userEvent.setup()
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = jest.spyOn(fileInput, 'click')

      const uploadArea = screen.getByTestId('upload-area')
      await user.click(uploadArea)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('calls onFileSelect with valid file', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['transaction data'], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      expect(mockOnFileSelect).toHaveBeenCalledWith(file)
    })

    it('does not call onFileSelect with invalid file type', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      expect(mockOnFileSelect).not.toHaveBeenCalled()
    })

    it('displays error message for invalid file', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
      })
    })

    it('displays error for file too large', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const largeContent = 'a'.repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByText(/file size exceeds/i)).toBeInTheDocument()
      })
    })
  })

  describe('drag and drop', () => {
    it('highlights upload area on drag over', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const uploadArea = screen.getByTestId('upload-area')

      fireEvent.dragOver(uploadArea)

      expect(uploadArea).toHaveClass('border-blue-500')
    })

    it('removes highlight on drag leave', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const uploadArea = screen.getByTestId('upload-area')

      fireEvent.dragOver(uploadArea)
      expect(uploadArea).toHaveClass('border-blue-500')

      fireEvent.dragLeave(uploadArea)
      expect(uploadArea).not.toHaveClass('border-blue-500')
    })

    it('handles file drop with valid file', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['data'], 'transactions.csv', { type: 'text/csv' })
      const uploadArea = screen.getByTestId('upload-area')

      fireEvent.drop(uploadArea, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file)
      })
    })

    it('handles file drop with invalid file', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['data'], 'document.pdf', { type: 'application/pdf' })
      const uploadArea = screen.getByTestId('upload-area')

      fireEvent.drop(uploadArea, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() => {
        expect(mockOnFileSelect).not.toHaveBeenCalled()
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
      })
    })

    it('prevents default drag behavior', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const uploadArea = screen.getByTestId('upload-area')
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true })
      const preventDefaultSpy = jest.spyOn(dragOverEvent, 'preventDefault')

      uploadArea.dispatchEvent(dragOverEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('file preview', () => {
    it('displays selected file name', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['data'], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByText('transactions.csv')).toBeInTheDocument()
      })
    })

    it('displays file size', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['data'], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        // Check for file size in the file preview section (specifically "4 Bytes" for the test data)
        const fileSizes = screen.getAllByText(/bytes|KB|MB/i)
        // Should have at least 2: one in instructions, one in file preview
        expect(fileSizes.length).toBeGreaterThanOrEqual(2)
        // Verify one specifically says "Bytes" (for the 4-byte test file)
        expect(fileSizes.some(el => el.textContent?.includes('Bytes'))).toBe(true)
      })
    })

    it('shows remove button for selected file', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['data'], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
      })
    })

    it('clears file when remove button is clicked', async () => {
      const user = userEvent.setup()
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['data'], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      const removeButton = await screen.findByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(screen.queryByText('transactions.csv')).not.toBeInTheDocument()
    })

    it('calls onFileSelect with null when file is removed', async () => {
      const user = userEvent.setup()
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const file = new File(['data'], 'transactions.csv', { type: 'text/csv' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      mockOnFileSelect.mockClear()

      const removeButton = await screen.findByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(mockOnFileSelect).toHaveBeenCalledWith(null)
    })
  })

  describe('error handling', () => {
    it('clears previous errors when new valid file is selected', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      // First, select invalid file
      const invalidFile = new File(['data'], 'document.pdf', { type: 'application/pdf' })
      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } })
      })

      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
      })

      // Then, select valid file
      const validFile = new File(['data'], 'transactions.csv', { type: 'text/csv' })
      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [validFile] } })
      })

      await waitFor(() => {
        expect(screen.queryByText(/file type not supported/i)).not.toBeInTheDocument()
      })
    })

    it('displays multiple errors for a single file', async () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const largeContent = 'a'.repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], 'document.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
        expect(screen.getByText(/file size exceeds/i)).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('has accessible label for file input', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toHaveAttribute('aria-label', 'Upload transaction file')
    })

    it('upload area is keyboard accessible', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const uploadArea = screen.getByTestId('upload-area')
      expect(uploadArea).toHaveAttribute('tabIndex', '0')
    })

    it('triggers file input on Enter key', async () => {
      const user = userEvent.setup()
      render(<FileUpload onFileSelect={mockOnFileSelect} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = jest.spyOn(fileInput, 'click')

      const uploadArea = screen.getByTestId('upload-area')
      uploadArea.focus()
      await user.keyboard('{Enter}')

      expect(clickSpy).toHaveBeenCalled()
    })
  })
})
