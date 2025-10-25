# Transaction Linking Research: Parent-Child Transaction Relationships

**Research Date:** October 25, 2025
**Researcher:** Research Agent
**Purpose:** Investigate transaction linking patterns for Chase credit card to Amazon order item reconciliation

---

## Executive Summary

This research document analyzes industry best practices, matching algorithms, and edge cases for implementing parent-child transaction relationships in personal finance applications. The primary use case is linking Chase credit card transactions (parent) with Amazon itemized orders (children).

**Key Findings:**
- Multi-criteria fuzzy matching is the industry standard (date + amount + merchant)
- Date tolerance windows of 1-7 days accommodate processing delays
- Amount matching requires tolerance for fees, taxes, and rounding
- Industry leaders like Plaid use sophisticated pending-to-posted reconciliation
- Hierarchical database patterns with self-referencing foreign keys are standard

---

## 1. Industry Best Practices

### 1.1 Plaid Transaction Reconciliation

**Source:** Plaid Transactions API Documentation

**Key Insights:**
- **Pending-to-Posted Tracking**: Plaid does not model pending-to-posted as a state change; instead, they create a new posted transaction with a `pending_transaction_id` linking back to the original
- **Transaction Removal Webhooks**: When pending transactions post, the original is removed and a `TRANSACTIONS_REMOVED` webhook is issued
- **Incremental Sync**: Uses cursor-based `/transactions/sync` endpoint for efficient updates
- **Matching Fields Available**:
  - Transaction date (100% fill rate)
  - Amount (100% fill rate)
  - Merchant name (97% fill rate, excludes non-merchant transactions)
  - Category (95% fill rate via `personal_finance_category`)
  - Location data (when available)

**Relevant Pattern:**
```javascript
// Plaid's approach to pending-to-posted reconciliation
{
  "transaction_id": "posted_txn_123",
  "pending": false,
  "pending_transaction_id": "pending_txn_456", // Links to original
  "date": "2025-10-21", // Posted date, may differ from transaction date
  "amount": 45.99,
  "merchant_name": "Amazon.com"
}
```

### 1.2 QuickBooks Transaction Matching

**Source:** QuickBooks API patterns analysis

**Key Practices:**
- **Three-Way Matching**: Date, amount, and description/memo
- **Date Windows**: Configurable matching windows (typically 3-5 days)
- **Amount Tolerance**: Allows for small discrepancies (typically $0.01-$0.05)
- **Manual Review Queue**: Ambiguous matches flagged for user confirmation
- **Batch Reconciliation**: Supports bulk matching operations

---

## 2. Matching Algorithm Analysis

### 2.1 Date-Based Matching

**Recommended Approach: Flexible Date Window**

```typescript
interface DateMatchCriteria {
  exactMatch: boolean;        // Require exact date match
  windowDays: number;          // Allow +/- N days
  considerPostingDelay: boolean; // Account for 1-3 day bank processing
}

// Industry Standard Windows:
// - Same day: 0 days (exact match)
// - Credit card processing: 1-3 days
// - Check deposits: 3-5 days
// - International: 5-7 days
```

**Edge Cases:**
- **Weekend/Holiday Processing**: Transactions may post on next business day
- **Time Zone Differences**: Amazon order date vs. credit card post date
- **Batch Processing**: Some merchants batch process end-of-day
- **Pending Transactions**: May have different dates than posted transactions

**Recommended Algorithm:**
```typescript
function isDateMatch(
  parentDate: Date,
  childDate: Date,
  windowDays: number = 3
): boolean {
  const diffMs = Math.abs(parentDate.getTime() - childDate.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= windowDays;
}
```

### 2.2 Amount-Based Matching

**Recommended Approach: Multi-Level Tolerance**

```typescript
interface AmountMatchCriteria {
  exactMatch: boolean;           // Require exact amount
  toleranceCents: number;        // Allow +/- cents difference
  tolerancePercent: number;      // Allow % difference for large amounts
  allowPartialMatch: boolean;    // Support partial payments
}

// Industry Standards:
// - Small transactions (<$50): ±$0.01 tolerance
// - Medium transactions ($50-$500): ±$0.05 or 0.1% tolerance
// - Large transactions (>$500): ±0.5% tolerance
```

