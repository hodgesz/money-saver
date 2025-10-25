# Transaction Matching Algorithm Design

**Version:** 1.0
**Author:** Analyst Agent (Hive Mind Collective)
**Date:** 2025-01-25
**Status:** Design Phase

## Executive Summary

This document specifies the algorithm for matching credit card charges (Chase CSV) to Amazon order line items (Amazon CSV) to provide unified transaction tracking. The algorithm handles date proximity, amount reconciliation, and complex edge cases including split shipments, returns, and tax/shipping allocation.

---

## 1. Problem Statement

### Current State
- Chase credit card CSV provides charges with:
  - Transaction date (when charge posted)
  - Total amount (single charge)
  - Merchant name (e.g., "AMAZON.COM" or "AMZN Mktp US")
  - Description
  - Category

- Amazon CSV provides order line items with:
  - Order date
  - Individual item prices (excluding tax/shipping)
  - Product descriptions
  - ASIN, Order ID, quantity
  - Category hierarchy

### Challenge
A single Chase credit card charge may represent:
- Multiple Amazon items from one order
- Items from multiple orders placed on the same day
- Items plus tax and shipping fees (not in Amazon CSV line items)
- Partial refunds or returns

**Goal:** Link Chase charges to Amazon line items with high confidence to enable:
- Accurate categorization of credit card charges
- Detailed expense tracking by product category
- Reconciliation and validation of charges

---

## 2. Data Model

### Chase Transaction (Source)
```typescript
interface ChaseTransaction {
  date: string              // Transaction date (MM/DD/YYYY)
  amount: number            // Absolute amount
  originalAmount: number    // Signed (negative = expense)
  merchant: string          // e.g., "AMAZON.COM"
  description: string       // Full description
  chaseCategory: string     // Chase's category
  type: string             // Transaction type
}
```

### Amazon Transaction (Target)
```typescript
interface AmazonTransaction {
  date: string              // Order date (YYYY-MM-DD)
  amount: number            // Item price
  merchant: string          // Always "Amazon"
  description: string       // Product description
  category?: string         // Amazon category
  subcategory?: string      // Amazon subcategory
  metadata?: {
    orderId?: string        // Amazon order ID
    asin?: string          // Product identifier
    quantity?: number      // Quantity ordered
    subscribeAndSave?: boolean
  }
}
```

### Match Result
```typescript
interface TransactionMatch {
  chaseTransaction: ChaseTransaction
  amazonTransactions: AmazonTransaction[]
  confidence: number        // 0-100 match confidence
  matchType: MatchType      // EXACT | PARTIAL | FUZZY | UNMATCHED
  metadata: {
    dateOffsetDays: number  // Days between order and charge
    amountDifference: number // Chase - sum(Amazon)
    estimatedTax?: number   // Calculated tax
    estimatedShipping?: number // Calculated shipping
    ambiguityScore: number  // 0-1 (0 = clear match, 1 = highly ambiguous)
  }
}

enum MatchType {
  EXACT = 'EXACT',           // Perfect date and amount match
  PARTIAL = 'PARTIAL',       // Good match with minor discrepancies
  FUZZY = 'FUZZY',          // Weak match, manual review suggested
  UNMATCHED = 'UNMATCHED'   // No viable match found
}
```

---

## 3. Matching Algorithm

### 3.1 High-Level Workflow

```
┌─────────────────────────────────────────────────────┐
│  PHASE 1: PRE-PROCESSING                            │
│  - Normalize dates (convert to ISO format)          │
│  - Filter Amazon merchants from Chase transactions   │
│  - Group Amazon items by order ID                    │
│  - Sort both datasets by date                        │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 2: CANDIDATE GENERATION                       │
│  - For each Chase transaction:                       │
│    - Find Amazon orders within date window           │
│    - Calculate amount similarity                     │
│    - Generate candidate matches                      │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 3: MATCH SCORING                             │
│  - Score each candidate (0-100)                      │
│  - Apply date proximity scoring                      │
│  - Apply amount matching scoring                     │
│  - Apply order grouping bonus                        │
│  - Calculate ambiguity penalty                       │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 4: MATCH SELECTION                           │
│  - Select best match above threshold                 │
│  - Handle 1:1, 1:N, and N:N mappings                │
│  - Flag ambiguous matches for review                 │
│  - Mark unmatched transactions                       │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  PHASE 5: POST-PROCESSING                           │
│  - Calculate tax/shipping allocation                 │
│  - Validate match consistency                        │
│  - Generate match report                             │
│  - Store match metadata                              │
└─────────────────────────────────────────────────────┘
```

