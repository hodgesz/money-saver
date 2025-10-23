# Analytics Component Hierarchy Diagram

## Visual Component Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                     app/analytics/page.tsx                       │
│                  (Analytics Dashboard - Page Level)              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ AnalyticsHeader  │    │ MonthlyOverview  │    │CategoryBreakdown │
│                  │    │                  │    │     Chart        │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│DateRangeSelector │    │    StatCard      │    │    PieChart      │
│   (reusable)     │    │   (reusable)     │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                 │                        │
                                 │                        │
                                 ▼                        ▼
                        ┌──────────────────┐    ┌──────────────────┐
                        │ComparisonBadge   │    │   LegendList     │
                        │   (reusable)     │    │                  │
                        └──────────────────┘    └──────────────────┘

        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ SpendingTrends   │    │ BudgetSummary    │    │  TopCategories   │
│     Chart        │    │     Panel        │    │      List        │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   LineChart      │    │BudgetProgressBar │    │CategoryListItem  │
│                  │    │   (reusable)     │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│  TrendTooltip    │    │BudgetCategory    │
│                  │    │      Item        │
└──────────────────┘    └──────────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐                                            │
│  │ AnalyticsPage   │                                            │
│  │  (React State)  │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           │ useEffect / API calls                               │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │analyticsService │                                            │
│  │  - getMonthly   │                                            │
│  │  - getCategory  │                                            │
│  │  - getTrends    │                                            │
│  │  - getBudget    │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
└───────────┼──────────────────────────────────────────────────────┘
            │ Supabase Client SDK
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase / PostgreSQL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ transactions │  │   budgets    │  │  categories  │          │
│  │    table     │  │    table     │  │    table     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┴─────────────────┘                   │
│                           │                                      │
│              Complex Aggregation Queries                         │
│              (GROUP BY, JOINs, DATE_TRUNC)                       │
│                           │                                      │
│                           ▼                                      │
│              ┌─────────────────────────┐                         │
│              │   Optimized Indexes     │                         │
│              │  - user_id, date        │                         │
│              │  - category_id          │                         │
│              │  - composite indexes    │                         │
│              └─────────────────────────┘                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
User Action: Select Date Range
         │
         ▼
┌─────────────────────┐
│ DateRangeSelector   │
│  onChange event     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Parent Component   │
│  (setState)         │
└──────────┬──────────┘
           │
           │ Parallel API Calls
           ├──────────────────────┬──────────────────┐
           ▼                      ▼                  ▼
┌─────────────────┐    ┌─────────────────┐   ┌──────────────┐
│getMonthlySpending│    │getCategoryBreak │   │getSpending   │
│                 │    │    down         │   │  Trends      │
└────────┬────────┘    └────────┬────────┘   └──────┬───────┘
         │                      │                    │
         │                      │                    │
         ▼                      ▼                    ▼
┌────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                   │
└────────────┬───────────────────┬───────────────────┬────────┘
             │                   │                   │
             ▼                   ▼                   ▼
    ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
    │ MonthlyOverview│  │CategoryBreakdown│  │ SpendingTrends │
    │   (Re-render)  │  │   (Re-render)   │  │   (Re-render)  │
    └────────────────┘  └────────────────┘  └────────────────┘
```

## Service Layer Structure

```
lib/services/
│
├── analytics.ts (Main Analytics Service)
│   ├── getMonthlySpending()
│   │   └── SQL: Monthly aggregation with income/expenses
│   │
│   ├── getCategoryBreakdown()
│   │   └── SQL: Category JOIN with budgets
│   │
│   ├── getSpendingTrends()
│   │   └── SQL: TIME series with DATE_TRUNC
│   │
│   ├── getBudgetSummary()
│   │   └── SQL: Budget JOIN with actual spending
│   │
│   ├── getTopCategories()
│   │   └── SQL: Ordered by total amount DESC
│   │
│   └── getSpendingComparison()
│       └── Calls getMonthlySpending twice + calculates delta
│
├── transactions.ts (Existing)
│   └── Used by analytics service
│
├── budgets.ts (Existing)
│   └── Used by analytics service
│
└── categories.ts (Existing)
    └── Used by analytics service
