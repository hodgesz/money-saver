// GREEN PHASE: Implement Amazon CSV parser

export interface AmazonTransaction {
  date: string
  amount: number
  merchant: string
  description: string
  category?: string
  subcategory?: string
  metadata?: {
    orderId?: string
    asin?: string
    quantity?: number
    subscribeAndSave?: boolean
  }
}

export interface AmazonParseResult {
  success: boolean
  transactions: AmazonTransaction[]
  errors: string[]
}

interface ColumnMapping {
  orderDate?: number
  price?: number
  description?: number
  orderId?: number
  asin?: number
  category?: number
  quantity?: number
  subscribeAndSave?: number
}

/**
 * Normalize header for comparison
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Find column indexes from headers
 */
function findColumnIndexes(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header)

    if (normalized.includes('order') && normalized.includes('date')) {
      mapping.orderDate = index
    } else if (normalized === 'price') {
      mapping.price = index
    } else if (normalized === 'description') {
      mapping.description = index
    } else if (normalized.includes('order') && normalized.includes('id')) {
      mapping.orderId = index
    } else if (normalized === 'asin') {
      mapping.asin = index
    } else if (normalized === 'category') {
      mapping.category = index
    } else if (normalized === 'quantity') {
      mapping.quantity = index
    } else if (normalized.includes('subscribe')) {
      mapping.subscribeAndSave = index
    }
  })

  return mapping
}

/**
 * Validate required columns are present
 */
function validateColumns(mapping: ColumnMapping): string[] {
  const errors: string[] = []
  const missing: string[] = []

  if (mapping.orderDate === undefined) missing.push('order date')
  if (mapping.price === undefined) missing.push('price')

  if (missing.length > 0) {
    errors.push(`Missing required columns: ${missing.join(', ')}`)
  }

  return errors
}

/**
 * Parse price from Amazon format
 * Handles: $45.99, 45.99, $1,234.56, $100
 */
function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null

  // Remove dollar sign, commas, and whitespace
  const cleaned = priceStr.replace(/[\$,\s]/g, '')

  const amount = parseFloat(cleaned)
  return isNaN(amount) ? null : amount
}

/**
 * Validate date format (YYYY-MM-DD)
 * Returns null for invalid dates (including "pending")
 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false
  if (dateStr.toLowerCase() === 'pending') return false

  // Validate YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false

  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Increment date by one day
 */
function incrementDate(dateStr: string): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

/**
 * Parse Amazon category hierarchy
 * Example: "Health & Household›Household Supplies›Paper Towels"
 * Returns: { category: "Household Supplies", subcategory: "Paper Towels" }
 */
function parseCategory(categoryStr: string): {
  category?: string
  subcategory?: string
} {
  if (!categoryStr) return {}

  const parts = categoryStr.split('›').map((s) => s.trim())

  if (parts.length === 0) return {}
  if (parts.length === 1) return { category: parts[0] }
  if (parts.length === 2) return { category: parts[0], subcategory: parts[1] }

  // For 3+ levels, use second level as category, third as subcategory
  return {
    category: parts[1],
    subcategory: parts[2],
  }
}

/**
 * Parse a single row from Amazon CSV
 * Note: For "pending" dates, this returns a special marker that will be interpolated later
 */
