# Transaction Linking Database Schema Design

**Version**: 1.0
**Date**: 2025-10-25
**Status**: Approved for Implementation
**Author**: System Architect Agent

---

## Executive Summary

This document defines the database schema modifications needed to support parent-child transaction relationships in the Money Saver application. The design uses a **self-referencing foreign key pattern** to enable hierarchical transaction linking with confidence tracking, link type classification, and rich metadata storage.

### Key Design Decisions

1. **Self-Referencing Pattern**: Single `Transactions` table with `parent_transaction_id` foreign key
2. **Confidence Tracking**: Numeric score (0-100) for link reliability
3. **Link Type Classification**: Enum for auto/manual/suggested links
4. **JSONB Metadata**: Flexible storage for match details, order IDs, and future extensions
5. **Recursive Query Support**: Common Table Expressions (CTEs) for hierarchy traversal
6. **Performance Optimization**: Strategic indexes on foreign keys and queries
7. **Security**: RLS policies maintain user data isolation

---

## Schema Modifications

### 1. ALTER TABLE Migrations

```sql
-- =====================================================
-- Migration: Add Transaction Linking Support
-- Description: Adds parent-child relationship columns
-- =====================================================

-- Add parent-child relationship column
ALTER TABLE transactions
ADD COLUMN parent_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

-- Add link confidence score (0-100)
ALTER TABLE transactions
ADD COLUMN link_confidence integer CHECK (link_confidence >= 0 AND link_confidence <= 100);

-- Add link type classification
CREATE TYPE link_type_enum AS ENUM ('auto', 'manual', 'suggested');

ALTER TABLE transactions
ADD COLUMN link_type link_type_enum;

-- Add metadata for match details (JSONB for flexibility)
ALTER TABLE transactions
ADD COLUMN link_metadata jsonb;

-- Add constraint: confidence required when parent exists
ALTER TABLE transactions
ADD CONSTRAINT check_link_confidence_required
  CHECK (
    (parent_transaction_id IS NULL AND link_confidence IS NULL AND link_type IS NULL)
    OR
    (parent_transaction_id IS NOT NULL AND link_confidence IS NOT NULL AND link_type IS NOT NULL)
  );

-- Add constraint: prevent self-referencing
ALTER TABLE transactions
ADD CONSTRAINT check_not_self_referencing
  CHECK (id != parent_transaction_id);

-- Add constraint: validate link_metadata structure when present
ALTER TABLE transactions
ADD CONSTRAINT check_link_metadata_structure
  CHECK (
    link_metadata IS NULL
    OR (
      link_metadata ? 'match_details'
      AND jsonb_typeof(link_metadata->'match_details') = 'object'
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN transactions.parent_transaction_id IS
  'Foreign key to parent transaction. Used for linking credit card payments to bank debits.';

COMMENT ON COLUMN transactions.link_confidence IS
  'Confidence score (0-100) indicating reliability of the link. Higher scores = stronger match.';

COMMENT ON COLUMN transactions.link_type IS
  'Classification of how the link was created: auto (algorithm), manual (user), suggested (AI recommendation).';

COMMENT ON COLUMN transactions.link_metadata IS
  'JSONB metadata containing match details, order IDs, algorithm info, and user notes.';
```

### 2. Indexes for Performance

```sql
-- =====================================================
-- Performance Indexes
-- =====================================================

-- Index on parent_transaction_id for fast child lookups
CREATE INDEX idx_transactions_parent_id
  ON transactions(parent_transaction_id)
  WHERE parent_transaction_id IS NOT NULL;

-- Composite index for user + parent queries
CREATE INDEX idx_transactions_user_parent
  ON transactions(user_id, parent_transaction_id)
  WHERE parent_transaction_id IS NOT NULL;

-- Index for finding potential link candidates (same user, similar amount, recent dates)
CREATE INDEX idx_transactions_linking_candidates
  ON transactions(user_id, amount, date DESC)
  WHERE parent_transaction_id IS NULL;

-- Index for filtering by link type
CREATE INDEX idx_transactions_link_type
  ON transactions(link_type)
  WHERE link_type IS NOT NULL;

-- GIN index for JSONB metadata queries
CREATE INDEX idx_transactions_link_metadata_gin
  ON transactions USING GIN (link_metadata);

-- Index for confidence-based queries
CREATE INDEX idx_transactions_link_confidence
  ON transactions(link_confidence DESC)
  WHERE link_confidence IS NOT NULL;

-- Partial index for unlinked transactions (optimization for link suggestions)
CREATE INDEX idx_transactions_unlinked
  ON transactions(user_id, date DESC, amount)
  WHERE parent_transaction_id IS NULL
    AND is_income = false;
```

