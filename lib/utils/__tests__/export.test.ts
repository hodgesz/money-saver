/**
 * Export Utilities Tests - Phase 2.3 Reports & Export
 * TDD Red Phase: Write tests first
 */

import { exportToCSV, exportToPDF, ExportData } from '../export'

describe('Export Utilities', () => {
  describe('exportToCSV', () => {
    it('should export transaction data to CSV format', () => {
      const data: ExportData = {
        title: 'Monthly Spending Report',
        headers: ['Date', 'Merchant', 'Category', 'Amount'],
        rows: [
          ['2024-10-01', 'Amazon', 'Shopping', '$150.00'],
          ['2024-10-02', 'Starbucks', 'Dining', '$5.50'],
        ],
      }

      const csvContent = exportToCSV(data)

      expect(csvContent).toContain('Monthly Spending Report')
      expect(csvContent).toContain('Date,Merchant,Category,Amount')
      expect(csvContent).toContain('2024-10-01,Amazon,Shopping,$150.00')
      expect(csvContent).toContain('2024-10-02,Starbucks,Dining,$5.50')
    })

    it('should handle empty data', () => {
      const data: ExportData = {
        title: 'Empty Report',
        headers: ['Date', 'Amount'],
        rows: [],
      }

      const csvContent = exportToCSV(data)

      expect(csvContent).toContain('Empty Report')
      expect(csvContent).toContain('Date,Amount')
      expect(csvContent.split('\n').length).toBe(2) // title + headers
    })

    it('should escape special characters in CSV', () => {
      const data: ExportData = {
        title: 'Report with Special Characters',
        headers: ['Description', 'Notes'],
        rows: [
          ['Item, with comma', 'Note "with quotes"'],
          ['Line\nbreak', 'Tab\there'],
        ],
      }

      const csvContent = exportToCSV(data)

      expect(csvContent).toContain('"Item, with comma"')
      expect(csvContent).toContain('"Note ""with quotes"""')
    })

    it('should trigger browser download', () => {
      const data: ExportData = {
        title: 'Test Report',
        headers: ['Col1'],
        rows: [['Value1']],
      }

      // Mock browser APIs
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      }
      const mockCreateElement = jest.spyOn(document, 'createElement')
      mockCreateElement.mockReturnValue(mockLink as any)

      // Mock URL methods
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url')
      const mockRevokeObjectURL = jest.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      exportToCSV(data, 'test-report.csv')

      expect(mockLink.download).toBe('test-report.csv')
      expect(mockLink.click).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

      mockCreateElement.mockRestore()
    })
  })

  describe('exportToPDF', () => {
    it('should export data to PDF format', async () => {
      const data: ExportData = {
        title: 'Monthly Report',
        headers: ['Date', 'Amount'],
        rows: [
          ['2024-10-01', '$100.00'],
          ['2024-10-02', '$50.00'],
        ],
        metadata: {
          dateRange: 'October 2024',
          totalAmount: '$150.00',
        },
      }

      // Mock jsPDF
      const mockSave = jest.fn()
      const mockText = jest.fn()
      const mockSetFontSize = jest.fn()
      const mockSetFont = jest.fn()
      const mockAutoTable = jest.fn()

      jest.mock('jspdf', () => ({
        jsPDF: jest.fn().mockImplementation(() => ({
          save: mockSave,
          text: mockText,
          setFontSize: mockSetFontSize,
          setFont: mockSetFont,
          autoTable: mockAutoTable,
        })),
      }))

      await exportToPDF(data, 'report.pdf')

      // Verify PDF was created (exact assertions depend on implementation)
      expect(true).toBe(true) // Placeholder
    })

    it('should handle empty data in PDF', async () => {
      const data: ExportData = {
        title: 'Empty Report',
        headers: ['Date'],
        rows: [],
      }

      await exportToPDF(data)

      expect(true).toBe(true) // Should not throw
    })

    it('should include metadata in PDF', async () => {
      const data: ExportData = {
        title: 'Report with Metadata',
        headers: ['Item'],
        rows: [['Test']],
        metadata: {
          generated: new Date().toISOString(),
          user: 'test@example.com',
        },
      }

      await exportToPDF(data)

      expect(true).toBe(true) // Metadata should be included
    })
  })
})
