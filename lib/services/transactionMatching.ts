/**
 * Transaction Matching Service
 * Core algorithm for linking Amazon line items to credit card charges
 *
 * Algorithm: 5-Phase Pipeline
 * 1. Pre-processing: Normalize and validate data
 * 2. Candidate Generation: Filter by date window
 * 3. Match Scoring: Calculate confidence (0-100)
 * 4. Match Selection: Choose best matches
 * 5. Post-processing: Allocate tax/shipping
 */

import {
  LinkedTransaction,
  MatchCandidate,
  MatchingConfig,
  getConfidenceLevel,
} from '@/lib/types/transactionLinking'

/**
 * Group of transactions from same order (same date)
 */
interface TransactionGroup {
  date: string
  transactions: LinkedTransaction[]
  totalAmount: number
}

/**
 * Check if child transaction date is within window of parent date
 * @param parentDate - Parent transaction date (ISO string)
 * @param childDate - Child transaction date (ISO string)
 * @param windowDays - Window size in days (±)
 * @returns true if within window
 */
export function isWithinDateWindow(
  parentDate: string,
  childDate: string,
  windowDays: number
): boolean {
  const parent = new Date(parentDate)
  const child = new Date(childDate)

  const diffMs = Math.abs(parent.getTime() - child.getTime())
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  return diffDays <= windowDays
}

/**
 * Validate if children amounts sum to parent amount within tolerance
 * @param parentAmount - Parent transaction amount
 * @param childrenTotal - Sum of children amounts
 * @param tolerance - Tolerance as decimal (e.g., 0.005 = 0.5%)
 * @returns true if amounts match within tolerance
 */
export function validateAmountMatch(
  parentAmount: number,
  childrenTotal: number,
  tolerance: number
): boolean {
  // Handle zero amounts
  if (parentAmount === 0 && childrenTotal === 0) return true
  if (parentAmount === 0 || childrenTotal === 0) return false

  const difference = Math.abs(parentAmount - childrenTotal)
  const percentDiff = difference / parentAmount

  return percentDiff <= tolerance
}

/**
 * Group transactions by date (same date = same order)
 * @param transactions - List of transactions
 * @returns Array of transaction groups sorted by date
 */
