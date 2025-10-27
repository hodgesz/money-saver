// GREEN PHASE: Implement Chase credit card parser

export interface ChaseTransaction {
  date: string
  amount: number
  originalAmount: number // Signed amount from CSV (negative = expense, positive = payment/return)
  merchant: string
  description: string
  chaseCategory: string
  type: string
}

export interface ChaseParseResult {
  success: boolean
  transactions: ChaseTransaction[]
  errors: string[]
}

/**
 * Chase CSV Format:
 * Transaction Date, Post Date, Description, Category, Type, Amount, Memo
 */

const REQUIRED_COLUMNS = ['Transaction Date', 'Description', 'Amount']

/**
 * Parse Chase credit card CSV file
 */
export function parseChaseCSV(csvContent: string): ChaseParseResult {
  const transactions: ChaseTransaction[] = []
  const errors: string[] = []

  // Check for empty content
  if (!csvContent || csvContent.trim().length === 0) {
    return {
      success: false,
      transactions: [],
      errors: ['CSV file is empty'],
    }
  }

  // Split into lines
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0)

  if (lines.length === 0) {
    return {
      success: false,
      transactions: [],
      errors: ['CSV file is empty'],
    }
  }

  if (lines.length === 1) {
    return {
      success: false,
      transactions: [],
      errors: ['No transaction data found'],
    }
  }

  // Parse header row
  const headers = parseCSVLine(lines[0])

  // Verify required columns exist
  const missingColumns = REQUIRED_COLUMNS.filter(
    col => !headers.includes(col)
  )

  if (missingColumns.length > 0) {
    return {
      success: false,
      transactions: [],
      errors: missingColumns.map(col => `Missing required column: ${col}`),
    }
  }

  // Find column indices
  const dateIndex = headers.indexOf('Transaction Date')
  const descriptionIndex = headers.indexOf('Description')
  const amountIndex = headers.indexOf('Amount')
  const categoryIndex = headers.indexOf('Category')
  const typeIndex = headers.indexOf('Type')

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue

    const values = parseCSVLine(line)
    const rowNumber = i + 1

    try {
      const transaction = parseChaseRow(
        values,
        dateIndex,
        descriptionIndex,
        amountIndex,
        categoryIndex,
        typeIndex,
        rowNumber
      )

      if (transaction) {
        transactions.push(transaction)
      }
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Row ${rowNumber}: ${error.message}`)
      }
    }
  }

  // Success if we parsed at least one transaction
  const success = transactions.length > 0

  return {
    success,
    transactions,
    errors,
  }
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let currentValue = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      insideQuotes = !insideQuotes
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim())
      currentValue = ''
    } else {
      currentValue += char
    }
  }

  // Add the last value
  values.push(currentValue.trim())

  return values
}

/**
 * Parse a single Chase transaction row
 */
function parseChaseRow(
  values: string[],
  dateIndex: number,
  descriptionIndex: number,
  amountIndex: number,
  categoryIndex: number,
  typeIndex: number,
  rowNumber: number
): ChaseTransaction | null {
  // Extract values
  const dateStr = values[dateIndex]?.trim() || ''
  const description = values[descriptionIndex]?.trim() || ''
  const amountStr = values[amountIndex]?.trim() || ''
  const chaseCategory = values[categoryIndex]?.trim() || ''
  const type = values[typeIndex]?.trim() || ''

  // Validate date
  if (!isValidDate(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }

  // Parse and validate amount
  const amount = parseFloat(amountStr)
  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`)
  }

  // Chase format:
  // - Negative amounts = purchases/expenses (e.g., -20.96)
  // - Positive amounts = payments/returns (e.g., 2519.13)
  // Store both original (signed) and absolute amount
  const absoluteAmount = Math.abs(amount)

  // Use description as merchant (Chase doesn't have separate merchant field)
  const merchant = description || 'Unknown'

  return {
    date: dateStr,
    amount: absoluteAmount,
    originalAmount: amount, // Keep signed amount for is_income determination
    merchant,
    description,
    chaseCategory,
    type,
  }
}

/**
 * Validate date format (MM/DD/YYYY or similar)
 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false

  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}
