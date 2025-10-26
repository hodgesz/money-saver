# Phase 2.3 - Advanced Analytics Dashboard

## Overview

Phase 2.3 introduces advanced financial analytics features to the Money Saver dashboard, providing users with deeper insights into their spending patterns, trends, and savings behavior.

## Features Implemented

### 1. Year-over-Year Spending Comparison
**Component**: `ComparisonCard` (type: "year-over-year")
**Service Method**: `analyticsService.getYearOverYearComparison(year, month)`

Compares current month's spending with the same month from the previous year.

**Key Metrics**:
- Percentage change in spending
- Current period total expenses
- Previous period total expenses
- Transaction count comparison
- Visual trend indicator (↑ increasing, ↓ decreasing, → stable)

**Color Coding**:
- 🔴 Red: Spending increased (bad trend)
- 🟢 Green: Spending decreased (good trend)
- ⚪ Gray: Spending remained stable

**Example Use Case**: "How does my March 2024 spending compare to March 2023?"

### 2. Month-over-Month Spending Comparison
**Component**: `ComparisonCard` (type: "month-over-month")
**Service Method**: `analyticsService.getMonthOverMonthComparison(year, month)`

Compares current month's spending with the previous month.

**Key Metrics**:
- Percentage change in spending
- Current period total expenses
- Previous period total expenses
- Transaction count comparison
- Visual trend indicator

**Special Handling**:
- Correctly handles year boundaries (January compares to December of previous year)

**Color Coding**: Same as Year-over-Year

**Example Use Case**: "Am I spending more this month than last month?"

### 3. Savings Rate Calculator
**Component**: `SavingsRateCard`
**Service Method**: `analyticsService.getSavingsRate(startDate, endDate)`

Calculates the savings rate over a specified date range (default: last 6 months).

**Formula**:
```
Savings Rate = (Net Savings / Total Income) × 100
Net Savings = Total Income - Total Expenses
```

**Key Metrics**:
- Savings rate percentage
- Total income
- Total expenses
- Net savings (positive or negative)

**Color Coding**:
- 🟢 Green: Positive savings (saving money)
- 🔴 Red: Negative savings (spending more than earning)
- ⚪ Gray: Breaking even (0% savings rate)

**Contextual Messages**:
- `> 50%`: "Excellent savings! You're saving over half your income ✨"
- `20-50%`: "Good savings rate! Keep up the momentum 💪"
- `0-20%`: "You're saving, but there's room for improvement 📊"
- `0%`: "Breaking even - consider reducing expenses or increasing income"
- `< 0%`: "⚠️ Spending more than earning - time to review your budget"

## Dashboard Integration

The new components are integrated into the main dashboard at `/dashboard` in a dedicated "Advanced Analytics" row:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <ComparisonCard type="year-over-year" year={2024} month={11} />
  <ComparisonCard type="month-over-month" year={2024} month={11} />
  <SavingsRateCard startDate="2024-06-01" endDate="2024-11-30" />
</div>
```

### Dashboard Layout (Top to Bottom):
1. **Overview Row**: Spending Overview + Budget Status Grid (2 columns)
2. **Charts Row**: Category Chart + Trends Chart (2 columns)
3. **Advanced Analytics Row**: YoY Comparison + MoM Comparison + Savings Rate (3 columns) ⭐ NEW
4. **Transactions Row**: Recent Transactions List (full width)

## Technical Implementation

### Service Layer (`lib/services/analytics.ts`)

Three new methods added to `analyticsService`:

```typescript
// Year-over-Year Comparison
async getYearOverYearComparison(
  year: number,
  month: number
): Promise<{ data: YearOverYearComparison | null; error: any }>

// Month-over-Month Comparison
async getMonthOverMonthComparison(
  year: number,
  month: number
): Promise<{ data: MonthOverMonthComparison | null; error: any }>

// Savings Rate Calculator
async getSavingsRate(
  startDate: string,
  endDate: string
): Promise<{ data: SavingsRate | null; error: any }>
```

### Type Definitions

```typescript
interface YearOverYearComparison {
  current: MonthlySpending
  previous: MonthlySpending
  percentChange: number
  trend: 'increasing' | 'decreasing' | 'stable' | 'no-data'
}

interface MonthOverMonthComparison {
  current: MonthlySpending
  previous: MonthlySpending
  percentChange: number
  trend: 'increasing' | 'decreasing' | 'stable' | 'no-data'
}