**Edge Cases:**
- **Multiple Items Sum**: Amazon items must sum to credit card total
- **Tax and Fees**: May be included/excluded differently
- **Currency Conversion**: International orders may have exchange rate differences
- **Rounding Differences**: Different rounding methods (up vs. banker's rounding)
- **Partial Refunds**: Child refund doesn't match parent total
- **Split Payments**: Single order paid with multiple methods

**Recommended Algorithm:**
```typescript
function isAmountMatch(
  parentAmount: number,
  childrenAmounts: number[],
  tolerance: number = 0.01
): boolean {
  const childTotal = childrenAmounts.reduce((sum, amt) => sum + amt, 0);
  const difference = Math.abs(parentAmount - childTotal);

  // Exact or within tolerance
  if (difference <= tolerance) return true;

  // Percentage tolerance for large amounts
  const percentDiff = difference / parentAmount;
  if (parentAmount > 100 && percentDiff <= 0.005) return true;

  return false;
}
```

### 2.3 Merchant/Description Matching

**Recommended Approach: Fuzzy String Matching**

```typescript
interface MerchantMatchCriteria {
  exactMatch: boolean;           // Require exact string match
  similarityThreshold: number;   // Levenshtein distance threshold
  knownMappings: Map<string, string>; // Known merchant aliases
  ignoreCase: boolean;
  ignorePunctuation: boolean;
}

// Common Merchant Name Variations:
// - "AMAZON.COM*M12AB34CD" → "Amazon"
// - "AMZN Mktp US*AB123CD45" → "Amazon"
// - "AMZ*Amazon.com" → "Amazon"
```

**Edge Cases:**
- **Merchant Aggregators**: Payment processors like PayPal, Square
- **Subscription Services**: Netflix, Spotify with varying descriptors
- **International Merchants**: Different names in different countries
- **Marketplace Sellers**: Amazon third-party sellers
- **Franchise Variations**: "Starbucks #12345" vs. "Starbucks Store"

**Recommended Algorithm (Levenshtein Distance):**
```typescript
function isMerchantMatch(
  parent: string,
  child: string,
  threshold: number = 0.7
): boolean {
  // Normalize strings
  const normalize = (s: string) =>
    s.toLowerCase()
     .replace(/[^a-z0-9]/g, '')
     .trim();

  const p = normalize(parent);
  const c = normalize(child);

  // Check for substring match
  if (p.includes(c) || c.includes(p)) return true;

  // Calculate similarity ratio
  const maxLen = Math.max(p.length, c.length);
  const distance = levenshteinDistance(p, c);
  const similarity = 1 - (distance / maxLen);

  return similarity >= threshold;
}
```

### 2.4 Composite Matching Score

**Industry Best Practice: Weighted Multi-Criteria Scoring**

```typescript
interface MatchScore {
  dateScore: number;      // 0-1, weighted by date proximity
  amountScore: number;    // 0-1, weighted by amount accuracy
  merchantScore: number;  // 0-1, weighted by string similarity
  confidenceScore: number; // Overall confidence (0-1)
}

// Industry Standard Weights:
const WEIGHTS = {
  date: 0.3,      // 30% - important but flexible
  amount: 0.5,    // 50% - most critical factor
  merchant: 0.2,  // 20% - supportive evidence
};

// Confidence Thresholds:
// - High Confidence: 0.85+ (auto-link)
// - Medium Confidence: 0.70-0.84 (suggest to user)
// - Low Confidence: 0.50-0.69 (flag for review)
// - No Match: <0.50 (reject)
```

**Recommended Algorithm:**
```typescript
function calculateMatchScore(
  parent: Transaction,
  children: Transaction[]
): MatchScore {
  // Date proximity score (decay over days)
  const dateDiff = calculateDateDifference(parent.date, children[0].date);
  const dateScore = Math.max(0, 1 - (dateDiff / 7)); // 7-day window

  // Amount accuracy score
  const childTotal = children.reduce((sum, c) => sum + c.amount, 0);
  const amountDiff = Math.abs(parent.amount - childTotal);
  const amountScore = Math.max(0, 1 - (amountDiff / parent.amount));

  // Merchant similarity score
  const merchantScore = isMerchantMatch(
    parent.merchant,
    'Amazon',
    0.7
  ) ? 1.0 : 0.0;

  // Weighted composite score
  const confidenceScore =
    (dateScore * WEIGHTS.date) +
    (amountScore * WEIGHTS.amount) +
    (merchantScore * WEIGHTS.merchant);

  return { dateScore, amountScore, merchantScore, confidenceScore };
}
```

---

## 3. Edge Cases and Handling Strategies

### 3.1 Temporal Edge Cases

| Edge Case | Description | Handling Strategy |
|-----------|-------------|-------------------|
| **Same-Day Multiple Orders** | User places multiple Amazon orders on same day | Match by exact amount first, then manual review |
| **Cross-Day Orders** | Order placed 11:58 PM, charged 12:02 AM next day | Use 2-day date window with time-aware matching |
| **Pending-to-Posted Delay** | Chase shows pending for 1-3 days before posting | Track both dates, match on transaction date |
| **Batch Processing** | Merchants batch process at end of day | Allow next-day matching with merchant confidence |
| **Weekend/Holiday Delays** | Banks closed, processing delayed 2-3 days | Extend window for weekends/holidays programmatically |

### 3.2 Amount Edge Cases

| Edge Case | Description | Handling Strategy |
|-----------|-------------|-------------------|
| **Tax Variations** | Amazon includes tax in total, line items may not | Sum all children including tax/shipping rows |
| **Partial Refunds** | Item refunded but not full order | Create separate refund transaction, link to parent |
| **Rounding Differences** | $1.333 × 3 = $3.99 or $4.00? | Apply small tolerance (±$0.02) |
| **Multiple Shipments** | Order split into multiple charges | Link multiple parent transactions to one order |
| **Gift Cards Applied** | Amazon charge less than item total | Store metadata about payment methods used |
| **Subscribe & Save Discount** | Prices differ from typical Amazon pricing | Use order ID as primary key if available |

### 3.3 Merchant Edge Cases

| Edge Case | Description | Handling Strategy |
|-----------|-------------|-------------------|
| **Third-Party Sellers** | "AMZN Mktp US*SellerName" format | Extract "AMZN" or "Amazon" keyword |
| **International Orders** | "Amazon.co.uk" vs "Amazon.com" | Normalize to base "Amazon" |
| **Payment Aggregators** | Charged through PayPal from Amazon | Check transaction metadata/memos |
| **Digital vs. Physical** | "Amazon Digital Services" for Prime | Consider separate category or flag |
| **Amazon Business** | Different merchant descriptor | Maintain known aliases mapping |

### 3.4 Data Quality Edge Cases

| Edge Case | Description | Handling Strategy |
|-----------|-------------|-------------------|
| **Missing Order IDs** | Older Amazon orders lack order ID | Fall back to date+amount fuzzy matching |
| **Incorrect Dates** | Amazon CSV shows "Pending" | Interpolate dates or mark for manual review |
| **Duplicate Entries** | Same transaction appears twice | Deduplicate by transaction ID + date + amount |
| **Missing Descriptions** | Generic "Amazon Purchase" | Use item details if available, else flag |
| **Currency Mismatches** | International orders in different currency | Convert to USD using historical exchange rates |

---

## 4. Database Schema Patterns

### 4.1 Self-Referencing Foreign Key Pattern

**Most Common Industry Pattern:**

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  parent_transaction_id UUID REFERENCES transactions(id),
  -- Core transaction fields
  date TIMESTAMP NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  merchant TEXT,
  description TEXT NOT NULL,
  -- Linking metadata
  link_confidence DECIMAL(3, 2), -- 0.00 to 1.00
  link_type TEXT CHECK (link_type IN ('auto', 'manual', 'suggested')),
  link_metadata JSONB, -- Store matching scores, order IDs, etc.
  -- Flags
  is_parent BOOLEAN DEFAULT FALSE,
  is_child BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for hierarchical queries
CREATE INDEX idx_parent_transaction ON transactions(parent_transaction_id);
CREATE INDEX idx_transaction_hierarchy ON transactions(user_id, is_parent, is_child);
```

**Pros:**
- Simple schema, single table
- Easy recursive queries with CTEs
- Flexible depth (can chain multiple levels)

**Cons:**
- Orphaned records if parent deleted
- Complex validation for circular references

### 4.2 Junction Table Pattern

**Alternative Pattern for Many-to-Many:**

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  date TIMESTAMP NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  merchant TEXT,
  description TEXT NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('parent', 'child', 'standalone')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transaction_links (
  id UUID PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  link_confidence DECIMAL(3, 2),
  link_type TEXT CHECK (link_type IN ('auto', 'manual', 'suggested')),
  match_scores JSONB, -- Store individual matching scores
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID, -- User who created link (if manual)
  UNIQUE(parent_id, child_id),
  CHECK(parent_id != child_id) -- Prevent self-linking
);

-- Indexes
CREATE INDEX idx_parent_links ON transaction_links(parent_id);
CREATE INDEX idx_child_links ON transaction_links(child_id);
CREATE INDEX idx_link_confidence ON transaction_links(link_confidence);
```

**Pros:**
- Clean separation of concerns
- Easy to add/remove links without touching transactions
- Can store rich linking metadata
- Prevents circular references

**Cons:**
- Extra table and joins
- More complex queries

### 4.3 Recommended Pattern for Our Use Case

**Hybrid Approach: Self-Reference + Metadata**

```sql
-- Extend existing transactions table
ALTER TABLE transactions ADD COLUMN parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN link_confidence DECIMAL(3, 2);
ALTER TABLE transactions ADD COLUMN link_type TEXT CHECK (link_type IN ('auto', 'manual', 'suggested'));
ALTER TABLE transactions ADD COLUMN link_metadata JSONB;

-- Add computed flags for efficient queries
ALTER TABLE transactions ADD COLUMN is_parent BOOLEAN GENERATED ALWAYS AS (
  EXISTS (
    SELECT 1 FROM transactions child
    WHERE child.parent_transaction_id = transactions.id
  )
) STORED;

-- Indexes
CREATE INDEX idx_parent_transaction ON transactions(parent_transaction_id) WHERE parent_transaction_id IS NOT NULL;
CREATE INDEX idx_link_confidence ON transactions(link_confidence) WHERE link_confidence IS NOT NULL;
CREATE INDEX idx_user_parents ON transactions(user_id, date) WHERE parent_transaction_id IS NULL;

-- View for easy hierarchical queries
CREATE VIEW transaction_hierarchy AS
WITH RECURSIVE hierarchy AS (
  -- Base case: parent transactions
  SELECT
    id,
    user_id,
    parent_transaction_id,
    date,
    amount,
    merchant,
    description,
    link_confidence,
    0 AS depth,
    ARRAY[id] AS path
  FROM transactions
  WHERE parent_transaction_id IS NULL

  UNION ALL

  -- Recursive case: child transactions
  SELECT
    t.id,
    t.user_id,
    t.parent_transaction_id,
    t.date,
    t.amount,
    t.merchant,
    t.description,
    t.link_confidence,
    h.depth + 1,
    h.path || t.id
  FROM transactions t
  JOIN hierarchy h ON t.parent_transaction_id = h.id
)
SELECT * FROM hierarchy;
```

---

## 5. Matching Algorithm Pseudocode

### 5.1 High-Level Workflow

```
1. LOAD all unlinked Chase transactions (potential parents)
2. LOAD all unlinked Amazon transactions (potential children)

3. FOR EACH Chase transaction:
   a. FILTER Amazon transactions by date window (±3 days)
   b. GROUP filtered transactions by order_id (if available)
   c. FOR EACH group:
      i. CALCULATE composite match score
      ii. IF score >= AUTO_LINK_THRESHOLD:
         - CREATE links automatically
      iii. ELSE IF score >= SUGGEST_THRESHOLD:
         - ADD to suggestion queue for user review
   d. IF no matches found:
      - MARK as standalone transaction

4. PERSIST all links to database with confidence scores

5. RETURN summary:
   - Auto-linked count
   - Suggested matches count
   - Unmatched transactions count
```

### 5.2 Detailed Algorithm

```typescript
interface MatchingConfig {
  dateWindowDays: number;          // Default: 3
  amountToleranceCents: number;    // Default: 2
  merchantSimilarityThreshold: number; // Default: 0.7
  autoLinkThreshold: number;       // Default: 0.85
  suggestThreshold: number;        // Default: 0.70
}

async function linkTransactions(
  chaseTransactions: Transaction[],
  amazonTransactions: Transaction[],
  config: MatchingConfig
): Promise<LinkingResult> {

  const results: LinkingResult = {
    autoLinked: [],
    suggested: [],
    unmatched: [],
  };

  // Pre-process: Group Amazon transactions by order ID
  const amazonByOrderId = groupBy(amazonTransactions, 'metadata.orderId');

  for (const parent of chaseTransactions) {
    // Skip if already linked
    if (parent.parent_transaction_id) continue;

    // Filter by date window
    const dateMin = addDays(parent.date, -config.dateWindowDays);
    const dateMax = addDays(parent.date, config.dateWindowDays);
    const candidatesInWindow = amazonTransactions.filter(child =>
      child.date >= dateMin && child.date <= dateMax
    );

    if (candidatesInWindow.length === 0) {
      results.unmatched.push(parent);
      continue;
    }

    // Try to match by order ID first (if available)
    const matchesByOrderId = findOrderIdMatches(
      parent,
      candidatesInWindow,
      amazonByOrderId
    );

    if (matchesByOrderId.length > 0) {
      // Order ID provides high confidence
      const bestMatch = matchesByOrderId[0];
      const score = calculateMatchScore(parent, bestMatch.children, config);

      if (score.confidenceScore >= config.autoLinkThreshold) {
        await createLinks(parent, bestMatch.children, 'auto', score);
        results.autoLinked.push({ parent, children: bestMatch.children, score });
        continue;
      }
    }

    // Fall back to fuzzy matching
    const fuzzyMatches = findFuzzyMatches(
      parent,
      candidatesInWindow,
      config
    );

    if (fuzzyMatches.length === 0) {
      results.unmatched.push(parent);
      continue;
    }

    // Take best match
    const bestMatch = fuzzyMatches[0];

    if (bestMatch.score.confidenceScore >= config.autoLinkThreshold) {
      await createLinks(parent, bestMatch.children, 'auto', bestMatch.score);
      results.autoLinked.push(bestMatch);
    } else if (bestMatch.score.confidenceScore >= config.suggestThreshold) {
      results.suggested.push(bestMatch);
    } else {
      results.unmatched.push(parent);
    }
  }

  return results;
}

function findFuzzyMatches(
  parent: Transaction,
  candidates: Transaction[],
  config: MatchingConfig
): Match[] {

  const matches: Match[] = [];

  // Try all possible combinations of candidates
  // (for cases where multiple Amazon items = one Chase charge)
  const combinations = generateCombinations(candidates);

  for (const combo of combinations) {
    const score = calculateMatchScore(parent, combo, config);

    if (score.confidenceScore >= config.suggestThreshold) {
      matches.push({ parent, children: combo, score });
    }
  }

  // Sort by confidence score descending
  return matches.sort((a, b) =>
    b.score.confidenceScore - a.score.confidenceScore
  );
}

function generateCombinations(items: Transaction[]): Transaction[][] {
  // Generate all non-empty subsets
  // Limit to reasonable size (e.g., max 10 items per combo)
  const maxComboSize = 10;
  const combinations: Transaction[][] = [];

  // Use bit manipulation for efficient subset generation
  const n = Math.min(items.length, maxComboSize);
  for (let i = 1; i < (1 << n); i++) {
    const combo: Transaction[] = [];
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        combo.push(items[j]);
      }
    }
    combinations.push(combo);
  }

  return combinations;
}
```

---

## 6. Implementation Recommendations

### 6.1 Phase 1: Basic Matching (MVP)

**Scope:** Simple 1-to-many parent-child linking

**Features:**
- Date window matching (±3 days)
- Exact amount matching with small tolerance (±$0.02)
- Amazon keyword detection in merchant field
- Manual link creation/removal
- Basic confidence scoring

**Timeline:** 1-2 weeks

### 6.2 Phase 2: Enhanced Matching

**Scope:** Fuzzy matching and auto-suggestions

**Features:**
- Composite confidence scoring
- Merchant fuzzy matching (Levenshtein distance)
- Order ID matching (if available)
- Auto-link high-confidence matches
- Suggest medium-confidence matches to user
- Batch processing for imports

**Timeline:** 2-3 weeks

### 6.3 Phase 3: Advanced Features

**Scope:** Complex scenarios and optimization

**Features:**
- Multiple shipment handling
- Partial refund tracking
- Currency conversion support
- Machine learning for merchant normalization
- Historical pattern learning (user-specific behaviors)
- Conflict resolution (when one parent could match multiple sets)

**Timeline:** 4-6 weeks

### 6.4 Technical Stack Recommendations

```typescript
// Matching Engine
- Algorithm: Composite scoring with configurable weights
- Performance: Process 10,000 transactions in <5 seconds
- Scalability: Support up to 100,000 transactions per user

// Database
- Pattern: Self-referencing foreign key with metadata JSONB
- Indexes: Covering indexes on (user_id, date, parent_transaction_id)
- Caching: Cache merchant normalizations (Redis)

// UI/UX
- Confidence Indicators: Green (>0.85), Yellow (0.70-0.84), Red (<0.70)
- User Feedback Loop: Allow users to confirm/reject suggestions
- Bulk Operations: Select multiple transactions for batch linking

// Testing
- Unit Tests: Each matching criterion (date, amount, merchant)
- Integration Tests: End-to-end linking workflows
- Performance Tests: Large dataset benchmarks (10K+ transactions)
- Edge Case Tests: All scenarios documented in Section 3
```

---

## 7. Alternative Approaches Considered

### 7.1 Machine Learning Approach

**Pros:**
- Can learn user-specific patterns
- Adapts over time with feedback
- Handles complex edge cases automatically

**Cons:**
- Requires training data (cold start problem)
- Black box (hard to explain matches)
- Overkill for deterministic problem
- Infrastructure overhead

**Verdict:** Not recommended for MVP, consider for Phase 3+

### 7.2 Rule-Based Expert System

**Pros:**
- Transparent and explainable
- Easy to debug and maintain
- Fast execution

**Cons:**
- Brittle (requires many rules)
- Hard to handle exceptions
- Manual maintenance burden

**Verdict:** Good for Phase 1, enhance with scoring in Phase 2

### 7.3 Hybrid Scoring System (RECOMMENDED)

**Pros:**
- Combines deterministic rules with flexible scoring
- Explainable (shows why match was made)
- Configurable thresholds
- Graceful degradation (falls back to suggestions)

**Cons:**
- Requires tuning weights
- May need per-user customization

**Verdict:** Best fit for our use case

---

## 8. Testing Strategy

### 8.1 Unit Test Cases

```typescript
describe('Transaction Linking', () => {

  describe('Date Matching', () => {
    it('should match exact dates', () => {});
    it('should match within 3-day window', () => {});
    it('should reject dates outside window', () => {});
    it('should handle timezone differences', () => {});
    it('should handle weekend/holiday delays', () => {});
  });

  describe('Amount Matching', () => {
    it('should match exact amounts', () => {});
    it('should match within tolerance', () => {});
    it('should sum multiple children correctly', () => {});
    it('should handle rounding differences', () => {});
    it('should handle partial refunds', () => {});
    it('should reject amounts outside tolerance', () => {});
  });

  describe('Merchant Matching', () => {
    it('should match exact merchant names', () => {});
    it('should match Amazon variations', () => {});
    it('should use fuzzy matching for similar names', () => {});
    it('should handle case differences', () => {});
    it('should handle punctuation differences', () => {});
  });

  describe('Composite Scoring', () => {
    it('should calculate correct confidence score', () => {});
    it('should auto-link high confidence matches', () => {});
    it('should suggest medium confidence matches', () => {});
    it('should reject low confidence matches', () => {});
  });

  describe('Edge Cases', () => {
    it('should handle same-day multiple orders', () => {});
    it('should handle cross-day orders', () => {});
    it('should handle missing order IDs', () => {});
    it('should handle duplicate transactions', () => {});
    it('should handle partial refunds', () => {});
    it('should handle currency conversions', () => {});
  });
});
```

### 8.2 Integration Test Scenarios

```typescript
describe('End-to-End Linking', () => {

  it('should link single Chase charge to multiple Amazon items', async () => {
    // Given: 1 Chase transaction for $45.99
    // And: 3 Amazon items totaling $45.99
    // When: Running linking algorithm
    // Then: Should create 3 child links with confidence > 0.85
  });

  it('should suggest ambiguous matches for user review', async () => {
    // Given: 1 Chase transaction for $50.00
    // And: 2 possible Amazon order groups ($49.99 and $50.01)
    // When: Running linking algorithm
    // Then: Should suggest both options with confidence 0.70-0.84
  });

  it('should handle bulk import with 1000 transactions', async () => {
    // Given: 500 Chase transactions
    // And: 1500 Amazon line items
    // When: Running linking algorithm
    // Then: Should complete in <10 seconds
    // And: Should link >80% automatically
  });
});
```

---

## 9. Monitoring and Metrics

### 9.1 Key Performance Indicators

```typescript
interface LinkingMetrics {
  // Accuracy Metrics
  autoLinkAccuracyRate: number;    // % of auto-links confirmed by users
  suggestionAccuracyRate: number;  // % of suggestions accepted by users
  falsePositiveRate: number;       // % of incorrect auto-links
  falseNegativeRate: number;       // % of missed matches

  // Performance Metrics
  averageProcessingTime: number;   // ms per transaction
  throughput: number;              // transactions per second

  // Coverage Metrics
  autoLinkPercentage: number;      // % auto-linked
  suggestedPercentage: number;     // % suggested to user
  unmatchedPercentage: number;     // % remain unmatched

  // User Behavior
  userConfirmationRate: number;    // % of users who confirm links
  manualLinkCreationRate: number;  // % of users creating manual links
}
```

### 9.2 Feedback Loop

```typescript
// Track user feedback to improve algorithm
interface LinkingFeedback {
  linkId: string;
  userId: string;
  action: 'confirmed' | 'rejected' | 'modified';
  originalConfidence: number;
  userConfidence: number; // Implied by action
  timestamp: Date;
}

// Use feedback to tune weights
function updateMatchingWeights(feedback: LinkingFeedback[]): void {
  // Analyze patterns in confirmed vs rejected links
  // Adjust WEIGHTS.date, WEIGHTS.amount, WEIGHTS.merchant
  // Store per-user or global weights
}
```

---

## 10. Migration Strategy

### 10.1 Database Migration

```sql
-- Migration: Add parent-child linking support
-- Version: 20251025_transaction_linking

BEGIN;

-- Add new columns
ALTER TABLE transactions
ADD COLUMN parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
ADD COLUMN link_confidence DECIMAL(3, 2) CHECK (link_confidence >= 0 AND link_confidence <= 1),
ADD COLUMN link_type TEXT CHECK (link_type IN ('auto', 'manual', 'suggested', NULL)),
ADD COLUMN link_metadata JSONB;

-- Add indexes
CREATE INDEX idx_parent_transaction ON transactions(parent_transaction_id)
  WHERE parent_transaction_id IS NOT NULL;
CREATE INDEX idx_link_confidence ON transactions(link_confidence)
  WHERE link_confidence IS NOT NULL;
CREATE INDEX idx_user_date_parent ON transactions(user_id, date, parent_transaction_id);

-- Add computed column for efficient parent queries
ALTER TABLE transactions
ADD COLUMN is_parent BOOLEAN GENERATED ALWAYS AS (
  EXISTS (
    SELECT 1 FROM transactions child
    WHERE child.parent_transaction_id = transactions.id
  )
) STORED;

-- Create view for hierarchical queries
CREATE VIEW transaction_hierarchy AS
WITH RECURSIVE hierarchy AS (
  SELECT
    id,
    user_id,
    parent_transaction_id,
    date,
    amount,
    merchant,
    description,
    link_confidence,
    link_type,
    0 AS depth,
    ARRAY[id] AS path,
    id AS root_id
  FROM transactions
  WHERE parent_transaction_id IS NULL

  UNION ALL

  SELECT
    t.id,
    t.user_id,
    t.parent_transaction_id,
    t.date,
    t.amount,
    t.merchant,
    t.description,
    t.link_confidence,
    t.link_type,
    h.depth + 1,
    h.path || t.id,
    h.root_id
  FROM transactions t
  JOIN hierarchy h ON t.parent_transaction_id = h.id
)
SELECT * FROM hierarchy;

-- Add trigger to prevent circular references
CREATE OR REPLACE FUNCTION prevent_circular_transaction_links()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if new parent creates circular reference
  IF NEW.parent_transaction_id IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE ancestors AS (
        SELECT parent_transaction_id FROM transactions WHERE id = NEW.id
        UNION ALL
        SELECT t.parent_transaction_id
        FROM transactions t
        JOIN ancestors a ON t.id = a.parent_transaction_id
        WHERE t.parent_transaction_id IS NOT NULL
      )
      SELECT 1 FROM ancestors WHERE parent_transaction_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular transaction link detected';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circular_links
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_transaction_links();

COMMIT;
```

### 10.2 Code Migration

```typescript
// Step 1: Add new fields to Transaction type
export interface Transaction {
  // ... existing fields ...
  parent_transaction_id?: string | null;
  link_confidence?: number | null;
  link_type?: 'auto' | 'manual' | 'suggested' | null;
  link_metadata?: LinkMetadata | null;
}

export interface LinkMetadata {
  match_scores?: {
    date_score: number;
    amount_score: number;
    merchant_score: number;
  };
  matched_order_id?: string;
  matched_at?: string;
  matched_by?: 'system' | 'user';
}

// Step 2: Create new service module
// lib/services/transactionLinking.ts
export const transactionLinkingService = {
  async linkTransactions(...),
  async unlinkTransaction(...),
  async getSuggestedLinks(...),
  async confirmLink(...),
  async rejectLink(...),
};

// Step 3: Update UI components
// components/features/TransactionLinkingPanel.tsx
// Show parent-child relationships visually
// Allow users to confirm/reject suggestions
// Provide manual linking interface
```

---

## 11. Conclusion and Next Steps

### 11.1 Key Recommendations

1. **Start with deterministic matching**: Date window + exact amount + merchant keyword
2. **Implement composite scoring**: Gradually add fuzzy matching and confidence levels
3. **Use self-referencing foreign key**: Simplest schema, adequate for most use cases
4. **Build feedback loop**: Learn from user confirmations/rejections
5. **Test thoroughly**: Edge cases will occur, need robust handling

### 11.2 Recommended Implementation Order

**Week 1-2: Foundation**
- Database migration (add parent_transaction_id column)
- Basic matching algorithm (date + amount + merchant)
- UI for viewing linked transactions

**Week 3-4: Core Features**
- Composite confidence scoring
- Auto-link high confidence matches
- Suggestion queue for medium confidence
- Manual linking interface

**Week 5-6: Polish**
- Bulk import with automatic linking
- User feedback collection
- Performance optimization
- Edge case handling

**Week 7+: Advanced**
- Machine learning enhancements
- Historical pattern learning
- Multi-shipment handling
- Conflict resolution

### 11.3 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **False positive links** | Start with high confidence threshold (0.85+), add user confirmation |
| **Performance degradation** | Index properly, use pagination, cache merchant mappings |
| **Edge case failures** | Comprehensive test suite, fallback to manual linking |
| **User confusion** | Clear UI indicators, confidence scores, ability to unlink |
| **Data integrity** | Foreign key constraints, circular reference prevention |

---

## 12. References and Resources

### 12.1 Industry Documentation

- **Plaid Transactions API**: Transaction reconciliation patterns, pending-to-posted tracking
- **QuickBooks API**: Three-way matching (date, amount, description)
- **Stripe Reconciliation**: Payment matching algorithms
- **Banking Industry Standards**: ACH processing delays, batch processing windows

### 12.2 Academic Research

- **String Matching Algorithms**: Levenshtein distance, Jaro-Winkler similarity
- **Record Linkage**: Probabilistic matching, composite scoring
- **Time Series Matching**: Temporal fuzzy matching

### 12.3 Related Code Patterns

- **Self-referencing foreign keys**: PostgreSQL recursive CTEs
- **JSONB metadata storage**: Flexible schema evolution
- **Confidence-based decision making**: Threshold tuning, A/B testing

---

## Appendix A: Example Data Structures

### A.1 Chase Transaction Example

```json
{
  "id": "chase_123",
  "date": "2025-10-20",
  "amount": 45.99,
  "merchant": "AMAZON.COM*M12AB34CD",
  "description": "AMAZON.COM*M12AB34CD",
  "chaseCategory": "Shopping",
  "type": "Sale",
  "originalAmount": -45.99,
  "parent_transaction_id": null,
  "link_confidence": null,
  "link_type": null
}
```

### A.2 Amazon Transaction Examples

```json
[
  {
    "id": "amz_456",
    "date": "2025-10-20",
    "amount": 29.99,
    "merchant": "Amazon",
    "description": "Wireless Mouse - Logitech",
    "category": "Electronics",
    "subcategory": "Computers & Accessories",
    "metadata": {
      "orderId": "112-1234567-8901234",
      "asin": "B07XYZ1234",
      "quantity": 1
    },
    "parent_transaction_id": "chase_123",
    "link_confidence": 0.92,
    "link_type": "auto",
    "link_metadata": {
      "match_scores": {
        "date_score": 1.0,
        "amount_score": 0.85,
        "merchant_score": 1.0
      },
      "matched_order_id": "112-1234567-8901234",
      "matched_at": "2025-10-20T14:30:00Z",
      "matched_by": "system"
    }
  },
  {
    "id": "amz_457",
    "date": "2025-10-20",
    "amount": 16.00,
    "merchant": "Amazon",
    "description": "USB Cable 3-Pack",
    "category": "Electronics",
    "subcategory": "Cables & Connectors",
    "metadata": {
      "orderId": "112-1234567-8901234",
      "asin": "B08ABC9876",
      "quantity": 1
    },
    "parent_transaction_id": "chase_123",
    "link_confidence": 0.92,
    "link_type": "auto"
  }
]
```

### A.3 Matching Score Example

```json
{
  "parent_id": "chase_123",
  "child_ids": ["amz_456", "amz_457"],
  "scores": {
    "date_score": 1.0,
    "amount_score": 0.89,
    "merchant_score": 1.0,
    "confidence_score": 0.92
  },
  "details": {
    "date_difference_days": 0,
    "amount_difference": 0.00,
    "amount_match_method": "exact_sum",
    "merchant_match_method": "keyword",
    "order_id_available": true
  },
  "recommendation": "auto_link"
}
```

---

## Appendix B: Configuration Examples

### B.1 Default Configuration

```typescript
export const DEFAULT_LINKING_CONFIG: MatchingConfig = {
  dateWindowDays: 3,
  amountToleranceCents: 2,
  amountTolerancePercent: 0.005, // 0.5% for large amounts
  merchantSimilarityThreshold: 0.7,
  autoLinkThreshold: 0.85,
  suggestThreshold: 0.70,
  weights: {
    date: 0.3,
    amount: 0.5,
    merchant: 0.2,
  },
  maxChildrenPerParent: 50, // Prevent runaway combinations
  enableOrderIdMatching: true,
  enableFuzzyMerchantMatching: true,
  enableUserFeedbackLearning: false, // Phase 3
};
```

### B.2 Conservative Configuration

```typescript
// For users who want high precision, low false positives
export const CONSERVATIVE_CONFIG: MatchingConfig = {
  dateWindowDays: 1,
  amountToleranceCents: 0,
  merchantSimilarityThreshold: 0.9,
  autoLinkThreshold: 0.95,
  suggestThreshold: 0.85,
  weights: {
    date: 0.2,
    amount: 0.6, // Emphasize amount matching
    merchant: 0.2,
  },
};
```

### B.3 Aggressive Configuration

```typescript
// For users who want maximum automation, accept some false positives
export const AGGRESSIVE_CONFIG: MatchingConfig = {
  dateWindowDays: 7,
  amountToleranceCents: 5,
  merchantSimilarityThreshold: 0.6,
  autoLinkThreshold: 0.70,
  suggestThreshold: 0.50,
  weights: {
    date: 0.4, // More lenient on dates
    amount: 0.4,
    merchant: 0.2,
  },
};
```

---

**End of Research Document**

**Prepared by:** Research Agent
**Date:** October 25, 2025
**Status:** Complete and ready for implementation planning