---

## 4. Detailed Algorithm Pseudocode

### Phase 1: Pre-Processing

```typescript
function preprocessTransactions(
  chaseTransactions: ChaseTransaction[],
  amazonTransactions: AmazonTransaction[]
): PreprocessedData {
  // 1. Filter Chase transactions to only Amazon merchants
  const amazonChaseTransactions = chaseTransactions.filter(tx =>
    isAmazonMerchant(tx.merchant)
  )

  // 2. Normalize dates to ISO format
  amazonChaseTransactions.forEach(tx => {
    tx.date = normalizeToISO(tx.date) // Convert MM/DD/YYYY to YYYY-MM-DD
  })

  // 3. Group Amazon items by order ID
  const amazonOrderGroups = groupBy(amazonTransactions, 'metadata.orderId')

  // 4. Calculate order totals (items only, no tax/shipping)
  const orderTotals = new Map<string, number>()
  for (const [orderId, items] of amazonOrderGroups.entries()) {
    orderTotals.set(orderId, sumAmounts(items))
  }

  // 5. Sort both by date
  amazonChaseTransactions.sort((a, b) => compareDate(a.date, b.date))
  amazonTransactions.sort((a, b) => compareDate(a.date, b.date))

  return {
    chaseTransactions: amazonChaseTransactions,
    amazonTransactions,
    amazonOrderGroups,
    orderTotals
  }
}

function isAmazonMerchant(merchant: string): boolean {
  const amazonPatterns = [
    /amazon\.com/i,
    /amzn\s+mktp/i,
    /amzn\s+market/i,
    /amazon\s+prime/i,
    /kindle/i,
    /audible/i,
    /whole\s+foods/i  // Amazon-owned
  ]

  return amazonPatterns.some(pattern => pattern.test(merchant))
}
```

### Phase 2: Candidate Generation

```typescript
function generateCandidates(
  chaseTransaction: ChaseTransaction,
  preprocessedData: PreprocessedData,
  config: MatchConfig
): MatchCandidate[] {
  const candidates: MatchCandidate[] = []
  const chaseDate = parseDate(chaseTransaction.date)

  // Define search window (typically +/- 5 days)
  const windowStart = addDays(chaseDate, -config.dateWindowBefore)
  const windowEnd = addDays(chaseDate, config.dateWindowAfter)

  // Find all Amazon orders within date window
  const candidateOrders = preprocessedData.amazonOrderGroups.filter(
    ([orderId, items]) => {
      const orderDate = parseDate(items[0].date)
      return orderDate >= windowStart && orderDate <= windowEnd
    }
  )

  // Generate candidates for each order
  for (const [orderId, items] of candidateOrders) {
    const orderTotal = preprocessedData.orderTotals.get(orderId) || 0
    const orderDate = parseDate(items[0].date)

    // Calculate date offset
    const dateOffsetDays = differenceInDays(chaseDate, orderDate)

    // Calculate amount difference (Chase should be >= Amazon items)
    const amountDiff = chaseTransaction.amount - orderTotal

    // Only consider if Chase amount >= Amazon total (accounts for tax/shipping)
    if (amountDiff >= 0) {
      candidates.push({
        orderId,
        items,
        dateOffsetDays,
        amountDifference: amountDiff,
        orderTotal
      })
    }
  }

  // Also check for multi-order matches (same-day orders)
  if (candidates.length > 1) {
    const sameDayOrders = candidates.filter(c => c.dateOffsetDays === 0)
    if (sameDayOrders.length > 1) {
      candidates.push(generateMultiOrderCandidate(sameDayOrders, chaseTransaction))
    }
  }

  return candidates
}
```

### Phase 3: Match Scoring

