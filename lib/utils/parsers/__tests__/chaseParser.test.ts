// RED PHASE: Write tests for Chase credit card parser

import { parseChaseCSV } from '../chaseParser'

describe('parseChaseCSV', () => {
  describe('valid Chase CSV', () => {
    it('parses Chase credit card transactions correctly', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,Payment Thank You - Web,,Payment,2519.13,
10/24/2025,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,
10/23/2025,10/24/2025,STARBUCKS STORE 05640,Food & Drink,Sale,-8.97,`

      const result = parseChaseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(3)
      expect(result.errors).toHaveLength(0)
    })

    it('extracts merchant from Description field', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,
10/23/2025,10/24/2025,STARBUCKS STORE 05640,Food & Drink,Sale,-8.97,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions[0].merchant).toBe('UBER   *TRIP')
      expect(result.transactions[1].merchant).toBe('STARBUCKS STORE 05640')
    })

    it('handles payments (positive amounts)', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,Payment Thank You - Web,,Payment,2519.13,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions[0].amount).toBe(2519.13)
      expect(result.transactions[0].originalAmount).toBe(2519.13)
      expect(result.transactions[0].merchant).toBe('Payment Thank You - Web')
    })

    it('handles charges (negative amounts)', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,`

      const result = parseChaseCSV(csvContent)

      // amount is always absolute value
      expect(result.transactions[0].amount).toBe(20.96)
      // originalAmount preserves the sign for income determination
      expect(result.transactions[0].originalAmount).toBe(-20.96)
    })

    it('uses Transaction Date as the date field', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/25/2025,UBER   *TRIP,Travel,Sale,-20.96,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions[0].date).toBe('10/24/2025')
    })

    it('uses Description as the transaction description', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,STARBUCKS STORE 05640,Food & Drink,Sale,-8.97,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions[0].description).toBe('STARBUCKS STORE 05640')
    })

    it('extracts transaction Type field', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,
10/24/2025,10/24/2025,Payment Thank You - Web,,Payment,2519.13,
10/23/2025,10/24/2025,RETURN: AMAZON.COM,Shopping,Return,25.00,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions[0].type).toBe('Sale')
      expect(result.transactions[1].type).toBe('Payment')
      expect(result.transactions[2].type).toBe('Return')
    })

    it('handles empty Memo field', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions).toHaveLength(1)
    })

    it('handles empty Category field', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,Payment Thank You - Web,,Payment,2519.13,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions).toHaveLength(1)
    })

    it('parses multiple transactions correctly', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,
10/23/2025,10/24/2025,STARBUCKS STORE 05640,Food & Drink,Sale,-8.97,
10/23/2025,10/24/2025,TARGET.COM  *,Shopping,Sale,-163.38,
10/24/2025,10/24/2025,Payment Thank You - Web,,Payment,2519.13,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions).toHaveLength(4)
      expect(result.transactions[0].merchant).toBe('UBER   *TRIP')
      expect(result.transactions[1].merchant).toBe('STARBUCKS STORE 05640')
      expect(result.transactions[2].merchant).toBe('TARGET.COM  *')
      expect(result.transactions[3].merchant).toBe('Payment Thank You - Web')
    })
  })

  describe('error handling', () => {
    it('returns error for empty CSV', () => {
      const result = parseChaseCSV('')

      expect(result.success).toBe(false)
      expect(result.transactions).toHaveLength(0)
      expect(result.errors).toContain('CSV file is empty')
    })

    it('returns error for CSV with only headers', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo`

      const result = parseChaseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.transactions).toHaveLength(0)
      expect(result.errors).toContain('No transaction data found')
    })

    it('returns error for missing required columns', () => {
      const csvContent = `Date,Amount
10/24/2025,20.96`

      const result = parseChaseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(err => err.includes('Transaction Date'))).toBe(true)
    })

    it('skips rows with invalid amounts', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,
10/24/2025,10/24/2025,INVALID,Travel,Sale,not-a-number,
10/24/2025,10/24/2025,STARBUCKS STORE 05640,Food & Drink,Sale,-8.97,`

      const result = parseChaseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(2)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Invalid amount')
    })

    it('skips rows with invalid dates', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
invalid-date,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,
10/24/2025,10/24/2025,STARBUCKS STORE 05640,Food & Drink,Sale,-8.97,`

      const result = parseChaseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Invalid date')
    })
  })

  describe('Chase-specific category mapping', () => {
    it('includes Chase category in the result', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,UBER   *TRIP,Travel,Sale,-20.96,
10/23/2025,10/24/2025,STARBUCKS STORE 05640,Food & Drink,Sale,-8.97,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions[0]).toHaveProperty('chaseCategory', 'Travel')
      expect(result.transactions[1]).toHaveProperty('chaseCategory', 'Food & Drink')
    })

    it('handles empty Chase category', () => {
      const csvContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/24/2025,10/24/2025,Payment Thank You - Web,,Payment,2519.13,`

      const result = parseChaseCSV(csvContent)

      expect(result.transactions[0]).toHaveProperty('chaseCategory', '')
    })
  })
})