### 3. Row Level Security (RLS) Updates

```sql
-- =====================================================
-- RLS Policy Updates
-- =====================================================

-- Drop existing policies if needed for modification
-- (Assuming base RLS policies already exist from Phase 1)

-- Enhanced SELECT policy with parent transaction access
CREATE POLICY transactions_select_own_and_linked
  ON transactions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    -- Allow viewing parent transactions if user owns the child
    id IN (
      SELECT parent_transaction_id
      FROM transactions
      WHERE user_id = auth.uid()
        AND parent_transaction_id IS NOT NULL
    )
  );

-- INSERT policy (unchanged, users can only create their own)
CREATE POLICY transactions_insert_own
  ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy with link validation
CREATE POLICY transactions_update_own
  ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- If linking to parent, verify parent ownership
      parent_transaction_id IS NULL
      OR
      EXISTS (
        SELECT 1 FROM transactions parent
        WHERE parent.id = parent_transaction_id
          AND parent.user_id = auth.uid()
      )
    )
  );

-- DELETE policy (unchanged)
CREATE POLICY transactions_delete_own
  ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS if not already enabled
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

---

## TypeScript Type Definitions

### 1. Database Types

```typescript
// types/database.types.ts

/**
 * Link type classification for transaction relationships
 */
export type LinkType = 'auto' | 'manual' | 'suggested';

/**
 * Metadata structure for transaction links
 */
export interface TransactionLinkMetadata {
  match_details: {
    algorithm?: string;
    algorithm_version?: string;
    match_factors?: {
      amount_similarity?: number;
      date_proximity_days?: number;
      merchant_similarity?: number;
      description_match?: boolean;
    };
    confidence_breakdown?: {
      amount_score?: number;
      date_score?: number;
      merchant_score?: number;
      pattern_score?: number;
    };
  };
  order_id?: string;
  external_reference?: string;
  user_notes?: string;
  linked_at?: string; // ISO timestamp
  linked_by?: string; // user_id if manual
  reviewed?: boolean;
  review_date?: string;
}

/**
 * Extended Transaction type with linking fields
 */
export interface Transaction {
  // Existing fields
  id: string;
  user_id: string;
  date: string;
  amount: number;
  merchant: string;
  description: string;
  category_id: string;
  account_id: string | null;
  receipt_url: string | null;
  is_income: boolean;
  created_at: string;
  updated_at: string;

  // New linking fields
  parent_transaction_id: string | null;
  link_confidence: number | null;
  link_type: LinkType | null;
  link_metadata: TransactionLinkMetadata | null;
}

/**
 * Transaction with child relationships
 */
export interface TransactionWithChildren extends Transaction {
  children: Transaction[];
  child_count: number;
  total_child_amount: number;
}

/**
 * Transaction with parent relationship
 */
export interface TransactionWithParent extends Transaction {
  parent: Transaction | null;
}

/**
 * Full transaction hierarchy
 */
export interface TransactionHierarchy extends Transaction {
  parent: Transaction | null;
  children: Transaction[];
  depth: number; // Distance from root
  path: string[]; // Array of IDs from root to this node
}

/**
 * Link suggestion for UI
 */
export interface LinkSuggestion {
  child_transaction: Transaction;
  parent_transaction: Transaction;
  confidence: number;
  match_details: TransactionLinkMetadata['match_details'];
  suggested_at: string;
}

/**
 * Link validation result
 */
export interface LinkValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
```

### 2. API Request/Response Types

```typescript
// types/api.types.ts

/**
 * Request to create a transaction link
 */
export interface CreateLinkRequest {
  child_transaction_id: string;
  parent_transaction_id: string;
  link_type: LinkType;
  link_confidence: number;
  link_metadata?: TransactionLinkMetadata;
}

/**
 * Request to update a link
 */
