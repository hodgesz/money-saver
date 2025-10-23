# Analytics Service - Quick Reference Guide

## Service API Methods

| Method | Parameters | Return Type | Description |
|--------|-----------|-------------|-------------|
| `getMonthlySpending` | `userId: string, month: string` | `Promise<ServiceResponse<MonthlySpending>>` | Monthly income, expenses, and balance |
| `getCategoryBreakdown` | `userId: string, startDate: string, endDate: string` | `Promise<ServiceResponse<CategoryBreakdown[]>>` | Spending by category with budget info |
| `getSpendingTrends` | `userId: string, startDate: string, endDate: string, granularity?: 'daily' \| 'weekly' \| 'monthly'` | `Promise<ServiceResponse<SpendingTrend[]>>` | Time series spending data |
| `getBudgetSummary` | `userId: string, month: string` | `Promise<ServiceResponse<BudgetSummary>>` | Budget vs actual spending |
| `getTopCategories` | `userId: string, startDate: string, endDate: string, limit?: number` | `Promise<ServiceResponse<TopCategory[]>>` | Top spending categories ranked |
| `getSpendingComparison` | `userId: string, currentPeriod: DateRange, previousPeriod: DateRange` | `Promise<ServiceResponse<SpendingComparison>>` | Period-over-period comparison |

## Key Data Types

### MonthlySpending
```typescript
{
  month: string           // 'YYYY-MM'
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
  averageTransactionAmount: number
  topCategory: { id, name, amount } | null
}
```

### CategoryBreakdown
```typescript
{
  categoryId: string
  categoryName: string
  categoryColor?: string
  categoryIcon?: string
  totalAmount: number
  transactionCount: number
  percentage: number          // % of total spending
  averageAmount: number
  budgetAmount?: number
  budgetPercentage?: number   // % of budget used
}
```

### SpendingTrend
```typescript
{
  date: string               // Format varies by granularity
  income: number
  expenses: number
  netBalance: number
  transactionCount: number
}
```

### BudgetSummary
```typescript
{
  month: string              // 'YYYY-MM'
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
  overallPercentage: number
  categories: BudgetCategoryStatus[]
  status: 'under' | 'at' | 'over'
}
```

## Database Queries

### Monthly Spending Query
```sql
SELECT
  DATE_TRUNC('month', date) as month,
  SUM(CASE WHEN is_income = true THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN is_income = false THEN amount ELSE 0 END) as total_expenses,
  COUNT(*) as transaction_count
FROM transactions
WHERE user_id = $1 AND date >= $2 AND date < $3
GROUP BY DATE_TRUNC('month', date);
```

### Category Breakdown Query
```sql
SELECT
  c.id, c.name, c.color, c.icon,
  COALESCE(SUM(t.amount), 0) as total_amount,
  COUNT(t.id) as transaction_count,
  b.amount as budget_amount
FROM categories c
LEFT JOIN transactions t ON c.id = t.category_id
  AND t.user_id = $1 AND t.date >= $2 AND t.date <= $3 AND t.is_income = false
LEFT JOIN budgets b ON c.id = b.category_id AND b.user_id = $1
WHERE c.user_id IS NULL OR c.user_id = $1
GROUP BY c.id, c.name, c.color, c.icon, b.amount
HAVING COUNT(t.id) > 0
ORDER BY total_amount DESC;
```

### Spending Trends Query
```sql
SELECT
  DATE_TRUNC('month', date) as period,
  SUM(CASE WHEN is_income = true THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN is_income = false THEN amount ELSE 0 END) as expenses,
  COUNT(*) as transaction_count
FROM transactions
WHERE user_id = $1 AND date >= $2 AND date <= $3
GROUP BY DATE_TRUNC('month', date)
ORDER BY period;
```

### Budget Summary Query
```sql
SELECT
  b.id, b.category_id, c.name, c.color,
  b.amount as budget_amount,
  COALESCE(SUM(t.amount), 0) as spent_amount,
  COUNT(t.id) as transaction_count
FROM budgets b
INNER JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t ON b.category_id = t.category_id
  AND t.user_id = $1 AND t.is_income = false
  AND t.date >= b.start_date AND t.date <= COALESCE(b.end_date, $3)
WHERE b.user_id = $1 AND b.start_date <= $3
GROUP BY b.id, b.category_id, c.name, c.color, b.amount
ORDER BY spent_amount DESC;
```

## Component Structure