interface SavingsRate {
  savingsRate: number
  totalIncome: number
  totalExpenses: number
  netSavings: number
}
```

### Components

**ComparisonCard** (`components/features/ComparisonCard.tsx`):
- Dual-mode component (YoY and MoM)
- Responsive grid layout
- Color-coded trend indicators
- Handles loading, error, and empty states
- Auto-refetches on prop changes

**SavingsRateCard** (`components/features/SavingsRateCard.tsx`):
- 3-column financial summary (Income, Expenses, Net Savings)
- Large savings rate display with icon
- Contextual advice messages
- Color-coded based on savings performance
- Handles loading, error, and empty states

## Test Coverage

### Service Layer Tests
**File**: `lib/services/__tests__/analytics-comparisons.test.ts`
**Test Cases**: 12 tests
- Year-over-Year: 4 tests (increasing/decreasing/stable/no-data trends)
- Month-over-Month: 4 tests (including year boundary handling)
- Savings Rate: 4 tests (positive/negative/zero/100% scenarios)

### Component Tests
**ComparisonCard Tests**: `components/features/__tests__/ComparisonCard.test.tsx`
**Test Cases**: 12 tests
- Loading states
- YoY and MoM comparisons
- All trend types (increasing/decreasing/stable/no-data)
- Error handling
- Data refetching on prop changes
- Year boundary handling

**SavingsRateCard Tests**: `components/features/__tests__/SavingsRateCard.test.tsx`
**Test Cases**: 13 tests
- Loading states
- Positive/negative/zero savings rates
- Edge cases (no income, no expenses, 100% savings)
- Color coding validation
- Currency formatting
- Error handling
- Data refetching

**Total Test Coverage**: 37 tests ✅

## Usage Examples

### Viewing Advanced Analytics

1. Navigate to `/dashboard` while logged in
2. Scroll to the "Advanced Analytics" section (third row)
3. View three cards side-by-side (or stacked on mobile):
   - Left: Year-over-Year comparison
   - Middle: Month-over-Month comparison
   - Right: Savings Rate (last 6 months)

### Understanding the Data

**Positive Trends** (Good for your budget):
- Green ↓ arrow on comparison cards = Spending decreased
- Green savings rate = Saving money

**Negative Trends** (Warning signs):
- Red ↑ arrow on comparison cards = Spending increased
- Red savings rate = Spending more than earning

**Stable Trends**:
- Gray → arrow = No significant change in spending
- 0% savings rate = Breaking even

## Edge Cases Handled

1. **No Previous Year Data**: Shows "No previous year data available for comparison" message
2. **Year Boundary**: January correctly compares to December of previous year
3. **No Income**: Savings rate defaults to 0%
4. **No Expenses**: Savings rate shows 100%
5. **Negative Savings**: Displays with red styling and warning message
6. **Large Amounts**: Properly formats with commas (e.g., $100,000.00)
7. **Zero Transactions**: Handles gracefully with "No data available" message

## Database Requirements

All features use existing `transactions` table with columns:
- `id` (uuid)
- `user_id` (uuid, references auth.users)
- `amount` (numeric)
- `is_income` (boolean)
- `date` (date)
- `category` (text)
- `description` (text)
- `created_at` (timestamptz)

**No database migrations required** - Phase 2.3 works with existing schema.

## Performance Considerations

- Each card makes independent API calls to Supabase
- Data is cached in component state until date range changes
- Date calculations use `useMemo` to prevent unnecessary recalculations
- Responsive design ensures fast rendering on all devices

## Future Enhancements (Not in Phase 2.3)

1. **Custom Date Range Selector**: Allow users to select custom date ranges for all cards
2. **Export to CSV**: Download analytics data for external analysis
3. **Goal Setting**: Set savings rate targets and track progress
4. **Category Breakdown**: Show which categories contribute most to savings/spending
5. **Forecasting**: Predict future savings based on historical trends
6. **Alert Thresholds**: Notify users when spending exceeds historical averages by X%

## Migration Notes

### For Existing Users
- No action required - features are automatically available
- Existing transaction data will be used for calculations
- New users will see "No data available" until transactions are imported

### For Developers
- Import new components: `import { ComparisonCard, SavingsRateCard } from '@/components/features'`
- Use service methods: `analyticsService.getYearOverYearComparison()`, etc.
- All new code follows existing patterns from Phase 2.2 components

## Testing Checklist

- [ ] Dashboard loads without errors at http://localhost:3000/dashboard
- [ ] All three analytics cards are visible in the third row
- [ ] Year-over-Year card shows current month vs last year
- [ ] Month-over-Month card shows current month vs previous month
- [ ] Savings Rate card shows last 6 months data
- [ ] Colors match trend direction (red for bad, green for good)
- [ ] Currency amounts are formatted correctly with commas and decimals
- [ ] Loading states appear briefly during data fetch
- [ ] Error states display if backend fails
- [ ] Empty states display if no transaction data exists
- [ ] Cards are responsive on mobile devices (stack vertically)
- [ ] All 37 tests pass: `npm test analytics-comparisons.test.ts ComparisonCard.test.tsx SavingsRateCard.test.tsx`

## Support

If you encounter issues with Phase 2.3 features:
1. Check browser console for errors
2. Verify you have transaction data in the database
3. Ensure you're logged in with a valid user account
4. Run tests to verify implementation: `npm test`
5. Check Supabase connection and RLS policies

## Related Documentation

- Phase 2.1: Transaction Import System
- Phase 2.2: Alerts and Notifications System
- Analytics Service: `lib/services/analytics.ts`
- Dashboard Components: `components/features/`
