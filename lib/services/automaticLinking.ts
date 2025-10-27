/**
 * Automatic Transaction Linking Service
 * Automatically links Amazon order items to credit card charges after CSV imports
 *
 * Workflow:
 * 1. Called after CSV imports (Chase or Amazon)
 * 2. Fetches unlinked Amazon.com* credit card charges
 * 3. Fetches unlinked Amazon order items
 * 4. Runs matching algorithm
 * 5. Auto-links matches with confidence >= 90
 * 6. Returns summary of linked transactions
 */

import { transactionLinkingService, getLinkSuggestions } from './transactionLinking'
import { DEFAULT_MATCHING_CONFIG } from '@/lib/types/transactionLinking'
import type { LinkSuggestion, LinkOperationResponse } from '@/lib/types/transactionLinking'

export interface AutoLinkResult {
  success: boolean
  totalMatches: number
  autoLinkedCount: number
  suggestedCount: number
  errors: string[]
  autoLinkedTransactions: LinkSuggestion[]
  suggestedTransactions: LinkSuggestion[]
}

/**
 * Automatically link Amazon transactions for a user
 * @param userId - User ID
 * @returns Result summary with auto-linked and suggested transactions
 */
export async function autoLinkAmazonTransactions(userId: string): Promise<AutoLinkResult> {
  const errors: string[] = []
  const autoLinkedTransactions: LinkSuggestion[] = []
  const suggestedTransactions: LinkSuggestion[] = []

  try {
    // Get link suggestions using existing matching algorithm
    // This already filters for Amazon.com* merchants
    const suggestions = await getLinkSuggestions(
      userId,
      DEFAULT_MATCHING_CONFIG.suggestThreshold // Get matches >= 70 confidence
    )

    if (suggestions.length === 0) {
      return {
        success: true,
        totalMatches: 0,
        autoLinkedCount: 0,
        suggestedCount: 0,
        errors: [],
        autoLinkedTransactions: [],
        suggestedTransactions: [],
      }
    }

    // Separate high-confidence matches (>=90) from suggestions (70-89)
    const highConfidenceMatches = suggestions.filter(
      s => s.confidence >= DEFAULT_MATCHING_CONFIG.autoLinkThreshold
    )
    const mediumConfidenceMatches = suggestions.filter(
      s =>
        s.confidence >= DEFAULT_MATCHING_CONFIG.suggestThreshold &&
        s.confidence < DEFAULT_MATCHING_CONFIG.autoLinkThreshold
    )

    // Auto-link high confidence matches
    for (const match of highConfidenceMatches) {
      const childIds = match.childTransactions.map(t => t.id)

      const result = await transactionLinkingService.createLink({
        parentTransactionId: match.parentTransaction.id,
        childTransactionIds: childIds,
        linkType: 'auto',
        confidence: match.confidence,
        metadata: {
          matchScores: match.matchScores,
          linkedAt: new Date().toISOString(),
        },
      })

      if (result.success) {
        autoLinkedTransactions.push(match)
      } else {
        errors.push(
          `Failed to auto-link ${match.parentTransaction.merchant}: ${result.errors.join(', ')}`
        )
      }
    }

    // Keep medium confidence matches as suggestions (don't auto-link)
    suggestedTransactions.push(...mediumConfidenceMatches)

    return {
      success: errors.length === 0,
      totalMatches: suggestions.length,
      autoLinkedCount: autoLinkedTransactions.length,
      suggestedCount: suggestedTransactions.length,
      errors,
      autoLinkedTransactions,
      suggestedTransactions,
    }
  } catch (error) {
    return {
      success: false,
      totalMatches: 0,
      autoLinkedCount: 0,
      suggestedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error during auto-linking'],
      autoLinkedTransactions: [],
      suggestedTransactions: [],
    }
  }
}

/**
 * Check if auto-linking should run for a user
 * (e.g., only run if there are unlinked Amazon transactions)
 * @param userId - User ID
 * @returns true if auto-linking should run
 */
export async function shouldRunAutoLink(userId: string): Promise<boolean> {
  try {
    // Get suggestions to check if there are any matches
    const suggestions = await getLinkSuggestions(
      userId,
      DEFAULT_MATCHING_CONFIG.suggestThreshold
    )

    return suggestions.length > 0
  } catch {
    return false
  }
}
