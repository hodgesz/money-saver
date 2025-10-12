# Testing Guide: Money Saver

**Version**: 1.0
**Last Updated**: 2025-10-12
**Status**: Active

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Testing Stack](#testing-stack)
4. [Types of Tests](#types-of-tests)
5. [TDD Workflow](#tdd-workflow)
6. [Setup & Installation](#setup--installation)
7. [Writing Tests](#writing-tests)
8. [Running Tests](#running-tests)
9. [Coverage Requirements](#coverage-requirements)
10. [Best Practices](#best-practices)
11. [Common Patterns](#common-patterns)
12. [CI/CD Integration](#cicd-integration)
13. [References](#references)

---

## Overview

This document outlines the testing strategy and Test-Driven Development (TDD) practices for the Money Saver project. Following these guidelines ensures code quality, maintainability, and confidence in deployments.

### Why TDD?

Test-Driven Development provides:
- **Confidence**: Know your features work before deploying
- **Documentation**: Tests serve as living examples of how code should behave
- **Refactoring Safety**: Change code without fear of breaking functionality
- **Bug Prevention**: Catch issues before they reach production
- **Better Design**: TDD naturally leads to more modular, testable code

---

## Testing Philosophy

### Our Core Principles

1. **Test First**: Write tests before implementation code (Red-Green-Refactor)
2. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
3. **Keep Tests Simple**: Tests should be easier to understand than the code they test
4. **Test One Thing**: Each test should verify a single behavior
5. **Make Tests Deterministic**: Tests should always produce the same result
6. **Fast Feedback**: Tests should run quickly to enable rapid iteration

### When to Write Tests

Write tests for:
- ✅ All new features and bug fixes
- ✅ Utility functions and business logic
- ✅ React components with user interaction
- ✅ API routes and data transformations
- ✅ Custom React hooks
- ✅ Critical user flows (authentication, transactions, budgets)

You may skip tests for:
- ❌ Third-party library code
- ❌ Simple configuration files
- ❌ One-time migration scripts (but document them well)

---

## Testing Stack

### Core Testing Tools

```json
{
  "jest": "Test runner and assertion library",
  "@testing-library/react": "React component testing utilities",
  "@testing-library/jest-dom": "Custom Jest matchers for DOM assertions",
  "@testing-library/user-event": "Simulate user interactions",
  "jest-environment-jsdom": "DOM environment for testing React components"
}
```

### Optional Testing Tools (Future)

```json
{
  "msw": "Mock Service Worker for API mocking",
  "playwright": "End-to-end testing framework",
  "@supabase/supabase-js": "Mock Supabase client for database testing"
}
```

---

## Types of Tests

### 1. Unit Tests

Test individual functions, utilities, and isolated logic.

**Characteristics**:
- Fast execution (< 100ms each)
- No external dependencies
- Test pure functions and calculations

**Example Use Cases**:
- Currency formatting functions
- Date utilities
- Validation logic
- Data transformations

### 2. Component Tests

Test React components in isolation.

**Characteristics**:
- Render components with Testing Library
- Simulate user interactions
- Assert on rendered output and behavior
- Mock props, context, and external dependencies

**Example Use Cases**:
- UI components (Button, Input, Card)
- Form components (TransactionForm, BudgetForm)
- Complex display components (TransactionList, Dashboard)

### 3. Integration Tests

Test how multiple units work together.

**Characteristics**:
- Test feature flows across components
- May involve multiple components and utilities
- Mock external services (API, Supabase)

**Example Use Cases**:
- Complete user flows (add transaction → categorize → view in list)
- Form submission with validation and API calls
- Dashboard data aggregation and display

### 4. End-to-End (E2E) Tests

Test complete user journeys in a real browser.

**Characteristics**:
- Slowest but most comprehensive
- Use real browser (Playwright)
- Test critical paths only
- Run against staging environment

**Example Use Cases**:
- User registration and login flow
- Complete transaction management workflow
- Budget creation and monitoring

---

## TDD Workflow

### The Red-Green-Refactor Cycle

```
┌─────────────┐
│   1. RED    │  Write a failing test
│   (Fail)    │  Define expected behavior
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  2. GREEN   │  Write minimal code to pass
│   (Pass)    │  Make the test pass
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. REFACTOR │  Improve code quality
│  (Improve)  │  Tests protect you
└──────┬──────┘
       │
       └──────► Repeat for next feature
```

### Practical Example

Let's implement a `formatCurrency` utility function using TDD.

#### Step 1: RED - Write the Test First

```typescript
// utils/__tests__/currency.test.ts
import { formatCurrency } from '../currency'

describe('formatCurrency', () => {
  it('formats positive USD amounts correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })
})
```

**Run test**: `npm test` → ❌ FAILS (function doesn't exist)

#### Step 2: GREEN - Make It Pass

```typescript
// utils/currency.ts
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}
```

**Run test**: `npm test` → ✅ PASSES

#### Step 3: REFACTOR - Improve Quality

```typescript
// Add more test cases
describe('formatCurrency', () => {
  it('formats positive USD amounts correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats negative amounts correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('supports different currencies', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56')
  })
})

// Refactor implementation
export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
```

**Run tests**: `npm test` → ✅ ALL PASS

---

## Setup & Installation

### 1. Install Dependencies

```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @types/jest \
  jest-environment-jsdom
```

### 2. Create Jest Configuration

Create `jest.config.js` in the project root:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### 3. Create Jest Setup File

Create `jest.setup.js` in the project root:

```javascript
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))
```

### 4. Update package.json Scripts

These should already exist from your current setup:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Writing Tests

### Test Organization

#### Directory Structure

```
money-saver/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   └── __tests__/
│   │       └── Button.test.tsx
│   ├── TransactionForm.tsx
│   └── __tests__/
│       └── TransactionForm.test.tsx
├── utils/
│   ├── currency.ts
│   └── __tests__/
│       └── currency.test.ts
├── lib/
│   ├── supabase.ts
│   └── __tests__/
│       └── supabase.test.ts
└── app/
    ├── transactions/
    │   ├── page.tsx
    │   └── __tests__/
    │       └── page.test.tsx
```

#### File Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test directory: `__tests__/` (co-located with source code)
- Test name matches source: `Button.tsx` → `Button.test.tsx`

### Component Test Examples

#### Simple UI Component Test

```typescript
// components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="primary">Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-blue-600')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

#### Form Component Test

```typescript
// components/__tests__/TransactionForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionForm } from '../TransactionForm'

describe('TransactionForm', () => {
  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()

    render(<TransactionForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Amount'), '45.99')
    await user.type(screen.getByLabelText('Description'), 'Groceries')
    await user.selectOptions(screen.getByLabelText('Category'), 'groceries')
    await user.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        amount: 45.99,
        description: 'Groceries',
        category: 'groceries',
      })
    })
  })

  it('shows validation errors for invalid input', async () => {
    const user = userEvent.setup()
    render(<TransactionForm onSubmit={jest.fn()} />)

    // Submit without filling required fields
    await user.click(screen.getByText('Submit'))

    expect(screen.getByText('Amount is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
  })

  it('displays loading state during submission', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn(() => new Promise(resolve =>
      setTimeout(resolve, 1000)
    ))

    render(<TransactionForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Amount'), '45.99')
    await user.click(screen.getByText('Submit'))

    expect(screen.getByText('Submitting...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Utility Function Tests

```typescript
// utils/__tests__/currency.test.ts
import { formatCurrency, parseCurrency } from '../currency'

describe('formatCurrency', () => {
  it('formats positive amounts correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats negative amounts correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('rounds to two decimal places', () => {
    expect(formatCurrency(1234.5678)).toBe('$1,234.57')
  })

  it('supports different currencies', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56')
    expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56')
  })
})

describe('parseCurrency', () => {
  it('parses currency string to number', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56)
  })

  it('handles negative amounts', () => {
    expect(parseCurrency('-$1,234.56')).toBe(-1234.56)
  })

  it('returns null for invalid input', () => {
    expect(parseCurrency('invalid')).toBeNull()
  })
})
```

### Custom Hook Tests

```typescript
// hooks/__tests__/useTransactions.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useTransactions } from '../useTransactions'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: [
            { id: '1', amount: 45.99, description: 'Groceries' },
            { id: '2', amount: 20.00, description: 'Gas' },
          ],
          error: null,
        })),
      })),
    })),
  },
}))

describe('useTransactions', () => {
  it('fetches transactions on mount', async () => {
    const { result } = renderHook(() => useTransactions())

    expect(result.current.loading).toBe(true)
    expect(result.current.transactions).toEqual([])

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.transactions).toHaveLength(2)
    expect(result.current.transactions[0].description).toBe('Groceries')
  })

  it('handles fetch errors gracefully', async () => {
    // Mock error response
    const { supabase } = require('@/lib/supabase')
    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({
          data: null,
          error: { message: 'Network error' },
        }),
      }),
    }))

    const { result } = renderHook(() => useTransactions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.transactions).toEqual([])
  })
})
```

### Testing with Supabase

```typescript
// lib/__tests__/transactions.test.ts
import { createTransaction, getTransactions } from '../transactions'
import { supabase } from '../supabase'

// Mock the Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('Transaction API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTransaction', () => {
    it('creates a new transaction', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: '123', amount: 45.99 },
        error: null,
      })

      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: () => ({
          single: () => Promise.resolve({
            data: { id: '123', amount: 45.99 },
            error: null,
          }),
        }),
      })

      const result = await createTransaction({
        amount: 45.99,
        description: 'Test transaction',
      })

      expect(result.data).toEqual({ id: '123', amount: 45.99 })
      expect(mockInsert).toHaveBeenCalledWith({
        amount: 45.99,
        description: 'Test transaction',
      })
    })

    it('handles creation errors', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const result = await createTransaction({ amount: 45.99 })

      expect(result.error).toBe('Database error')
      expect(result.data).toBeNull()
    })
  })
})
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a specific test file
npm test -- Button.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="formats currency"

# Run tests for changed files only (git)
npm test -- --onlyChanged

# Update snapshots (if using snapshot testing)
npm test -- -u

# Run tests in verbose mode (see individual test results)
npm test -- --verbose
```

### Watch Mode Shortcuts

When running `npm run test:watch`, you can use these shortcuts:

- `a` - Run all tests
- `f` - Run only failed tests
- `p` - Filter by filename pattern
- `t` - Filter by test name pattern
- `q` - Quit watch mode
- `Enter` - Trigger a test run

### Coverage Reports

After running `npm run test:coverage`, view the HTML report:

```bash
open coverage/lcov-report/index.html
```

The coverage report shows:
- **Statements**: Percentage of statements executed
- **Branches**: Percentage of conditional branches tested
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

---

## Coverage Requirements

### Minimum Coverage Thresholds

```javascript
coverageThreshold: {
  global: {
    branches: 70,    // 70% of conditional branches
    functions: 70,   // 70% of functions
    lines: 70,       // 70% of code lines
    statements: 70,  // 70% of statements
  },
}
```

### Coverage by File Type

| File Type | Target Coverage | Priority |
|-----------|----------------|----------|
| Utilities | 90%+ | High |
| Business Logic | 85%+ | High |
| Components | 75%+ | Medium |
| Pages | 60%+ | Medium |
| Config Files | N/A | Low |

### When Coverage Doesn't Matter

Don't obsess over 100% coverage. Focus on:
- Critical business logic
- Complex conditionals
- User-facing features
- Bug-prone areas

It's okay to have lower coverage for:
- Simple pass-through components
- Type definitions
- Configuration files
- Third-party library wrappers

---

## Best Practices

### 1. Test Behavior, Not Implementation

❌ **Bad**: Testing implementation details
```typescript
it('calls useState with correct initial value', () => {
  const spy = jest.spyOn(React, 'useState')
  render(<Counter />)
  expect(spy).toHaveBeenCalledWith(0)
})
```

✅ **Good**: Testing behavior
```typescript
it('displays initial count of zero', () => {
  render(<Counter />)
  expect(screen.getByText('Count: 0')).toBeInTheDocument()
})
```

### 2. Use Descriptive Test Names

❌ **Bad**: Vague test names
```typescript
it('works correctly', () => { ... })
it('test 1', () => { ... })
```

✅ **Good**: Clear, descriptive names
```typescript
it('formats positive amounts with dollar sign and commas', () => { ... })
it('displays validation error when amount is negative', () => { ... })
```

### 3. Follow AAA Pattern

**Arrange-Act-Assert** makes tests readable:

```typescript
it('submits form with valid data', async () => {
  // Arrange: Set up test data and state
  const user = userEvent.setup()
  const onSubmit = jest.fn()
  render(<TransactionForm onSubmit={onSubmit} />)

  // Act: Perform the action being tested
  await user.type(screen.getByLabelText('Amount'), '45.99')
  await user.click(screen.getByText('Submit'))

  // Assert: Verify the expected outcome
  expect(onSubmit).toHaveBeenCalledWith({ amount: 45.99 })
})
```

### 4. Keep Tests Independent

Each test should run in isolation:

```typescript
describe('TransactionList', () => {
  // Use beforeEach to reset state
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('test 1', () => {
    // This test doesn't depend on test 2
  })

  it('test 2', () => {
    // This test doesn't depend on test 1
  })
})
```

### 5. Mock External Dependencies

```typescript
// Mock Supabase
jest.mock('@/lib/supabase')

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
```

### 6. Use Testing Library Queries Correctly

**Priority order** (use the first one that applies):

1. `getByRole` - Most accessible, preferred
2. `getByLabelText` - Good for form fields
3. `getByPlaceholderText` - Okay for inputs
4. `getByText` - Good for non-interactive content
5. `getByTestId` - Last resort

```typescript
// ✅ Best: Accessible and semantic
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email address')

// ❌ Avoid: Relies on implementation
screen.getByClassName('btn-primary')
```

### 7. Test User Interactions Realistically

```typescript
// ✅ Good: Use userEvent for realistic interactions
const user = userEvent.setup()
await user.type(input, 'hello')
await user.click(button)

// ❌ Avoid: fireEvent is less realistic
fireEvent.change(input, { target: { value: 'hello' } })
fireEvent.click(button)
```

---

## Common Patterns

### Testing Async Operations

```typescript
it('loads data asynchronously', async () => {
  render(<DataComponent />)

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  // Assert on loaded data
  expect(screen.getByText('Data loaded')).toBeInTheDocument()
})
```

### Testing Error States

```typescript
it('displays error message when fetch fails', async () => {
  // Mock a failed fetch
  jest.spyOn(global, 'fetch').mockRejectedValue(
    new Error('Network error')
  )

  render(<DataComponent />)

  await waitFor(() => {
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })
})
```

### Testing Forms with Validation

```typescript
it('prevents submission with invalid data', async () => {
  const user = userEvent.setup()
  const onSubmit = jest.fn()

  render(<TransactionForm onSubmit={onSubmit} />)

  // Try to submit empty form
  await user.click(screen.getByText('Submit'))

  // Verify validation errors appear
  expect(screen.getByText('Amount is required')).toBeInTheDocument()

  // Verify form was not submitted
  expect(onSubmit).not.toHaveBeenCalled()
})
```

### Testing Context Providers

```typescript
// Test wrapper with context
const wrapper = ({ children }) => (
  <AuthContext.Provider value={{ user: mockUser }}>
    {children}
  </AuthContext.Provider>
)

it('displays user name from context', () => {
  render(<UserProfile />, { wrapper })
  expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Run Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage --maxWorkers=2

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests for staged files
npm test -- --findRelatedTests --passWithNoTests
```

---

## References

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event API](https://testing-library.com/docs/user-event/intro)

### Learning Resources
- [Kent C. Dodds - Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Test-Driven Development with React](https://www.freecodecamp.org/news/test-driven-development-tutorial-how-to-test-javascript-and-reactjs-app/)

### Tools
- [Jest Cheat Sheet](https://github.com/sapegin/jest-cheat-sheet)
- [Testing Playground](https://testing-playground.com/) - Interactive query builder

---

## Troubleshooting

### Common Issues

**Issue**: Tests timing out
```typescript
// Solution: Increase timeout for slow operations
it('performs slow operation', async () => {
  // ...
}, 10000) // 10 second timeout
```

**Issue**: `act()` warnings
```typescript
// Solution: Wrap state updates in waitFor
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument()
})
```

**Issue**: Tests pass locally but fail in CI
```typescript
// Solution: Avoid relying on timing, use waitFor
// ❌ Bad
await new Promise(resolve => setTimeout(resolve, 1000))

// ✅ Good
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

---

## Appendix

### Test Template

```typescript
// components/__tests__/ComponentName.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from '../ComponentName'

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />)
    // Add assertions
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<ComponentName />)

    // Arrange
    const button = screen.getByRole('button')

    // Act
    await user.click(button)

    // Assert
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

---

**Document Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-12 | Initial testing guide creation |
