/**
 * Amazon Export Parser
 *
 * Parses Amazon data request export files (Retail.OrderHistory.1.csv)
 * This format includes tax-inclusive totals, exact charged amounts, and precise timestamps.
 *
 * Key features:
 * - Tax-inclusive totals from "Total Owed" column
 * - Precise ISO 8601 timestamps
 * - Multi-item order aggregation
 * - Shipping and discount handling
 */

import type { TransactionFormData } from '@/types'

export interface AmazonExportParseResult {
  success: boolean
  transactions: TransactionFormData[]
  errors: string[]
  totalOrders: number
  totalAmount: number
  skippedOrders: number
}

export interface AmazonExportOptions {
  /** If true, aggregate line items into order totals. If false, import each line item separately */
  aggregateOrders?: boolean
}

interface AmazonOrderLine {
  orderId: string
  orderDate: string
  unitPrice: number
  unitPriceTax: number
  shippingCharge: number
  totalDiscounts: number
  totalOwed: number
  asin: string
  quantity: number
  paymentInstrumentType: string
  orderStatus: string
  shipmentStatus: string
}

interface AggregatedOrder {
  orderId: string
  orderDate: string
  items: AmazonOrderLine[]
  totalOwed: number
  paymentMethod: string
  orderStatus: string
  shipmentStatus: string
}

/**
 * Parse Amazon export CSV and convert to transactions
 * @param csvContent - CSV file content
 * @param options - Parsing options (aggregateOrders: true for order totals, false for individual line items)
 */
export function parseAmazonExport(
  csvContent: string,
  options: AmazonExportOptions = { aggregateOrders: false }
): AmazonExportParseResult {
  const result: AmazonExportParseResult = {
    success: false,
    transactions: [],
    errors: [],
    totalOrders: 0,
    totalAmount: 0,
    skippedOrders: 0,
  }

  // Validate input
  if (!csvContent || csvContent.trim().length === 0) {
    result.errors.push('Empty CSV file')
    return result
  }

  try {
    // Parse CSV
    const lines = parseCSV(csvContent)

    if (lines.length < 2) {
      result.errors.push('CSV file must contain header and at least one data row')
      return result
    }

    // Extract header and validate format
    const header = lines[0]
    if (!isValidAmazonExportHeader(header)) {
      result.errors.push('Invalid Amazon export format. Expected Retail.OrderHistory.1.csv format')
      return result
    }

    // Parse order lines
    const orderLines: AmazonOrderLine[] = []
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = parseOrderLine(lines[i], header)
        if (line) {
          orderLines.push(line)
        }
      } catch (error) {
        // Skip invalid lines but continue parsing
        result.errors.push(`Error parsing line ${i + 1}: ${error}`)
      }
    }

    if (options.aggregateOrders) {
      // Aggregate mode: Combine line items into order totals
      const orders = aggregateOrdersByOrderId(orderLines)

      for (const order of orders) {
        if (order.orderStatus === 'Cancelled' || order.totalOwed === 0) {
          result.skippedOrders++
          continue
        }

        const transaction = convertOrderToTransaction(order)
        result.transactions.push(transaction)
        result.totalAmount += transaction.amount
      }
    } else {
      // Line-item mode: Import each line item separately for granular categorization
      for (const line of orderLines) {
        if (line.orderStatus === 'Cancelled' || line.totalOwed === 0) {
          result.skippedOrders++
          continue
        }

        const transaction = convertLineItemToTransaction(line)
        result.transactions.push(transaction)
        result.totalAmount += transaction.amount
      }
    }

    result.totalOrders = result.transactions.length
    result.success = true
  } catch (error) {
    result.errors.push(`Failed to parse CSV: ${error}`)
    return result
  }

  return result
}

/**
 * Parse CSV content into array of string arrays
 * Handles quoted fields and embedded commas
 */
function parseCSV(content: string): string[][] {
  const lines: string[][] = []
  const rows = content.split('\n')

  for (const row of rows) {
    if (!row.trim()) continue

    const fields: string[] = []
    let currentField = ''
    let insideQuotes = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]

      if (char === '"') {
        if (insideQuotes && row[i + 1] === '"') {
          // Escaped quote
          currentField += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes
        }
      } else if (char === ',' && !insideQuotes) {
        // Field delimiter
        fields.push(currentField)
        currentField = ''
      } else {
        currentField += char
      }
    }

    // Add last field
    fields.push(currentField)
    lines.push(fields)
  }

  return lines
}

/**
 * Validate Amazon export header
 */
