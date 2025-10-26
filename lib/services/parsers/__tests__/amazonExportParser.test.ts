/**
 * Amazon Export Parser Tests
 *
 * Tests for parsing Amazon data request export files (Retail.OrderHistory.1.csv)
 * This format includes tax-inclusive totals, exact charged amounts, and precise timestamps.
 *
 * TDD Approach: RED-GREEN-REFACTOR
 */

import { parseAmazonExport, AmazonExportParseResult } from '../amazonExportParser'
import type { Transaction } from '@/types'

describe('parseAmazonExport', () => {
  describe('Basic CSV Parsing', () => {
    it('should parse valid Amazon export CSV with single item', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-9348994-8388237","2025-10-25T20:27:42Z","Not Applicable","USD","13.99","0.94","0","0","14.93","13.99","0.94","B0CRH8JXXV","New","1","Visa - 0335","Authorized","Paid","2025-10-25T20:32:53Z","next-1dc","Jonathan  Hodges 2834 E NICHOLS CIR","Jonathan Hodges",""`

      const result = parseAmazonExport(csv)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should extract correct transaction fields from single item order', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-9348994-8388237","2025-10-25T20:27:42Z","Not Applicable","USD","13.99","0.94","0","0","14.93","13.99","0.94","B0CRH8JXXV","New","1","Visa - 0335","Authorized","Paid","2025-10-25T20:32:53Z","next-1dc","Jonathan  Hodges 2834 E NICHOLS CIR","Jonathan Hodges",""`

      const result = parseAmazonExport(csv)
      const transaction = result.transactions[0]

      expect(transaction.date).toBeInstanceOf(Date)
      expect(transaction.amount).toBe(14.93) // Tax-inclusive total
      expect(transaction.merchant).toBe('Amazon')
      expect(transaction.description).toContain('B0CRH8JXXV')
      expect(transaction.is_income).toBe(false)
    })

    it('should parse order date to correct Date object', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-9348994-8388237","2025-10-25T20:27:42Z","Not Applicable","USD","13.99","0.94","0","0","14.93","13.99","0.94","B0CRH8JXXV","New","1","Visa - 0335","Authorized","Paid","2025-10-25T20:32:53Z","next-1dc","Jonathan  Hodges 2834 E NICHOLS CIR","Jonathan Hodges",""`

      const result = parseAmazonExport(csv)
      const transaction = result.transactions[0]

      expect(transaction.date.getFullYear()).toBe(2025)
      expect(transaction.date.getMonth()).toBe(9) // October (0-indexed)
      expect(transaction.date.getDate()).toBe(25)
    })
  })

  describe('Multi-Item Order Aggregation', () => {
    it('should aggregate multiple line items into single transaction', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","112-8566685-0797060","2025-10-13T18:34:00Z","Not Applicable","USD","17.95","1.21","0","0","19.16","17.95","1.21","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-14T10:00:00Z","standard","Address","Name",""
"Amazon.com","112-8566685-0797060","2025-10-13T18:34:00Z","Not Applicable","USD","9.99","0.67","0","0","10.66","9.99","0.67","B0002","New","1","Visa - 0335","Closed","Shipped","2025-10-14T10:00:00Z","standard","Address","Name",""`

      const result = parseAmazonExport(csv)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1) // Aggregated into one transaction
      expect(result.transactions[0].amount).toBe(29.82) // Sum of both items
    })

    it('should include item count in description for multi-item orders', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","112-8566685-0797060","2025-10-13T18:34:00Z","Not Applicable","USD","17.95","1.21","0","0","19.16","17.95","1.21","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-14T10:00:00Z","standard","Address","Name",""
"Amazon.com","112-8566685-0797060","2025-10-13T18:34:00Z","Not Applicable","USD","9.99","0.67","0","0","10.66","9.99","0.67","B0002","New","1","Visa - 0335","Closed","Shipped","2025-10-14T10:00:00Z","standard","Address","Name",""`

      const result = parseAmazonExport(csv)
      const transaction = result.transactions[0]

      expect(transaction.description).toContain('2 items')
      expect(transaction.description).toContain('Order: 112-8566685-0797060')
    })

    it('should list ASINs for multi-item orders', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","112-8566685-0797060","2025-10-13T18:34:00Z","Not Applicable","USD","17.95","1.21","0","0","19.16","17.95","1.21","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-14T10:00:00Z","standard","Address","Name",""
"Amazon.com","112-8566685-0797060","2025-10-13T18:34:00Z","Not Applicable","USD","9.99","0.67","0","0","10.66","9.99","0.67","B0002","New","1","Visa - 0335","Closed","Shipped","2025-10-14T10:00:00Z","standard","Address","Name",""`

      const result = parseAmazonExport(csv)
      const transaction = result.transactions[0]

      expect(transaction.description).toContain('B0001')
      expect(transaction.description).toContain('B0002')
    })
  })

  describe('Tax-Inclusive Total Calculation', () => {
    it('should calculate total from Total Owed column', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-8388237-9999999","2025-10-25T20:27:42Z","Not Applicable","USD","19.99","1.35","2.50","0","23.84","19.99","1.35","B0001","New","1","Visa - 0335","Authorized","Paid","2025-10-25T20:32:53Z","next-1dc","Address","Name",""`

      const result = parseAmazonExport(csv)
      const transaction = result.transactions[0]

      // Total Owed includes price + tax + shipping
      expect(transaction.amount).toBe(23.84)
    })

    it('should handle orders with shipping charges', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-1111111-1111111","2025-10-25T20:27:42Z","Not Applicable","USD","10.00","0.68","5.99","0","16.67","10.00","0.68","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-25T20:32:53Z","standard","Address","Name",""`

      const result = parseAmazonExport(csv)
      const transaction = result.transactions[0]

      expect(transaction.amount).toBe(16.67) // Includes $5.99 shipping
    })

    it('should handle orders with discounts', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-2222222-2222222","2025-10-25T20:27:42Z","Not Applicable","USD","50.00","3.38","0","10.00","43.38","50.00","3.38","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-25T20:32:53Z","standard","Address","Name",""`

      const result = parseAmazonExport(csv)
      const transaction = result.transactions[0]

      expect(transaction.amount).toBe(43.38) // Price + tax - discount
    })

    it('should handle zero tax items', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-3333333-3333333","2025-10-25T20:27:42Z","Not Applicable","USD","9.99","0","0","0","9.99","9.99","0","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-25T20:32:53Z","standard","Address","Name",""`

      const result = parseAmazonExport(csv)
      const transaction = result.transactions[0]

      expect(transaction.amount).toBe(9.99) // No tax
    })
  })

  describe('Error Handling', () => {
    it('should return error for empty CSV', () => {
      const csv = ''
      const result = parseAmazonExport(csv)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Empty CSV file')
      expect(result.transactions).toHaveLength(0)
    })

    it('should return error for invalid CSV format', () => {
      const csv = 'not,a,valid,amazon,export'
      const result = parseAmazonExport(csv)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should skip cancelled orders', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-4444444-4444444","2025-10-25T20:27:42Z","Not Applicable","USD","29.99","2.03","0","0","0","29.99","2.03","B0001","New","1","Visa - 0335","Cancelled","Not Available","","standard","Address","Name",""`

      const result = parseAmazonExport(csv)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(0) // Cancelled order excluded
      expect(result.skippedOrders).toBe(1)
    })

    it('should skip orders with zero total', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-5555555-5555555","2025-10-25T20:27:42Z","Not Applicable","USD","0","0","0","0","0","0","0","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-25T20:32:53Z","standard","Address","Name",""`

      const result = parseAmazonExport(csv)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(0) // Zero total excluded
      expect(result.skippedOrders).toBe(1)
    })

    it('should handle missing optional fields gracefully', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-6666666-6666666","2025-10-25T20:27:42Z","","USD","13.99","0.94","","","14.93","13.99","0.94","","New","1","","Authorized","Paid","","","","",""`

      const result = parseAmazonExport(csv)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].amount).toBe(14.93)
    })
  })

  describe('Metadata and Statistics', () => {
    it('should return statistics about parsed data', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-1111111-1111111","2025-10-25T20:27:42Z","Not Applicable","USD","10.00","0.68","0","0","10.68","10.00","0.68","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-25T20:32:53Z","standard","Address","Name",""
"Amazon.com","111-2222222-2222222","2025-10-24T15:30:00Z","Not Applicable","USD","20.00","1.35","0","0","21.35","20.00","1.35","B0002","New","1","Visa - 0335","Closed","Shipped","2025-10-24T20:00:00Z","standard","Address","Name",""`

      const result = parseAmazonExport(csv)

      expect(result.totalOrders).toBe(2)
      expect(result.totalAmount).toBeCloseTo(32.03, 2)
      expect(result.skippedOrders).toBe(0)
    })

    it('should track skipped orders separately', () => {
      const csv = `"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"
"Amazon.com","111-1111111-1111111","2025-10-25T20:27:42Z","Not Applicable","USD","10.00","0.68","0","0","10.68","10.00","0.68","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-25T20:32:53Z","standard","Address","Name",""
"Amazon.com","111-2222222-2222222","2025-10-24T15:30:00Z","Not Applicable","USD","20.00","1.35","0","0","0","20.00","1.35","B0002","New","1","Visa - 0335","Cancelled","Not Available","","standard","Address","Name",""`

      const result = parseAmazonExport(csv)

      expect(result.totalOrders).toBe(1) // One valid order
      expect(result.skippedOrders).toBe(1) // One skipped
      expect(result.transactions).toHaveLength(1)
    })
  })

  describe('Real-World Data Scenarios', () => {
    it('should handle large order with 8+ items', () => {
      const items = [
        '"Amazon.com","112-8259165-9894648","2025-10-08T16:27:00Z","Not Applicable","USD","18.67","1.26","0","0","19.93","18.67","1.26","B0001","New","1","Visa - 0335","Closed","Shipped","2025-10-09T10:00:00Z","standard","Address","Name",""',
        '"Amazon.com","112-8259165-9894648","2025-10-08T16:27:00Z","Not Applicable","USD","47.99","3.24","0","0","51.23","47.99","3.24","B0002","New","1","Visa - 0335","Closed","Shipped","2025-10-09T10:00:00Z","standard","Address","Name",""',
        '"Amazon.com","112-8259165-9894648","2025-10-08T16:27:00Z","Not Applicable","USD","16.99","1.15","0","0","18.14","16.99","1.15","B0003","New","1","Visa - 0335","Closed","Shipped","2025-10-09T10:00:00Z","standard","Address","Name",""',
        '"Amazon.com","112-8259165-9894648","2025-10-08T16:27:00Z","Not Applicable","USD","29.99","2.03","0","0","32.02","29.99","2.03","B0004","New","1","Visa - 0335","Closed","Shipped","2025-10-09T10:00:00Z","standard","Address","Name",""',
        '"Amazon.com","112-8259165-9894648","2025-10-08T16:27:00Z","Not Applicable","USD","39.99","2.70","0","0","42.69","39.99","2.70","B0005","New","1","Visa - 0335","Closed","Shipped","2025-10-09T10:00:00Z","standard","Address","Name",""',
        '"Amazon.com","112-8259165-9894648","2025-10-08T16:27:00Z","Not Applicable","USD","24.99","1.69","0","0","26.68","24.99","1.69","B0006","New","1","Visa - 0335","Closed","Shipped","2025-10-09T10:00:00Z","standard","Address","Name",""',
        '"Amazon.com","112-8259165-9894648","2025-10-08T16:27:00Z","Not Applicable","USD","14.99","1.01","0","0","16.00","14.99","1.01","B0007","New","1","Visa - 0335","Closed","Shipped","2025-10-09T10:00:00Z","standard","Address","Name",""',
        '"Amazon.com","112-8259165-9894648","2025-10-08T16:27:00Z","Not Applicable","USD","22.99","1.55","0","0","24.54","22.99","1.55","B0008","New","1","Visa - 0335","Closed","Shipped","2025-10-09T10:00:00Z","standard","Address","Name",""'
      ]

      const header = '"Website","Order ID","Order Date","Purchase Order Number","Currency","Unit Price","Unit Price Tax","Shipping Charge","Total Discounts","Total Owed","Shipment Item Subtotal","Shipment Item Subtotal Tax","ASIN","Product Condition","Quantity","Payment Instrument Type","Order Status","Shipment Status","Ship Date","Shipping Option","Shipping Address","Buyer Name","Group Name"'
      const csv = header + '\n' + items.join('\n')

      const result = parseAmazonExport(csv)

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].amount).toBeCloseTo(231.23, 2)
      expect(result.transactions[0].description).toContain('8 items')
    })
  })
})
