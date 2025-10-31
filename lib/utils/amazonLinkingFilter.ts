/**
 * Amazon Linking Filter Utility
 * Identifies Amazon marketplace transactions that can be linked to order items
 *
 * Linkable transactions:
 * - AMAZON MKTPL*CODE123
 * - Amazon.com*CODE123
 * - AMZN MKTP US*CODE123
 *
 * Non-linkable transactions:
 * - Amazon Grocery Subscri
 * - AMAZON PRIME*
 * - Amazon Music
 * - AWS
 * - Amazon (exact match - these are line items)
 */

/**
 * Check if an Amazon transaction is linkable to order items
 * @param merchant - Merchant name from transaction
 * @returns true if this is a marketplace transaction that can be linked
 */
export function isLinkableAmazonTransaction(merchant: string | null | undefined): boolean {
  if (!merchant || merchant.trim() === '') {
    return false
  }

  const normalizedMerchant = merchant.trim().toLowerCase()

  // Exact match "Amazon" = line item, not linkable
  if (normalizedMerchant === 'amazon') {
    return false
  }

  // Exclude subscriptions and services (not marketplace purchases)
  const nonLinkablePatterns = [
    'prime',           // Amazon Prime, Prime Video, etc.
    'grocery subscri', // Amazon Grocery Subscription
    'music',           // Amazon Music
    'digital',         // Amazon Digital Services
    'aws',             // Amazon Web Services
    'web services',    // Amazon Web Services
  ]

  for (const pattern of nonLinkablePatterns) {
    if (normalizedMerchant.includes(pattern)) {
      return false
    }
  }

  // Check if it's Amazon-related
  const isAmazon = normalizedMerchant.includes('amazon') ||
                   normalizedMerchant.includes('amzn')

  if (!isAmazon) {
    return false
  }

  // Marketplace transactions have format: AMAZON MKTPL*CODE or Amazon.com*CODE or AMZN MKTP*CODE
  // Must have asterisk followed by code
  const hasMarketplacePattern = normalizedMerchant.includes('mktpl') ||
                                normalizedMerchant.includes('mktp') ||
                                normalizedMerchant.includes('.com')

  const hasAsteriskAndCode = /\*[a-z0-9]/i.test(normalizedMerchant)

  return hasMarketplacePattern && hasAsteriskAndCode
}
