'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { alertEventsService } from '@/lib/services/alertEvents'
import type { AlertEvent } from '@/types'

/**
 * AlertDisplay Component
 *
 * Notification bell icon with dropdown displaying recent alerts.
 *
 * Features:
 * - Unread count badge
 * - Dropdown list of recent alerts
 * - Mark as read functionality
 * - Navigation to related transactions/budgets
 * - Real-time updates via polling
 */

export function AlertDisplay() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertEvent[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch alerts and unread count
  const fetchAlerts = async () => {
    try {
      const [alertsResult, countResult] = await Promise.all([
        alertEventsService.getAlertEvents({ limit: 10 }),
        alertEventsService.getUnreadCount(),
      ])

      if (alertsResult.data) {
        setAlerts(alertsResult.data)
      }

      if (countResult.data !== null) {
        setUnreadCount(countResult.data)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchAlerts()
  }, [])

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle alert click
  const handleAlertClick = async (alert: AlertEvent) => {
    // Mark as read
    await alertEventsService.markAlertAsRead(alert.id)

    // Navigate to related page
    if (alert.transaction_id) {
      router.push('/transactions')
    } else if (alert.budget_id) {
      router.push('/budgets')
    }

    // Refresh alerts
    fetchAlerts()
    setIsOpen(false)
  }

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await alertEventsService.markAllAlertsAsRead()
    fetchAlerts()
  }

  // Get relative time string
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Get severity color classes
  const getSeverityClasses = (severity: string): string => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-l-4 border-red-500'
      case 'medium':
        return 'bg-yellow-50 border-l-4 border-yellow-500'
      case 'low':
        return 'bg-blue-50 border-l-4 border-blue-500'
      default:
        return 'bg-gray-50'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500">Loading...</div>
            ) : alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No alerts
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      getSeverityClasses(alert.severity)
                    } ${!alert.is_read ? 'font-semibold' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Alert Message */}
                        <p className="text-sm text-gray-900">{alert.message}</p>

                        {/* Timestamp */}
                        <p className="text-xs text-gray-500 mt-1">
                          {getRelativeTime(alert.created_at)}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {!alert.is_read && (
                        <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
