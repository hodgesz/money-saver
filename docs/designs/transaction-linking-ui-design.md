# Transaction Linking UI/UX Design Specification

**Version**: 1.0
**Date**: 2025-10-25
**Status**: Draft
**Author**: System Architect Agent

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [User Workflows](#user-workflows)
4. [Component Architecture](#component-architecture)
5. [Visual Design Specifications](#visual-design-specifications)
6. [State Management](#state-management)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Performance Considerations](#performance-considerations)
9. [Mobile Responsiveness](#mobile-responsiveness)
10. [Implementation Plan](#implementation-plan)

---

## Overview

### Purpose

The Transaction Linking feature enables users to connect parent transactions (e.g., Amazon orders, credit card payments) with their itemized breakdowns (e.g., individual products, sub-charges). This design provides an intuitive interface for viewing, creating, and managing these relationships.

### Goals

1. **Clarity**: Immediately obvious parent-child relationships
2. **Efficiency**: Quick linking and unlinking operations
3. **Transparency**: Clear confidence scores and auto-link suggestions
4. **Flexibility**: Support for manual overrides and bulk operations
5. **Performance**: Handle hundreds of transactions without lag

### Key Use Cases

1. **Viewing Linked Transactions**: Expand parent to see itemized breakdown
2. **Manual Linking**: Connect related transactions after import
3. **Reviewing Auto-Links**: Approve or reject system suggestions
4. **Unlinking**: Break incorrect relationships
5. **Bulk Operations**: Link multiple transactions at once

---

## Design Principles

### 1. Progressive Disclosure
- Show essential information by default
- Reveal details on user interaction (expand/collapse)
- Avoid overwhelming users with complexity

### 2. Visual Hierarchy
- Parent transactions visually distinct from children
- Clear nesting/indentation for relationships
- Consistent use of color and typography

### 3. Immediate Feedback
- Real-time updates when linking/unlinking
- Visual confirmation of actions
- Clear error states

### 4. Mobile-First
- Touch-friendly targets (minimum 44x44px)
- Responsive layouts that work on small screens
- Gesture-based interactions where appropriate

### 5. Accessibility
- WCAG 2.1 Level AA compliance
- Screen reader support
- Keyboard navigation
- Semantic HTML

---

## User Workflows

### Workflow 1: View Linked Transactions

```
User Story: As a user, I want to see the itemized breakdown of an Amazon order
so I can understand what I purchased.

Flow:
1. User navigates to Transactions page
2. User sees parent transaction with expand indicator (chevron icon)
3. User clicks/taps on parent transaction row
4. Child transactions expand with visual indentation
5. User sees itemized details with amounts
6. User clicks again to collapse
```

**Visual Representation**:
```
┌─────────────────────────────────────────────────────┐
│ ▼ Amazon.com          Shopping    Sep 15    $127.53 │ ← Parent (expanded)
├─────────────────────────────────────────────────────┤
│   ├─ Wireless Mouse   Electronics  Sep 15    $24.99 │ ← Child
│   ├─ USB Cable        Electronics  Sep 15    $12.99 │ ← Child
│   ├─ Keyboard         Electronics  Sep 15    $79.99 │ ← Child
│   └─ Shipping         Shipping     Sep 15     $9.56 │ ← Child
└─────────────────────────────────────────────────────┘
```

### Workflow 2: Manual Linking

```
User Story: As a user, I want to manually link a credit card payment to specific
purchases so my budget tracking is accurate.

Flow:
1. User selects "Link Transactions" button
2. Modal/drawer opens with linking interface
3. User selects parent transaction (e.g., credit card payment)
4. User selects one or more child transactions (checkboxes)
5. User clicks "Link Selected" button
6. System creates relationships
7. UI updates to show linked state
8. Modal closes with success message
```

### Workflow 3: Review Auto-Link Suggestions

```
User Story: As a user, I want to review auto-linked transactions to ensure
accuracy before finalizing my import.

Flow:
1. After import, user sees banner: "5 auto-linked transactions pending review"
2. User clicks "Review Auto-Links"
3. User sees list of suggested links with confidence scores
4. For each suggestion:
   - User sees parent and proposed children
   - User sees match confidence (High/Medium/Low)
   - User clicks "Approve" or "Reject"
5. System finalizes approved links
6. User returns to transaction list
```

**Visual Representation**:
```
┌──────────────────────────────────────────────────────┐
│ 🔗 Review Auto-Linked Transactions (5 pending)       │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Parent: Amazon.com - $127.53 (Sep 15)               │
│ Confidence: ● High (95%)                             │
│                                                       │
│ Proposed Children:                                    │
│ ☑ Wireless Mouse - $24.99                           │
│ ☑ USB Cable - $12.99                                │
│ ☑ Keyboard - $79.99                                 │
│ ☑ Shipping - $9.56                                  │
│                                                       │
│ Total: $127.53 ✓ Matches parent                     │
│                                                       │
│ [Approve] [Reject] [Edit]                           │
└──────────────────────────────────────────────────────┘
```

### Workflow 4: Bulk Linking

```
User Story: As a user, I want to link multiple transactions at once to save time.

Flow:
1. User enables multi-select mode (checkbox/button)
2. User selects multiple parent transactions
3. User clicks "Bulk Link" button
4. System shows linking wizard:
   - Step 1: Confirm parent transactions
   - Step 2: Select child transactions for each parent
   - Step 3: Review and confirm
5. System creates all relationships
6. UI updates to show all linked states
```

---

## Component Architecture

### Component Hierarchy

```
TransactionListWithLinking
├── TransactionListHeader
│   ├── SearchInput
│   ├── CategoryFilter
│   ├── LinkStatusFilter (New)
│   └── BulkActionBar (New)
├── TransactionTable
│   ├── TransactionRow (Enhanced)
│   │   ├── ExpandCollapseIcon
│   │   ├── LinkStatusBadge
│   │   ├── TransactionDetails
│   │   └── ActionButtons
│   └── ChildTransactionRow (New)
│       ├── IndentationIndicator
│       ├── TransactionDetails
│       └── UnlinkButton
├── LinkingModal (New)
│   ├── ParentSelector
│   ├── ChildSelector
│   └── LinkingActions
└── AutoLinkReviewPanel (New)
    ├── SuggestionCard
    │   ├── ConfidenceBadge
    │   ├── ParentSummary
    │   ├── ChildList
    │   └── ApprovalActions
    └── BulkApprovalBar
```

### New Components

#### 1. `LinkedTransactionRow`

**Purpose**: Display parent transaction with expand/collapse capability

**Props**:
```typescript
interface LinkedTransactionRowProps {
  transaction: Transaction
  childTransactions: Transaction[]
  isExpanded: boolean
  onToggleExpand: () => void
  onUnlink: (childId: string) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  categories: Category[]
}
```

**Key Features**:
- Chevron icon indicates expandable state
- Badge shows child count (e.g., "3 items")
- Different background color when expanded
- Smooth expand/collapse animation

#### 2. `ChildTransactionRow`

**Purpose**: Display child transaction with indentation and unlink option

**Props**:
```typescript
interface ChildTransactionRowProps {
  transaction: Transaction
  parentId: string
  onUnlink: () => void
  categories: Category[]
  indentLevel?: number
}
```

**Key Features**:
- Left border/indentation to show hierarchy
- Smaller font size for visual subordination
- "Unlink" button (ghost variant)
- Optional tree connector lines

#### 3. `TransactionLinkingModal`

**Purpose**: Interface for manually linking transactions

**Props**:
```typescript
interface TransactionLinkingModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  existingLinks: TransactionLink[]
  onLink: (parentId: string, childIds: string[]) => Promise<void>
}
```

**Key Features**:
- Two-panel layout: parent selection | child selection
- Search and filter in each panel
- Running total shows selected children sum
- Validation prevents invalid links (circular refs, duplicate links)
- Preview of resulting link before confirmation

#### 4. `AutoLinkReviewPanel`

**Purpose**: Review and approve auto-linked transaction suggestions

**Props**:
```typescript
interface AutoLinkReviewPanelProps {
  suggestions: LinkSuggestion[]
  onApprove: (suggestionId: string) => Promise<void>
  onReject: (suggestionId: string) => Promise<void>
  onBulkApprove: (suggestionIds: string[]) => Promise<void>
}

interface LinkSuggestion {
  id: string
  parentTransaction: Transaction
  childTransactions: Transaction[]
  confidence: 'high' | 'medium' | 'low'
  confidenceScore: number
  matchingCriteria: string[]
}
```

**Key Features**:
- Card-based layout for each suggestion
- Color-coded confidence badges
- Expandable details about matching criteria
- Bulk approval for high-confidence suggestions
- Edit option to adjust children before approving

#### 5. `LinkStatusBadge`

**Purpose**: Visual indicator of transaction linking status

**Props**:
```typescript
interface LinkStatusBadgeProps {
  status: 'parent' | 'child' | 'unlinked'
  childCount?: number
}
```

**Variants**:
- **Parent**: Blue badge with count (e.g., "📦 3 items")
- **Child**: Gray badge with icon (e.g., "└─ Item")
- **Unlinked**: No badge (default state)

---

## Visual Design Specifications

### Color Palette

#### Link Status Colors
```css
/* Parent transaction */
--color-parent-bg: #EFF6FF;        /* Blue-50 */
--color-parent-border: #3B82F6;    /* Blue-500 */
--color-parent-text: #1E40AF;      /* Blue-800 */

/* Child transaction */
--color-child-bg: #F9FAFB;         /* Gray-50 */
--color-child-border: #D1D5DB;     /* Gray-300 */
--color-child-text: #6B7280;       /* Gray-500 */

/* Auto-link confidence */
--color-confidence-high: #10B981;   /* Green-500 */
--color-confidence-medium: #F59E0B; /* Amber-500 */
--color-confidence-low: #EF4444;    /* Red-500 */
```

#### Interactive States
```css
/* Hover states */
--color-parent-hover: #DBEAFE;     /* Blue-100 */
--color-child-hover: #F3F4F6;      /* Gray-100 */

/* Selected states */
--color-selected: #E0E7FF;         /* Indigo-100 */
--color-selected-border: #6366F1;   /* Indigo-500 */
```

### Typography

```css
/* Parent transaction */
.parent-transaction {
  font-size: 0.875rem;     /* 14px */
  font-weight: 600;        /* Semibold */
  line-height: 1.25rem;
}

/* Child transaction */
.child-transaction {
  font-size: 0.8125rem;    /* 13px */
  font-weight: 400;        /* Regular */
  line-height: 1.125rem;
  color: var(--color-child-text);
}

/* Confidence badge */
.confidence-badge {
  font-size: 0.75rem;      /* 12px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}
```

### Spacing & Layout

```css
/* Indentation for child transactions */
.child-indent {
  padding-left: 2.5rem;    /* 40px - space for tree indicator */
}

/* Nested child (2nd level) */
.child-indent-2 {
  padding-left: 4.5rem;    /* 72px */
}

/* Expand/collapse icon spacing */
.expand-icon {
  margin-right: 0.75rem;   /* 12px */
  width: 1.25rem;          /* 20px */
  height: 1.25rem;
}
```

### Icons

#### Link Status Icons
- **Parent (collapsed)**: `▶` or `chevron-right` (16px)
- **Parent (expanded)**: `▼` or `chevron-down` (16px)
- **Child**: `└─` or custom tree connector (14px)
- **Linked badge**: `🔗` or `link` icon (12px)
- **Unlink**: `⛓️‍💥` or `unlink` icon (14px)

#### Confidence Icons
- **High**: `●` Green circle (8px)
- **Medium**: `●` Amber circle (8px)
- **Low**: `●` Red circle (8px)

### Visual States

#### Parent Transaction Row (Collapsed)
```
┌────────────────────────────────────────────────────┐
│ ▶ [Badge: 3 items] Amazon.com   Sep 15   $127.53 │
└────────────────────────────────────────────────────┘
Background: White (#FFFFFF)
Border-left: 3px solid Blue-500
```

#### Parent Transaction Row (Expanded)
```
┌────────────────────────────────────────────────────┐
│ ▼ [Badge: 3 items] Amazon.com   Sep 15   $127.53 │
└────────────────────────────────────────────────────┘
Background: Blue-50 (#EFF6FF)
Border-left: 3px solid Blue-500
```

#### Child Transaction Row
```
┌────────────────────────────────────────────────────┐
│   └─ Wireless Mouse      Electronics    $24.99    │
└────────────────────────────────────────────────────┘
Background: Gray-50 (#F9FAFB)
Border-left: 2px solid Gray-300 (starting at indent)
Padding-left: 40px
```

### Animations

```css
/* Expand/collapse animation */
@keyframes expandCollapse {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 1000px;
    opacity: 1;
  }
}

.child-transactions {
  animation: expandCollapse 0.2s ease-out;
}

/* Chevron rotation */
.expand-icon {
  transition: transform 0.2s ease-out;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

/* Link status badge fade in */
@keyframes badgeFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.link-badge {
  animation: badgeFadeIn 0.15s ease-out;
}
```

---

## State Management

### Component State

#### TransactionListWithLinking State
```typescript
interface TransactionListState {
  // Existing state
  transactions: Transaction[]
  categories: Category[]
  loading: boolean
  error: string | null
  currentPage: number
  hasMore: boolean

  // New linking state
  expandedParentIds: Set<string>
  selectedTransactionIds: Set<string>
  linkingMode: 'view' | 'manual' | 'bulk'
  autoLinkSuggestions: LinkSuggestion[]
  showAutoLinkPanel: boolean

  // Linking relationships
  transactionLinks: Map<string, string[]> // parentId -> childIds[]
  reverseLinks: Map<string, string>       // childId -> parentId
}
```

### Server State (React Query)

```typescript
// Fetch transaction links
const { data: links, isLoading } = useQuery({
  queryKey: ['transaction-links', userId],
  queryFn: () => transactionLinkService.getUserLinks(userId)
})

// Auto-link suggestions
const { data: suggestions } = useQuery({
  queryKey: ['auto-link-suggestions', userId],
  queryFn: () => transactionLinkService.getAutoLinkSuggestions(userId),
  enabled: showAutoLinkPanel
})

// Create link mutation
const createLinkMutation = useMutation({
  mutationFn: (data: CreateLinkRequest) =>
    transactionLinkService.createLink(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['transaction-links'])
    queryClient.invalidateQueries(['transactions'])
  }
})
```

### Context API (Alternative to React Query)

```typescript
interface TransactionLinkContextValue {
  links: TransactionLink[]
  expandedParents: Set<string>
  suggestions: LinkSuggestion[]

  // Actions
  toggleExpand: (parentId: string) => void
  createLink: (parentId: string, childIds: string[]) => Promise<void>
  removeLink: (linkId: string) => Promise<void>
  approveSuggestion: (suggestionId: string) => Promise<void>
  rejectSuggestion: (suggestionId: string) => Promise<void>

  // Utilities
  getChildTransactions: (parentId: string) => Transaction[]
  isParent: (transactionId: string) => boolean
  isChild: (transactionId: string) => boolean
  getParentId: (childId: string) => string | null
}
```

---

## Accessibility Requirements

### Keyboard Navigation

#### Transaction List
- `Tab`: Navigate through interactive elements
- `Enter/Space`: Expand/collapse parent transaction
- `Arrow Down/Up`: Navigate between transaction rows
- `Shift + Click`: Select multiple transactions for bulk linking
- `Escape`: Close modal/panel

#### Linking Modal
- `Tab`: Navigate between parent/child selection panels
- `Ctrl/Cmd + A`: Select all children in current view
- `Enter`: Confirm link creation
- `Escape`: Cancel and close modal

### Screen Reader Support

```html
<!-- Parent transaction row -->
<tr
  role="row"
  aria-expanded="false"
  aria-label="Amazon.com, $127.53, September 15, 2024, has 3 linked items"
  tabindex="0"
>
  <td>
    <button aria-label="Expand to show linked items">
      <ChevronIcon aria-hidden="true" />
    </button>
  </td>
  <!-- ... -->
</tr>

<!-- Child transaction row -->
<tr
  role="row"
  aria-label="Wireless Mouse, $24.99, linked to Amazon.com"
  data-link-level="1"
>
  <td>
    <span aria-hidden="true">└─</span>
    <span class="sr-only">Linked item:</span>
  </td>
  <!-- ... -->
</tr>

<!-- Confidence badge -->
<span
  role="status"
  aria-label="High confidence match, 95%"
  class="confidence-badge"
>
  <span aria-hidden="true">● High</span>
</span>
```

### Focus Management

```typescript
// When expanding parent, focus should stay on expand button
const handleExpand = (parentId: string) => {
  setExpandedParents(prev => new Set(prev).add(parentId))
  // Focus remains on expand button for easy collapse
}

// When opening modal, focus should move to first input
const openLinkingModal = () => {
  setModalOpen(true)
  // Focus management handled by modal component
}

// After linking, focus should return to parent row
const handleLinkCreated = async () => {
  await createLink()
  closeModal()
  // Return focus to the linked parent transaction
  document.getElementById(`transaction-${parentId}`)?.focus()
}
```

### Color Contrast

All text meets WCAG AA standards:
- Parent transaction text: 4.5:1 minimum
- Child transaction text: 4.5:1 minimum
- Confidence badges: 3:1 minimum (large text)
- Focus indicators: 3:1 minimum

---

## Performance Considerations

### Virtualization

For large transaction lists (100+ items), implement virtualization:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function TransactionListVirtualized({ transactions }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Flatten parent/child structure for virtualization
  const flattenedTransactions = useMemo(() => {
    const result: FlattenedTransaction[] = []
    transactions.forEach(transaction => {
      result.push({ ...transaction, isChild: false, level: 0 })
      if (expandedParents.has(transaction.id)) {
        const children = getChildTransactions(transaction.id)
        children.forEach(child => {
          result.push({ ...child, isChild: true, level: 1 })
        })
      }
    })
    return result
  }, [transactions, expandedParents])

  const virtualizer = useVirtualizer({
    count: flattenedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedTransactions[index]
      return item.isChild ? 48 : 64 // Child rows shorter than parents
    },
    overscan: 5
  })

  // Render virtualized rows...
}
```

### Optimistic Updates

```typescript
const createLinkMutation = useMutation({
  mutationFn: transactionLinkService.createLink,

  // Optimistically update UI before server confirms
  onMutate: async (newLink) => {
    await queryClient.cancelQueries(['transaction-links'])

    const previousLinks = queryClient.getQueryData(['transaction-links'])

    // Optimistically add new link
    queryClient.setQueryData(['transaction-links'], (old: TransactionLink[]) => [
      ...old,
      { ...newLink, id: 'temp-' + Date.now() }
    ])

    return { previousLinks }
  },

  // Rollback on error
  onError: (err, newLink, context) => {
    queryClient.setQueryData(['transaction-links'], context?.previousLinks)
  },

  // Refetch on success to get real IDs
  onSuccess: () => {
    queryClient.invalidateQueries(['transaction-links'])
  }
})
```

### Memoization

```typescript
// Memoize expensive calculations
const linkedTransactionMap = useMemo(() => {
  const map = new Map<string, Transaction[]>()
  links.forEach(link => {
    const children = transactions.filter(t =>
      link.child_transaction_ids.includes(t.id)
    )
    map.set(link.parent_transaction_id, children)
  })
  return map
}, [links, transactions])

// Memoize filtered/sorted transactions
const displayTransactions = useMemo(() => {
  return transactions
    .filter(t => !isChild(t.id)) // Only show parent-level transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}, [transactions, reverseLinks])
```

### Lazy Loading

```typescript
// Load auto-link suggestions only when panel is opened
const { data: suggestions, isLoading } = useQuery({
  queryKey: ['auto-link-suggestions'],
  queryFn: () => transactionLinkService.getSuggestions(),
  enabled: showAutoLinkPanel, // Only fetch when needed
  staleTime: 5 * 60 * 1000,   // Cache for 5 minutes
})

// Load child transactions on expand (if not already loaded)
const loadChildTransactions = async (parentId: string) => {
  if (!childrenCache.has(parentId)) {
    const children = await transactionLinkService.getChildren(parentId)
    setChildrenCache(prev => new Map(prev).set(parentId, children))
  }
  setExpandedParents(prev => new Set(prev).add(parentId))
}
```

---

## Mobile Responsiveness

### Breakpoints

```css
/* Mobile first approach */
.transaction-table {
  /* Base: Mobile (<640px) */
  display: block;
  overflow-x: auto;
}

/* Tablet (640px - 1024px) */
@media (min-width: 640px) {
  .transaction-table {
    display: table;
  }
}

/* Desktop (>1024px) */
@media (min-width: 1024px) {
  .transaction-row {
    /* Full layout with all columns */
  }
}
```

### Mobile-Specific Layout

#### Transaction Card View (Mobile)
```html
<!-- Card layout instead of table on mobile -->
<div class="transaction-card">
  <div class="card-header">
    <button class="expand-button">▶</button>
    <div class="transaction-info">
      <h3>Amazon.com</h3>
      <span class="badge">3 items</span>
    </div>
    <span class="amount">$127.53</span>
  </div>

  <div class="card-details">
    <span class="date">Sep 15, 2024</span>
    <span class="category">Shopping</span>
  </div>

  <!-- Expanded children -->
  <div class="child-transactions" hidden>
    <div class="child-card">
      <span class="child-icon">└─</span>
      <span class="description">Wireless Mouse</span>
      <span class="amount">$24.99</span>
    </div>
    <!-- More children... -->
  </div>
</div>
```

### Touch Interactions

```typescript
// Larger touch targets on mobile
const TouchTarget = styled.button`
  min-width: 44px;
  min-height: 44px;
  padding: 12px;

  @media (min-width: 640px) {
    min-width: 32px;
    min-height: 32px;
    padding: 8px;
  }
`

// Swipe to expand/collapse (optional enhancement)
import { useSwipeable } from 'react-swipeable'

const handlers = useSwipeable({
  onSwipedRight: () => expandTransaction(id),
  onSwipedLeft: () => collapseTransaction(id),
  trackMouse: false // Only on touch devices
})
```

### Mobile Modal

```typescript
// Full-screen modal on mobile, drawer on desktop
function LinkingModal({ isOpen, onClose }: Props) {
  const isMobile = useMediaQuery('(max-width: 640px)')

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className={isMobile ? 'modal-fullscreen' : 'modal-drawer'}
    >
      {/* Modal content */}
    </Dialog>
  )
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### Tasks
1. **Database Schema**
   - Create `transaction_links` table
   - Add indexes for performance
   - Implement RLS policies

2. **API Layer**
   - Create link service methods
   - Add endpoints for CRUD operations
   - Implement validation logic

3. **Type Definitions**
   - Add `TransactionLink` interface
   - Add `LinkSuggestion` interface
   - Update existing types

#### Deliverables
- [ ] Database migration script
- [ ] API service layer complete
- [ ] Type definitions in `/types/index.ts`
- [ ] Unit tests for service layer (90% coverage)

### Phase 2: Basic Viewing (Week 3)

#### Tasks
1. **Linked Transaction Row Component**
   - Implement expand/collapse functionality
   - Add visual indicators (chevron, badge)
   - Handle keyboard navigation

2. **Child Transaction Row Component**
   - Implement indentation/nesting
   - Add unlink button
   - Style for visual hierarchy

3. **Update Transaction List**
   - Integrate linked row components
   - Fetch and display links
   - Handle expand/collapse state

#### Deliverables
- [ ] `LinkedTransactionRow.tsx` component
- [ ] `ChildTransactionRow.tsx` component
- [ ] Updated `TransactionList.tsx`
- [ ] Component tests (75% coverage)

### Phase 3: Manual Linking (Week 4)

#### Tasks
1. **Linking Modal Component**
   - Create two-panel layout
   - Implement parent/child selection
   - Add validation and error handling

2. **Link Creation Flow**
   - Integrate with API
   - Optimistic updates
   - Success/error feedback

3. **Unlinking Feature**
   - Add unlink button to child rows
   - Confirmation dialog
   - Update UI on unlink

#### Deliverables
- [ ] `TransactionLinkingModal.tsx` component
- [ ] Link creation integrated
- [ ] Unlinking functionality
- [ ] Integration tests for linking flow

### Phase 4: Auto-Link Review (Week 5)

#### Tasks
1. **Auto-Link Suggestion Algorithm**
   - Implement matching logic (backend)
   - Calculate confidence scores
   - Create suggestion service

2. **Review Panel Component**
   - Display suggestions
   - Show confidence indicators
   - Implement approve/reject actions

3. **Import Flow Integration**
   - Show suggestion count after import
   - Link to review panel
   - Bulk approval option

#### Deliverables
- [ ] Auto-link algorithm implementation
- [ ] `AutoLinkReviewPanel.tsx` component
- [ ] Integration with import flow
- [ ] Algorithm tests (90% coverage)

### Phase 5: Polish & Optimization (Week 6)

#### Tasks
1. **Performance Optimization**
   - Implement virtualization for large lists
   - Add memoization
   - Optimize database queries

2. **Accessibility**
   - Add ARIA labels
   - Test keyboard navigation
   - Screen reader testing

3. **Mobile Responsiveness**
   - Card-based mobile layout
   - Touch-friendly targets
   - Responsive modal/drawer

4. **Documentation**
   - User guide for linking feature
   - Developer documentation
   - Update PRD

#### Deliverables
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Mobile UI complete
- [ ] Documentation complete

### Testing Checklist

#### Unit Tests
- [ ] Link service methods
- [ ] Auto-link algorithm
- [ ] Component logic
- [ ] Validation functions

#### Integration Tests
- [ ] Link creation flow
- [ ] Unlinking flow
- [ ] Auto-link approval flow
- [ ] Bulk operations

#### E2E Tests (Playwright)
- [ ] View linked transactions
- [ ] Manual linking workflow
- [ ] Review auto-links workflow
- [ ] Mobile linking experience

#### Accessibility Tests
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast
- [ ] Focus management

---

## Appendix

### A. Related Documents
- [Transaction Linking PRD](../architecture/transaction-linking-prd.md)
- [Database Schema Design](../architecture/transaction-linking-schema.md)
- [API Specification](../architecture/transaction-linking-api.md)
- [Auto-Link Algorithm Design](../architecture/transaction-linking-algorithm.md)

### B. Design Assets
- Figma mockups (to be created)
- Icon library references
- Color palette swatch

### C. Code Examples

#### Example: Basic Linked Transaction Row
```typescript
export function LinkedTransactionRow({
  transaction,
  childTransactions,
  isExpanded,
  onToggleExpand
}: LinkedTransactionRowProps) {
  const hasChildren = childTransactions.length > 0

  return (
    <>
      <tr
        className={`transaction-row ${isExpanded ? 'expanded' : ''}`}
        aria-expanded={isExpanded}
      >
        <td>
          {hasChildren && (
            <button
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              className="expand-button"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
        </td>
        <td>{formatDate(transaction.date)}</td>
        <td>
          <div className="flex items-center gap-2">
            <span>{transaction.merchant}</span>
            {hasChildren && (
              <Badge variant="primary">
                {childTransactions.length} items
              </Badge>
            )}
          </div>
        </td>
        <td>{formatCurrency(transaction.amount)}</td>
      </tr>

      {isExpanded && childTransactions.map(child => (
        <ChildTransactionRow
          key={child.id}
          transaction={child}
          parentId={transaction.id}
          onUnlink={() => handleUnlink(child.id)}
        />
      ))}
    </>
  )
}
```

---

**Document Version History**

| Version | Date       | Author             | Changes                  |
|---------|------------|--------------------|--------------------------|
| 1.0     | 2025-10-25 | System Architect   | Initial design document  |