```typescript
function scoreMatch(
  candidate: MatchCandidate,
  chaseTransaction: ChaseTransaction,
  config: MatchConfig
): MatchScore {
  let score = 0
  const weights = config.scoringWeights

  // ===== DATE PROXIMITY SCORING (40 points max) =====
  const dateScore = calculateDateScore(
    candidate.dateOffsetDays,
    weights.dateProximity
  )
  score += dateScore

  // ===== AMOUNT MATCHING SCORING (50 points max) =====
  const amountScore = calculateAmountScore(
    candidate.amountDifference,
    candidate.orderTotal,
    chaseTransaction.amount,
    weights.amountMatch
  )
  score += amountScore

  // ===== ORDER GROUPING BONUS (10 points max) =====
  // Bonus if all items share same order ID (clean match)
  if (candidate.orderId && !candidate.isMultiOrder) {
    score += weights.orderGroupingBonus
  }

  // ===== AMBIGUITY PENALTY =====
  const ambiguityScore = calculateAmbiguity(candidate, chaseTransaction)
  const penalty = ambiguityScore * weights.ambiguityPenalty
  score -= penalty

  return {
    totalScore: Math.max(0, Math.min(100, score)),
    dateScore,
    amountScore,
    ambiguityScore,
    confidence: scoreToConfidence(score)
  }
}

function calculateDateScore(
  dateOffsetDays: number,
  maxScore: number
): number {
  // Perfect score for 0-1 day offset
  if (dateOffsetDays <= 1) return maxScore

  // Linear decay: -4 points per day
  // Day 0-1: 40 points
  // Day 2: 36 points
  // Day 3: 32 points
  // Day 4: 28 points
  // Day 5: 24 points
  const decayRate = 4
  const score = maxScore - (Math.abs(dateOffsetDays) - 1) * decayRate

  return Math.max(0, score)
}

function calculateAmountScore(
  amountDiff: number,
  orderTotal: number,
  chaseAmount: number,
  maxScore: number
): number {
  // Calculate expected tax/shipping range
  // Typical: 5-15% tax + $0-$10 shipping
  const expectedTax = orderTotal * 0.10  // 10% avg
  const expectedShipping = 5.00          // $5 avg
  const expectedTotal = orderTotal + expectedTax + expectedShipping
  const tolerance = orderTotal * 0.03    // 3% tolerance

  // Perfect match: amountDiff within expected range ± tolerance
  const lowerBound = expectedTax - tolerance
  const upperBound = expectedTax + expectedShipping + tolerance

  if (amountDiff >= lowerBound && amountDiff <= upperBound) {
    return maxScore // 50 points
  }

  // Good match: amountDiff within reasonable range
  if (amountDiff < lowerBound) {
    // Chase amount too close to order total (missing tax/shipping?)
    const ratio = amountDiff / expectedTax
    return maxScore * ratio // Proportional score
  }

  if (amountDiff > upperBound) {
    // Chase amount significantly higher (wrong match or multi-order)
    const excess = amountDiff - upperBound
    const excessRatio = excess / orderTotal

    if (excessRatio < 0.10) {
      return maxScore * 0.8 // 40 points (minor excess)
    } else if (excessRatio < 0.25) {
      return maxScore * 0.5 // 25 points (significant excess)
    } else {
      return 0 // Likely wrong match
    }
  }

  return 0
}

function calculateAmbiguity(
  candidate: MatchCandidate,
  chaseTransaction: ChaseTransaction
): number {
  let ambiguity = 0

  // High ambiguity if multiple candidates with similar scores exist
  // (This check happens during match selection, not scoring)

  // Ambiguity from multi-order matching
  if (candidate.isMultiOrder) {
    ambiguity += 0.3 // Multi-order adds 30% ambiguity
  }

  // Ambiguity from large date offset
  if (Math.abs(candidate.dateOffsetDays) > 3) {
    ambiguity += 0.2 // Large offset adds 20% ambiguity
  }

  // Ambiguity from unusual amount difference
  const expectedDiff = candidate.orderTotal * 0.12 // 12% for tax+shipping
  const actualDiffRatio = candidate.amountDifference / expectedDiff

  if (actualDiffRatio < 0.5 || actualDiffRatio > 2.0) {
    ambiguity += 0.3 // Unusual amount adds 30% ambiguity
  }

  return Math.min(1.0, ambiguity)
}
```

### Phase 4: Match Selection

