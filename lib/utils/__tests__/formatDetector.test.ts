// RED PHASE: Write tests for CSV format detector
import { detectCSVFormat, CSVFormat, getFormatName } from '../formatDetector'

describe('detectCSVFormat', () => {
  describe('Amazon format detection', () => {
    it('detects Amazon order history format', () => {
      const headers = ['order id', 'order url', 'order date', 'quantity', 'description', 'item url', 'price', 'ASIN', 'category']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.AMAZON)
    })

    it('detects Amazon format with case variations', () => {
      const headers = ['Order ID', 'Order Date', 'Price', 'ASIN', 'Category', 'Description']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.AMAZON)
    })

    it('detects Amazon format with minimal required columns', () => {
      const headers = ['order date', 'price', 'description', 'ASIN']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.AMAZON)
    })
  })

  describe('Bank statement format detection', () => {
    it('detects bank statement with debit/credit columns', () => {
      const headers = ['date', 'description', 'debit', 'credit', 'balance']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.BANK_STATEMENT)
    })

    it('detects bank statement with amount column', () => {
      const headers = ['date', 'description', 'amount', 'balance', 'type']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.BANK_STATEMENT)
    })

    it('detects bank statement with case variations', () => {
      const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.BANK_STATEMENT)
    })
  })

  describe('Credit card format detection', () => {
    it('detects Chase credit card format', () => {
      const headers = ['transaction date', 'post date', 'description', 'category', 'amount']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.CHASE_CREDIT_CARD)
    })

    it('detects credit card with merchant column', () => {
      const headers = ['date', 'merchant', 'category', 'amount', 'memo']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.CREDIT_CARD)
    })

    it('detects credit card with case variations', () => {
      const headers = ['Transaction Date', 'Merchant', 'Amount', 'Category']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.CREDIT_CARD)
    })
  })

  describe('Generic format detection', () => {
    it('detects generic format with date, amount, description (no merchant)', () => {
      const headers = ['date', 'amount', 'description', 'notes']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.GENERIC)
    })

    it('detects generic format with minimal columns', () => {
      const headers = ['date', 'amount', 'description']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.GENERIC)
    })

    it('falls back to generic for unknown format', () => {
      const headers = ['col1', 'col2', 'col3']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.GENERIC)
    })

    it('handles empty headers', () => {
      const headers: string[] = []

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.GENERIC)
    })
  })

  describe('format priority', () => {
    it('prefers Amazon format over generic when both match', () => {
      const headers = ['order date', 'price', 'description', 'ASIN', 'amount']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.AMAZON)
    })

    it('prefers bank statement over generic when both match', () => {
      const headers = ['date', 'description', 'debit', 'credit', 'amount']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.BANK_STATEMENT)
    })

    it('prefers credit card over generic when both match', () => {
      const headers = ['date', 'merchant', 'category', 'amount', 'description']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.CREDIT_CARD)
    })
  })

  describe('header normalization', () => {
    it('handles headers with extra whitespace', () => {
      const headers = ['  order date  ', '  price  ', '  ASIN  ']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.AMAZON)
    })

    it('handles headers with special characters', () => {
      const headers = ['order-date', 'item_price', 'product.description', 'ASIN']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.AMAZON)
    })

    it('handles headers with mixed separators', () => {
      const headers = ['Order Date', 'Item Price', 'Product Description', 'ASIN']

      const result = detectCSVFormat(headers)

      expect(result).toBe(CSVFormat.AMAZON)
    })
  })

  describe('getFormatName', () => {
    it('returns correct name for Amazon format', () => {
      expect(getFormatName(CSVFormat.AMAZON)).toBe('Amazon Order History')
    })

    it('returns correct name for bank statement format', () => {
      expect(getFormatName(CSVFormat.BANK_STATEMENT)).toBe('Bank Statement')
    })

    it('returns correct name for credit card format', () => {
      expect(getFormatName(CSVFormat.CREDIT_CARD)).toBe('Credit Card Statement')
    })

    it('returns correct name for generic format', () => {
      expect(getFormatName(CSVFormat.GENERIC)).toBe('Generic Transaction CSV')
    })
  })
})
