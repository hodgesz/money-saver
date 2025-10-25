# Transaction Linking Test Plan

**Version**: 1.0
**Date**: 2025-10-25
**Author**: Coder Agent (Hive Mind)
**Status**: Draft

---

## Executive Summary

This document outlines the comprehensive Test-Driven Development (TDD) strategy for implementing transaction linking functionality in the Money Saver application. Transaction linking enables users to match Amazon order line items with corresponding credit card charges, providing complete financial transparency and accurate expense tracking.

### Coverage Targets (from PRD.md)
- **Business Logic**: 90%+ coverage
- **React Components**: 75%+ coverage
- **Overall**: 70%+ coverage

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Testing Strategy](#testing-strategy)
3. [Test Categories](#test-categories)
4. [Unit Tests](#unit-tests)
5. [Integration Tests](#integration-tests)
6. [Component Tests](#component-tests)
7. [End-to-End Tests](#end-to-end-tests)
8. [Mock Data & Fixtures](#mock-data--fixtures)
9. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Feature Overview

### What is Transaction Linking?

Transaction linking matches Amazon order line items with credit card payment transactions to provide:
- Complete order visibility (items + payment method)
- Accurate expense categorization
- Detection of split payments
- Identification of unmatched transactions

### Key Components

1. **Matching Algorithm**: Core logic for linking transactions
2. **Database Layer**: Persistence and relationship management
3. **UI Components**: User interface for viewing/managing links
4. **Import Workflow**: Automated linking during CSV import

---

## Testing Strategy

### Red-Green-Refactor Approach

Following TDD methodology from `TESTING.md`:

```
1. RED: Write failing test defining expected behavior
2. GREEN: Implement minimal code to pass the test
3. REFACTOR: Improve code quality while tests protect against regressions
```

### Test Pyramid Distribution

```
           ╱╲
          ╱  ╲        E2E: 5% (Critical user journeys)
         ╱────╲
        ╱      ╲      Integration: 20% (Feature workflows)
       ╱────────╲
      ╱          ╲    Component: 25% (UI behavior)
     ╱────────────╲
    ╱              ╲  Unit: 50% (Business logic)
   ╱────────────────╲
```

### Test Execution Order

1. **Phase 1**: Unit tests for matching algorithm (RED → GREEN → REFACTOR)
2. **Phase 2**: Integration tests for database operations
3. **Phase 3**: Component tests for UI elements
4. **Phase 4**: E2E tests for complete workflows

---

## Test Categories

### 1. Unit Tests (50% of test suite)

**Focus**: Matching algorithm, utility functions, business logic
**Patterns**: From `chaseParser.test.ts` and `duplicateDetection.test.ts`

### 2. Integration Tests (20% of test suite)

**Focus**: Database operations, service layer interactions
**Patterns**: From `transactions.test.ts`

### 3. Component Tests (25% of test suite)

**Focus**: React components, user interactions, UI state
**Patterns**: From Testing Library best practices

### 4. End-to-End Tests (5% of test suite)

**Focus**: Critical user journeys, full workflow validation
**Tool**: Playwright (future implementation)

---

## Unit Tests

### File: `lib/services/__tests__/transactionLinking.test.ts`

#### Test Suite Structure

```typescript
describe('transactionLinkingService', () => {
  describe('findPotentialMatches', () => {
    // Exact matching tests
    // Fuzzy matching tests
    // Date range matching tests
    // Amount tolerance tests
  })

  describe('calculateMatchConfidence', () => {
    // Confidence scoring tests
    // Weighted criteria tests
  })

  describe('linkTransactions', () => {
    // Link creation tests
    // Validation tests
  })

  describe('unlinkTransactions', () => {
    // Unlink operation tests
    // Cleanup tests
  })

  describe('getLinkedTransactions', () => {
    // Retrieval tests
    // Relationship mapping tests
  })
})
```

#### Detailed Test Cases

##### 1. Exact Match Tests (Confidence: 1.0)

```typescript
describe('findPotentialMatches - exact matching', () => {
  it('matches Amazon item to credit card charge with exact amount and date', () => {
    // RED PHASE: Define expected behavior
    const amazonItem = {
      date: '2025-10-15',
      amount: 29.99,
      merchant: 'Amazon',
      description: 'Wireless Mouse',
      source: 'amazon_order'
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-15',
        amount: 29.99,
        merchant: 'AMAZON.COM',
        description: 'AMAZON.COM*ABC123',
        source: 'chase_credit_card'
      }
    ]

    const matches = findPotentialMatches(amazonItem, creditCardTransactions)

    expect(matches).toHaveLength(1)
    expect(matches[0].confidence).toBe(1.0)
    expect(matches[0].matchReasons).toContain('exact_amount_and_date')
    expect(matches[0].creditCardTransaction.id).toBe('cc-1')
  })

  it('matches with date posted within same transaction window', () => {
    const amazonItem = {
      date: '2025-10-15',
      amount: 29.99,
      merchant: 'Amazon',
      description: 'Wireless Mouse'
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-16', // Posted next day (common)
        amount: 29.99,
        merchant: 'AMAZON.COM',
        description: 'AMAZON.COM*ABC123'
      }
    ]

    const matches = findPotentialMatches(amazonItem, creditCardTransactions, {
      dateWindowDays: 2
    })

    expect(matches).toHaveLength(1)
    expect(matches[0].confidence).toBeGreaterThanOrEqual(0.95)
  })
})
```

##### 2. Fuzzy Match Tests (Confidence: 0.7-0.9)

```typescript
describe('findPotentialMatches - fuzzy matching', () => {
  it('matches Amazon item to credit card with slight amount difference (tax rounding)', () => {
    const amazonItem = {
      date: '2025-10-15',
      amount: 29.99,
      merchant: 'Amazon',
      description: 'Wireless Mouse'
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-15',
        amount: 30.01, // $0.02 difference (tax rounding)
        merchant: 'AMAZON.COM',
        description: 'AMAZON.COM*ABC123'
      }
    ]

    const matches = findPotentialMatches(amazonItem, creditCardTransactions, {
      amountTolerancePercent: 1.0 // 1% tolerance
    })

    expect(matches).toHaveLength(1)
    expect(matches[0].confidence).toBeGreaterThanOrEqual(0.85)
    expect(matches[0].matchReasons).toContain('amount_within_tolerance')
  })

  it('matches despite different merchant name formatting', () => {
    const amazonItem = {
      date: '2025-10-15',
      amount: 29.99,
      merchant: 'Amazon.com',
      description: 'Wireless Mouse'
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-15',
        amount: 29.99,
        merchant: 'AMAZON COM', // Different formatting
        description: 'AMAZON COM*MARKETPLACE'
      }
    ]

    const matches = findPotentialMatches(amazonItem, creditCardTransactions)

    expect(matches).toHaveLength(1)
    expect(matches[0].confidence).toBeGreaterThanOrEqual(0.9)
  })
})
```

##### 3. Split Payment Tests

```typescript
describe('findPotentialMatches - split payments', () => {
  it('identifies multiple credit card charges that sum to Amazon order total', () => {
    const amazonOrder = {
      date: '2025-10-15',
      totalAmount: 150.00,
      items: [
        { amount: 50.00, description: 'Item 1' },
        { amount: 100.00, description: 'Item 2' }
      ]
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-15',
        amount: 50.00,
        merchant: 'AMAZON.COM'
      },
      {
        id: 'cc-2',
        date: '2025-10-16',
        amount: 100.00,
        merchant: 'AMAZON.COM'
      }
    ]

    const splitMatch = findSplitPaymentMatches(amazonOrder, creditCardTransactions)

    expect(splitMatch.isSplitPayment).toBe(true)
    expect(splitMatch.transactions).toHaveLength(2)
    expect(splitMatch.confidence).toBeGreaterThanOrEqual(0.8)
    expect(splitMatch.totalMatched).toBe(150.00)
  })

  it('handles gift card + credit card split payments', () => {
    const amazonOrder = {
      date: '2025-10-15',
      totalAmount: 150.00,
      giftCardApplied: 50.00,
      items: [{ amount: 150.00, description: 'Laptop' }]
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-15',
        amount: 100.00, // Only charged remainder after gift card
        merchant: 'AMAZON.COM'
      }
    ]

    const matches = findPotentialMatches(amazonOrder, creditCardTransactions, {
      considerGiftCards: true
    })

    expect(matches).toHaveLength(1)
    expect(matches[0].confidence).toBeGreaterThanOrEqual(0.85)
    expect(matches[0].matchReasons).toContain('gift_card_adjusted')
  })
})
```

##### 4. No Match / Rejection Tests

```typescript
describe('findPotentialMatches - no matches', () => {
  it('returns empty array when date is outside window', () => {
    const amazonItem = {
      date: '2025-10-15',
      amount: 29.99,
      merchant: 'Amazon'
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-01', // 14 days before
        amount: 29.99,
        merchant: 'AMAZON.COM'
      }
    ]

    const matches = findPotentialMatches(amazonItem, creditCardTransactions, {
      dateWindowDays: 7 // Only look back 7 days
    })

    expect(matches).toHaveLength(0)
  })

  it('returns empty array when amount differs significantly', () => {
    const amazonItem = {
      date: '2025-10-15',
      amount: 29.99,
      merchant: 'Amazon'
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-15',
        amount: 59.99, // 100% more expensive
        merchant: 'AMAZON.COM'
      }
    ]

    const matches = findPotentialMatches(amazonItem, creditCardTransactions, {
      amountTolerancePercent: 5.0 // Only 5% tolerance
    })

    expect(matches).toHaveLength(0)
  })

  it('returns empty array when merchant does not match', () => {
    const amazonItem = {
      date: '2025-10-15',
      amount: 29.99,
      merchant: 'Amazon',
      description: 'Wireless Mouse'
    }

    const creditCardTransactions = [
      {
        id: 'cc-1',
        date: '2025-10-15',
        amount: 29.99,
        merchant: 'WALMART', // Different merchant
        description: 'WALMART #123'
      }
    ]

    const matches = findPotentialMatches(amazonItem, creditCardTransactions)

    expect(matches).toHaveLength(0)
  })
})
```

##### 5. Confidence Scoring Tests

```typescript
describe('calculateMatchConfidence', () => {
  it('calculates 1.0 confidence for perfect match', () => {
    const match = {
      dateMatch: true,
      dateDifferenceDays: 0,
      amountMatch: true,
      amountDifference: 0,
      merchantMatch: true,
      descriptionSimilarity: 1.0
    }

    const confidence = calculateMatchConfidence(match)

    expect(confidence).toBe(1.0)
  })

  it('reduces confidence for date difference', () => {
    const match = {
      dateMatch: true,
      dateDifferenceDays: 3, // Posted 3 days later
      amountMatch: true,
      amountDifference: 0,
      merchantMatch: true,
      descriptionSimilarity: 0.8
    }

    const confidence = calculateMatchConfidence(match)

    expect(confidence).toBeGreaterThanOrEqual(0.8)
    expect(confidence).toBeLessThan(1.0)
  })

  it('applies weighted scoring to match criteria', () => {
    const weights = {
      date: 0.3,
      amount: 0.4,
      merchant: 0.2,
      description: 0.1
    }

    const match = {
      dateMatch: true,
      dateDifferenceDays: 0,
      amountMatch: false,
      amountDifference: 1.50, // $1.50 off
      merchantMatch: true,
      descriptionSimilarity: 0.5
    }

    const confidence = calculateMatchConfidence(match, weights)

    // Date (0.3) + Merchant (0.2) + Description (0.05) = 0.55
    expect(confidence).toBeCloseTo(0.55, 1)
  })
})
```

---

## Integration Tests

### File: `lib/services/__tests__/transactionLinking.integration.test.ts`

#### Database Operations

```typescript
describe('transactionLinkingService - database operations', () => {
  beforeEach(async () => {
    // Set up test database with sample transactions
    await setupTestDatabase()
  })

  afterEach(async () => {
    // Clean up test data
    await cleanupTestDatabase()
  })

  describe('linkTransactions', () => {
    it('creates link between Amazon item and credit card transaction', async () => {
      const amazonTransactionId = 'amazon-1'
      const creditCardTransactionId = 'cc-1'
      const linkMetadata = {
        confidence: 0.95,
        matchReasons: ['exact_amount', 'date_within_window'],
        linkedAt: new Date().toISOString()
      }

      const result = await transactionLinkingService.linkTransactions(
        amazonTransactionId,
        creditCardTransactionId,
        linkMetadata
      )

      expect(result.success).toBe(true)
      expect(result.link).toBeDefined()
      expect(result.link.amazonTransactionId).toBe(amazonTransactionId)
      expect(result.link.creditCardTransactionId).toBe(creditCardTransactionId)

      // Verify link exists in database
      const link = await supabase
        .from('transaction_links')
        .select('*')
        .eq('amazon_transaction_id', amazonTransactionId)
        .single()

      expect(link.data).toBeDefined()
      expect(link.data.confidence).toBe(0.95)
    })

    it('prevents duplicate links for the same transaction pair', async () => {
      const amazonTransactionId = 'amazon-1'
      const creditCardTransactionId = 'cc-1'

      // Create first link
      await transactionLinkingService.linkTransactions(
        amazonTransactionId,
        creditCardTransactionId,
        { confidence: 0.95 }
      )

      // Attempt to create duplicate link
      const result = await transactionLinkingService.linkTransactions(
        amazonTransactionId,
        creditCardTransactionId,
        { confidence: 0.90 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('already linked')
    })

    it('allows one Amazon transaction to link to multiple credit card transactions (split payment)', async () => {
      const amazonTransactionId = 'amazon-order-1'
      const creditCardIds = ['cc-1', 'cc-2']

      for (const ccId of creditCardIds) {
        const result = await transactionLinkingService.linkTransactions(
          amazonTransactionId,
          ccId,
          { confidence: 0.85, matchReasons: ['split_payment'] }
        )

        expect(result.success).toBe(true)
      }

      // Verify both links exist
      const links = await supabase
        .from('transaction_links')
        .select('*')
        .eq('amazon_transaction_id', amazonTransactionId)

      expect(links.data).toHaveLength(2)
    })
  })

  describe('unlinkTransactions', () => {
    it('removes link between transactions', async () => {
      // Create link first
      const linkResult = await transactionLinkingService.linkTransactions(
        'amazon-1',
        'cc-1',
        { confidence: 0.95 }
      )

      // Unlink
      const unlinkResult = await transactionLinkingService.unlinkTransactions(
        linkResult.link.id
      )

      expect(unlinkResult.success).toBe(true)

      // Verify link is removed
      const link = await supabase
        .from('transaction_links')
        .select('*')
        .eq('id', linkResult.link.id)
        .maybeSingle()

      expect(link.data).toBeNull()
    })

    it('handles unlinking non-existent link gracefully', async () => {
      const result = await transactionLinkingService.unlinkTransactions(
        'non-existent-link-id'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('getLinkedTransactions', () => {
    it('retrieves all transactions linked to an Amazon order', async () => {
      const amazonTransactionId = 'amazon-1'

      // Create multiple links
      await transactionLinkingService.linkTransactions(
        amazonTransactionId,
        'cc-1',
        { confidence: 0.95 }
      )
      await transactionLinkingService.linkTransactions(
        amazonTransactionId,
        'cc-2',
        { confidence: 0.90 }
      )

      const result = await transactionLinkingService.getLinkedTransactions(
        amazonTransactionId
      )

      expect(result.amazonTransaction.id).toBe(amazonTransactionId)
      expect(result.creditCardTransactions).toHaveLength(2)
      expect(result.links).toHaveLength(2)
    })

    it('returns empty array when transaction has no links', async () => {
      const result = await transactionLinkingService.getLinkedTransactions(
        'unlinked-transaction'
      )

      expect(result.amazonTransaction.id).toBe('unlinked-transaction')
      expect(result.creditCardTransactions).toHaveLength(0)
      expect(result.links).toHaveLength(0)
    })
  })
})
```

---

## Component Tests

### File: `app/transactions/link/__tests__/TransactionLinker.test.tsx`

#### UI Component Tests

```typescript
describe('TransactionLinker', () => {
  describe('rendering', () => {
    it('displays Amazon transaction and potential matches', () => {
      const amazonTransaction = {
        id: 'amazon-1',
        date: '2025-10-15',
        amount: 29.99,
        merchant: 'Amazon',
        description: 'Wireless Mouse'
      }

      const potentialMatches = [
        {
          id: 'cc-1',
          date: '2025-10-15',
          amount: 29.99,
          merchant: 'AMAZON.COM',
          confidence: 0.95
        },
        {
          id: 'cc-2',
          date: '2025-10-16',
          amount: 30.00,
          merchant: 'AMAZON.COM',
          confidence: 0.85
        }
      ]

      render(
        <TransactionLinker
          amazonTransaction={amazonTransaction}
          potentialMatches={potentialMatches}
        />
      )

      expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()
      expect(screen.getByText('$29.99')).toBeInTheDocument()
      expect(screen.getByText(/potential matches/i)).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /link/i })).toHaveLength(2)
    })

    it('displays confidence badges for each match', () => {
      const potentialMatches = [
        { id: 'cc-1', confidence: 0.95, amount: 29.99 },
        { id: 'cc-2', confidence: 0.85, amount: 30.00 },
        { id: 'cc-3', confidence: 0.70, amount: 30.50 }
      ]

      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={potentialMatches}
        />
      )

      expect(screen.getByText('95% match')).toBeInTheDocument()
      expect(screen.getByText('85% match')).toBeInTheDocument()
      expect(screen.getByText('70% match')).toBeInTheDocument()
    })

    it('shows "Already Linked" badge for linked transactions', () => {
      const linkedMatch = {
        id: 'cc-1',
        confidence: 0.95,
        amount: 29.99,
        isLinked: true,
        linkedAt: '2025-10-15T10:00:00Z'
      }

      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={[linkedMatch]}
        />
      )

      expect(screen.getByText(/already linked/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /unlink/i })).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    it('links transactions when Link button is clicked', async () => {
      const user = userEvent.setup()
      const onLink = jest.fn()

      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={[mockCreditCardMatch]}
          onLink={onLink}
        />
      )

      const linkButton = screen.getByRole('button', { name: /^link$/i })
      await user.click(linkButton)

      expect(onLink).toHaveBeenCalledWith({
        amazonTransactionId: mockAmazonTransaction.id,
        creditCardTransactionId: mockCreditCardMatch.id,
        confidence: mockCreditCardMatch.confidence
      })
    })

    it('shows confirmation dialog for low confidence matches', async () => {
      const user = userEvent.setup()
      const lowConfidenceMatch = {
        id: 'cc-1',
        confidence: 0.65, // Below 70% threshold
        amount: 35.00
      }

      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={[lowConfidenceMatch]}
        />
      )

      const linkButton = screen.getByRole('button', { name: /link/i })
      await user.click(linkButton)

      expect(screen.getByText(/low confidence match/i)).toBeInTheDocument()
      expect(screen.getByText(/65%/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    })

    it('unlinks transactions when Unlink button is clicked', async () => {
      const user = userEvent.setup()
      const onUnlink = jest.fn()
      const linkedMatch = {
        id: 'cc-1',
        isLinked: true,
        linkId: 'link-1'
      }

      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={[linkedMatch]}
          onUnlink={onUnlink}
        />
      )

      const unlinkButton = screen.getByRole('button', { name: /unlink/i })
      await user.click(unlinkButton)

      expect(onUnlink).toHaveBeenCalledWith('link-1')
    })

    it('allows manual search for matching transactions', async () => {
      const user = userEvent.setup()
      const onSearch = jest.fn()

      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={[]}
          onManualSearch={onSearch}
        />
      )

      const searchButton = screen.getByRole('button', { name: /search manually/i })
      await user.click(searchButton)

      expect(screen.getByPlaceholderText(/search transactions/i)).toBeInTheDocument()

      await user.type(screen.getByPlaceholderText(/search transactions/i), 'amazon')
      await user.click(screen.getByRole('button', { name: /search/i }))

      expect(onSearch).toHaveBeenCalledWith('amazon')
    })
  })

  describe('loading and error states', () => {
    it('displays loading state while finding matches', () => {
      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={[]}
          isLoading={true}
        />
      )

      expect(screen.getByText(/finding matches/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('displays error message when matching fails', () => {
      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={[]}
          error="Failed to fetch credit card transactions"
        />
      )

      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
    })

    it('displays empty state when no matches found', () => {
      render(
        <TransactionLinker
          amazonTransaction={mockAmazonTransaction}
          potentialMatches={[]}
        />
      )

      expect(screen.getByText(/no matching transactions found/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /search manually/i })).toBeInTheDocument()
    })
  })
})
```

---

## End-to-End Tests

### File: `e2e/transaction-linking.spec.ts` (Future: Playwright)

```typescript
test.describe('Transaction Linking E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')
  })

  test('complete linking workflow from import to linked view', async ({ page }) => {
    // 1. Import Amazon CSV
    await page.click('text=Import')
    await page.setInputFiles('input[type="file"]', 'fixtures/amazon-order.csv')
    await page.waitForSelector('text=Import successful')

    // 2. Import Chase Credit Card CSV
    await page.setInputFiles('input[type="file"]', 'fixtures/chase-credit.csv')
    await page.waitForSelector('text=Import successful')

    // 3. Navigate to linking interface
    await page.click('text=Link Transactions')
    await page.waitForSelector('text=Transaction Linking')

    // 4. Verify potential matches are displayed
    const matchCount = await page.locator('[data-testid="potential-match"]').count()
    expect(matchCount).toBeGreaterThan(0)

    // 5. Link first match
    await page.click('[data-testid="link-button"]:first-child')
    await page.waitForSelector('text=Successfully linked')

    // 6. Verify link appears in transaction list
    await page.click('text=Transactions')
    await page.waitForSelector('[data-testid="linked-indicator"]')
  })

  test('manual search and link workflow', async ({ page }) => {
    await page.click('text=Link Transactions')
    await page.click('text=Search Manually')

    await page.fill('[placeholder="Search transactions"]', 'Amazon 29.99')
    await page.click('button:has-text("Search")')

    await page.waitForSelector('text=Search Results')
    await page.click('[data-testid="link-button"]:first-child')

    await expect(page.locator('text=Successfully linked')).toBeVisible()
  })
})
```

---

## Mock Data & Fixtures

### Amazon Order CSV Fixture

**File**: `__fixtures__/amazon-order-sample.csv`

```csv
Order Date,Order ID,Title,Category,ASIN/ISBN,Price,Item Total
2025-10-15,123-4567890-1234567,Logitech Wireless Mouse,Electronics,B08XYZ123,$29.99,$29.99
2025-10-15,123-4567890-1234567,USB-C Cable 6ft,Electronics,B07ABC456,$12.99,$12.99
2025-10-15,123-4567890-1234567,Laptop Stand,Office Products,B09DEF789,$39.99,$39.99
2025-10-18,123-9876543-9876543,Coffee Beans 2lb,Grocery,B06GHI012,$24.99,$24.99
```

**Total Order Amount**: $82.97 (shipping/tax not shown)

### Chase Credit Card CSV Fixture

**File**: `__fixtures__/chase-credit-sample.csv`

```csv
Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/15/2025,10/15/2025,AMAZON.COM*ABC123DEF,Shopping,Sale,-29.99,
10/15/2025,10/15/2025,AMAZON.COM*GHI456JKL,Shopping,Sale,-12.99,
10/16/2025,10/16/2025,AMAZON.COM*MNO789PQR,Shopping,Sale,-39.99,
10/18/2025,10/19/2025,AMZN Mktp US*ST4U12V3W,Shopping,Sale,-24.99,
10/16/2025,10/16/2025,STARBUCKS #12345,Food & Drink,Sale,-5.67,
```

**Expected Links**:
1. Amazon Mouse ($29.99) ↔ Chase ($29.99) - Confidence: 1.0
2. Amazon Cable ($12.99) ↔ Chase ($12.99) - Confidence: 1.0
3. Amazon Stand ($39.99) ↔ Chase ($39.99) - Confidence: 0.95 (posted next day)
4. Amazon Coffee ($24.99) ↔ Chase ($24.99) - Confidence: 0.90 (date +1, different merchant format)

### Test Data Builders

```typescript
// lib/__fixtures__/testDataBuilders.ts

export const buildAmazonTransaction = (overrides = {}) => ({
  id: `amazon-${Date.now()}`,
  user_id: 'test-user-1',
  date: '2025-10-15',
  amount: 29.99,
  merchant: 'Amazon',
  description: 'Wireless Mouse',
  category_id: 'electronics-cat-id',
  source: 'amazon_order',
  is_income: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const buildCreditCardTransaction = (overrides = {}) => ({
  id: `cc-${Date.now()}`,
  user_id: 'test-user-1',
  date: '2025-10-15',
  amount: 29.99,
  merchant: 'AMAZON.COM',
  description: 'AMAZON.COM*ABC123',
  category_id: 'shopping-cat-id',
  source: 'chase_credit_card',
  type: 'Sale',
  is_income: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const buildTransactionLink = (overrides = {}) => ({
  id: `link-${Date.now()}`,
  amazon_transaction_id: 'amazon-1',
  credit_card_transaction_id: 'cc-1',
  confidence: 0.95,
  match_reasons: ['exact_amount', 'date_within_window'],
  linked_at: new Date().toISOString(),
  linked_by: 'test-user-1',
  ...overrides
})
```

---

## Edge Cases & Error Scenarios

### 1. Date Boundary Cases

```typescript
describe('edge cases - date boundaries', () => {
  it('handles month boundary correctly', () => {
    const amazonItem = { date: '2025-10-31', amount: 29.99 }
    const creditTransaction = { date: '2025-11-01', amount: 29.99 }

    const matches = findPotentialMatches(amazonItem, [creditTransaction])
    expect(matches).toHaveLength(1)
  })

  it('handles year boundary correctly', () => {
    const amazonItem = { date: '2024-12-31', amount: 29.99 }
    const creditTransaction = { date: '2025-01-01', amount: 29.99 }

    const matches = findPotentialMatches(amazonItem, [creditTransaction])
    expect(matches).toHaveLength(1)
  })

  it('respects timezone differences in date matching', () => {
    const amazonItem = { date: '2025-10-15T23:59:00Z', amount: 29.99 }
    const creditTransaction = { date: '2025-10-16T00:01:00Z', amount: 29.99 }

    // Should match - same calendar date in most timezones
    const matches = findPotentialMatches(amazonItem, [creditTransaction])
    expect(matches).toHaveLength(1)
  })
})
```

### 2. Amount Edge Cases

```typescript
describe('edge cases - amounts', () => {
  it('handles zero dollar amounts', () => {
    const amazonItem = { date: '2025-10-15', amount: 0.00 }
    const creditTransaction = { date: '2025-10-15', amount: 0.00 }

    const matches = findPotentialMatches(amazonItem, [creditTransaction])
    expect(matches).toHaveLength(0) // Reject zero-dollar matches
  })

  it('handles very large amounts correctly', () => {
    const amazonItem = { date: '2025-10-15', amount: 9999.99 }
    const creditTransaction = { date: '2025-10-15', amount: 9999.99 }

    const matches = findPotentialMatches(amazonItem, [creditTransaction])
    expect(matches).toHaveLength(1)
  })

  it('handles cent-precision rounding', () => {
    const amazonItem = { date: '2025-10-15', amount: 29.994 }
    const creditTransaction = { date: '2025-10-15', amount: 29.99 }

    const matches = findPotentialMatches(amazonItem, [creditTransaction])
    expect(matches).toHaveLength(1)
  })
})
```

### 3. Merchant Name Variations

```typescript
describe('edge cases - merchant names', () => {
  it('matches despite special characters in merchant name', () => {
    const amazonItem = { merchant: 'Amazon.com' }
    const creditTransaction = { merchant: 'AMAZON*COM' }

    expect(normalizeMerchantName(amazonItem.merchant))
      .toBe(normalizeMerchantName(creditTransaction.merchant))
  })

  it('matches Amazon Marketplace variations', () => {
    const variations = [
      'AMAZON.COM',
      'AMZN Mktp US',
      'Amazon Marketplace',
      'AMAZON MKTPLACE PMTS',
      'AMZ*Amazon.com'
    ]

    variations.forEach(merchant => {
      expect(isAmazonMerchant(merchant)).toBe(true)
    })
  })

  it('handles international Amazon domains', () => {
    const domains = ['Amazon.ca', 'Amazon.co.uk', 'Amazon.de']

    domains.forEach(domain => {
      expect(isAmazonMerchant(domain)).toBe(true)
    })
  })
})
```

### 4. Database Constraint Violations

```typescript
describe('edge cases - database constraints', () => {
  it('handles orphaned transaction references', async () => {
    const result = await transactionLinkingService.linkTransactions(
      'non-existent-amazon-id',
      'cc-1',
      { confidence: 0.95 }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('handles concurrent link attempts', async () => {
    const amazonId = 'amazon-1'
    const ccId = 'cc-1'

    // Simulate concurrent link attempts
    const [result1, result2] = await Promise.all([
      transactionLinkingService.linkTransactions(amazonId, ccId, { confidence: 0.95 }),
      transactionLinkingService.linkTransactions(amazonId, ccId, { confidence: 0.90 })
    ])

    // One should succeed, one should fail
    const successes = [result1, result2].filter(r => r.success)
    expect(successes).toHaveLength(1)
  })
})
```

### 5. Performance Edge Cases

```typescript
describe('edge cases - performance', () => {
  it('handles large dataset efficiently', () => {
    const amazonItem = { date: '2025-10-15', amount: 29.99 }
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: `cc-${i}`,
      date: '2025-10-15',
      amount: Math.random() * 100,
      merchant: 'RANDOM MERCHANT'
    }))

    const startTime = Date.now()
    const matches = findPotentialMatches(amazonItem, largeDataset)
    const endTime = Date.now()

    expect(endTime - startTime).toBeLessThan(1000) // Should complete in < 1 second
  })

  it('limits number of potential matches returned', () => {
    const amazonItem = { date: '2025-10-15', amount: 29.99 }
    const manyMatches = Array.from({ length: 100 }, (_, i) => ({
      id: `cc-${i}`,
      date: '2025-10-15',
      amount: 29.99,
      merchant: 'AMAZON.COM'
    }))

    const matches = findPotentialMatches(amazonItem, manyMatches, {
      maxResults: 10
    })

    expect(matches).toHaveLength(10)
    expect(matches[0].confidence).toBeGreaterThanOrEqual(matches[9].confidence)
  })
})
```

---

## Implementation Roadmap

### Phase 1: Core Matching Algorithm (Week 1)

#### Day 1-2: Exact Match Logic
- **RED**: Write tests for exact date + amount matching
- **GREEN**: Implement basic matching function
- **REFACTOR**: Optimize for performance

#### Day 3-4: Fuzzy Matching
- **RED**: Write tests for date window and amount tolerance
- **GREEN**: Add fuzzy matching logic
- **REFACTOR**: Extract reusable utilities

#### Day 5: Confidence Scoring
- **RED**: Write tests for confidence calculation
- **GREEN**: Implement weighted scoring system
- **REFACTOR**: Make weights configurable

### Phase 2: Database Layer (Week 2)

#### Day 1-2: Schema & Migrations
- Create `transaction_links` table
- Add indexes for performance
- Set up RLS policies

#### Day 3-4: Service Layer
- **RED**: Write integration tests for CRUD operations
- **GREEN**: Implement linking service
- **REFACTOR**: Add error handling and validation

#### Day 5: Batch Operations
- **RED**: Write tests for bulk linking
- **GREEN**: Implement batch processing
- **REFACTOR**: Optimize database queries

### Phase 3: UI Components (Week 3)

#### Day 1-2: TransactionLinker Component
- **RED**: Write component tests for rendering
- **GREEN**: Build basic UI structure
- **REFACTOR**: Extract reusable sub-components

#### Day 3-4: User Interactions
- **RED**: Write tests for link/unlink actions
- **GREEN**: Implement event handlers and API calls
- **REFACTOR**: Add loading and error states

#### Day 5: Polish & Accessibility
- Add keyboard navigation
- Ensure WCAG 2.1 AA compliance
- Add success/error toasts

### Phase 4: Integration & E2E (Week 4)

#### Day 1-2: Import Workflow Integration
- **RED**: Write tests for auto-linking during import
- **GREEN**: Integrate with existing import flow
- **REFACTOR**: Optimize for bulk imports

#### Day 3-4: E2E Testing
- Set up Playwright
- Write critical path tests
- Add to CI/CD pipeline

#### Day 5: Documentation & Review
- Update PRD and TESTING.md
- Code review and refinement
- Prepare for deployment

---

## Test Execution Strategy

### Local Development

```bash
# Run all transaction linking tests
npm test -- transactionLinking

# Run in watch mode during development
npm test -- --watch transactionLinking

# Run with coverage
npm test -- --coverage transactionLinking

# Run specific test suite
npm test -- transactionLinking.test.ts
```

### Continuous Integration

```yaml
# .github/workflows/test-transaction-linking.yml
name: Transaction Linking Tests

on:
  pull_request:
    paths:
      - 'lib/services/transactionLinking*'
      - 'app/transactions/link/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- transactionLinking --coverage
      - run: npm test -- link --coverage
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
npm test -- --findRelatedTests --passWithNoTests
```

---

## Success Metrics

### Code Coverage Goals
- Matching algorithm: **95%+** coverage
- Database operations: **90%+** coverage
- React components: **80%+** coverage
- Overall feature: **85%+** coverage

### Quality Gates
- ✅ All tests pass
- ✅ No console errors or warnings
- ✅ Linting passes
- ✅ TypeScript compiles without errors
- ✅ Coverage meets minimum thresholds

### Performance Benchmarks
- Matching 1 transaction against 1000: **< 100ms**
- Bulk linking 100 transactions: **< 5 seconds**
- UI renders potential matches: **< 500ms**

---

## References

- [PRD.md](/docs/PRD.md) - Feature requirements and coverage targets
- [TESTING.md](/docs/TESTING.md) - TDD methodology and best practices
- [chaseParser.test.ts](/lib/utils/parsers/__tests__/chaseParser.test.ts) - Test pattern reference
- [duplicateDetection.test.ts](/lib/services/__tests__/duplicateDetection.test.ts) - Integration test patterns

---

## Appendix A: Database Schema

```sql
CREATE TABLE transaction_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amazon_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  credit_card_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  match_reasons TEXT[] NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_by UUID REFERENCES auth.users(id),
  unlinked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_transaction_link UNIQUE (amazon_transaction_id, credit_card_transaction_id),
  CHECK (amazon_transaction_id != credit_card_transaction_id)
);

-- Indexes for performance
CREATE INDEX idx_transaction_links_amazon ON transaction_links(amazon_transaction_id);
CREATE INDEX idx_transaction_links_credit_card ON transaction_links(credit_card_transaction_id);
CREATE INDEX idx_transaction_links_confidence ON transaction_links(confidence);
CREATE INDEX idx_transaction_links_linked_at ON transaction_links(linked_at);

-- RLS Policies
ALTER TABLE transaction_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction links"
  ON transaction_links FOR SELECT
  USING (
    amazon_transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own transaction links"
  ON transaction_links FOR INSERT
  WITH CHECK (
    amazon_transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own transaction links"
  ON transaction_links FOR DELETE
  USING (
    amazon_transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );
```

---

## Appendix B: Type Definitions

```typescript
// lib/types/transactionLinking.ts

export interface TransactionLink {
  id: string
  amazonTransactionId: string
  creditCardTransactionId: string
  confidence: number // 0.0 to 1.0
  matchReasons: string[]
  linkedAt: string
  linkedBy: string
  unlinkedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PotentialMatch {
  creditCardTransaction: Transaction
  confidence: number
  matchReasons: string[]
  dateDifferenceDays: number
  amountDifference: number
  merchantSimilarity: number
}

export interface MatchingOptions {
  dateWindowDays?: number // Default: 7
  amountTolerancePercent?: number // Default: 2.0
  minConfidence?: number // Default: 0.7
  maxResults?: number // Default: 10
  considerGiftCards?: boolean // Default: true
}

export interface LinkingResult {
  success: boolean
  link?: TransactionLink
  error?: string
}

export interface LinkedTransactionsView {
  amazonTransaction: Transaction
  creditCardTransactions: Transaction[]
  links: TransactionLink[]
  totalLinkedAmount: number
  unmatchedAmount: number
}
```

---

**Document Status**: Ready for Review
**Next Steps**: Begin Phase 1 implementation with Red-Green-Refactor cycle
**Coordination**: Will use hooks to report progress via memory store
