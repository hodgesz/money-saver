# Analytics Service Architecture

## Overview
This document defines the architecture for the analytics service, which provides spending insights, budget tracking, and trend analysis for the money-saver application.

## Service API Specification

### Core Service Interface

```typescript
// lib/services/analytics.ts

export interface AnalyticsService {
  // Monthly spending aggregation
  getMonthlySpending(userId: string, month: string): Promise<ServiceResponse<MonthlySpending>>

  // Category breakdown for a specific period
  getCategoryBreakdown(userId: string, startDate: string, endDate: string): Promise<ServiceResponse<CategoryBreakdown[]>>

  // Spending trends over time
  getSpendingTrends(userId: string, startDate: string, endDate: string, granularity?: 'daily' | 'weekly' | 'monthly'): Promise<ServiceResponse<SpendingTrend[]>>

  // Budget summary with actual vs planned
  getBudgetSummary(userId: string, month: string): Promise<ServiceResponse<BudgetSummary>>

  // Top spending categories
  getTopCategories(userId: string, startDate: string, endDate: string, limit?: number): Promise<ServiceResponse<TopCategory[]>>

  // Spending comparison across periods
  getSpendingComparison(userId: string, currentPeriod: DateRange, previousPeriod: DateRange): Promise<ServiceResponse<SpendingComparison>>
}
```

## Data Models and TypeScript Types

### Core Types

```typescript
// types/analytics.ts

export interface MonthlySpending {
  month: string // Format: 'YYYY-MM'
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
  averageTransactionAmount: number
  topCategory: {
    id: string
    name: string
    amount: number
  } | null
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  categoryColor?: string
  categoryIcon?: string
  totalAmount: number
  transactionCount: number
  percentage: number // Percentage of total spending
  averageAmount: number
  budgetAmount?: number // If budget exists for this category
  budgetPercentage?: number // Spending vs budget percentage
}

export interface SpendingTrend {
  date: string // Format: 'YYYY-MM-DD', 'YYYY-MM', or ISO week
  income: number
  expenses: number
  netBalance: number
  transactionCount: number
}

export interface BudgetSummary {
  month: string // Format: 'YYYY-MM'
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
  overallPercentage: number
  categories: BudgetCategoryStatus[]
  status: 'under' | 'at' | 'over'
}

export interface BudgetCategoryStatus {
  categoryId: string
  categoryName: string
  categoryColor?: string
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  percentage: number
  status: 'under' | 'at' | 'over'
  transactionCount: number
}

export interface TopCategory {
  categoryId: string
  categoryName: string
  categoryColor?: string
  categoryIcon?: string
  totalAmount: number
  transactionCount: number
  percentage: number
}

export interface SpendingComparison {
  current: {
    startDate: string
    endDate: string
    totalIncome: number
    totalExpenses: number
    netBalance: number
  }
  previous: {
    startDate: string
    endDate: string
    totalIncome: number
    totalExpenses: number
    netBalance: number
  }
  change: {
    incomeChange: number
    incomePercentage: number
    expensesChange: number
    expensesPercentage: number
    balanceChange: number
    balancePercentage: number
  }
}

export interface DateRange {
  startDate: string
  endDate: string
}

export interface ServiceResponse<T> {
  data: T | null
  error: any
}
```

## Database Query Strategies

### 1. Monthly Spending Query

```sql
-- Get monthly spending aggregation
SELECT
  DATE_TRUNC('month', date) as month,
  SUM(CASE WHEN is_income = true THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN is_income = false THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN is_income = true THEN amount ELSE -amount END) as net_balance,
  COUNT(*) as transaction_count,
  AVG(amount) as average_transaction_amount
FROM transactions
WHERE user_id = $1
  AND date >= $2
  AND date < $3
GROUP BY DATE_TRUNC('month', date);
```

**Optimization:**
- Uses existing index: `idx_transactions_user_date`
- Date truncation is efficient for monthly grouping
- Single pass aggregation

### 2. Category Breakdown Query

```sql
-- Get spending by category with budget info
SELECT
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  COALESCE(SUM(t.amount), 0) as total_amount,
  COUNT(t.id) as transaction_count,
  AVG(t.amount) as average_amount,
  b.amount as budget_amount
FROM categories c
LEFT JOIN transactions t ON c.id = t.category_id
  AND t.user_id = $1
  AND t.date >= $2
  AND t.date <= $3
  AND t.is_income = false
LEFT JOIN budgets b ON c.id = b.category_id
  AND b.user_id = $1
  AND b.start_date <= $3
  AND (b.end_date IS NULL OR b.end_date >= $2)
WHERE c.user_id IS NULL OR c.user_id = $1
GROUP BY c.id, c.name, c.color, c.icon, b.amount
HAVING COUNT(t.id) > 0
ORDER BY total_amount DESC;
```

