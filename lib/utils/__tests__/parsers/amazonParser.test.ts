// RED PHASE: Write tests for Amazon CSV parser
import { parseAmazonCSV, AmazonTransaction } from '../../parsers/amazonParser'

describe('parseAmazonCSV', () => {
  describe('parsing valid Amazon CSV', () => {
    it('parses basic Amazon order', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-6922871-4946666,https://www.amazon.com/orders/111-6922871-4946666,2024-12-26,1,"Bounty Quick-Size Paper Towels",https://www.amazon.com/dp/B079VP6DH6,$40.46,0,B079VP6DH6,Health & Household›Household Supplies›Paper Towels`

      const result = parseAmazonCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0]).toMatchObject({
        date: '2024-12-26',
        amount: 40.46,
        merchant: 'Amazon',
        description: 'Bounty Quick-Size Paper Towels',
        category: 'Household Supplies',
      })
      expect(result.errors).toHaveLength(0)
    })

    it('parses multiple Amazon orders', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-111,https://amazon.com,2024-12-26,1,"Product A",https://amazon.com/A,$25.99,0,A001,Category A
222-222,https://amazon.com,2024-12-27,1,"Product B",https://amazon.com/B,$15.50,0,B002,Category B
333-333,https://amazon.com,2024-12-28,1,"Product C",https://amazon.com/C,$99.99,0,C003,Category C`

      const result = parseAmazonCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(3)
      expect(result.transactions[0].amount).toBe(25.99)
      expect(result.transactions[1].amount).toBe(15.50)
      expect(result.transactions[2].amount).toBe(99.99)
    })

    it('handles hierarchical category parsing', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-111,https://amazon.com,2024-12-26,1,"Test Product",https://amazon.com,$10.00,0,TEST,"Health & Household›Household Supplies›Paper Towels›Kitchen Rolls"`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].category).toBe('Household Supplies')
      expect(result.transactions[0].subcategory).toBe('Paper Towels')
    })

    it('handles items with no category', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-111,https://amazon.com,2024-12-26,1,"Test Product",https://amazon.com,$10.00,0,TEST,`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].category).toBeUndefined()
      expect(result.transactions[0].subcategory).toBeUndefined()
    })
  })

  describe('price parsing', () => {
    it('parses price with dollar sign', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-111,https://amazon.com,2024-12-26,1,"Product",https://amazon.com,$45.99,0,TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].amount).toBe(45.99)
    })

    it('parses price without dollar sign', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-111,https://amazon.com,2024-12-26,1,"Product",https://amazon.com,45.99,0,TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].amount).toBe(45.99)
    })

    it('parses price with commas', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-111,https://amazon.com,2024-12-26,1,"Product",https://amazon.com,"$1,234.56",0,TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].amount).toBe(1234.56)
    })

    it('handles whole dollar amounts', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-111,https://amazon.com,2024-12-26,1,"Product",https://amazon.com,$100,0,TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].amount).toBe(100.0)
    })
  })

  describe('column name variations', () => {
    it('handles lowercase column names', () => {
      const csvContent = `order id,order date,price,description,asin,category
111-111,2024-12-26,$25.99,"Product",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].amount).toBe(25.99)
    })

    it('handles uppercase column names', () => {
      const csvContent = `ORDER ID,ORDER DATE,PRICE,DESCRIPTION,ASIN,CATEGORY
111-111,2024-12-26,$25.99,"Product",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions).toHaveLength(1)
    })

    it('handles column names with extra spaces', () => {
      const csvContent = `  order id  ,  order date  ,  price  ,  description  ,  ASIN  ,  category
111-111,2024-12-26,$25.99,"Product",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    it('returns error for missing required columns', () => {
      const csvContent = `order id,description
111-111,"Product"`

      const result = parseAmazonCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing required columns: order date, price')
    })

    it('returns error for invalid date format', () => {
      const csvContent = `order id,order date,price,description,ASIN,category
111-111,invalid-date,$25.99,"Product",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toMatch(/invalid.*date/i)
    })

    it('returns error for invalid price', () => {
      const csvContent = `order id,order date,price,description,ASIN,category
111-111,2024-12-26,invalid-price,"Product",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toMatch(/invalid.*price/i)
    })

    it('collects multiple errors per row', () => {
      const csvContent = `order id,order date,price,description,ASIN,category
111-111,invalid-date,invalid-price,"Product",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })

    it('continues parsing after error rows', () => {
      const csvContent = `order id,order date,price,description,ASIN,category
111-111,invalid-date,invalid-price,"Product A",TEST,Category
222-222,2024-12-26,$25.99,"Product B",TEST,Category
333-333,2024-12-27,bad-price,"Product C",TEST,Category
444-444,2024-12-28,$15.00,"Product D",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions).toHaveLength(2)
      expect(result.transactions[0].description).toBe('Product B')
      expect(result.transactions[1].description).toBe('Product D')
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('special characters and formatting', () => {
    it('handles quoted descriptions with commas', () => {
      const csvContent = `order id,order date,price,description,ASIN,category
111-111,2024-12-26,$25.99,"Product, with commas, in name",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].description).toBe('Product, with commas, in name')
    })

    it('handles descriptions with ampersands and special characters', () => {
      const csvContent = `order id,order date,price,description,ASIN,category
111-111,2024-12-26,$25.99,"Product & More™ Size 12 x 18",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].description).toBe('Product & More™ Size 12 x 18')
    })

    it('handles UTF-8 characters', () => {
      const csvContent = `order id,order date,price,description,ASIN,category
111-111,2024-12-26,$25.99,"Café Español ñ é ü",TEST,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].description).toBe('Café Español ñ é ü')
    })
  })

  describe('metadata extraction', () => {
    it('includes Amazon-specific metadata', () => {
      const csvContent = `order id,order url,order date,quantity,description,item url,price,subscribe & save,ASIN,category
111-111,https://amazon.com/order/111-111,2024-12-26,2,"Product",https://amazon.com/dp/TEST,$25.99,1,TEST123,Category`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].metadata).toMatchObject({
        orderId: '111-111',
        asin: 'TEST123',
        quantity: 2,
        subscribeAndSave: true,
      })
    })

    it('handles missing optional metadata', () => {
      const csvContent = `order date,price,description
2024-12-26,$25.99,"Product"`

      const result = parseAmazonCSV(csvContent)

      expect(result.transactions[0].metadata).toMatchObject({
        orderId: undefined,
        asin: undefined,
      })
    })
  })
})