function isValidAmazonExportHeader(header: string[]): boolean {
  const requiredColumns = [
    'Order ID',
    'Order Date',
    'Unit Price',
    'Unit Price Tax',
    'Total Owed',
    'ASIN',
    'Order Status',
  ]

  return requiredColumns.every((col) =>
    header.some((h) => h.includes(col))
  )
}

/**
 * Parse a single order line from CSV
 */
function parseOrderLine(
  fields: string[],
  header: string[]
): AmazonOrderLine | null {
  const getField = (name: string): string => {
    const index = header.findIndex((h) => h.includes(name))
    return index >= 0 ? fields[index] : ''
  }

  const parseNumber = (value: string): number => {
    if (!value || value === 'Not Applicable' || value === '') return 0
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }

  try {
    return {
      orderId: getField('Order ID'),
      orderDate: getField('Order Date'),
      unitPrice: parseNumber(getField('Unit Price')),
      unitPriceTax: parseNumber(getField('Unit Price Tax')),
      shippingCharge: parseNumber(getField('Shipping Charge')),
      totalDiscounts: parseNumber(getField('Total Discounts')),
      totalOwed: parseNumber(getField('Total Owed')),
      asin: getField('ASIN'),
      quantity: parseNumber(getField('Quantity')) || 1,
      paymentInstrumentType: getField('Payment Instrument Type'),
      orderStatus: getField('Order Status'),
      shipmentStatus: getField('Shipment Status'),
    }
  } catch (error) {
    return null
  }
}

/**
 * Aggregate order lines by order ID
 */
function aggregateOrdersByOrderId(
  orderLines: AmazonOrderLine[]
): AggregatedOrder[] {
  const ordersMap = new Map<string, AggregatedOrder>()

  for (const line of orderLines) {
    if (!line.orderId) continue

    if (!ordersMap.has(line.orderId)) {
      ordersMap.set(line.orderId, {
        orderId: line.orderId,
        orderDate: line.orderDate,
        items: [],
        totalOwed: 0,
        paymentMethod: line.paymentInstrumentType,
        orderStatus: line.orderStatus,
        shipmentStatus: line.shipmentStatus,
      })
    }

    const order = ordersMap.get(line.orderId)!
    order.items.push(line)
    order.totalOwed += line.totalOwed
  }

  return Array.from(ordersMap.values())
}

/**
 * Convert aggregated order to TransactionFormData
 */
function convertOrderToTransaction(order: AggregatedOrder): TransactionFormData {
  // Parse order date
  let orderDate: Date
  try {
    orderDate = new Date(order.orderDate.replace('Z', '+00:00'))
  } catch {
    orderDate = new Date()
  }

  // Build description
  const itemCount = order.items.length
  const description = buildOrderDescription(order, itemCount)

  return {
    date: orderDate.toISOString().split('T')[0],
    amount: Math.round(order.totalOwed * 100) / 100, // Round to 2 decimals
    merchant: 'Amazon',
    description,
    is_income: false,
  }
}

/**
 * Convert individual line item to TransactionFormData
 * Used when aggregateOrders = false to import each item separately for granular categorization
 */
function convertLineItemToTransaction(line: AmazonOrderLine): TransactionFormData {
  // Parse order date
  let orderDate: Date
  try {
    orderDate = new Date(line.orderDate.replace('Z', '+00:00'))
  } catch {
    orderDate = new Date()
  }

  // Build description with order ID and ASIN
  const description = `Order: ${line.orderId} | ASIN: ${line.asin}${
    line.quantity > 1 ? ` | Qty: ${line.quantity}` : ''
  }`

  return {
    date: orderDate.toISOString().split('T')[0],
    amount: Math.round(line.totalOwed * 100) / 100, // Round to 2 decimals
    merchant: 'Amazon',
    description,
    is_income: false,
  }
}

/**
 * Build order description with item details
 */
function buildOrderDescription(
  order: AggregatedOrder,
  itemCount: number
): string {
  const parts: string[] = []

  // Order ID
  parts.push(`Order: ${order.orderId}`)

  // Item count
  if (itemCount === 1) {
    // Single item - show ASIN
    const asin = order.items[0].asin
    if (asin) {
      parts.push(`ASIN: ${asin}`)
    }
  } else {
    // Multi-item - show count and list ASINs
    parts.push(`${itemCount} items`)

    // List up to 5 ASINs
    const asins = order.items
      .map((item) => item.asin)
      .filter((asin) => asin)
      .slice(0, 5)

    if (asins.length > 0) {
      parts.push(`ASINs: ${asins.join(', ')}`)
    }

    if (order.items.length > 5) {
      parts.push(`... and ${order.items.length - 5} more`)
    }
  }

  return parts.join(' | ')
}
