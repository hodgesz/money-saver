/**
 * TransactionLinkingModal Component Tests
 * TDD RED Phase: Tests written before implementation
 *
 * Tests modal for manually linking child transactions to a parent
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionLinkingModal } from '../TransactionLinkingModal'
import type { LinkedTransaction } from '@/lib/types/transactionLinking'
import type { Category } from '@/types'

describe('TransactionLinkingModal', () => {
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

  const mockCandidateTransactions: LinkedTransaction[] = [
    {
      id: 'candidate-1',
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
      parent_transaction_id: null,
      link_confidence: null,
      link_type: null,
      link_metadata: {},
    },
    {
      id: 'candidate-2',
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
      parent_transaction_id: null,
      link_confidence: null,
      link_type: null,
      link_metadata: {},
    },
    {
      id: 'candidate-3',
      user_id: 'user-123',
      date: '2025-10-18T00:00:00Z',
      amount: 18.99,
      merchant: 'Amazon',
      description: 'Phone Case',
      category_id: null,
      account_id: null,
      receipt_url: null,
      is_income: false,
      created_at: '2025-10-18T08:00:00Z',
      updated_at: '2025-10-18T08:00:00Z',
      parent_transaction_id: null,
      link_confidence: null,
      link_type: null,
      link_metadata: {},
    },
  ]

  const mockOnClose = jest.fn()
  const mockOnLink = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Modal Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={false}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Link Items to Transaction')).toBeInTheDocument()
    })

    it('displays parent transaction details', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      expect(screen.getByText('Amazon purchase')).toBeInTheDocument()
      expect(screen.getByText('$82.97')).toBeInTheDocument()
    })

    it('lists candidate transactions', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()
      expect(screen.getByText('USB-C Cable')).toBeInTheDocument()
      expect(screen.getByText('Phone Case')).toBeInTheDocument()
    })
  })

  describe('Transaction Selection', () => {
    it('allows selecting individual transactions', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const checkbox1 = screen.getByLabelText('Select Wireless Mouse')
      fireEvent.click(checkbox1)

      expect(checkbox1).toBeChecked()
    })

    it('allows selecting multiple transactions', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const checkbox1 = screen.getByLabelText('Select Wireless Mouse')
      const checkbox2 = screen.getByLabelText('Select USB-C Cable')

      fireEvent.click(checkbox1)
      fireEvent.click(checkbox2)

      expect(checkbox1).toBeChecked()
      expect(checkbox2).toBeChecked()
    })

    it('allows deselecting transactions', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const checkbox = screen.getByLabelText('Select Wireless Mouse')
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('has "Select All" checkbox', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      expect(screen.getByLabelText('Select all')).toBeInTheDocument()
    })

    it('selects all transactions when "Select All" is clicked', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const selectAllCheckbox = screen.getByLabelText('Select all')
      fireEvent.click(selectAllCheckbox)

      expect(screen.getByLabelText('Select Wireless Mouse')).toBeChecked()
      expect(screen.getByLabelText('Select USB-C Cable')).toBeChecked()
      expect(screen.getByLabelText('Select Phone Case')).toBeChecked()
    })
  })

  describe('Amount Validation', () => {
    it('calculates and displays selected items total', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const checkbox1 = screen.getByLabelText('Select Wireless Mouse')
      const checkbox2 = screen.getByLabelText('Select USB-C Cable')

      fireEvent.click(checkbox1) // $24.99
      fireEvent.click(checkbox2) // $8.99

      expect(screen.getByText('$33.98')).toBeInTheDocument() // Total
    })

    it('shows warning when selected total differs from parent amount', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const checkbox1 = screen.getByLabelText('Select Wireless Mouse')
      fireEvent.click(checkbox1) // $24.99 vs parent $82.97

      expect(
        screen.getByText(/total differs from parent amount/i)
      ).toBeInTheDocument()
    })

    it('shows success indicator when amounts match', () => {
      // Create parent with amount matching candidates
      const matchingParent = {
        ...mockParentTransaction,
        amount: 52.97, // 24.99 + 8.99 + 18.99
      }

      render(
        <TransactionLinkingModal
          parentTransaction={matchingParent}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      // Select all items
      const selectAllCheckbox = screen.getByLabelText('Select all')
      fireEvent.click(selectAllCheckbox)

      expect(screen.getByText(/amounts match/i)).toBeInTheDocument()
    })
  })

  describe('Link Creation', () => {
    it('disables "Link" button when no items selected', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const linkButton = screen.getByRole('button', { name: /^link$/i })
      expect(linkButton).toBeDisabled()
    })

    it('enables "Link" button when items are selected', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const checkbox = screen.getByLabelText('Select Wireless Mouse')
      fireEvent.click(checkbox)

      const linkButton = screen.getByRole('button', { name: /^link$/i })
      expect(linkButton).toBeEnabled()
    })

    it('calls onLink with selected transaction IDs when submitted', async () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      // Select two transactions
      fireEvent.click(screen.getByLabelText('Select Wireless Mouse'))
      fireEvent.click(screen.getByLabelText('Select USB-C Cable'))

      // Click Link button
      const linkButton = screen.getByRole('button', { name: /^link$/i })
      fireEvent.click(linkButton)

      await waitFor(() => {
        expect(mockOnLink).toHaveBeenCalledWith('parent-1', ['candidate-1', 'candidate-2'])
      })
    })

    it('shows loading state while submitting', async () => {
      mockOnLink.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      fireEvent.click(screen.getByLabelText('Select Wireless Mouse'))
      const linkButton = screen.getByRole('button', { name: /^link$/i })
      fireEvent.click(linkButton)

      expect(screen.getByText('Linking...')).toBeInTheDocument()
    })

    it('closes modal after successful link', async () => {
      mockOnLink.mockResolvedValue(undefined)

      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      fireEvent.click(screen.getByLabelText('Select Wireless Mouse'))
      const linkButton = screen.getByRole('button', { name: /^link$/i })
      fireEvent.click(linkButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Modal Controls', () => {
    it('calls onClose when close button is clicked', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onClose when Cancel button is clicked', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop is clicked', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={mockCandidateTransactions}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      const backdrop = screen.getByRole('dialog').parentElement?.querySelector('.fixed.inset-0.bg-gray-500')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })
  })

  describe('Empty State', () => {
    it('shows message when no candidate transactions available', () => {
      render(
        <TransactionLinkingModal
          parentTransaction={mockParentTransaction}
          candidateTransactions={[]}
          categories={mockCategories}
          isOpen={true}
          onClose={mockOnClose}
          onLink={mockOnLink}
        />
      )

      expect(screen.getByText(/no matching transactions found/i)).toBeInTheDocument()
    })
  })
})
