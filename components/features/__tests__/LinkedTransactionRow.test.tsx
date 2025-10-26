/**
 * LinkedTransactionRow Component Tests
 * TDD RED Phase: Tests written before implementation
 *
 * Tests expandable transaction row that displays parent-child relationships
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { LinkedTransactionRow } from '../LinkedTransactionRow'
import type { LinkedTransaction } from '@/lib/types/transactionLinking'
import type { Category } from '@/types'

describe('LinkedTransactionRow', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-shopping',
      user_id: 'user-123',
      name: 'Shopping',
      type: 'expense',
      created_at: '2025-10-01T00:00:00Z',
      updated_at: '2025-10-01T00:00:00Z',
    },
  ]

  const mockParentTransaction: LinkedTransaction = {
    id: 'parent-1',
    user_id: 'user-123',
    date: '2025-10-20T00:00:00Z',
    amount: 82.97,
    merchant: 'AMAZON.COM*M12AB34CD',
    description: 'Amazon purchase',
    category_id: 'cat-shopping',
    account_id: 'acc-chase',
    receipt_url: null,
    is_income: false,
    created_at: '2025-10-20T10:00:00Z',
    updated_at: '2025-10-20T10:00:00Z',
    parent_transaction_id: null,
    link_confidence: null,
    link_type: null,
    link_metadata: {},
  }

  const mockChildTransactions: LinkedTransaction[] = [
    {
      id: 'child-1',
      user_id: 'user-123',
      date: '2025-10-18T00:00:00Z',
      amount: 24.99,
      merchant: 'Amazon',
      description: 'Wireless Mouse',
      category_id: null,
      account_id: null,
      receipt_url: null,
      is_income: false,
      created_at: '2025-10-18T08:00:00Z',
      updated_at: '2025-10-18T08:00:00Z',
      parent_transaction_id: 'parent-1',
      link_confidence: 95,
      link_type: 'auto',
      link_metadata: {
        matchScores: {
          dateScore: 36,
          amountScore: 48,
          orderGroupScore: 10,
          total: 94,
        },
      },
    },
    {
      id: 'child-2',
      user_id: 'user-123',
      date: '2025-10-18T00:00:00Z',
      amount: 8.99,
      merchant: 'Amazon',
      description: 'USB-C Cable',
      category_id: null,
      account_id: null,
      receipt_url: null,
      is_income: false,
      created_at: '2025-10-18T08:00:00Z',
      updated_at: '2025-10-18T08:00:00Z',
      parent_transaction_id: 'parent-1',
      link_confidence: 95,
      link_type: 'auto',
      link_metadata: {},
    },
  ]

  const mockUnlinkedTransaction: LinkedTransaction = {
    ...mockParentTransaction,
    id: 'unlinked-1',
    description: 'Unlinked transaction',
    parent_transaction_id: null,
  }

  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnUnlink = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders unlinked transaction row', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockUnlinkedTransaction}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('Unlinked transaction')).toBeInTheDocument()
      expect(screen.getByText('AMAZON.COM*M12AB34CD')).toBeInTheDocument()
      expect(screen.getByText('$82.97')).toBeInTheDocument()
    })

    it('renders parent transaction with child count', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockParentTransaction}
              childTransactions={mockChildTransactions}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('Amazon purchase')).toBeInTheDocument()
      expect(screen.getByText('2 linked items')).toBeInTheDocument()
    })

    it('renders child transaction with indent indicator', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockChildTransactions[0]}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
              isChild
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()
      expect(screen.getByLabelText('Child transaction')).toBeInTheDocument()
    })
  })

  describe('Expand/Collapse Functionality', () => {
    it('starts collapsed by default', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockParentTransaction}
              childTransactions={mockChildTransactions}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
            />
          </tbody>
        </table>
      )

      // Children should not be visible initially
      expect(screen.queryByText('Wireless Mouse')).not.toBeInTheDocument()
      expect(screen.queryByText('USB-C Cable')).not.toBeInTheDocument()
    })

    it('expands to show children when clicked', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockParentTransaction}
              childTransactions={mockChildTransactions}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
            />
          </tbody>
        </table>
      )

      // Click the expand button
      const expandButton = screen.getByLabelText('Expand linked items')
      fireEvent.click(expandButton)

      // Children should now be visible
      expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()
      expect(screen.getByText('USB-C Cable')).toBeInTheDocument()
    })

    it('collapses children when clicked again', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockParentTransaction}
              childTransactions={mockChildTransactions}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
            />
          </tbody>
        </table>
      )

      // Expand
      const expandButton = screen.getByLabelText('Expand linked items')
      fireEvent.click(expandButton)
      expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()

      // Collapse
      const collapseButton = screen.getByLabelText('Collapse linked items')
      fireEvent.click(collapseButton)
      expect(screen.queryByText('Wireless Mouse')).not.toBeInTheDocument()
    })
  })

  describe('Unlink Actions', () => {
    it('shows "Unlink" button for child transactions', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockChildTransactions[0]}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
              isChild
            />
          </tbody>
        </table>
      )

      const unlinkButton = screen.getByLabelText('Unlink Wireless Mouse')
      expect(unlinkButton).toBeInTheDocument()
    })

    it('calls onUnlink when "Unlink" button is clicked', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockChildTransactions[0]}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
              isChild
            />
          </tbody>
        </table>
      )

      const unlinkButton = screen.getByLabelText('Unlink Wireless Mouse')
      fireEvent.click(unlinkButton)

      expect(mockOnUnlink).toHaveBeenCalledWith(mockChildTransactions[0].id)
    })
  })

  describe('Confidence Badges', () => {
    it('shows EXACT confidence badge for high confidence (≥90)', () => {
      const highConfidenceChild = {
        ...mockChildTransactions[0],
        link_confidence: 95,
      }

      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={highConfidenceChild}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
              isChild
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('EXACT (95%)')).toBeInTheDocument()
      expect(screen.getByText('EXACT (95%)')).toHaveClass('bg-green-100')
    })

    it('shows PARTIAL confidence badge for medium confidence (70-89)', () => {
      const mediumConfidenceChild = {
        ...mockChildTransactions[0],
        link_confidence: 80,
      }

      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mediumConfidenceChild}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
              isChild
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('PARTIAL (80%)')).toBeInTheDocument()
      expect(screen.getByText('PARTIAL (80%)')).toHaveClass('bg-yellow-100')
    })

    it('shows manual badge for manual links', () => {
      const manualChild = {
        ...mockChildTransactions[0],
        link_type: 'manual' as const,
        link_confidence: null,
      }

      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={manualChild}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
              isChild
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('MANUAL')).toBeInTheDocument()
      expect(screen.getByText('MANUAL')).toHaveClass('bg-blue-100')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for expand button', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockParentTransaction}
              childTransactions={mockChildTransactions}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
            />
          </tbody>
        </table>
      )

      const button = screen.getByLabelText('Expand linked items')
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('updates aria-expanded when toggled', () => {
      render(
        <table>
          <tbody>
            <LinkedTransactionRow
              transaction={mockParentTransaction}
              childTransactions={mockChildTransactions}
              categories={mockCategories}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              onUnlink={mockOnUnlink}
            />
          </tbody>
        </table>
      )

      const button = screen.getByLabelText('Expand linked items')
      fireEvent.click(button)

      const collapseButton = screen.getByLabelText('Collapse linked items')
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
