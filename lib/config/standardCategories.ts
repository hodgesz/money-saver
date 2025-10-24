// Standard category definitions based on common budget categories
// Similar to Monarch Money, credit card categorization systems

export interface StandardCategory {
  name: string
  color: string
  keywords: string[] // For smart categorization
  description?: string
}

export const STANDARD_CATEGORIES: StandardCategory[] = [
  {
    name: 'Housing',
    color: '#3B82F6', // Blue
    keywords: ['rent', 'mortgage', 'property', 'hoa', 'maintenance', 'repair', 'apartment', 'landlord'],
    description: 'Rent, mortgage, HOA fees, home maintenance',
  },
  {
    name: 'Bills & Utilities',
    color: '#8B5CF6', // Purple
    keywords: ['electric', 'gas', 'water', 'internet', 'phone', 'cable', 'utility', 'bill', 'subscription'],
    description: 'Electric, gas, water, internet, phone bills',
  },
  {
    name: 'Food & Dining',
    color: '#10B981', // Green
    keywords: ['restaurant', 'grocery', 'food', 'dining', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'market', 'supermarket', 'whole foods', 'safeway', 'kroger', 'trader joe'],
    description: 'Groceries, restaurants, dining out',
  },
  {
    name: 'Travel & Lifestyle',
    color: '#F59E0B', // Amber
    keywords: ['hotel', 'flight', 'airline', 'travel', 'vacation', 'airbnb', 'uber', 'lyft', 'taxi', 'entertainment', 'movie', 'concert', 'gym', 'fitness'],
    description: 'Travel, entertainment, recreation, fitness',
  },
  {
    name: 'Shopping',
    color: '#EC4899', // Pink
    keywords: ['amazon', 'target', 'walmart', 'clothing', 'shoes', 'retail', 'store', 'mall', 'electronics', 'purchase'],
    description: 'Retail shopping, online purchases, clothing',
  },
  {
    name: 'Children',
    color: '#06B6D4', // Cyan
    keywords: ['daycare', 'childcare', 'school supplies', 'toys', 'kids', 'children', 'baby', 'diaper'],
    description: 'Childcare, school supplies, toys, activities',
  },
  {
    name: 'Education',
    color: '#8B5CF6', // Violet
    keywords: ['tuition', 'school', 'college', 'university', 'course', 'textbook', 'student', 'education', 'learning'],
    description: 'Tuition, books, courses, educational expenses',
  },
  {
    name: 'Health & Wellness',
    color: '#EF4444', // Red
    keywords: ['doctor', 'hospital', 'pharmacy', 'medical', 'health', 'dental', 'vision', 'insurance', 'medication', 'prescription', 'clinic', 'cvs', 'walgreens'],
    description: 'Medical, dental, pharmacy, health insurance',
  },
  {
    name: 'Financial',
    color: '#059669', // Emerald
    keywords: ['bank', 'fee', 'interest', 'payment', 'loan', 'credit card', 'investment', 'transfer', 'atm'],
    description: 'Bank fees, loan payments, financial services',
  },
  {
    name: 'Auto & Transport',
    color: '#0EA5E9', // Sky blue
    keywords: ['gas', 'fuel', 'car', 'auto', 'vehicle', 'insurance', 'parking', 'toll', 'maintenance', 'oil change', 'dmv', 'registration'],
    description: 'Gas, car maintenance, parking, auto insurance',
  },
  {
    name: 'Business, Gifts & Donations',
    color: '#A855F7', // Purple
    keywords: ['gift', 'donation', 'charity', 'business', 'office', 'supplies', 'professional', 'consulting'],
    description: 'Business expenses, gifts, charitable donations',
  },
  {
    name: 'Other',
    color: '#6B7280', // Gray
    keywords: [], // Catch-all category
    description: 'Miscellaneous expenses',
  },
]

// Helper to get category by name
export function getStandardCategoryByName(name: string): StandardCategory | undefined {
  return STANDARD_CATEGORIES.find(cat => cat.name.toLowerCase() === name.toLowerCase())
}

// Helper to get all category names
export function getStandardCategoryNames(): string[] {
  return STANDARD_CATEGORIES.map(cat => cat.name)
}
