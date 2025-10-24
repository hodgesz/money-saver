// RED PHASE: Write failing tests first
import { parseCSV, ParsedTransaction, ParseResult } from '../csvParser'

describe('parseCSV', () => {
  describe('valid CSV parsing', () => {
    it('parses a simple CSV with standard columns', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Whole Foods,Groceries
2024-01-16,-30.00,Gas Station,Fuel`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(2)
      expect(result.errors).toHaveLength(0)

      const firstTransaction = result.transactions[0]
      expect(firstTransaction.date).toBe('2024-01-15')
      expect(firstTransaction.amount).toBe(45.99)
      expect(firstTransaction.merchant).toBe('Whole Foods')
      expect(firstTransaction.description).toBe('Groceries')
    })

    it('handles different column order', () => {
      const csvContent = `merchant,date,description,amount
Target,2024-01-15,Shopping,89.99`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].merchant).toBe('Target')
      expect(result.transactions[0].amount).toBe(89.99)
    })

    it('handles alternative column names', () => {
      const csvContent = `Date,Amount,Merchant Name,Notes
2024-01-15,45.99,Starbucks,Coffee`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].description).toBe('Coffee')
    })

    it('trims whitespace from values', () => {
      const csvContent = `date,amount,merchant,description
  2024-01-15  ,  45.99  ,  Whole Foods  ,  Groceries  `

      const result = parseCSV(csvContent)

      expect(result.transactions[0].merchant).toBe('Whole Foods')
      expect(result.transactions[0].description).toBe('Groceries')
    })

    it('handles empty description field', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Whole Foods,`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions[0].description).toBe('')
    })

    it('parses amounts with currency symbols', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,$45.99,Whole Foods,Groceries
2024-01-16,-$30.00,Gas Station,Fuel`

      const result = parseCSV(csvContent)

      expect(result.transactions[0].amount).toBe(45.99)
      expect(result.transactions[1].amount).toBe(-30.00)
    })

    it('parses amounts with commas', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,"1,234.56",Store,Purchase`

      const result = parseCSV(csvContent)

      expect(result.transactions[0].amount).toBe(1234.56)
    })

    it('handles quoted fields with commas', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,"Smith, John & Co","Office supplies, pens"`

      const result = parseCSV(csvContent)

      expect(result.transactions[0].merchant).toBe('Smith, John & Co')
      expect(result.transactions[0].description).toBe('Office supplies, pens')
    })
  })

  describe('error handling', () => {
    it('returns error for empty CSV', () => {
      const result = parseCSV('')

      expect(result.success).toBe(false)
      expect(result.errors).toContain('CSV file is empty')
      expect(result.transactions).toHaveLength(0)
    })

    it('returns error for CSV with only headers', () => {
      const csvContent = `date,amount,merchant,description`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('No transaction data found')
    })

    it('returns error for missing required columns', () => {
      const csvContent = `date,merchant
2024-01-15,Store`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing required column: amount')
    })

    it('skips rows with invalid date format', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store A,Valid
invalid-date,30.00,Store B,Invalid
2024-01-17,25.00,Store C,Valid`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Invalid date format')
    })

    it('skips rows with invalid amount', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store A,Valid
2024-01-16,not-a-number,Store B,Invalid
2024-01-17,25.00,Store C,Valid`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Invalid amount')
    })

    it('handles missing merchant gracefully', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,,Groceries`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions[0].merchant).toBe('Unknown')
    })
  })

  describe('edge cases', () => {
    it('handles large files with many transactions', () => {
      const rows = ['date,amount,merchant,description']
      for (let i = 1; i <= 1000; i++) {
        rows.push(`2024-01-${String(i % 28 + 1).padStart(2, '0')},${i * 10}.99,Store ${i},Purchase ${i}`)
      }
      const csvContent = rows.join('\n')

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1000)
    })

    it('handles different line endings (CRLF)', () => {
      const csvContent = `date,amount,merchant,description\r\n2024-01-15,45.99,Store,Item\r\n`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
    })

    it('handles UTF-8 characters in merchant names', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Café René,Coffee`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions[0].merchant).toBe('Café René')
    })

    it('returns partial success with mixed valid/invalid rows', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store A,Valid
invalid-date,invalid-amount,Store B,Invalid
2024-01-17,25.00,Store C,Valid`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(2)
      expect(result.errors).toHaveLength(2) // One for date, one for amount
    })
  })

  describe('type definitions', () => {
    it('returns correctly typed ParseResult', () => {
      const csvContent = `date,amount,merchant,description
2024-01-15,45.99,Store,Item`

      const result: ParseResult = parseCSV(csvContent)

      // Type checking - this will fail at compile time if types are wrong
      expect(typeof result.success).toBe('boolean')
      expect(Array.isArray(result.transactions)).toBe(true)
      expect(Array.isArray(result.errors)).toBe(true)

      if (result.transactions.length > 0) {
        const transaction: ParsedTransaction = result.transactions[0]
        expect(typeof transaction.date).toBe('string')
        expect(typeof transaction.amount).toBe('number')
        expect(typeof transaction.merchant).toBe('string')
        expect(typeof transaction.description).toBe('string')
      }
    })
  })
})
