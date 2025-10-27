// RED PHASE: Write failing tests for file validation
import { validateFile, ValidationResult, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '../fileValidation'

describe('validateFile', () => {
  describe('file type validation', () => {
    it('accepts CSV files', () => {
      const file = new File(['test'], 'transactions.csv', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts Excel files (.xlsx)', () => {
      const file = new File(['test'], 'transactions.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts Excel files (.xls)', () => {
      const file = new File(['test'], 'transactions.xls', {
        type: 'application/vnd.ms-excel',
      })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects PDF files', () => {
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('File type not supported. Please upload a CSV, Excel, or ZIP file.')
    })

    it('rejects image files', () => {
      const file = new File(['test'], 'image.jpg', { type: 'image/jpeg' })
      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('File type not supported')
    })

    it('rejects files without extension', () => {
      const file = new File(['test'], 'transactions', { type: '' })
      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('File type not supported')
    })

    it('validates by file extension if MIME type is generic', () => {
      // Some browsers report generic MIME types
      const file = new File(['test'], 'transactions.csv', {
        type: 'application/octet-stream',
      })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })
  })

  describe('file size validation', () => {
    it('accepts files under the size limit', () => {
      const content = 'a'.repeat(1024 * 1024) // 1MB
      const file = new File([content], 'transactions.csv', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts files exactly at the size limit', () => {
      const file = new File(['test'], 'transactions.csv', { type: 'text/csv' })
      // Mock size property to be exactly at the limit
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE, writable: false })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('rejects files over the size limit', () => {
      const file = new File(['test'], 'transactions.csv', { type: 'text/csv' })
      // Mock size property to simulate a file over the limit
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1, writable: false })
      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('File size exceeds 100MB limit')
    })

    it('accepts large files under 100MB', () => {
      const content = 'a'.repeat(50 * 1024 * 1024) // 50MB
      const file = new File([content], 'transactions.csv', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts empty files (edge case)', () => {
      const file = new File([], 'empty.csv', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })
  })

  describe('file name validation', () => {
    it('accepts standard file names', () => {
      const file = new File(['test'], 'my-transactions.csv', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('accepts file names with spaces', () => {
      const file = new File(['test'], 'My Transactions 2024.csv', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('accepts file names with special characters', () => {
      const file = new File(['test'], 'transactions_2024-01.csv', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('accepts Unicode characters in file names', () => {
      const file = new File(['test'], 'транзакції.csv', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })
  })

  describe('multiple validation errors', () => {
    it('returns multiple errors for invalid file', () => {
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })
      // Mock size property to simulate a file over the limit
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1, writable: false })
      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
      expect(result.errors.some(e => e.includes('File type'))).toBe(true)
      expect(result.errors.some(e => e.includes('File size'))).toBe(true)
    })

    it('returns all errors at once for better UX', () => {
      const file = new File(['test'], 'bad-file.exe', { type: 'application/x-msdownload' })
      // Mock size property to simulate a file over the limit
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1, writable: false })
      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('handles null file gracefully', () => {
      const result = validateFile(null as any)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('No file provided')
    })

    it('handles undefined file gracefully', () => {
      const result = validateFile(undefined as any)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('No file provided')
    })

    it('validates file with mixed case extension', () => {
      const file = new File(['test'], 'transactions.CSV', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(true)
    })

    it('validates file with no name', () => {
      const file = new File(['test'], '', { type: 'text/csv' })
      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('File name is required')
    })
  })

  describe('constants', () => {
    it('exports ACCEPTED_FILE_TYPES', () => {
      expect(ACCEPTED_FILE_TYPES).toBeInstanceOf(Array)
      expect(ACCEPTED_FILE_TYPES.length).toBeGreaterThan(0)
      expect(ACCEPTED_FILE_TYPES).toContain('text/csv')
    })

    it('exports MAX_FILE_SIZE', () => {
      expect(typeof MAX_FILE_SIZE).toBe('number')
      expect(MAX_FILE_SIZE).toBe(100 * 1024 * 1024) // 100MB
    })
  })
})