function parseAmazonRow(
  row: string[],
  mapping: ColumnMapping,
  rowNum: number,
  lastValidDate: string | null
): {
  transaction: AmazonTransaction | null
  errors: string[]
  isPending: boolean
  dateStr: string
} {
  const errors: string[] = []

  // Extract values
  const dateStr = mapping.orderDate !== undefined ? row[mapping.orderDate] : ''
  const priceStr = mapping.price !== undefined ? row[mapping.price] : ''
  const description =
    mapping.description !== undefined ? row[mapping.description] : ''

  // Skip rows with both empty date and price (likely blank/summary rows)
  if (!dateStr.trim() && !priceStr.trim()) {
    return { transaction: null, errors: [], isPending: false, dateStr: '' }
  }

  // Check if date is pending
  const isPending = dateStr.toLowerCase() === 'pending'

  // For pending dates, we'll interpolate later
  let finalDate: string | null = null
  if (isPending) {
    // Use last valid date as placeholder, will be updated in second pass
    finalDate = lastValidDate
  } else if (isValidDate(dateStr)) {
    finalDate = dateStr
  }

  if (!finalDate) {
    errors.push(`Row ${rowNum}: Invalid date format: ${dateStr}`)
  }

  // Parse price
  const amount = parsePrice(priceStr)
  if (amount === null) {
    errors.push(`Row ${rowNum}: Invalid price: ${priceStr}`)
  }

  // If validation failed, return errors
  if (errors.length > 0) {
    return { transaction: null, errors, isPending: false, dateStr }
  }

  // Parse category
  const categoryStr =
    mapping.category !== undefined ? row[mapping.category] : ''
  const { category, subcategory } = parseCategory(categoryStr)

  // Build transaction
  const transaction: AmazonTransaction = {
    date: finalDate!,
    amount: amount!,
    merchant: 'Amazon',
    description: description || 'Amazon Purchase',
    category,
    subcategory,
    metadata: {
      orderId: mapping.orderId !== undefined ? row[mapping.orderId] : undefined,
      asin: mapping.asin !== undefined ? row[mapping.asin] : undefined,
      quantity:
        mapping.quantity !== undefined
          ? parseInt(row[mapping.quantity]) || undefined
          : undefined,
      subscribeAndSave:
        mapping.subscribeAndSave !== undefined
          ? row[mapping.subscribeAndSave] === '1' ||
            row[mapping.subscribeAndSave].toLowerCase() === 'true'
          : undefined,
    },
  }

  return { transaction, errors: [], isPending, dateStr }
}

/**
 * Parse Amazon CSV content
 */
export function parseAmazonCSV(csvContent: string): AmazonParseResult {
  const lines = csvContent.trim().split('\n')

  if (lines.length === 0) {
    return {
      success: false,
      transactions: [],
      errors: ['Empty CSV file'],
    }
  }

  // Parse headers
  const headerLine = lines[0]
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

  // Find column indexes
  const mapping = findColumnIndexes(headers)

  // Validate required columns
  const columnErrors = validateColumns(mapping)
  if (columnErrors.length > 0) {
    return {
      success: false,
      transactions: [],
      errors: columnErrors,
    }
  }

  // Parse rows (two-pass for pending date interpolation)
  const transactions: AmazonTransaction[] = []
  const errors: string[] = []
  let lastValidDate: string | null = null

  // First pass: parse all rows and track pending dates
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue // Skip empty lines

    // CSV parsing with proper quote handling (including escaped quotes)
    const row: string[] = []
    let current = ''
    let inQuotes = false
    let j = 0

    while (j < lines[i].length) {
      const char = lines[i][j]
      const nextChar = j < lines[i].length - 1 ? lines[i][j + 1] : ''

      if (char === '"') {
        if (!inQuotes) {
          // Start of quoted field
          inQuotes = true
        } else if (nextChar === '"') {
          // Escaped quote (two quotes in a row) - add one quote to output
          current += '"'
          j += 2 // Skip both quotes
          continue
        } else {
          // End of quoted field
          inQuotes = false
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator outside quotes
        row.push(current)
        current = ''
      } else {
        current += char
      }

      j++
    }
    row.push(current) // Add last field

    // Parse row
    const result = parseAmazonRow(row, mapping, i + 1, lastValidDate)

    if (result.transaction) {
      transactions.push(result.transaction)

      // Update last valid date if this wasn't pending
      if (!result.isPending && isValidDate(result.dateStr)) {
        lastValidDate = result.dateStr
      }
    }

    if (result.errors.length > 0) {
      errors.push(...result.errors)
    }
  }

  return {
    success: errors.length === 0,
    transactions,
    errors,
  }
}