export interface UpdateLinkRequest {
  link_confidence?: number;
  link_type?: LinkType;
  link_metadata?: TransactionLinkMetadata;
}

/**
 * Request to unlink a transaction
 */
export interface UnlinkRequest {
  transaction_id: string;
  reason?: string;
}

/**
 * Response with link operation result
 */
export interface LinkOperationResponse {
  success: boolean;
  transaction: TransactionWithParent;
  message?: string;
}

/**
 * Request for link suggestions
 */
export interface GetLinkSuggestionsRequest {
  transaction_id?: string; // Specific transaction or all unlinked
  min_confidence?: number; // Default: 70
  limit?: number; // Default: 10
}

/**
 * Response with link suggestions
 */
export interface GetLinkSuggestionsResponse {
  suggestions: LinkSuggestion[];
  total_count: number;
}
```

---

## Example Queries

### 1. Basic Linking Operations

```sql
-- =====================================================
-- Create a Link (Manual)
-- =====================================================
UPDATE transactions
SET
  parent_transaction_id = 'parent-uuid-here',
  link_confidence = 95,
  link_type = 'manual',
  link_metadata = jsonb_build_object(
    'match_details', jsonb_build_object(
      'algorithm', 'manual_user_selection',
      'algorithm_version', '1.0'
    ),
    'user_notes', 'Chase payment for Amazon purchase',
    'linked_at', now()::text,
    'linked_by', auth.uid()::text
  ),
  updated_at = now()
WHERE id = 'child-uuid-here'
  AND user_id = auth.uid();

-- =====================================================
-- Remove a Link
-- =====================================================
UPDATE transactions
SET
  parent_transaction_id = NULL,
  link_confidence = NULL,
  link_type = NULL,
  link_metadata = NULL,
  updated_at = now()
WHERE id = 'child-uuid-here'
  AND user_id = auth.uid();

-- =====================================================
-- Update Link Confidence
-- =====================================================
UPDATE transactions
SET
  link_confidence = 85,
  link_metadata = jsonb_set(
    COALESCE(link_metadata, '{}'::jsonb),
    '{match_details,reviewed}',
    'true'::jsonb
  ),
  updated_at = now()
WHERE id = 'child-uuid-here'
  AND user_id = auth.uid();
```

### 2. Query Linked Transactions

```sql
-- =====================================================
-- Get All Children of a Transaction
-- =====================================================
SELECT
  t.*,
  COUNT(*) OVER () as total_children,
  SUM(t.amount) OVER () as total_child_amount
FROM transactions t
WHERE t.parent_transaction_id = 'parent-uuid-here'
  AND t.user_id = auth.uid()
ORDER BY t.date DESC;

-- =====================================================
-- Get Transaction with Parent
-- =====================================================
SELECT
  child.*,
  parent.id as parent_id,
  parent.merchant as parent_merchant,
  parent.amount as parent_amount,
  parent.date as parent_date
FROM transactions child
LEFT JOIN transactions parent ON child.parent_transaction_id = parent.id
WHERE child.id = 'transaction-uuid-here'
  AND child.user_id = auth.uid();

-- =====================================================
-- Get Transaction with All Children
-- =====================================================
SELECT
  parent.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', child.id,
        'amount', child.amount,
        'merchant', child.merchant,
        'date', child.date,
        'link_confidence', child.link_confidence,
        'link_type', child.link_type
      )
      ORDER BY child.date DESC
    ) FILTER (WHERE child.id IS NOT NULL),
    '[]'::json
  ) as children,
  COUNT(child.id) as child_count,
  COALESCE(SUM(child.amount), 0) as total_child_amount
FROM transactions parent
LEFT JOIN transactions child ON child.parent_transaction_id = parent.id
WHERE parent.id = 'parent-uuid-here'
  AND parent.user_id = auth.uid()
GROUP BY parent.id;
```

### 3. Recursive Hierarchy Queries

```sql
-- =====================================================
-- Get Full Transaction Hierarchy (with depth)
-- =====================================================
WITH RECURSIVE transaction_hierarchy AS (
  -- Base case: root transactions (no parent)
  SELECT
    t.*,
    0 as depth,
    ARRAY[t.id] as path,
    t.id::text as root_id
  FROM transactions t
  WHERE t.parent_transaction_id IS NULL
    AND t.user_id = auth.uid()

  UNION ALL

  -- Recursive case: children
  SELECT
    t.*,
    th.depth + 1,
    th.path || t.id,
    th.root_id
  FROM transactions t
  INNER JOIN transaction_hierarchy th ON t.parent_transaction_id = th.id
  WHERE t.user_id = auth.uid()
)
SELECT * FROM transaction_hierarchy
WHERE root_id = 'root-transaction-uuid'
ORDER BY depth, date DESC;