```typescript
function selectBestMatch(
  chaseTransaction: ChaseTransaction,
  candidates: MatchCandidate[],
  config: MatchConfig
): TransactionMatch {
  // Score all candidates
  const scoredCandidates = candidates.map(candidate => ({
    candidate,
    score: scoreMatch(candidate, chaseTransaction, config)
  })).sort((a, b) => b.score.totalScore - a.score.totalScore)

  // No candidates found
  if (scoredCandidates.length === 0) {
    return {
      chaseTransaction,
      amazonTransactions: [],
      confidence: 0,
      matchType: MatchType.UNMATCHED,
      metadata: {
        dateOffsetDays: 0,
        amountDifference: chaseTransaction.amount,
        ambiguityScore: 0
      }
    }
  }

  const bestMatch = scoredCandidates[0]
  const confidence = bestMatch.score.totalScore

  // Check for ambiguity: multiple candidates with similar scores
  let ambiguityScore = bestMatch.score.ambiguityScore
  if (scoredCandidates.length > 1) {
    const secondBest = scoredCandidates[1]
    const scoreDiff = confidence - secondBest.score.totalScore

    // If top 2 candidates within 10 points, increase ambiguity
    if (scoreDiff < 10) {
      ambiguityScore = Math.max(ambiguityScore, 0.7)
    }
  }

  // Determine match type based on confidence
  let matchType: MatchType
  if (confidence >= config.thresholds.exact) {
    matchType = MatchType.EXACT      // >= 90 confidence
  } else if (confidence >= config.thresholds.partial) {
    matchType = MatchType.PARTIAL    // >= 70 confidence
  } else if (confidence >= config.thresholds.fuzzy) {
    matchType = MatchType.FUZZY      // >= 50 confidence
  } else {
    matchType = MatchType.UNMATCHED  // < 50 confidence
  }

  // Calculate tax and shipping estimates
  const amountDiff = bestMatch.candidate.amountDifference
  const orderTotal = bestMatch.candidate.orderTotal
  const estimatedTax = calculateEstimatedTax(orderTotal, amountDiff)
  const estimatedShipping = amountDiff - estimatedTax

  return {
    chaseTransaction,
    amazonTransactions: bestMatch.candidate.items,
    confidence,
    matchType,
    metadata: {
      dateOffsetDays: bestMatch.candidate.dateOffsetDays,
      amountDifference: amountDiff,
      estimatedTax,
      estimatedShipping,
      ambiguityScore
    }
  }
}

function calculateEstimatedTax(
  orderTotal: number,
  amountDiff: number
): number {
  // Assume typical tax rate of 8-10%
  const estimatedTaxRate = 0.09 // 9%
  const estimatedTax = orderTotal * estimatedTaxRate

  // If amountDiff is less than estimated tax, use amountDiff
  // (no shipping, or low tax rate)
  if (amountDiff < estimatedTax) {
    return amountDiff
  }

  // If amountDiff is much larger, assume $5-10 shipping + tax
  return estimatedTax
}
```

---

## 5. Edge Case Handling

### 5.1 Multiple Orders Same Day

**Scenario:** User places 3 Amazon orders on Dec 1st. Chase shows single charge on Dec 3rd.

**Strategy:**
1. Generate multi-order candidate by combining orders with same date
2. Calculate combined total + estimated tax/shipping
3. If combined total matches Chase amount better than individual orders, prefer multi-order match
4. Increase ambiguity score by 0.3 due to complexity

**Example:**
```
Chase: Dec 3, $127.42
Amazon Orders:
  - Order A (Dec 1): $45.99
  - Order B (Dec 1): $32.50
  - Order C (Dec 1): $38.75

Combined: $117.24 + ~$10 tax/shipping = $127.24 ✓ Match!
```

### 5.2 Split Shipments

**Scenario:** Single Amazon order ships in 2 parts, charged separately on different dates.

**Strategy:**
1. Detect split orders by matching order ID with different dates
2. For each Chase transaction, check if it matches a subset of order items
3. Track partially matched orders to avoid double-matching
4. Flag split shipments in metadata for user awareness

**Example:**
```
Amazon Order #123-456 (Dec 1):
  - Item A: $45.99 (ships Dec 2)
  - Item B: $32.50 (ships Dec 5)

Chase:
  - Dec 3: $49.23 → Matches Item A + tax/ship
  - Dec 6: $34.87 → Matches Item B + tax/ship
```

### 5.3 Returns and Refunds

**Scenario:** User returns item, receives partial refund.