**Optimization:**
- Uses indexes: `idx_transactions_category_id`, `idx_budgets_category_id`
- LEFT JOINs allow showing all categories even without transactions
- HAVING clause filters out empty categories
- Date range filtering in JOIN conditions

### 3. Spending Trends Query (Monthly)

```sql
-- Get monthly spending trends
SELECT
  DATE_TRUNC('month', date) as period,
  SUM(CASE WHEN is_income = true THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN is_income = false THEN amount ELSE 0 END) as expenses,
  SUM(CASE WHEN is_income = true THEN amount ELSE -amount END) as net_balance,
  COUNT(*) as transaction_count
FROM transactions
WHERE user_id = $1
  AND date >= $2
  AND date <= $3
GROUP BY DATE_TRUNC('month', date)
ORDER BY period;
```

**Optimization:**
- DATE_TRUNC for flexible granularity (can use 'day', 'week', or 'month')
- Single table scan with index support
- Ordered results for time series display

### 4. Budget Summary Query

```sql
-- Get budget summary with actual spending
SELECT
  b.id as budget_id,
  b.category_id,
  c.name as category_name,
  c.color as category_color,
  b.amount as budget_amount,
  b.start_date,
  b.end_date,
  COALESCE(SUM(t.amount), 0) as spent_amount,
  COUNT(t.id) as transaction_count
FROM budgets b
INNER JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t ON b.category_id = t.category_id
  AND t.user_id = $1
  AND t.is_income = false
  AND t.date >= b.start_date
  AND t.date <= COALESCE(b.end_date, $3)
WHERE b.user_id = $1
  AND b.start_date <= $3
  AND (b.end_date IS NULL OR b.end_date >= $2)
GROUP BY b.id, b.category_id, c.name, c.color, b.amount, b.start_date, b.end_date
ORDER BY spent_amount DESC;
```

**Optimization:**
- INNER JOIN ensures only budgets with categories are shown
- LEFT JOIN allows showing budgets with no spending
- Date filtering in JOIN conditions reduces rows processed
- Uses composite index: `idx_transactions_user_date`

### 5. Performance Considerations

**Indexes Required:**
- ✅ `idx_transactions_user_date` (already exists)
- ✅ `idx_transactions_category_id` (already exists)
- ✅ `idx_budgets_category_id` (already exists)
- ✅ `idx_budgets_user_id` (already exists)

**Query Limits:**
- Default limit: 50 results for list queries
- Top categories: Default limit 10
- Trends: Maximum 365 days (daily), 52 weeks (weekly), 24 months (monthly)

**Caching Strategy:**
- Monthly aggregations can be cached with 1-hour TTL
- Budget summaries should be real-time (no caching)
- Trends can be cached with 30-minute TTL
- Category breakdowns should be real-time for current period

## Component Hierarchy

### Page Level
```
app/analytics/page.tsx (Analytics Dashboard)
├── AnalyticsHeader (Title + Date Range Selector)
├── MonthlyOverview (Monthly spending cards)
├── CategoryBreakdownChart (Pie/Bar chart)
├── SpendingTrendsChart (Line chart)
├── BudgetSummaryPanel (Budget vs actual)
└── TopCategoriesList (List view)
```

### Component Structure

```
components/analytics/
├── AnalyticsHeader.tsx
│   └── DateRangeSelector.tsx (shared component)
│
├── MonthlyOverview.tsx
│   ├── StatCard.tsx (reusable stat display)
│   └── ComparisonBadge.tsx (% change indicator)
│
├── CategoryBreakdownChart.tsx
│   ├── PieChart.tsx (visualization)
│   └── LegendList.tsx (category legend)
│
├── SpendingTrendsChart.tsx
│   ├── LineChart.tsx (time series visualization)
│   └── TrendTooltip.tsx (hover details)
│
├── BudgetSummaryPanel.tsx
│   ├── BudgetProgressBar.tsx (visual progress)
│   └── BudgetCategoryItem.tsx (individual budget)
│
└── TopCategoriesList.tsx
    └── CategoryListItem.tsx (category row)
```

