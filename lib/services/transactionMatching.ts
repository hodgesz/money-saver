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
 * @param toleranceDollars - Tolerance in dollars (e.g., 3.00 = $3)
 * @returns true if amounts match within tolerance
 */
export function validateAmountMatch(
  parentAmount: number,
  childrenTotal: number,
  toleranceDollars: number
): boolean {
  // Handle zero amounts
  if (parentAmount === 0 && childrenTotal === 0) return true
  if (parentAmount === 0 || childrenTotal === 0) return false

  const difference = Math.abs(parentAmount - childrenTotal)

  return difference <= toleranceDollars
}

/**
 * Group transactions by Amazon Order ID (not date!)
 * This ensures all line items from the same order are grouped together,
 * even if they shipped on different dates.
 * @param transactions - List of transactions
 * @returns Array of transaction groups sorted by date
 */
export function groupTransactionsByOrder(
  transactions: LinkedTransaction[]
): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>()

  for (const transaction of transactions) {
    // Use order_id field directly (populated from Amazon export)
    // If no Order ID, fall back to date-based grouping
    const groupKey = transaction.order_id || transaction.date.split('T')[0]

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        date: transaction.date,
        transactions: [],
        totalAmount: 0,
      })
    }

    const group = groups.get(groupKey)!
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
 * Score decays dynamically based on window size
 * For 30-day window: ~1.33 points/day decay (40/30)
 * For 14-day window: ~2.86 points/day decay (40/14)
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

  // Dynamic decay rate: spread 40 points across the entire window
  // This ensures matches at the edge of the window can still score points
  const decayRate = 40 / windowDays
  const score = Math.max(0, 40 - diffDays * decayRate)

  return Math.round(score)
}

/**
 * Calculate amount score (0-50 points)
 * Based on how well children sum to parent amount
 * Uses fixed dollar tolerance instead of percentage (e.g., $3 handles CO delivery fees)
 * @param parentAmount - Parent amount
 * @param childrenTotal - Sum of children amounts
 * @param toleranceDollars - Amount tolerance in dollars (e.g., 3.00)
 * @returns Amount score (0-50)
 */
function calculateAmountScore(
  parentAmount: number,
  childrenTotal: number,
  toleranceDollars: number
): number {
  if (parentAmount === 0) return 0

  const difference = Math.abs(parentAmount - childrenTotal)

  // If outside tolerance, return 0
  if (difference > toleranceDollars) return 0

  // Perfect match ($0.00 diff) = 50 points
  // Score decreases linearly as difference approaches tolerance
  // Example: $0.28 diff with $3 tolerance = 50 * (1 - 0.28/3) = 45 points
  const score = 50 * (1 - difference / toleranceDollars)

  return Math.round(score)
}

/**
 * Calculate order group score (0-10 points)
 * DEPRECATED: This score is no longer used as all Amazon Export line items
 * have Order IDs, making this bonus meaningless. Kept for backwards compatibility.
 * @param transactions - Transactions in potential match
 * @returns Always 0 (score removed)
 */
function calculateOrderGroupScore(transactions: LinkedTransaction[]): number {
  // REMOVED: Order ID bonus is redundant since ALL Amazon Export items have Order IDs
  // Matching now relies solely on date proximity (40 pts) + amount match (50 pts) = max 90 pts
  return 0
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
  console.log('[Matching] Starting matching with config:', {
    dateWindow: config.dateWindow,
    amountTolerance: config.amountTolerance,
    suggestThreshold: config.suggestThreshold,
    enableMerchantMatching: config.enableMerchantMatching,
  })

  const matches: MatchCandidate[] = []

  // Filter out already linked children
  const unlinkedChildren = children.filter(child => child.parent_transaction_id === null)
  console.log('[Matching] Unlinked children after filter:', unlinkedChildren.length)

  // Filter parents by merchant if enabled
  let filteredParents = parents
  if (config.enableMerchantMatching) {
    filteredParents = parents.filter(parent =>
      matchesMerchant(parent, config.merchantKeywords)
    )
    console.log('[Matching] Filtered parents by merchant keywords:', filteredParents.length)
  } else {
    console.log('[Matching] Merchant matching disabled, using all parents:', filteredParents.length)
  }

  // For each parent, find best matching children
  for (const parent of filteredParents) {
    // Skip if parent is already a child
    if (parent.parent_transaction_id !== null) {
      console.log('[Matching] Skipping parent (already a child):', parent.merchant)
      continue
    }

    console.log('[Matching] Processing parent:', {
      merchant: parent.merchant,
      amount: parent.amount,
      date: parent.date,
    })

    // Find candidates within date window
    const candidates = unlinkedChildren.filter(child =>
      isWithinDateWindow(parent.date, child.date, config.dateWindow)
    )

    console.log('[Matching] Candidates within date window:', candidates.length)

    if (candidates.length === 0) {
      console.log('[Matching] ⚠️  NO MATCH - Parent skipped (no candidates within date window):', {
        merchant: parent.merchant,
        amount: parent.amount,
        date: parent.date,
      })
      continue
    }

    // Try to find combinations that match the parent amount
    // For MVP, we'll use a greedy approach: group by date and try each group
    const groups = groupTransactionsByOrder(candidates)
    console.log('[Matching] Formed groups by date:', groups.length)

    let matchedForThisParent = false
    for (const group of groups) {
      const confidence = calculateMatchConfidence(parent, group.transactions, config)

      console.log('[Matching] Group confidence score:', {
        parentMerchant: parent.merchant,
        parentAmount: parent.amount,
        parentDate: parent.date,
        groupDate: group.date,
        groupCount: group.transactions.length,
        groupTotal: group.totalAmount,
        amountDiff: Math.abs(parent.amount - group.totalAmount).toFixed(2),
        dateScore: confidence.dateScore,
        amountScore: confidence.amountScore,
        orderGroupScore: confidence.orderGroupScore,
        totalScore: confidence.totalScore,
        confidenceLevel: confidence.confidenceLevel,
      })

      // Only include if above minimum threshold
      if (confidence.totalScore >= config.suggestThreshold) {
        console.log('[Matching] ✓ Match added (above threshold):', confidence.totalScore)
        matches.push(confidence)
        matchedForThisParent = true
      } else {
        console.log('[Matching] ✗ Match rejected (below threshold):', confidence.totalScore, '<', config.suggestThreshold)
      }
    }

    // Log if parent had candidates but no groups scored high enough
    if (!matchedForThisParent && groups.length > 0) {
      console.log('[Matching] ⚠️  NO MATCH - Parent had candidates but all groups scored below threshold:', {
        merchant: parent.merchant,
        amount: parent.amount,
        date: parent.date,
        candidatesChecked: candidates.length,
        groupsChecked: groups.length,
      })
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.totalScore - a.totalScore)

  console.log('[Matching] Total matches found:', matches.length)
  if (matches.length > 0) {
    console.log('[Matching] Top 3 matches by confidence:', matches.slice(0, 3).map(m => ({
      parent: m.parentTransaction.merchant,
      childCount: m.childTransactions.length,
      totalScore: m.totalScore,
    })))
  }

  return matches
}