**Strategy:**
1. Detect returns by identifying positive `originalAmount` in Chase (credits)
2. Match refunds to previous purchases by:
   - Date proximity (return within 30 days of purchase)
   - Amount similarity (partial or full refund)
3. Link refund to original matched transaction
4. Update net amount after refund

**Example:**
```
Chase:
  - Dec 3: -$127.42 (purchase)
  - Dec 10: +$45.99 (refund)

Amazon Order (Dec 1): $117.24
  - Item A: $45.99 (returned)
  - Item B: $32.50
  - Item C: $38.75

Match: Link refund to Item A, net charge = $81.43
```

### 5.4 Pending vs Posted Dates

**Scenario:** Amazon CSV may have "pending" dates for recent orders.

**Strategy:**
1. Amazon parser interpolates pending dates (already implemented)
2. When matching, give pending dates lower confidence (reduce date score by 20%)
3. Flag matches with pending dates for review after order posts

### 5.5 Tax-Exempt or Prime Shipping

**Scenario:** User has Amazon Prime (free shipping) or tax-exempt status.

**Strategy:**
1. Detect Prime membership by checking for `$0.00` shipping in multiple orders
2. Adjust amount scoring to expect lower difference (tax-only or no tax)
3. Use tighter tolerance bands:
   - Prime + tax-exempt: amountDiff should be ~$0
   - Prime + tax: amountDiff = orderTotal × tax rate
   - No Prime: amountDiff = orderTotal × tax rate + shipping

---

## 6. Configuration & Thresholds

### Default Match Configuration

```typescript
interface MatchConfig {
  // Date window for candidate generation
  dateWindowBefore: number  // Days before Chase date (default: 5)
  dateWindowAfter: number   // Days after Chase date (default: 3)

  // Scoring weights
  scoringWeights: {
    dateProximity: number       // Max 40 points
    amountMatch: number         // Max 50 points
    orderGroupingBonus: number  // Max 10 points
    ambiguityPenalty: number    // Max -20 points
  }

  // Confidence thresholds
  thresholds: {
    exact: number    // >= 90: High confidence, auto-match
    partial: number  // >= 70: Good confidence, minor review
    fuzzy: number    // >= 50: Low confidence, manual review
    // < 50: No match, leave unmatched
  }

  // Tax/shipping estimation
  defaultTaxRate: number      // 0.09 (9%)
  expectedShippingMin: number // $0
  expectedShippingMax: number // $10
  amountTolerance: number     // 3% of order total
}

const DEFAULT_CONFIG: MatchConfig = {
  dateWindowBefore: 5,
  dateWindowAfter: 3,
  scoringWeights: {
    dateProximity: 40,
    amountMatch: 50,
    orderGroupingBonus: 10,
    ambiguityPenalty: 20
  },
  thresholds: {
    exact: 90,
    partial: 70,
    fuzzy: 50
  },
  defaultTaxRate: 0.09,
  expectedShippingMin: 0,
  expectedShippingMax: 10,
  amountTolerance: 0.03
}
```

---

## 7. Performance Considerations

### 7.1 Time Complexity

**Naive Approach:** O(C × A) where C = Chase transactions, A = Amazon transactions
- For 100 Chase × 1000 Amazon = 100,000 comparisons

**Optimized Approach:** O(C × log(A) + C × W) where W = avg candidates per window
- Pre-sort transactions by date: O(C log C + A log A)
- Binary search for date window: O(log A) per Chase transaction
- Candidate scoring: O(W) where W << A (typically 5-20 candidates)
- **Total:** O(C × W) ≈ O(C) for reasonable W

**Expected Performance:**
- 100 Chase transactions × 20 candidates avg = 2,000 scoring operations
- Should complete in <100ms on modern hardware

### 7.2 Space Complexity

- O(A) for pre-processed Amazon order groups
- O(C) for match results
- **Total:** O(C + A) linear space

### 7.3 Optimization Strategies

1. **Date Indexing:** Use binary search on sorted dates to find window bounds
2. **Order ID Grouping:** Pre-group Amazon items by order ID to reduce per-item checks
3. **Early Termination:** Skip candidates with impossible amount differences
4. **Caching:** Cache scored candidates for multi-pass matching (e.g., returns)
5. **Batch Processing:** Process transactions in date-sorted batches to improve cache locality

---

## 8. Implementation Phases