-- =====================================================
-- Get All Unlinked Transactions (Candidates for Linking)
-- =====================================================
SELECT
  t.*,
  COUNT(*) OVER () as total_unlinked
FROM transactions t
WHERE t.parent_transaction_id IS NULL
  AND t.is_income = false
  AND t.user_id = auth.uid()
  AND t.date >= (CURRENT_DATE - INTERVAL '90 days')
ORDER BY t.date DESC, t.amount DESC;

-- =====================================================
-- Detect Circular References (Validation Query)
-- =====================================================
WITH RECURSIVE cycle_check AS (
  SELECT
    id,
    parent_transaction_id,
    ARRAY[id] as path,
    false as cycle_detected
  FROM transactions
  WHERE user_id = auth.uid()

  UNION ALL

  SELECT
    t.id,
    t.parent_transaction_id,
    cc.path || t.id,
    t.id = ANY(cc.path) as cycle_detected
  FROM transactions t
  INNER JOIN cycle_check cc ON t.id = cc.parent_transaction_id
  WHERE NOT cc.cycle_detected
)
SELECT * FROM cycle_check
WHERE cycle_detected = true;
```

### 4. Link Suggestion Queries

```sql
-- =====================================================
-- Find Potential Link Matches (Same User, Similar Amount, Recent)
-- =====================================================
SELECT
  credit_card.id as child_id,
  credit_card.merchant as child_merchant,
  credit_card.amount as child_amount,
  credit_card.date as child_date,

  bank.id as parent_id,
  bank.merchant as parent_merchant,
  bank.amount as parent_amount,
  bank.date as parent_date,

  -- Calculate confidence score
  (
    -- Amount similarity (40 points max)
    CASE
      WHEN ABS(credit_card.amount - bank.amount) < 0.01 THEN 40
      WHEN ABS(credit_card.amount - bank.amount) < 1.00 THEN 30
      WHEN ABS(credit_card.amount - bank.amount) < 5.00 THEN 20
      ELSE 0
    END +

    -- Date proximity (30 points max)
    CASE
      WHEN ABS(EXTRACT(EPOCH FROM (credit_card.date - bank.date)) / 86400) <= 1 THEN 30
      WHEN ABS(EXTRACT(EPOCH FROM (credit_card.date - bank.date)) / 86400) <= 3 THEN 20
      WHEN ABS(EXTRACT(EPOCH FROM (credit_card.date - bank.date)) / 86400) <= 7 THEN 10
      ELSE 0
    END +

    -- Merchant similarity (30 points max)
    CASE
      WHEN LOWER(credit_card.merchant) = LOWER(bank.merchant) THEN 30
      WHEN LOWER(credit_card.merchant) LIKE '%' || LOWER(bank.merchant) || '%' THEN 20
      WHEN LOWER(bank.merchant) LIKE '%' || LOWER(credit_card.merchant) || '%' THEN 20
      ELSE 0
    END
  ) as confidence_score,

  -- Match details
  jsonb_build_object(
    'match_factors', jsonb_build_object(
      'amount_difference', ABS(credit_card.amount - bank.amount),
      'date_difference_days', ABS(EXTRACT(EPOCH FROM (credit_card.date - bank.date)) / 86400),
      'merchant_match', LOWER(credit_card.merchant) = LOWER(bank.merchant)
    )
  ) as match_details

FROM transactions credit_card
CROSS JOIN LATERAL (
  SELECT * FROM transactions
  WHERE user_id = credit_card.user_id
    AND parent_transaction_id IS NULL
    AND is_income = false
    AND ABS(amount - credit_card.amount) < 10.00 -- Pre-filter for performance
    AND ABS(EXTRACT(EPOCH FROM (date - credit_card.date)) / 86400) <= 7
    AND id != credit_card.id
  ORDER BY date DESC
  LIMIT 10
) bank

