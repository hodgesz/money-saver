// GREEN PHASE: Implement CSV parser to pass tests

export interface ParsedTransaction {
  date: string
  amount: number
  merchant: string
  description: string
}

export interface ParseResult {
  success: boolean
  transactions: ParsedTransaction[]
  errors: string[]
}

// Column name mappings for flexibility
const COLUMN_MAPPINGS = {
  date: ['date', 'transaction date', 'trans date'],
  amount: ['amount', 'transaction amount', 'value'],
  merchant: ['merchant', 'merchant name', 'vendor', 'payee'],
  description: ['description', 'notes', 'memo', 'details'],
}

/**
 * Parses CSV content and extracts transaction data
 * @param csvContent - Raw CSV file content as string
 * @returns ParseResult with transactions and any errors
 */
export function parseCSV(csvContent: string): ParseResult {
  const transactions: ParsedTransaction[] = []
  const errors: string[] = []

  // Check for empty content
  if (!csvContent || csvContent.trim().length === 0) {
    return {
      success: false,
      transactions: [],
      errors: ['CSV file is empty'],
    }
  }

  // Split into lines and handle different line endings
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
  const headerRow = lines[0]
  const headers = parseCSVLine(headerRow).map(h => h.toLowerCase().trim())

  // Find column indices
  const columnIndices = findColumnIndices(headers)

  // Check for required columns
  const missingColumns: string[] = []
  if (columnIndices.date === -1) missingColumns.push('date')
  if (columnIndices.amount === -1) missingColumns.push('amount')

  if (missingColumns.length > 0) {
    return {
      success: false,
      transactions: [],
      errors: missingColumns.map(col => `Missing required column: ${col}`),
    }
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue

    const values = parseCSVLine(line)
    const rowNumber = i + 1

    const result = parseTransactionRow(values, columnIndices, rowNumber)

    if (result.errors.length > 0) {
      // Add all validation errors for this row
      errors.push(...result.errors.map(err => `Row ${rowNumber}: ${err}`))
    } else if (result.transaction) {
      transactions.push(result.transaction)
    }
  }

  // Determine overall success
  const success = transactions.length > 0

  return {
    success,
    transactions,
    errors,
  }
}

/**
 * Parse a single CSV line, handling quoted fields with commas
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
 * Find indices of required columns in header
 */
interface ColumnIndices {
  date: number
  amount: number
  merchant: number
  description: number
}

function findColumnIndices(headers: string[]): ColumnIndices {
  const indices: ColumnIndices = {
    date: -1,
    amount: -1,
    merchant: -1,
    description: -1,
  }

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]

    if (COLUMN_MAPPINGS.date.includes(header)) {
      indices.date = i
    } else if (COLUMN_MAPPINGS.amount.includes(header)) {
      indices.amount = i
    } else if (COLUMN_MAPPINGS.merchant.includes(header)) {
      indices.merchant = i
    } else if (COLUMN_MAPPINGS.description.includes(header)) {
      indices.description = i
    }
  }

  return indices
}

interface ParseRowResult {
  transaction: ParsedTransaction | null
  errors: string[]
}

/**
 * Parse a single transaction row
 */
function parseTransactionRow(
  values: string[],
  indices: ColumnIndices,
  rowNumber: number
): ParseRowResult {
  const rowErrors: string[] = []

  // Extract values
  const dateStr = values[indices.date]?.trim() || ''
  const amountStr = values[indices.amount]?.trim() || ''
  const merchant = values[indices.merchant]?.trim() || 'Unknown'
  const description = values[indices.description]?.trim() || ''

  // Validate date
  if (!isValidDate(dateStr)) {
    rowErrors.push(`Invalid date format: ${dateStr}`)
  }

  // Validate and parse amount
  const amount = parseAmount(amountStr)
  if (isNaN(amount)) {
    rowErrors.push(`Invalid amount: ${amountStr}`)
  }

  // If there are any validation errors, return them
  if (rowErrors.length > 0) {
    return {
      transaction: null,
      errors: rowErrors,
    }
  }

  // All validations passed, return the transaction
  return {
    transaction: {
      date: dateStr,
      amount,
      merchant: merchant || 'Unknown',
      description,
    },
    errors: [],
  }
}

/**
 * Validate date format (YYYY-MM-DD or similar)
 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false

  // Try parsing the date
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

/**
 * Parse amount string, handling currency symbols and commas
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return NaN

  // Remove currency symbols and commas
  const cleaned = amountStr
    .replace(/[$€£¥,]/g, '')
    .trim()

  return parseFloat(cleaned)
}