### Phase 1: Core Matching (MVP)
- [ ] Implement preprocessing pipeline
- [ ] Implement candidate generation
- [ ] Implement basic scoring (date + amount)
- [ ] Implement match selection
- [ ] Unit tests for each phase

### Phase 2: Edge Cases
- [ ] Multi-order matching
- [ ] Split shipment detection
- [ ] Returns and refunds linking
- [ ] Ambiguity detection

### Phase 3: Optimization
- [ ] Date indexing and binary search
- [ ] Performance profiling and benchmarking
- [ ] Batch processing optimization

### Phase 4: User Interface
- [ ] Display matched transactions
- [ ] Ambiguity review workflow
- [ ] Manual match correction
- [ ] Match confidence visualization

---

## 9. Testing Strategy

### Unit Tests
- `preprocessTransactions()` - date normalization, grouping
- `generateCandidates()` - window filtering, amount checks
- `scoreMatch()` - scoring logic for each component
- `selectBestMatch()` - confidence thresholds, ambiguity

### Integration Tests
- End-to-end matching with sample datasets
- Edge case scenarios (multi-order, refunds, splits)
- Performance benchmarks (100, 1000, 10000 transactions)

### Test Data Sets
1. **Perfect Matches:** 1:1 Chase to Amazon order
2. **Multi-Order:** Multiple orders same day
3. **Split Shipment:** Single order, multiple charges
4. **Returns:** Purchase + refund pairs
5. **Ambiguous:** Similar amounts, close dates
6. **No Match:** Non-Amazon Chase charges mixed in

---

## 10. Match Report Format

```typescript
interface MatchingReport {
  summary: {
    totalChaseTransactions: number
    totalAmazonTransactions: number
    matched: number
    unmatched: number
    exactMatches: number
    partialMatches: number
    fuzzyMatches: number
    ambiguousMatches: number
  }
  matches: TransactionMatch[]
  unmatchedChase: ChaseTransaction[]
  unmatchedAmazon: AmazonTransaction[]
  warnings: string[]
}
```

---

## 11. Future Enhancements

1. **Machine Learning:** Train model on historical matches to improve scoring
2. **Multi-Merchant:** Extend algorithm to support other merchants (Walmart, Target)
3. **Subscription Detection:** Identify recurring Amazon subscriptions
4. **Fraud Detection:** Flag suspicious mismatches or duplicate charges
5. **User Feedback Loop:** Allow users to correct matches and retrain algorithm

---

## 12. References

### Related Code Files
- `/lib/utils/parsers/chaseParser.ts` - Chase CSV parser
- `/lib/utils/parsers/amazonParser.ts` - Amazon CSV parser
- `/lib/services/duplicateDetection.ts` - Duplicate detection logic (date/amount/merchant matching)

### Related PRs
- PR #26: Payment filtering and merchant categorization for Chase imports
- PR #20: Duplicate detection feature
- PR #21: Date format fix for duplicate detection

---

## Appendix A: Scoring Examples

### Example 1: Perfect Match
```
Chase: Dec 3, $54.23
Amazon Order #123 (Dec 1): $49.99
  - Item: Widget X

Date Offset: 2 days → 36 points (40 - 4×1)
Amount Diff: $4.24 → 50 points (within expected tax range)
Order Grouping: +10 points (single order)
Ambiguity: -0 points

Total Score: 96/100 → EXACT MATCH
```

### Example 2: Multi-Order Match
```
Chase: Dec 5, $127.42
Amazon Orders (Dec 3):
  - Order A: $45.99
  - Order B: $32.50
  - Order C: $38.75
Total: $117.24

Date Offset: 2 days → 36 points
Amount Diff: $10.18 → 48 points (within expected range)
Order Grouping: +0 points (multi-order, no bonus)
Ambiguity: -6 points (multi-order penalty: 0.3 × 20)

Total Score: 78/100 → PARTIAL MATCH (manual review suggested)
```

### Example 3: Fuzzy Match
```
Chase: Dec 8, $89.99
Amazon Order #456 (Dec 2): $82.50

Date Offset: 6 days → 20 points (40 - 4×5)
Amount Diff: $7.49 → 35 points (slightly low for tax+shipping)
Order Grouping: +10 points
Ambiguity: -4 points (large date offset: 0.2 × 20)

Total Score: 61/100 → FUZZY MATCH (requires review)
```

---

**End of Document**