WHERE credit_card.user_id = auth.uid()
  AND credit_card.parent_transaction_id IS NULL
  AND credit_card.is_income = false

HAVING (
  -- Amount similarity threshold
  CASE
    WHEN ABS(credit_card.amount - bank.amount) < 0.01 THEN 40
    WHEN ABS(credit_card.amount - bank.amount) < 1.00 THEN 30
    WHEN ABS(credit_card.amount - bank.amount) < 5.00 THEN 20
    ELSE 0
  END +

  -- Date proximity threshold
  CASE
    WHEN ABS(EXTRACT(EPOCH FROM (credit_card.date - bank.date)) / 86400) <= 1 THEN 30
    WHEN ABS(EXTRACT(EPOCH FROM (credit_card.date - bank.date)) / 86400) <= 3 THEN 20
    WHEN ABS(EXTRACT(EPOCH FROM (credit_card.date - bank.date)) / 86400) <= 7 THEN 10
    ELSE 0
  END +

  -- Merchant similarity threshold
  CASE
    WHEN LOWER(credit_card.merchant) = LOWER(bank.merchant) THEN 30
    WHEN LOWER(credit_card.merchant) LIKE '%' || LOWER(bank.merchant) || '%' THEN 20
    WHEN LOWER(bank.merchant) LIKE '%' || LOWER(credit_card.merchant) || '%' THEN 20
    ELSE 0
  END
) >= 70 -- Minimum confidence threshold

ORDER BY confidence_score DESC, credit_card.date DESC
LIMIT 20;
```

### 5. Analytics Queries

```sql
-- =====================================================
-- Link Quality Metrics
-- =====================================================
SELECT
  link_type,
  COUNT(*) as link_count,
  AVG(link_confidence) as avg_confidence,
  MIN(link_confidence) as min_confidence,
  MAX(link_confidence) as max_confidence,
  COUNT(*) FILTER (WHERE link_confidence >= 90) as high_confidence_count,
  COUNT(*) FILTER (WHERE link_confidence < 70) as low_confidence_count
FROM transactions
WHERE user_id = auth.uid()
  AND parent_transaction_id IS NOT NULL
GROUP BY link_type;

-- =====================================================
-- Linking Coverage Report
-- =====================================================
SELECT
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE parent_transaction_id IS NOT NULL) as linked_count,
  COUNT(*) FILTER (WHERE parent_transaction_id IS NULL) as unlinked_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE parent_transaction_id IS NOT NULL) / NULLIF(COUNT(*), 0),
    2
  ) as linking_percentage
FROM transactions
WHERE user_id = auth.uid()
  AND is_income = false;

-- =====================================================
-- Parent Transactions with Child Summary
-- =====================================================
SELECT
  parent.id,
  parent.merchant,
  parent.amount as parent_amount,
  parent.date,
  COUNT(child.id) as child_count,
  SUM(child.amount) as total_child_amount,
  ROUND(AVG(child.link_confidence), 0) as avg_child_confidence,
  array_agg(DISTINCT child.link_type) as link_types_used
FROM transactions parent
INNER JOIN transactions child ON child.parent_transaction_id = parent.id
WHERE parent.user_id = auth.uid()
GROUP BY parent.id, parent.merchant, parent.amount, parent.date
HAVING COUNT(child.id) > 1
ORDER BY parent.date DESC;
```

---

## Migration Rollback Plan

In case the migration needs to be rolled back:

```sql
-- =====================================================
-- Rollback Migration (Use with Caution)
-- =====================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_transactions_parent_id;
DROP INDEX IF EXISTS idx_transactions_user_parent;
DROP INDEX IF EXISTS idx_transactions_linking_candidates;
DROP INDEX IF EXISTS idx_transactions_link_type;
DROP INDEX IF EXISTS idx_transactions_link_metadata_gin;
DROP INDEX IF EXISTS idx_transactions_link_confidence;
DROP INDEX IF EXISTS idx_transactions_unlinked;

-- Drop constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_link_confidence_required;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_not_self_referencing;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_link_metadata_structure;

-- Drop columns
ALTER TABLE transactions DROP COLUMN IF EXISTS parent_transaction_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS link_confidence;
ALTER TABLE transactions DROP COLUMN IF EXISTS link_type;
ALTER TABLE transactions DROP COLUMN IF EXISTS link_metadata;

