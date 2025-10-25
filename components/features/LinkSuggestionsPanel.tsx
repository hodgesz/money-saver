'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import type { LinkSuggestion } from '@/lib/types/transactionLinking'
import type { Category } from '@/types'

interface LinkSuggestionsPanelProps {
  suggestions: LinkSuggestion[]
  categories: Category[]
  isLoading: boolean
  onAccept: (suggestion: LinkSuggestion) => Promise<void>
  onReject: (suggestion: LinkSuggestion) => Promise<void>
  onRefresh: () => void
}

export function LinkSuggestionsPanel({
  suggestions,
  categories,
  isLoading,
  onAccept,
  onReject,
  onRefresh,
}: LinkSuggestionsPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [minConfidence, setMinConfidence] = useState<number>(70)
  const [processingIndex, setProcessingIndex] = useState<number | null>(null)

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return 'Uncategorized'
    const category = categories.find(c => c.id === categoryId)
    return category?.name || 'Unknown'
  }

  const getConfidenceBadgeClass = (confidenceLevel: string): string => {
    const colors = {
      EXACT: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      FUZZY: 'bg-orange-100 text-orange-800',
      UNMATCHED: 'bg-gray-100 text-gray-800',
    }
    return colors[confidenceLevel as keyof typeof colors] || colors.UNMATCHED
  }

  const filteredSuggestions = suggestions.filter(s => s.confidence >= minConfidence)

  const handleAccept = async (suggestion: LinkSuggestion, index: number) => {
    setProcessingIndex(index)
    try {
      await onAccept(suggestion)
    } finally {
      setProcessingIndex(null)
    }
  }

  const handleReject = async (suggestion: LinkSuggestion, index: number) => {
    setProcessingIndex(index)
    try {
      await onReject(suggestion)
    } finally {
      setProcessingIndex(null)
    }
  }

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center p-12">
          <p className="text-gray-600">Loading suggestions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Link Suggestions</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredSuggestions.length} suggestion{filteredSuggestions.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Confidence Filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="confidence-filter" className="text-sm whitespace-nowrap">
              Minimum Confidence:
            </Label>
            <select
              id="confidence-filter"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Minimum confidence level"
            >
              <option value="50">FUZZY (50%+)</option>
              <option value="70">PARTIAL (70%+)</option>
              <option value="90">EXACT (90%+)</option>
            </select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            aria-label="Refresh suggestions"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredSuggestions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            No link suggestions found with {minConfidence}%+ confidence.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try lowering the confidence threshold or importing more transactions.
          </p>
        </div>
      )}

      {/* Suggestions List */}
      {filteredSuggestions.length > 0 && (
        <div className="space-y-4">
          {filteredSuggestions.map((suggestion, index) => {
            const isExpanded = expandedIndex === index
            const isProcessing = processingIndex === index
            const childrenTotal = suggestion.childTransactions.reduce((sum, t) => sum + t.amount, 0)

            return (
              <div
                key={`${suggestion.parentTransaction.id}-${index}`}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Suggestion Header */}
                <div className="bg-gray-50 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {suggestion.parentTransaction.description}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceBadgeClass(suggestion.confidenceLevel)}`}>
                          {suggestion.confidenceLevel} ({suggestion.confidence}%)
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(suggestion.parentTransaction.date)} • {getCategoryName(suggestion.parentTransaction.category_id)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(suggestion.parentTransaction.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Quick Summary */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>{suggestion.childTransactions.length} items • Total: {formatCurrency(childrenTotal)}</span>
                    <button
                      onClick={() => toggleExpand(index)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                      aria-label={isExpanded ? 'Hide details' : 'Show details'}
                    >
                      {isExpanded ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(suggestion, index)}
                      disabled={isProcessing}
                      aria-label="Accept suggestion"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReject(suggestion, index)}
                      disabled={isProcessing}
                      aria-label="Reject suggestion"
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    {/* Match Reasons */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Match Details</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {suggestion.reasons.map((reason, i) => (
                          <li key={i}>• {reason}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Child Transactions */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Linked Items</h4>
                      <div className="space-y-2">
                        {suggestion.childTransactions.map((child) => (
                          <div
                            key={child.id}
                            className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{child.description}</p>
                              <p className="text-xs text-gray-500">{formatDate(child.date)}</p>
                            </div>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(child.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