### Page Component
```typescript
// app/analytics/page.tsx
export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>()
  const [data, setData] = useState<AnalyticsData>()

  useEffect(() => {
    // Parallel fetch all analytics data
    Promise.all([
      analyticsService.getMonthlySpending(...),
      analyticsService.getCategoryBreakdown(...),
      analyticsService.getSpendingTrends(...),
      analyticsService.getBudgetSummary(...)
    ])
  }, [dateRange])

  return (
    <>
      <AnalyticsHeader dateRange={dateRange} onChange={setDateRange} />
      <MonthlyOverview data={data.monthly} />
      <CategoryBreakdownChart data={data.categories} />
      <SpendingTrendsChart data={data.trends} />
      <BudgetSummaryPanel data={data.budget} />
      <TopCategoriesList data={data.topCategories} />
    </>
  )
}
```

### Analytics Components

| Component | Purpose | Props | Children |
|-----------|---------|-------|----------|
| `AnalyticsHeader` | Page title & date selector | `dateRange, onDateRangeChange` | `DateRangeSelector` |
| `MonthlyOverview` | Monthly stats cards | `data: MonthlySpending` | `StatCard`, `ComparisonBadge` |
| `CategoryBreakdownChart` | Category spending visualization | `data: CategoryBreakdown[]` | `PieChart`, `LegendList` |
| `SpendingTrendsChart` | Time series chart | `data: SpendingTrend[]` | `LineChart`, `TrendTooltip` |
| `BudgetSummaryPanel` | Budget tracking | `data: BudgetSummary` | `BudgetProgressBar`, `BudgetCategoryItem` |
| `TopCategoriesList` | Top categories list | `data: TopCategory[]` | `CategoryListItem` |

## Helper Utilities

### Date Helpers
```typescript
import { dateHelpers } from '@/lib/utils/dateHelpers'

// Get month range
const range = dateHelpers.getMonthRange('2025-10')
// Returns: { startDate: '2025-10-01', endDate: '2025-10-31' }

// Get previous period
const previous = dateHelpers.getPreviousPeriod(range)
// Returns: { startDate: '2025-09-01', endDate: '2025-09-30' }

// Format for display
const display = dateHelpers.formatMonthYear('2025-10-15')
// Returns: "October 2025"
```

### Currency Helpers
```typescript
import { currencyHelpers } from '@/lib/utils/currencyHelpers'

// Format currency
const formatted = currencyHelpers.formatCurrency(1234.56)
// Returns: "$1,234.56"

// Compact format
const compact = currencyHelpers.formatCurrencyCompact(1500000)
// Returns: "$1.5M"
```

### Percentage Helpers
```typescript
import { percentageHelpers } from '@/lib/utils/percentageHelpers'

// Calculate percentage
const pct = percentageHelpers.calculatePercentage(750, 1000)
// Returns: 75

// Calculate change
const change = percentageHelpers.calculateChangePercentage(850, 750)
// Returns: 13.33

// Format for display
const display = percentageHelpers.formatPercentage(75.5, 1)
// Returns: "75.5%"
```

### Chart Helpers
```typescript
import { chartHelpers } from '@/lib/utils/chartHelpers'

// Transform for pie chart
const pieData = chartHelpers.transformCategoryDataForPieChart(categories)

// Transform for line chart
const lineData = chartHelpers.transformTrendsForLineChart(trends)

// Get color palette
const colors = chartHelpers.getChartColors(10)
// Returns: ['#10b981', '#3b82f6', '#8b5cf6', ...]
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Page Load | < 2s | Initial dashboard load |
| Date Range Change | < 500ms | Re-fetch and re-render |
| Chart Rendering | < 100ms | Per chart component |
| Monthly Spending Query | < 200ms | Single month aggregation |
| Category Breakdown Query | < 300ms | With budget joins |
| Spending Trends Query | < 400ms | Time series data |
| Budget Summary Query | < 500ms | Complex joins and aggregations |

## Optimization Techniques

### Database Level
- ✅ Use existing indexes: `idx_transactions_user_date`, `idx_transactions_category_id`
- ✅ Limit result sets: 50 (lists), 10 (top categories), 365 days max
- ✅ Single-pass aggregations with `DATE_TRUNC`
- ✅ Efficient `LEFT JOIN` for optional data

### Service Level
- ✅ Parallel query execution: `Promise.all()`
- ✅ Data transformation in memory
- ✅ Client-side caching with TTL
  - Monthly: 1 hour
  - Trends: 30 minutes
  - Budgets: Real-time (no cache)

### Component Level
- ✅ React.memo for expensive components
- ✅ useMemo for computed values
- ✅ useCallback for event handlers
- ✅ Lazy loading for chart libraries

## Error Handling

### Service Layer
```typescript
try {
  const { data, error } = await supabase.from('transactions')...
  if (error) return { data: null, error }
  return { data: transformedData, error: null }
} catch (error) {
  console.error('Analytics service error:', error)
  return { data: null, error }
}
```

### Component Layer
```typescript
const { data, error } = await analyticsService.getMonthlySpending(...)