-- Drop enum type
DROP TYPE IF EXISTS link_type_enum;

-- Recreate original RLS policies (if needed)
-- [Original RLS policy definitions here]
```

---

## Performance Considerations

### Index Usage Patterns

1. **Parent Lookups**: `idx_transactions_parent_id` - Fast child retrieval
2. **User Filtering**: `idx_transactions_user_parent` - Combined user + parent queries
3. **Link Candidates**: `idx_transactions_linking_candidates` - Finding potential matches
4. **Metadata Search**: `idx_transactions_link_metadata_gin` - JSONB queries
5. **Unlinked Optimization**: `idx_transactions_unlinked` - Partial index for suggestions

### Query Optimization Tips

1. **Limit Recursive Depth**: Add `WHERE depth < 10` to CTEs
2. **Use Materialized CTEs**: Add `MATERIALIZED` for large datasets
3. **Pre-filter Candidates**: Use amount/date ranges before similarity calculations
4. **Batch Operations**: Link multiple transactions in single transaction
5. **Vacuum Regularly**: Maintain index performance with `VACUUM ANALYZE transactions;`

### Expected Performance

- **Child Lookup**: < 10ms (indexed parent_id)
- **Link Suggestion**: < 500ms (with 10K transactions)
- **Hierarchy Query**: < 100ms (depth ≤ 5)
- **Unlinked Count**: < 50ms (partial index)

---

## Security Considerations

### RLS Policy Details

1. **Data Isolation**: Users only see their own transactions
2. **Parent Visibility**: Can view parent if they own the child
3. **Link Validation**: Cannot link to transactions owned by other users
4. **Cascade Protection**: `ON DELETE SET NULL` prevents orphaned children

### Validation Rules

1. **No Self-Links**: `check_not_self_referencing` constraint
2. **Confidence Range**: 0-100 enforced at database level
3. **Required Fields**: All link fields required when parent exists
4. **Metadata Structure**: Validates `match_details` object presence

---

## Testing Recommendations

### Unit Tests

1. **Constraint Validation**
   - Test self-referencing rejection
   - Test confidence range validation
   - Test required field enforcement

2. **Link Operations**
   - Create link (manual, auto, suggested)
   - Update link confidence
   - Remove link
   - Prevent cross-user linking

3. **Query Performance**
   - Verify index usage with `EXPLAIN ANALYZE`
   - Test with 10K+ transactions
   - Measure recursive query performance

### Integration Tests

1. **End-to-End Linking**
   - Import transactions
   - Generate suggestions
   - User confirms link
   - Verify hierarchy display

2. **RLS Policy Verification**
   - Test as different users
   - Verify data isolation
   - Test parent visibility rules

---

## Future Enhancements

### Potential Improvements

1. **Many-to-Many Links**: Support multiple parents (e.g., split payments)
2. **Link History**: Track link creation/modification history
3. **Auto-Linking Rules**: User-defined rules for automatic linking
4. **Conflict Resolution**: Handle duplicate link suggestions
5. **Bulk Operations**: Link/unlink multiple transactions at once
6. **Link Categories**: Classify link types (payment, split, transfer, etc.)

### Monitoring & Observability

1. **Link Quality Dashboard**: Track confidence distribution over time
2. **Suggestion Acceptance Rate**: Measure algorithm effectiveness
3. **Performance Metrics**: Query execution times and index hit rates
4. **Error Tracking**: Log failed link operations and reasons

---

## Conclusion

This schema design provides a robust foundation for transaction linking with:

- ✅ **Scalability**: Handles thousands of transactions with optimized indexes
- ✅ **Flexibility**: JSONB metadata supports future enhancements
- ✅ **Security**: RLS policies maintain user data isolation
- ✅ **Performance**: Strategic indexes for common query patterns
- ✅ **Maintainability**: Clear constraints and validation rules
- ✅ **Type Safety**: Comprehensive TypeScript definitions

The self-referencing pattern is proven, widely supported, and aligns with PostgreSQL best practices for hierarchical data.

---

## Document History

| Version | Date       | Author            | Changes                          |
|---------|------------|-------------------|----------------------------------|
| 1.0     | 2025-10-25 | System Architect  | Initial schema design            |