```

## Helper Utilities Structure

```
lib/utils/
│
├── dateHelpers.ts
│   ├── getMonthRange(month: string): DateRange
│   ├── getPreviousPeriod(range: DateRange): DateRange
│   ├── formatMonthYear(date: string): string
│   ├── getTrendDateRange(months: number): DateRange
│   └── isDateInRange(date: string, range: DateRange): boolean
│
├── currencyHelpers.ts
│   ├── formatCurrency(amount: number): string
│   ├── parseCurrency(value: string): number
│   └── formatCurrencyCompact(amount: number): string
│
├── percentageHelpers.ts
│   ├── calculatePercentage(amount: number, total: number): number
│   ├── calculateChangePercentage(current: number, previous: number): number
│   └── formatPercentage(value: number, decimals?: number): string
│
└── chartHelpers.ts
    ├── transformCategoryDataForPieChart(data: CategoryBreakdown[]): PieChartData[]
    ├── transformTrendsForLineChart(data: SpendingTrend[]): LineChartData
    └── getChartColors(count: number): string[]
```

## Component Props Flow

```
AnalyticsPage
│
├── AnalyticsHeader
│   └── Props: { dateRange, onDateRangeChange }
│       └── DateRangeSelector
│           └── Props: { startDate, endDate, onChange }
│
├── MonthlyOverview
│   └── Props: { data: MonthlySpending }
│       ├── StatCard
│       │   └── Props: { title, value, icon, change }
│       └── ComparisonBadge
│           └── Props: { percentage, trend: 'up' | 'down' }
│
├── CategoryBreakdownChart
│   └── Props: { data: CategoryBreakdown[] }
│       ├── PieChart
│       │   └── Props: { data: PieChartData[], colors }
│       └── LegendList
│           └── Props: { items: CategoryBreakdown[] }
│
├── SpendingTrendsChart
│   └── Props: { data: SpendingTrend[], granularity }
│       ├── LineChart
│       │   └── Props: { data: LineChartData, xAxis, yAxis }
│       └── TrendTooltip
│           └── Props: { date, income, expenses, balance }
│
├── BudgetSummaryPanel
│   └── Props: { data: BudgetSummary }
│       ├── BudgetProgressBar
│       │   └── Props: { percentage, status, amount, budget }
│       └── BudgetCategoryItem
│           └── Props: { category: BudgetCategoryStatus }
│
└── TopCategoriesList
    └── Props: { data: TopCategory[], limit }
        └── CategoryListItem
            └── Props: { category: TopCategory, rank }
```

## State Management Pattern

```
AnalyticsPage Component State:
{
  dateRange: {
    startDate: string,
    endDate: string
  },
  monthlySpending: MonthlySpending | null,
  categoryBreakdown: CategoryBreakdown[] | null,
  spendingTrends: SpendingTrend[] | null,
  budgetSummary: BudgetSummary | null,
  topCategories: TopCategory[] | null,
  loading: {
    monthly: boolean,
    categories: boolean,
    trends: boolean,
    budgets: boolean
  },
  errors: {
    monthly: Error | null,
    categories: Error | null,
    trends: Error | null,
    budgets: Error | null
  }
}
```

## Error Handling Pattern

```
Service Layer (analytics.ts):
  ├── Try-Catch around Supabase queries
  ├── Return { data: null, error } format
  └── Log errors to console

Component Layer (AnalyticsPage):
  ├── Check error in response
  ├── Set error state
  ├── Display error UI
  │   ├── ErrorBoundary (page-level)
  │   ├── Inline error message (component-level)
  │   └── Retry button
  └── Prevent rendering of failed components
```

## Performance Optimization Strategy

```
Query Level:
  ├── Use database indexes
  ├── Limit result sets
  ├── Optimize JOIN operations
  └── Use DATE_TRUNC for grouping

Service Level:
  ├── Parallel query execution
  ├── Data transformation in memory
  └── Caching with TTL

Component Level:
  ├── React.memo for expensive components
  ├── useMemo for computed values
  ├── useCallback for event handlers
  └── Lazy loading for charts

Network Level:
  ├── Request batching
  ├── Client-side caching
  └── Optimistic updates
```
