// Transaction Linking Types
// Supporting parent-child transaction relationships (e.g., Amazon items → Credit card charge)

/**
 * Type of link between parent and child transactions
 */
export type LinkType = 'auto' | 'manual' | 'suggested'

/**
 * Confidence level for auto-matched links
 */
export type ConfidenceLevel = 'EXACT' | 'PARTIAL' | 'FUZZY' | 'UNMATCHED'

/**
 * Metadata stored with transaction links
 */
export interface TransactionLinkMetadata {
  /** Breakdown of match scores by component */
  matchScores?: {
    dateScore: number // 0-40 points
    amountScore: number // 0-50 points
    orderGroupScore: number // 0-10 points
    total: number // 0-100 points
  }
  /** Amazon order ID if applicable */
  orderId?: string
  /** Order group ID for multiple items in same order */
  orderGroupId?: string
  /** User notes about the link */
  userNotes?: string
  /** Timestamp when link was created */
  linkedAt?: string
  /** User ID who created the link (for manual links) */
  linkedBy?: string
  /** Tax amount allocated to this item */
  taxAmount?: number
  /** Shipping amount allocated to this item */
  shippingAmount?: number
  /** Original match confidence before user override */
  originalConfidence?: number
}

/**
 * Extended Transaction type with linking fields
 */
export interface LinkedTransaction {
  id: string
  user_id: string
  date: string
  amount: number
  merchant: string
  description: string
  category_id: string | null
  account_id: string | null
  receipt_url: string | null
  is_income: boolean
  order_id: string | null
  created_at: string
  updated_at: string

  // Linking fields
  parent_transaction_id: string | null
  link_confidence: number | null
  link_type: LinkType | null
  link_metadata: TransactionLinkMetadata
}

/**
 * Transaction with its child transactions
 */
export interface TransactionWithChildren extends LinkedTransaction {
  children: LinkedTransaction[]
}

/**
 * Transaction with its parent transaction
 */
export interface TransactionWithParent extends LinkedTransaction {
  parent: LinkedTransaction | null
}

/**
 * Full hierarchy (parent + children)
 */
export interface TransactionHierarchy {
  parent: LinkedTransaction
  children: LinkedTransaction[]
  totalChildren: number
  totalAmount: number
  childrenAmount: number
}

/**
 * Link suggestion for review
 */
export interface LinkSuggestion {
  parentTransaction: LinkedTransaction
  childTransactions: LinkedTransaction[]
  confidence: number
  confidenceLevel: ConfidenceLevel
  matchScores: {
    dateScore: number
    amountScore: number
    orderGroupScore: number
    total: number
  }
  reasons: string[]
}

/**
 * Result of link validation
 */
export interface LinkValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Request to create a link
 */
export interface CreateLinkRequest {
  parentTransactionId: string
  childTransactionIds: string[]
  linkType: LinkType
  confidence?: number
  metadata?: Partial<TransactionLinkMetadata>
}

/**
 * Request to update a link
 */
export interface UpdateLinkRequest {
  transactionId: string
  confidence?: number
  linkType?: LinkType
  metadata?: Partial<TransactionLinkMetadata>
}

/**
 * Response from link operation
 */
export interface LinkOperationResponse {
  success: boolean
  linkedCount: number
  errors: string[]
}

/**
 * Matching candidate for linking algorithm
 */
export interface MatchCandidate {
  parentTransaction: LinkedTransaction
  childTransactions: LinkedTransaction[]
  dateScore: number
  amountScore: number
  orderGroupScore: number
  totalScore: number
  confidenceLevel: ConfidenceLevel
}

/**
 * Configuration for matching algorithm
 */
export interface MatchingConfig {
  /** Date window in days (±) */
  dateWindow: number
  /** Amount tolerance in dollars (e.g., 3.00 for $3 tolerance) */
  amountTolerance: number
  /** Minimum confidence score to auto-link */
  autoLinkThreshold: number
  /** Minimum confidence score to suggest */
  suggestThreshold: number
  /** Enable merchant name matching */
  enableMerchantMatching: boolean
  /** Merchant keywords to match (e.g., ['amazon', 'amzn']) */
  merchantKeywords: string[]
}

/**
 * Default matching configuration
 */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  dateWindow: 30, // ±30 days (Amazon orders can have delayed delivery/billing, especially slow shipping)
  amountTolerance: 3.00, // $3 fixed tolerance (handles CO delivery fee ~$0.28 + other small variations)
  autoLinkThreshold: 80, // 80+ confidence (auto-link high-quality matches only)
  suggestThreshold: 70, // 70+ confidence (require strong match - order_id grouping + close date + good amount)
  enableMerchantMatching: true,
  merchantKeywords: ['amazon', 'amzn', 'amazon.com', 'amazon marketplace'],
}

/**
 * Helper to get confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return 'EXACT'
  if (score >= 70) return 'PARTIAL'
  if (score >= 50) return 'FUZZY'
  return 'UNMATCHED'
}

/**
 * Helper to check if transaction is a parent
 */
export function isParentTransaction(transaction: LinkedTransaction): boolean {
  return transaction.parent_transaction_id === null
}

/**
 * Helper to check if transaction is a child
 */
export function isChildTransaction(transaction: LinkedTransaction): boolean {
  return transaction.parent_transaction_id !== null
}

/**
 * Helper to check if transaction is linked (parent or child)
 */
export function isLinkedTransaction(transaction: LinkedTransaction): boolean {
  return transaction.parent_transaction_id !== null || transaction.link_type !== null
}
