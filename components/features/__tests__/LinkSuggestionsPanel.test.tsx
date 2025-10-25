/**
 * LinkSuggestionsPanel Component Tests
 * TDD RED Phase: Tests written before implementation
 *
 * Tests panel for displaying and accepting automatic link suggestions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LinkSuggestionsPanel } from '../LinkSuggestionsPanel'
import type { LinkSuggestion } from '@/lib/types/transactionLinking'
import type { Category } from '@/types'

describe('LinkSuggestionsPanel', () => {
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

  const mockSuggestions: LinkSuggestion[] = [
    {
      parentTransaction: {
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
      },
      childTransactions: [
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
          parent_transaction_id: null,
          link_confidence: null,
          link_type: null,
          link_metadata: {},
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
          parent_transaction_id: null,
          link_confidence: null,
          link_type: null,
          link_metadata: {},
        },
      ],
      confidence: 94,
      confidenceLevel: 'EXACT',
      matchScores: {
        dateScore: 36,
        amountScore: 48,
        orderGroupScore: 10,
        total: 94,
      },
      reasons: [
        'Date proximity: 36/40 points',
        'Amount match: 48/50 points',
        'Order grouping: 10/10 points',
      ],
    },
    {
      parentTransaction: {
        id: 'parent-2',
        user_id: 'user-123',
        date: '2025-10-22T00:00:00Z',
        amount: 45.50,
        merchant: 'AMAZON.COM*M98ZY76XW',
        description: 'Amazon purchase',
        category_id: 'cat-shopping',
        account_id: 'acc-chase',
        receipt_url: null,
        is_income: false,
        created_at: '2025-10-22T10:00:00Z',
        updated_at: '2025-10-22T10:00:00Z',
        parent_transaction_id: null,
        link_confidence: null,
        link_type: null,
        link_metadata: {},
      },
      childTransactions: [
        {
          id: 'child-3',
          user_id: 'user-123',
          date: '2025-10-19T00:00:00Z',
          amount: 18.99,
          merchant: 'Amazon',
          description: 'Phone Case',
          category_id: null,
          account_id: null,
          receipt_url: null,
          is_income: false,
          created_at: '2025-10-19T08:00:00Z',
          updated_at: '2025-10-19T08:00:00Z',
          parent_transaction_id: null,
          link_confidence: null,
          link_type: null,
          link_metadata: {},
        },
      ],
      confidence: 75,
      confidenceLevel: 'PARTIAL',
      matchScores: {
        dateScore: 28,
        amountScore: 42,
        orderGroupScore: 5,
        total: 75,
      },
      reasons: [
        'Date proximity: 28/40 points',
        'Amount match: 42/50 points',
        'Order grouping: 5/10 points',
      ],
    },
  ]

  const mockOnAccept = jest.fn()
  const mockOnReject = jest.fn()
  const mockOnRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Panel Rendering', () => {
    it('renders the panel with suggestions', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getByText('Link Suggestions')).toBeInTheDocument()
      expect(screen.getByText('2 suggestions found')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={[]}
          categories={mockCategories}
          isLoading={true}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getByText('Loading suggestions...')).toBeInTheDocument()
    })

    it('shows empty state when no suggestions', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={[]}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getByText(/no link suggestions/i)).toBeInTheDocument()
    })
  })

  describe('Suggestion Display', () => {
    it('displays parent transaction details', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getAllByText('Amazon purchase').length).toBeGreaterThan(0)
      expect(screen.getByText('$82.97')).toBeInTheDocument()
    })

    it('displays child transaction details when expanded', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      // Expand first suggestion
      const expandButtons = screen.getAllByLabelText(/show details/i)
      fireEvent.click(expandButtons[0])

      // Now child transactions should be visible
      expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()
      expect(screen.getByText('USB-C Cable')).toBeInTheDocument()
    })

    it('displays confidence level badge', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getByText(/EXACT \(94%\)/)).toBeInTheDocument()
      expect(screen.getByText(/PARTIAL \(75%\)/)).toBeInTheDocument()
    })

    it('displays quick summary of match', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      // Summary information should be visible
      expect(screen.getByText(/2 items • Total:/)).toBeInTheDocument()
      expect(screen.getByText(/1 items • Total:/)).toBeInTheDocument()
    })
  })

  describe('Suggestion Actions', () => {
    it('shows Accept and Reject buttons for each suggestion', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i })

      expect(acceptButtons).toHaveLength(2)
      expect(rejectButtons).toHaveLength(2)
    })

    it('calls onAccept with suggestion when Accept button is clicked', async () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
      fireEvent.click(acceptButtons[0])

      await waitFor(() => {
        expect(mockOnAccept).toHaveBeenCalledWith(mockSuggestions[0])
      })
    })

    it('calls onReject with suggestion when Reject button is clicked', async () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i })
      fireEvent.click(rejectButtons[0])

      await waitFor(() => {
        expect(mockOnReject).toHaveBeenCalledWith(mockSuggestions[0])
      })
    })

    it('disables buttons while processing', async () => {
      let resolvePromise: () => void
      const promise = new Promise<void>(resolve => {
        resolvePromise = resolve
      })
      mockOnAccept.mockReturnValue(promise)

      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
      fireEvent.click(acceptButtons[0])

      // Buttons for the processing suggestion should be disabled
      await waitFor(() => {
        expect(acceptButtons[0]).toBeDisabled()
        expect(screen.getAllByRole('button', { name: /reject/i })[0]).toBeDisabled()
      })

      // Cleanup
      resolvePromise!()
    })
  })

  describe('Expand/Collapse Details', () => {
    it('shows expand/collapse buttons for suggestions', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      // Show Details buttons should be visible
      expect(screen.getAllByText('Show Details').length).toBe(2)
      // Match reasons should not be visible initially
      expect(screen.queryByText('Date proximity: 36/40 points')).not.toBeInTheDocument()
    })
  })

  describe('Confidence Level Styling', () => {
    it('applies green styling for EXACT confidence', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      const exactBadge = screen.getByText(/EXACT \(94%\)/)
      expect(exactBadge).toHaveClass('bg-green-100')
    })

    it('applies yellow styling for PARTIAL confidence', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      const partialBadge = screen.getByText(/PARTIAL \(75%\)/)
      expect(partialBadge).toHaveClass('bg-yellow-100')
    })
  })

  describe('Refresh Functionality', () => {
    it('shows refresh button', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })

    it('calls onRefresh when refresh button is clicked', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshButton)

      expect(mockOnRefresh).toHaveBeenCalled()
    })
  })

  describe('Filtering by Confidence', () => {
    it('shows confidence filter dropdown', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getByLabelText(/minimum confidence/i)).toBeInTheDocument()
    })

    it('filters suggestions by selected confidence level', () => {
      render(
        <LinkSuggestionsPanel
          suggestions={mockSuggestions}
          categories={mockCategories}
          isLoading={false}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          onRefresh={mockOnRefresh}
        />
      )

      // Initially shows both suggestions
      expect(screen.getByText('2 suggestions found')).toBeInTheDocument()

      // Change filter to EXACT only (≥90)
      const filterSelect = screen.getByLabelText(/minimum confidence/i)
      fireEvent.change(filterSelect, { target: { value: '90' } })

      // Should now show only 1 suggestion (94% EXACT)
      expect(screen.getByText('1 suggestion found')).toBeInTheDocument()
      expect(screen.queryByText('PARTIAL (75%)')).not.toBeInTheDocument()
    })
  })
})
