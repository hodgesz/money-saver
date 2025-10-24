import { STANDARD_CATEGORIES, StandardCategory } from '@/lib/config/standardCategories'
import type { Category } from '@/types'

/**
 * Smart category mapping service
 * Maps transaction descriptions/merchants to standard categories using keyword matching
 */

interface CategoryMatch {
  category: Category
  confidence: number // 0-1 score
  matchedKeywords: string[]
}

export const categoryMappingService = {
  /**
   * Find the best matching category for a transaction
   * @param description Transaction description
   * @param merchant Transaction merchant (optional)
   * @param categories List of available categories
   * @returns Matched category or null if no good match
   */
  matchCategory(
    description: string,
    merchant: string | undefined,
    categories: Category[]
  ): Category | null {
    const searchText = `${description} ${merchant || ''}`.toLowerCase()

    // Try to find matches for each standard category
    const matches: CategoryMatch[] = []

    for (const standardCat of STANDARD_CATEGORIES) {
      // Skip "Other" category for now - it's the fallback
      if (standardCat.name === 'Other') continue

      // Find matching keywords
      const matchedKeywords = standardCat.keywords.filter(keyword =>
        searchText.includes(keyword.toLowerCase())
      )

      if (matchedKeywords.length > 0) {
        // Find the corresponding user category
        const userCategory = categories.find(
          cat => cat.name.toLowerCase() === standardCat.name.toLowerCase()
        )

        if (userCategory) {
          matches.push({
            category: userCategory,
            confidence: matchedKeywords.length / standardCat.keywords.length,
            matchedKeywords,
          })
        }
      }
    }

    // If we have matches, return the one with highest confidence
    if (matches.length > 0) {
      matches.sort((a, b) => b.confidence - a.confidence)
      return matches[0].category
    }

    // No match found - return "Other" category if it exists
    const otherCategory = categories.find(
      cat => cat.name.toLowerCase() === 'other'
    )
    return otherCategory || null
  },

  /**
   * Get all possible category matches with confidence scores
   * Useful for showing suggestions to users
   */
  getAllMatches(
    description: string,
    merchant: string | undefined,
    categories: Category[]
  ): CategoryMatch[] {
    const searchText = `${description} ${merchant || ''}`.toLowerCase()
    const matches: CategoryMatch[] = []

    for (const standardCat of STANDARD_CATEGORIES) {
      if (standardCat.name === 'Other') continue

      const matchedKeywords = standardCat.keywords.filter(keyword =>
        searchText.includes(keyword.toLowerCase())
      )

      if (matchedKeywords.length > 0) {
        const userCategory = categories.find(
          cat => cat.name.toLowerCase() === standardCat.name.toLowerCase()
        )

        if (userCategory) {
          matches.push({
            category: userCategory,
            confidence: matchedKeywords.length / standardCat.keywords.length,
            matchedKeywords,
          })
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence)
  },

  /**
   * Batch categorize multiple transactions
   */
  batchMatchCategories(
    transactions: Array<{ description: string; merchant?: string }>,
    categories: Category[]
  ): Array<Category | null> {
    return transactions.map(t =>
      this.matchCategory(t.description, t.merchant, categories)
    )
  },
}
