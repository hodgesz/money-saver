/**
 * Transaction Linking Service
 * Database CRUD operations for transaction linking
 *
 * Provides functions to:
 * - Create/remove/update links between transactions
 * - Retrieve linked transaction hierarchies
 * - Get link suggestions based on matching algorithm
 * - Validate link requests
 */

import { supabase } from '@/lib/supabase/client'
import {
  LinkedTransaction,
  CreateLinkRequest,
  UpdateLinkRequest,
  LinkOperationResponse,
  LinkValidationResult,
  TransactionHierarchy,
  LinkSuggestion,
  DEFAULT_MATCHING_CONFIG,
} from '@/lib/types/transactionLinking'
import { findMatchingTransactions } from './transactionMatching'

/**
 * Validate a link request before creating
 * @param request - Link creation request
 * @param parent - Parent transaction
 * @param children - Child transactions
 * @returns Validation result with errors and warnings
 */
export async function validateLink(
  request: CreateLinkRequest,
  parent: LinkedTransaction,
  children: LinkedTransaction[]
): Promise<LinkValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Check: Parent cannot already be a child
  if (parent.parent_transaction_id !== null) {
    errors.push('Parent transaction is already a child of another transaction')
  }

  // Check: Children cannot already be linked
  for (const child of children) {
    if (child.parent_transaction_id !== null) {
      errors.push(`Child transaction ${child.id} is already linked`)
    }
  }

  // Check: No self-referencing links
  const childIds = request.childTransactionIds
  if (childIds.includes(request.parentTransactionId)) {
    errors.push('Transaction cannot link to itself')
  }

  // Warn: Significant amount differences (manual links)
  if (request.linkType === 'manual') {
    const childrenTotal = children.reduce((sum, child) => sum + child.amount, 0)
    const percentDiff = Math.abs(parent.amount - childrenTotal) / parent.amount

    if (percentDiff > 0.1) {
      // 10% difference
      warnings.push(
        `Child amounts ($${childrenTotal.toFixed(2)}) differ significantly from parent ($${parent.amount.toFixed(2)})`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Create links between parent and child transactions
 * @param request - Link creation request
 * @returns Operation response with success status
 */
export async function createLink(request: CreateLinkRequest): Promise<LinkOperationResponse> {
  try {
    // Build metadata
    const metadata = {
      ...request.metadata,
      linkedAt: new Date().toISOString(),
    }

    // Update child transactions to link to parent
    const { data, error } = await supabase
      .from('transactions')
      .update({
        parent_transaction_id: request.parentTransactionId,
        link_type: request.linkType,
        link_confidence: request.confidence || null,
        link_metadata: metadata,
      })
      .in('id', request.childTransactionIds)
      .select()

    if (error) {
      return {
        success: false,
        linkedCount: 0,
        errors: [error.message],
      }
    }

    return {
      success: true,
      linkedCount: data?.length || 0,
      errors: [],
    }
  } catch (error) {
    return {
      success: false,
      linkedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Remove link from a child transaction
 * @param transactionId - Child transaction ID
 * @returns Operation response
 */
export async function removeLink(transactionId: string): Promise<LinkOperationResponse> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        parent_transaction_id: null,
        link_type: null,
        link_confidence: null,
        link_metadata: {},
      })
      .eq('id', transactionId)

    if (error) {
      return {
        success: false,
        linkedCount: 0,
        errors: [error.message],
      }
    }

    return {
      success: true,
      linkedCount: 1,
      errors: [],
    }
  } catch (error) {
    return {
      success: false,
      linkedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Update link confidence or metadata
 * @param request - Update request
 * @returns Operation response
 */
export async function updateLink(request: UpdateLinkRequest): Promise<LinkOperationResponse> {
  try {
    const updates: Partial<LinkedTransaction> = {}

    if (request.confidence !== undefined) {
      updates.link_confidence = request.confidence
    }

    if (request.linkType !== undefined) {
      updates.link_type = request.linkType
    }

    if (request.metadata !== undefined) {
      // Merge with existing metadata
      updates.link_metadata = request.metadata
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', request.transactionId)

    if (error) {
      return {
        success: false,
        linkedCount: 0,
        errors: [error.message],
      }
    }

    return {
      success: true,
      linkedCount: 1,
      errors: [],
    }
  } catch (error) {
    return {
      success: false,
      linkedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Get transaction with all its children (full hierarchy)
 * @param parentId - Parent transaction ID
 * @returns Transaction hierarchy
 */
export async function getLinkedTransactions(parentId: string): Promise<TransactionHierarchy> {
  // Get parent transaction
  const { data: parentData, error: parentError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', parentId)

  if (parentError || !parentData || parentData.length === 0) {
    throw new Error('Parent transaction not found')
  }

  const parent = parentData[0] as LinkedTransaction

  // Get all children
  const { data: childrenData, error: childrenError } = await supabase
    .from('transactions')
    .select('*')
    .eq('parent_transaction_id', parentId)

  if (childrenError) {
    throw new Error('Failed to fetch children: ' + childrenError.message)
  }

  const children = (childrenData || []) as LinkedTransaction[]

  // Calculate totals
  const childrenAmount = children.reduce((sum, child) => sum + child.amount, 0)

  return {
    parent,
    children,
    totalChildren: children.length,
    totalAmount: parent.amount,
    childrenAmount,
  }
}

/**
 * Get link suggestions for unlinked transactions
 * @param userId - User ID
 * @param minConfidence - Minimum confidence threshold (default: 70)
 * @returns Array of link suggestions
 */
export async function getLinkSuggestions(
  userId: string,
  minConfidence: number = 70
): Promise<LinkSuggestion[]> {
  // Get unlinked parent candidates (e.g., credit card charges with Amazon)
  const { data: parentsData, error: parentsError } = await supabase
    .from('transactions')
    .select('*')
    .is('parent_transaction_id', null) // Not a child
    .ilike('merchant', '%amazon%') // Amazon transactions

  if (parentsError || !parentsData) {
    return []
  }

  // Get unlinked child candidates (e.g., Amazon order line items)
  const { data: childrenData, error: childrenError } = await supabase
    .from('transactions')
    .select('*')
    .is('parent_transaction_id', null) // Not linked yet

  if (childrenError || !childrenData) {
    return []
  }

  const parents = parentsData as LinkedTransaction[]
  const children = childrenData as LinkedTransaction[]

  // Use matching algorithm to find candidates
  const matches = findMatchingTransactions(parents, children, DEFAULT_MATCHING_CONFIG)

  // Filter by minimum confidence and convert to suggestions
  const suggestions: LinkSuggestion[] = matches
    .filter(match => match.totalScore >= minConfidence)
    .map(match => ({
      parentTransaction: match.parentTransaction,
      childTransactions: match.childTransactions,
      confidence: match.totalScore,
      confidenceLevel: match.confidenceLevel,
      matchScores: {
        dateScore: match.dateScore,
        amountScore: match.amountScore,
        orderGroupScore: match.orderGroupScore,
        total: match.totalScore,
      },
      reasons: [
        `Date proximity: ${match.dateScore}/40 points`,
        `Amount match: ${match.amountScore}/50 points`,
        `Order grouping: ${match.orderGroupScore}/10 points`,
      ],
    }))

  return suggestions
}

/**
 * Create multiple links in batch
 * @param requests - Array of link requests
 * @returns Array of operation responses
 */
export async function bulkCreateLinks(
  requests: CreateLinkRequest[]
): Promise<LinkOperationResponse[]> {
  const results: LinkOperationResponse[] = []

  for (const request of requests) {
    const result = await createLink(request)
    results.push(result)
  }

  return results
}