### Shared Components (Reused)
```
components/ui/
├── Card.tsx ✅ (already exists)
├── Badge.tsx ✅ (already exists)
├── Button.tsx ✅ (already exists)
├── ProgressBar.tsx ✅ (already exists)
└── DatePicker.tsx (new - date range selection)
```

## Data Flow

### 1. Page Load Flow
```
AnalyticsPage
  ↓ (fetch on mount)
analyticsService.getMonthlySpending()
analyticsService.getCategoryBreakdown()
analyticsService.getSpendingTrends()
analyticsService.getBudgetSummary()
  ↓ (parallel queries)
Supabase → PostgreSQL
  ↓ (return data)
React State (useState/useEffect)
  ↓ (render)
Charts and Components
```

### 2. Date Range Change Flow
```
DateRangeSelector
  ↓ (onChange event)
Parent Component State Update
  ↓ (trigger re-fetch)
analyticsService methods with new date range
  ↓ (update data)
Charts re-render with new data
```

### 3. Error Handling Flow
```
Service Call
  ↓ (if error)
Error Object in ServiceResponse
  ↓ (check in component)
Display ErrorBoundary or inline error message
  ↓ (retry option)
User can manually refresh data
```

## Utilities and Helpers

### Date Utilities
```typescript
// lib/utils/dateHelpers.ts

export const dateHelpers = {
  // Get start and end of month
  getMonthRange(month: string): DateRange

  // Get previous period for comparison
  getPreviousPeriod(dateRange: DateRange): DateRange

  // Format dates for display
  formatMonthYear(date: string): string

  // Get date range for trends
  getTrendDateRange(months: number): DateRange

  // Check if date is within range
  isDateInRange(date: string, range: DateRange): boolean
}
```

### Currency Formatting
```typescript
// lib/utils/currencyHelpers.ts

export const currencyHelpers = {
  // Format amount as currency
  formatCurrency(amount: number, currency?: string): string

  // Parse currency string to number
  parseCurrency(value: string): number

  // Format with abbreviations (1K, 1M)
  formatCurrencyCompact(amount: number): string
}
```

### Percentage Calculations
```typescript
// lib/utils/percentageHelpers.ts

export const percentageHelpers = {
  // Calculate percentage of total
  calculatePercentage(amount: number, total: number): number

  // Calculate change percentage
  calculateChangePercentage(current: number, previous: number): number

  // Format percentage for display
  formatPercentage(value: number, decimals?: number): string
}
```

### Chart Data Transformers
```typescript
// lib/utils/chartHelpers.ts

export const chartHelpers = {
  // Transform category breakdown for pie chart
  transformCategoryDataForPieChart(data: CategoryBreakdown[]): PieChartData[]

  // Transform trends for line chart
  transformTrendsForLineChart(data: SpendingTrend[]): LineChartData

  // Get chart color palette
  getChartColors(count: number): string[]
}
```

## API Response Examples

### Monthly Spending Response
```json
{
  "data": {
    "month": "2025-10",
    "totalIncome": 5000.00,
    "totalExpenses": 3250.75,
    "netBalance": 1749.25,
    "transactionCount": 42,
    "averageTransactionAmount": 77.40,
    "topCategory": {
      "id": "uuid",
      "name": "Groceries",
      "amount": 650.25
    }
  },
  "error": null
}
```

### Category Breakdown Response
```json
{
  "data": [
    {
      "categoryId": "uuid-1",
      "categoryName": "Groceries",
      "categoryColor": "#10b981",
      "categoryIcon": "shopping-cart",
      "totalAmount": 650.25,
      "transactionCount": 12,
      "percentage": 20.0,
      "averageAmount": 54.19,
      "budgetAmount": 800.00,
      "budgetPercentage": 81.3
    }
  ],
  "error": null
}
```

## Testing Strategy

### Unit Tests
- Test each service method independently
- Mock Supabase client responses
- Test error handling
- Test edge cases (empty data, null values)

### Integration Tests
- Test service methods with real Supabase queries
- Test data transformations
- Test date range calculations

### Component Tests
- Test chart rendering with mock data
- Test date range selector interactions
- Test error state rendering
- Test loading states

## Performance Metrics

### Target Performance
- Page load: < 2 seconds
- Date range change: < 500ms
- Chart rendering: < 100ms

### Query Performance
- Monthly spending: < 200ms
- Category breakdown: < 300ms
- Spending trends: < 400ms
- Budget summary: < 500ms

### Optimization Techniques
- Parallel query execution
- Data caching (client-side)
- Lazy loading for charts
- Pagination for large datasets
- SQL query optimization with proper indexes
