// GREEN PHASE: Implement CSV format detector

export enum CSVFormat {
  AMAZON = 'amazon',
  CHASE_CREDIT_CARD = 'chase_credit_card',
  BANK_STATEMENT = 'bank_statement',
  CREDIT_CARD = 'credit_card',
  GENERIC = 'generic',
}

interface FormatSignature {
  requiredColumns: string[]
  optionalColumns: string[]
  priority: number
}

const FORMAT_SIGNATURES: Record<CSVFormat, FormatSignature> = {
  [CSVFormat.AMAZON]: {
    // Amazon is identified by having ASIN or "order" keywords
    requiredColumns: ['asin|order'],
    optionalColumns: ['price', 'description', 'category', 'quantity', 'item'],
    priority: 1,
  },
  [CSVFormat.CHASE_CREDIT_CARD]: {
    // Chase credit cards have specific column structure
    requiredColumns: ['transaction date', 'post date', 'description'],
    optionalColumns: ['amount', 'category', 'type', 'memo'],
    priority: 1,
  },
  [CSVFormat.BANK_STATEMENT]: {
    // Bank statements have debit/credit columns or balance
    requiredColumns: ['date', 'debit|credit|balance'],
    optionalColumns: ['description', 'amount', 'type', 'memo', 'check'],
    priority: 2,
  },
  [CSVFormat.CREDIT_CARD]: {
    // Credit cards have merchant or "transaction" keyword
    requiredColumns: ['date', 'merchant|transaction'],
    optionalColumns: ['amount', 'category', 'post', 'memo', 'card'],
    priority: 3,
  },
  [CSVFormat.GENERIC]: {
    requiredColumns: ['date'],
    optionalColumns: ['amount', 'merchant', 'description', 'price'],
    priority: 4,
  },
}

/**
 * Normalize header for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Replace special characters with spaces
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Check if normalized headers contain a specific column name
 * Supports OR logic with pipe separator (e.g., "asin|order")
 */
function hasColumn(normalizedHeaders: string[], columnName: string): boolean {
  // Handle OR logic (e.g., "asin|order")
  if (columnName.includes('|')) {
    const alternatives = columnName.split('|')
    return alternatives.some((alt) => hasColumn(normalizedHeaders, alt))
  }

  const normalizedColumn = normalizeHeader(columnName)
  return normalizedHeaders.some((header) => header.includes(normalizedColumn))
}

/**
 * Calculate match score for a format signature
 */
function calculateMatchScore(
  normalizedHeaders: string[],
  signature: FormatSignature
): number {
  // Check if all required columns are present
  const hasAllRequired = signature.requiredColumns.every((col) =>
    hasColumn(normalizedHeaders, col)
  )

  if (!hasAllRequired) {
    return 0
  }

  // Count how many required columns matched
  const requiredMatches = signature.requiredColumns.length

  // Count how many optional columns are present
  const optionalMatches = signature.optionalColumns.filter((col) =>
    hasColumn(normalizedHeaders, col)
  ).length

  // Score calculation:
  // - Base score: 1000
  // - Required column bonus: 200 per required column (rewards specificity)
  // - Optional column bonus: 50 per optional match
  // - Priority penalty: 100 per priority level (lower priority = higher penalty)
  return (
    1000 +
    requiredMatches * 200 +
    optionalMatches * 50 -
    signature.priority * 100
  )
}

/**
 * Detect CSV format from headers
 * Returns the format with the highest match score
 */
export function detectCSVFormat(headers: string[]): CSVFormat {
  if (headers.length === 0) {
    return CSVFormat.GENERIC
  }

  // Normalize all headers
  const normalizedHeaders = headers.map(normalizeHeader)

  // Calculate match scores for each format
  const scores: Array<{ format: CSVFormat; score: number }> = Object.entries(
    FORMAT_SIGNATURES
  ).map(([format, signature]) => ({
    format: format as CSVFormat,
    score: calculateMatchScore(normalizedHeaders, signature),
  }))

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  // Return format with highest score (or GENERIC if no match)
  const bestMatch = scores[0]
  return bestMatch.score > 0 ? bestMatch.format : CSVFormat.GENERIC
}

/**
 * Get human-readable format name
 */
export function getFormatName(format: CSVFormat): string {
  switch (format) {
    case CSVFormat.AMAZON:
      return 'Amazon Order History'
    case CSVFormat.CHASE_CREDIT_CARD:
      return 'Chase Credit Card'
    case CSVFormat.BANK_STATEMENT:
      return 'Bank Statement'
    case CSVFormat.CREDIT_CARD:
      return 'Credit Card Statement'
    case CSVFormat.GENERIC:
      return 'Generic Transaction CSV'
  }
}
