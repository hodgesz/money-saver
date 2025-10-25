/**
 * Merchant Category Matcher
 * Maps merchant names to Money Saver categories based on common patterns
 */

export interface MerchantPattern {
  keywords: string[]
  category: string
}

// Merchant patterns organized by Money Saver categories
const MERCHANT_PATTERNS: MerchantPattern[] = [
  // Dining (Food & Drink)
  {
    keywords: ['starbucks', 'mcdonalds', 'burger king', 'taco bell', 'chipotle', 'subway', 'dunkin', 'panera', 'chick-fil-a', 'wendys', 'dominos', 'pizza hut', 'papa johns', 'kfc', 'arbys', 'sonic', 'dairy queen', 'five guys', 'in-n-out', 'shake shack', 'doordash', 'dd *', 'grubhub', 'uber eats', 'postmates', 'restaurant', 'cafe', 'coffee', 'diner', 'grill', 'bar & grill', 'bar and grill', 'bistro', 'eatery', 'culvers', 'baja', 'empanadas', 'tst*', 'snooze', 'brewery', 'liquor', 'food cart', 'pour la france', 'kucu tequila', 'goat and clover', 'melodys food', 'noodles', 'sushi', 'ramen', 'birdcall', 'upslope brewery', 'locals liquors', 'pappadeaux'],
    category: 'Dining',
  },

  // Groceries
  {
    keywords: ['whole foods', 'trader joes', 'safeway', 'kroger', 'publix', 'albertsons', 'food lion', 'wegmans', 'heb', 'aldi', 'lidl', 'sprouts', 'fresh market', 'king soopers', 'market', 'grocery', 'supermarket', 'food store', 'jets pizza', 'amazon grocery', 'instacart', 'renuebyscience'],
    category: 'Groceries',
  },

  // Transportation (Travel + Gas)
  {
    keywords: ['shell', 'exxon', 'mobil', 'chevron', 'bp', 'texaco', 'sunoco', 'citgo', 'arco', '76', 'conoco', 'valero', 'marathon', 'speedway', 'wawa', '7-eleven gas', 'circle k', 'stinker', 'golden gate', 'uber', 'lyft', 'taxi', 'parking', 'laz parking', 'toll', 'e 470', 'express toll', 'metro', 'transit', 'bus', 'train', 'subway', 'ua inflt', 'hotel', 'doubletree', 'marriott', 'courtyard', 'hilton', 'hyatt', 'sheraton', 'holiday inn', 'best western', 'motel', 'inn', 'airbnb', 'rental car', 'hertz', 'enterprise', 'avis', 'budget'],
    category: 'Transportation',
  },

  // Shopping
  {
    keywords: ['amazon', 'walmart', 'target', 'costco', 'sams club', 'best buy', 'home depot', 'lowes', 'macys', 'nordstrom', 'kohls', 'jcpenney', 'tj maxx', 'marshalls', 'ross', 'old navy', 'gap', 'banana republic', 'h&m', 'zara', 'forever 21', 'ikea', 'bed bath', 'container store', 'office depot', 'staples', 'amzn', 'ebay', 'etsy', 'five below', 'patina antiques', 'goodwill', 'crossroads', 'ruelala', 'halara', 'petsmart', 'petco', 'pura.com', 'whoop', 'samsung electronics', 'apple store', 'the genie company', 'keyp inc'],
    category: 'Shopping',
  },

  // Entertainment
  {
    keywords: ['netflix', 'hulu', 'disney+', 'disney plus', 'hbo', 'prime video', 'spotify', 'apple music', 'youtube premium', 'pandora', 'theater', 'cinema', 'movie', 'amc', 'regal', 'cinemark', 'gym', 'fitness', 'planet fitness', '24 hour fitness', 'la fitness', 'lifetime fitness', 'ymca', 'siq elite', 'google one', 'flosports', 'novelflow', 'minecraft', 'nyx*dialed games', 'legends concessions'],
    category: 'Entertainment',
  },

  // Utilities (Bills & Utilities + Software)
  {
    keywords: ['electric', 'power', 'gas company', 'water', 'sewer', 'internet', 'cable', 'phone', 'wireless', 'verizon', 'att', 'at&t', 't-mobile', 'sprint', 'comcast', 'xfinity', 'spectrum', 'cox', 'centurylink', 'frontier', 'slack', 'microsoft', 'adobe', 'zoom', 'cursor', 'openai', 'chatgpt', 'github', 'dropbox', 'icloud', 'audible', 'siriusxm', 'sirius', 'denver post', 'city of', 'utility'],
    category: 'Utilities',
  },

  // Healthcare (Health & Wellness + Personal)
  {
    keywords: ['pharmacy', 'cvs', 'walgreens', 'rite aid', 'doctor', 'dental', 'dentist', 'medical', 'hospital', 'clinic', 'health', 'urgent care', 'lab', 'optometry', 'vision', 'kaiser', 'aetna', 'blue cross', 'cigna', 'betterme', 'wellness', 'spa', 'salon', 'massage', 'haircut', 'barber', 'nail', 'tanning', 'palm beach tan', 'm&m salon', 'sq *', 'chco', 'emergency', 'emerg dep'],
    category: 'Healthcare',
  },

  // Other (Education + Professional Services + Fees + Payments)
  {
    keywords: ['university', 'college', 'school', 'tuition', 'wgu', 'western governors', 'testsmarter', 'course', 'udemy', 'coursera', 'lawyer', 'attorney', 'accountant', 'cpa', 'tax', 'legal', 'notary', 'ups store', 'fedex', 'usps', 'shipping', 'postage', 'transaction fee', 'service fee', 'convenience fee', 'late fee', 'overdraft', 'atm fee', 'annual fee', 'finance charge', 'interest charge', 'nbs-wgu', 'arapahoe county', 'venmo', 'paypal', 'ny times', 'nytimes', 'greenbox', 'storage', 'oneusefulthing', 'heifer intl', 'donation', 'charity', 'gift', 'colorado united', 'travelers', 'insurance', 'ins', 'cachet cleaners', 'jazz car wash', 'cleaners', 'car wash', 'detail', 'automotive', 'payment thank you', 'automatic payment', 'payment - thank', 'credit card payment', 'online payment'],
    category: 'Other',
  },
]

/**
 * Match a merchant name to a category
 * Returns the category name or null if no match found
 */
export function matchMerchantToCategory(merchant: string): string | null {
  if (!merchant || merchant.trim().length === 0) {
    return null
  }

  // Normalize merchant name for matching
  const normalizedMerchant = merchant.toLowerCase().trim()

  // Check each pattern
  for (const pattern of MERCHANT_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalizedMerchant.includes(keyword.toLowerCase())) {
        return pattern.category
      }
    }
  }

  return null
}

/**
 * Get category name from description or merchant
 * Tries both fields to maximize matching success
 */
export function getCategoryFromTransaction(
  merchant: string,
  description?: string
): string | null {
  // Try merchant first
  const merchantMatch = matchMerchantToCategory(merchant)
  if (merchantMatch) {
    return merchantMatch
  }

  // Try description as fallback
  if (description) {
    const descriptionMatch = matchMerchantToCategory(description)
    if (descriptionMatch) {
      return descriptionMatch
    }
  }

  return null
}