export function groupTransactionsByOrder(
  transactions: LinkedTransaction[]
): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>()

  for (const transaction of transactions) {
    const dateKey = transaction.date.split('T')[0] // Use date only (no time)

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: transaction.date,
        transactions: [],
        totalAmount: 0,
      })
    }

    const group = groups.get(dateKey)!
    group.transactions.push(transaction)
    group.totalAmount += transaction.amount
  }

  // Convert to array and sort by date
  return Array.from(groups.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

/**
 * Calculate date score (0-40 points)
 * Score decays by 4 points per day
 * @param parentDate - Parent transaction date
 * @param childDate - Child transaction date (or earliest in group)
 * @param windowDays - Date window size
 * @returns Date score (0-40)
 */
function calculateDateScore(
  parentDate: string,
  childDate: string,
  windowDays: number
): number {
  if (!isWithinDateWindow(parentDate, childDate, windowDays)) {
    return 0
  }

  const parent = new Date(parentDate)
  const child = new Date(childDate)

  const diffMs = Math.abs(parent.getTime() - child.getTime())
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  // Max 40 points, decay 4 points per day
  const score = Math.max(0, 40 - diffDays * 4)

  return Math.round(score)
}

/**
 * Calculate amount score (0-50 points)
 * Based on how well children sum to parent amount
 * @param parentAmount - Parent amount
 * @param childrenTotal - Sum of children amounts
 * @param tolerance - Amount tolerance
 * @returns Amount score (0-50)
 */
function calculateAmountScore(
  parentAmount: number,
  childrenTotal: number,
  tolerance: number
): number {
  if (parentAmount === 0) return 0

  const difference = Math.abs(parentAmount - childrenTotal)
  const percentDiff = difference / parentAmount

  // If outside tolerance, return 0
  if (percentDiff > tolerance) return 0

  // Perfect match = 50 points
  // Score decreases linearly as difference approaches tolerance
  const score = 50 * (1 - percentDiff / tolerance)

  return Math.round(score)
}

/**
 * Calculate order group score (0-10 points)
 * Bonus for multiple items on same date (same order)
 * @param transactions - Transactions in potential match
 * @returns Order group score (0-10)
 */
function calculateOrderGroupScore(transactions: LinkedTransaction[]): number {
  if (transactions.length === 1) return 0

  // Group by date
  const groups = groupTransactionsByOrder(transactions)

  // If all on same date = max 10 points
  if (groups.length === 1) return 10

  // If multiple dates = 5 points (could be split shipment)
  return 5
}

/**
 * Calculate match confidence score
 * @param parent - Parent transaction
 * @param children - Child transactions
 * @param config - Matching configuration
 * @returns Match candidate with scores
 */
export function calculateMatchConfidence(
  parent: LinkedTransaction,
  children: LinkedTransaction[],
  config: MatchingConfig
): MatchCandidate {
  // Calculate component scores
  const childrenTotal = children.reduce((sum, child) => sum + child.amount, 0)

  // Use earliest child date for date score
  const earliestChild = children.reduce((earliest, child) =>
    new Date(child.date) < new Date(earliest.date) ? child : earliest
  )

  const dateScore = calculateDateScore(parent.date, earliestChild.date, config.dateWindow)

  // If date outside window, return 0 confidence
  if (dateScore === 0) {
    return {
      parentTransaction: parent,
      childTransactions: children,
      dateScore: 0,
      amountScore: 0,
      orderGroupScore: 0,
      totalScore: 0,
      confidenceLevel: 'UNMATCHED',
    }
  }

  const amountScore = calculateAmountScore(
    parent.amount,
    childrenTotal,
    config.amountTolerance
  )

  const orderGroupScore = calculateOrderGroupScore(children)

  const totalScore = dateScore + amountScore + orderGroupScore

  return {
    parentTransaction: parent,
    childTransactions: children,
    dateScore,
    amountScore,
    orderGroupScore,
    totalScore,
    confidenceLevel: getConfidenceLevel(totalScore),
  }
}

/**
 * Filter transactions by merchant keywords
 * @param transaction - Transaction to check
 * @param keywords - Merchant keywords to match
 * @returns true if merchant matches any keyword
 */
function matchesMerchant(transaction: LinkedTransaction, keywords: string[]): boolean {
  const merchant = transaction.merchant.toLowerCase()

  return keywords.some(keyword => merchant.includes(keyword.toLowerCase()))
}

/**
 * Find matching transactions for parent-child linking
 * @param parents - Potential parent transactions (e.g., credit card charges)
 * @param children - Potential child transactions (e.g., Amazon items)
 * @param config - Matching configuration
 * @returns Array of match candidates
 */
export function findMatchingTransactions(
  parents: LinkedTransaction[],
  children: LinkedTransaction[],
  config: MatchingConfig
): MatchCandidate[] {
  const matches: MatchCandidate[] = []

  // Filter out already linked children
  const unlinkedChildren = children.filter(child => child.parent_transaction_id === null)

  // Filter parents by merchant if enabled
  let filteredParents = parents
  if (config.enableMerchantMatching) {
    filteredParents = parents.filter(parent =>
      matchesMerchant(parent, config.merchantKeywords)
    )
  }

  // For each parent, find best matching children
  for (const parent of filteredParents) {
    // Skip if parent is already a child
    if (parent.parent_transaction_id !== null) continue

    // Find candidates within date window
    const candidates = unlinkedChildren.filter(child =>
      isWithinDateWindow(parent.date, child.date, config.dateWindow)
    )

    if (candidates.length === 0) continue

    // Try to find combinations that match the parent amount
    // For MVP, we'll use a greedy approach: group by date and try each group
    const groups = groupTransactionsByOrder(candidates)

    for (const group of groups) {
      const confidence = calculateMatchConfidence(parent, group.transactions, config)

      // Only include if above minimum threshold
      if (confidence.totalScore >= config.suggestThreshold) {
        matches.push(confidence)
      }
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.totalScore - a.totalScore)

  return matches
}