if (error) {
  setError(error)
  return <ErrorMessage error={error} onRetry={fetchData} />
}

if (!data) {
  return <EmptyState message="No data available" />
}

return <DataVisualization data={data} />
```

## Testing Strategy

### Unit Tests (Jest)
```typescript
describe('analyticsService', () => {
  it('should fetch monthly spending', async () => {
    const { data, error } = await analyticsService.getMonthlySpending(userId, '2025-10')
    expect(error).toBeNull()
    expect(data).toHaveProperty('totalIncome')
    expect(data).toHaveProperty('totalExpenses')
  })
})
```

### Integration Tests
```typescript
describe('analyticsService integration', () => {
  it('should fetch and transform category breakdown', async () => {
    const { data } = await analyticsService.getCategoryBreakdown(
      userId, '2025-10-01', '2025-10-31'
    )
    expect(data).toBeArray()
    expect(data[0]).toHaveProperty('percentage')
  })
})
```

### Component Tests (React Testing Library)
```typescript
describe('MonthlyOverview', () => {
  it('should render monthly stats', () => {
    render(<MonthlyOverview data={mockMonthlySpending} />)
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
  })
})
```

## Implementation Checklist

### Phase 1: Service Layer
- [ ] Create `lib/services/analytics.ts`
- [ ] Implement `getMonthlySpending()`
- [ ] Implement `getCategoryBreakdown()`
- [ ] Implement `getSpendingTrends()`
- [ ] Implement `getBudgetSummary()`
- [ ] Implement `getTopCategories()`
- [ ] Implement `getSpendingComparison()`
- [ ] Add service layer tests

### Phase 2: Type Definitions
- [ ] Create `types/analytics.ts`
- [ ] Define all data models
- [ ] Export types for components
- [ ] Add JSDoc comments

### Phase 3: Utilities
- [ ] Create `lib/utils/dateHelpers.ts`
- [ ] Create `lib/utils/currencyHelpers.ts`
- [ ] Create `lib/utils/percentageHelpers.ts`
- [ ] Create `lib/utils/chartHelpers.ts`
- [ ] Add utility tests

### Phase 4: Components
- [ ] Create `app/analytics/page.tsx`
- [ ] Create `components/analytics/AnalyticsHeader.tsx`
- [ ] Create `components/analytics/MonthlyOverview.tsx`
- [ ] Create `components/analytics/CategoryBreakdownChart.tsx`
- [ ] Create `components/analytics/SpendingTrendsChart.tsx`
- [ ] Create `components/analytics/BudgetSummaryPanel.tsx`
- [ ] Create `components/analytics/TopCategoriesList.tsx`
- [ ] Add component tests

### Phase 5: Integration
- [ ] Connect page to service layer
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Optimize performance
- [ ] Add end-to-end tests

## Common Patterns

### Fetching Analytics Data
```typescript
const [data, setData] = useState<MonthlySpending | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<Error | null>(null)

useEffect(() => {
  async function fetchData() {
    setLoading(true)
    const { data, error } = await analyticsService.getMonthlySpending(userId, month)
    if (error) {
      setError(error)
    } else {
      setData(data)
    }
    setLoading(false)
  }
  fetchData()
}, [userId, month])
```

### Date Range Selection
```typescript
const [dateRange, setDateRange] = useState<DateRange>(() => {
  const now = new Date()
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
  }
})

const handleDateChange = (newRange: DateRange) => {
  setDateRange(newRange)
  // This will trigger useEffect to re-fetch data
}
```

### Parallel Data Fetching
```typescript
useEffect(() => {
  async function fetchAllData() {
    const [monthly, categories, trends, budget] = await Promise.all([
      analyticsService.getMonthlySpending(userId, month),
      analyticsService.getCategoryBreakdown(userId, startDate, endDate),
      analyticsService.getSpendingTrends(userId, startDate, endDate),
      analyticsService.getBudgetSummary(userId, month)
    ])

    setData({ monthly, categories, trends, budget })
  }
  fetchAllData()
}, [userId, dateRange])
```
