# Category Management

## Standard Categories

This app uses a predefined set of standard categories similar to credit card companies and budgeting tools like Monarch Money. This prevents category explosion and makes budgeting more manageable.

### Available Categories

1. **Housing** - Rent, mortgage, HOA fees, home maintenance
2. **Bills & Utilities** - Electric, gas, water, internet, phone bills
3. **Food & Dining** - Groceries, restaurants, dining out
4. **Travel & Lifestyle** - Travel, entertainment, recreation, fitness
5. **Shopping** - Retail shopping, online purchases, clothing
6. **Children** - Childcare, school supplies, toys, activities
7. **Education** - Tuition, books, courses, educational expenses
8. **Health & Wellness** - Medical, dental, pharmacy, health insurance
9. **Financial** - Bank fees, loan payments, financial services
10. **Auto & Transport** - Gas, car maintenance, parking, auto insurance
11. **Business, Gifts & Donations** - Business expenses, gifts, charitable donations
12. **Other** - Miscellaneous expenses

## Initial Setup

### Seeding Categories

Before importing transactions, you need to populate your account with the standard categories:

```bash
# Make sure you have the required environment variables set in .env.local:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

npm run seed:categories
```

This will:
- Check if you already have categories (won't duplicate)
- Create all 12 standard categories for your account
- Assign appropriate colors to each category

**Note:** You only need to run this once per user account.

## Smart Categorization

### How It Works

When you import transactions, the app uses intelligent keyword matching to automatically assign categories:

- **Keyword Matching**: The system looks for specific keywords in the merchant name and description
- **Confidence Scoring**: Transactions are matched to the most likely category
- **Fallback to "Other"**: If no good match is found, transactions go to the "Other" category

### Examples

| Merchant/Description | Matched Category |
|---------------------|------------------|
| Whole Foods, Safeway, Grocery | Food & Dining |
| Amazon, Target, Walmart | Shopping |
| Shell, Chevron, Gas Station | Auto & Transport |
| CVS Pharmacy, Walgreens | Health & Wellness |
| Electric Company, Internet Bill | Bills & Utilities |
| Rent Payment, Mortgage | Housing |

### Keyword Lists

Categories are matched based on keywords defined in `lib/config/standardCategories.ts`:

- **Food & Dining**: restaurant, grocery, food, cafe, coffee, market, supermarket
- **Shopping**: amazon, target, walmart, clothing, electronics
- **Auto & Transport**: gas, fuel, car, vehicle, parking, toll, maintenance
- **Health & Wellness**: doctor, hospital, pharmacy, medical, dental, cvs, walgreens
- And more...

## Manual Category Assignment

You can always manually change a transaction's category:

1. Go to the Transactions page
2. Click "Edit" on any transaction
3. Select the correct category from the dropdown
4. Save your changes

## Customization

If you want to modify the standard categories or keywords:

1. Edit `lib/config/standardCategories.ts`
2. Update the keywords array for any category
3. Run `npm run seed:categories` again (for new users)
4. Existing transactions won't be re-categorized automatically

## Technical Details

### Files

- **Configuration**: `lib/config/standardCategories.ts`
- **Mapping Service**: `lib/services/categoryMapping.ts`
- **Seed Script**: `scripts/seedCategories.ts`

### Database Schema

Categories are stored per-user with Row Level Security (RLS):

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Smart Categorization Algorithm

1. Parse transaction merchant and description
2. Search for keyword matches in each category
3. Calculate confidence score (matched keywords / total keywords)
4. Return category with highest confidence
5. Fallback to "Other" if no match found
