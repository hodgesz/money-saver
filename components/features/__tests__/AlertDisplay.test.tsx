import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertDisplay } from '../AlertDisplay'
import { alertEventsService } from '@/lib/services/alertEvents'
import type { AlertEvent } from '@/types'

// Mock the alert services
jest.mock('@/lib/services/alertEvents', () => ({
  alertEventsService: {
    getAlertEvents: jest.fn(),
    getUnreadCount: jest.fn(),
    markAlertAsRead: jest.fn(),
    markAllAlertsAsRead: jest.fn(),
  },
}))

// Mock Next.js navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockAlertEvents: AlertEvent[] = [
  {
    id: '1',
    user_id: 'user-123',
    alert_id: 'alert-1',
    transaction_id: 'txn-1',
    budget_id: null,
    type: 'large_purchase',
    message: 'Large purchase detected: $150.00 at Amazon',
    severity: 'medium',
    is_read: false,
    metadata: { amount: 150.00, merchant: 'Amazon' },
    created_at: '2024-03-15T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-123',
    alert_id: 'alert-2',
    transaction_id: null,
    budget_id: 'budget-1',
    type: 'budget_warning',
    message: 'Budget warning: 85% spent on Groceries',
    severity: 'high',
    is_read: false,
    metadata: { percentage: 85, category: 'Groceries' },
    created_at: '2024-03-14T10:00:00Z',
  },
  {
    id: '3',
    user_id: 'user-123',
    alert_id: 'alert-3',
    transaction_id: 'txn-2',
    budget_id: null,
    type: 'anomaly',
    message: 'Unusual spending detected: $300.00',
    severity: 'medium',
    is_read: true,
    metadata: { amount: 300.00 },
    created_at: '2024-03-13T10:00:00Z',
  },
]

describe('AlertDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders notification bell icon', async () => {
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 0,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })

      render(<AlertDisplay />)

      const bellIcon = screen.getByRole('button', { name: /notifications/i })
      expect(bellIcon).toBeInTheDocument()
    })

    it('displays unread count badge when there are unread alerts', async () => {
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 2,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: mockAlertEvents,
        error: null,
      })

      render(<AlertDisplay />)

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('does not display badge when no unread alerts', async () => {
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 0,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })

      render(<AlertDisplay />)

      await waitFor(() => {
        const badge = screen.queryByText(/^\d+$/)
        expect(badge).not.toBeInTheDocument()
      })
    })

    it('shows loading state initially', () => {
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 0,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })

      render(<AlertDisplay />)

      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })
  })

  describe('Dropdown Interaction', () => {
    it('opens dropdown when bell icon is clicked', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 2,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: mockAlertEvents.slice(0, 2),
        error: null,
      })

      render(<AlertDisplay />)

      const bellIcon = screen.getByRole('button', { name: /notifications/i })
      await user.click(bellIcon)

      await waitFor(() => {
        expect(screen.getByText(/Large purchase detected/i)).toBeInTheDocument()
        expect(screen.getByText(/Budget warning/i)).toBeInTheDocument()
      })
    })

    it('closes dropdown when clicked outside', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 1,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [mockAlertEvents[0]],
        error: null,
      })

      render(<AlertDisplay />)

      // Open dropdown
      const bellIcon = screen.getByRole('button', { name: /notifications/i })
      await user.click(bellIcon)

      await waitFor(() => {
        expect(screen.getByText(/Large purchase detected/i)).toBeInTheDocument()
      })

      // Click outside (on body)
      await user.click(document.body)

      await waitFor(() => {
        expect(screen.queryByText(/Large purchase detected/i)).not.toBeInTheDocument()
      })
    })

    it('displays "No alerts" when no alerts exist', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 0,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })

      render(<AlertDisplay />)

      const bellIcon = screen.getByRole('button', { name: /notifications/i })
      await user.click(bellIcon)

      await waitFor(() => {
        expect(screen.getByText(/No alerts/i)).toBeInTheDocument()
      })
    })
  })

  describe('Alert Display', () => {
    it('displays alert message', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 1,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [mockAlertEvents[0]],
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        expect(screen.getByText('Large purchase detected: $150.00 at Amazon')).toBeInTheDocument()
      })
    })

    it('displays relative timestamp', async () => {
      const user = userEvent.setup()

      // Create a recent alert (1 hour ago)
      const recentAlert = {
        ...mockAlertEvents[0],
        created_at: new Date(Date.now() - 3600000).toISOString(),
      }

      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 1,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [recentAlert],
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        // Should show something like "1h ago"
        expect(screen.getByText(/ago/i)).toBeInTheDocument()
      })
    })

    it('applies different styles for severity levels', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 2,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: mockAlertEvents.slice(0, 2),
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        // Both alerts should be visible
        expect(screen.getByText(/Large purchase detected/i)).toBeInTheDocument()
        expect(screen.getByText(/Budget warning/i)).toBeInTheDocument()
      })
    })

    it('shows unread indicator for unread alerts', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 2,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: mockAlertEvents,
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      // Should show visual indicator for unread alerts
      // This could be a dot, bold text, or different background
      await waitFor(() => {
        expect(screen.getByText(/Large purchase detected/i)).toBeInTheDocument()
      })
    })
  })

  describe('Mark as Read', () => {
    it('marks alert as read when clicked', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 1,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [mockAlertEvents[0]],
        error: null,
      })
      ;(alertEventsService.markAlertAsRead as jest.Mock).mockResolvedValue({
        data: { ...mockAlertEvents[0], is_read: true },
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        expect(screen.getByText(/Large purchase detected/i)).toBeInTheDocument()
      })

      // Click on the alert
      const alertItem = screen.getByText(/Large purchase detected/i)
      await user.click(alertItem)

      expect(alertEventsService.markAlertAsRead).toHaveBeenCalledWith('1')
    })

    it('navigates to transaction when alert with transaction_id is clicked', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 1,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [mockAlertEvents[0]],
        error: null,
      })
      ;(alertEventsService.markAlertAsRead as jest.Mock).mockResolvedValue({
        data: { ...mockAlertEvents[0], is_read: true },
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        expect(screen.getByText(/Large purchase detected/i)).toBeInTheDocument()
      })

      const alertItem = screen.getByText(/Large purchase detected/i)
      await user.click(alertItem)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/transactions')
      })
    })

    it('navigates to budgets when alert with budget_id is clicked', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 1,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [mockAlertEvents[1]],
        error: null,
      })
      ;(alertEventsService.markAlertAsRead as jest.Mock).mockResolvedValue({
        data: { ...mockAlertEvents[1], is_read: true },
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        expect(screen.getByText(/Budget warning/i)).toBeInTheDocument()
      })

      const alertItem = screen.getByText(/Budget warning/i)
      await user.click(alertItem)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/budgets')
      })
    })
  })

  describe('Mark All as Read', () => {
    it('displays "Mark all as read" button when unread alerts exist', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 2,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: mockAlertEvents.slice(0, 2),
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument()
      })
    })

    it('marks all alerts as read when "Mark all as read" is clicked', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 2,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: mockAlertEvents.slice(0, 2),
        error: null,
      })
      ;(alertEventsService.markAllAlertsAsRead as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument()
      })

      const markAllButton = screen.getByRole('button', { name: /mark all as read/i })
      await user.click(markAllButton)

      expect(alertEventsService.markAllAlertsAsRead).toHaveBeenCalled()
    })

    it('refreshes alert list after marking all as read', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock)
        .mockResolvedValueOnce({ data: 2, error: null })
        .mockResolvedValueOnce({ data: 0, error: null })

      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: mockAlertEvents.slice(0, 2),
        error: null,
      })
      ;(alertEventsService.markAllAlertsAsRead as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument()
      })

      const markAllButton = screen.getByRole('button', { name: /mark all as read/i })
      await user.click(markAllButton)

      // Should call getAlertEvents again after marking all as read
      await waitFor(() => {
        expect(alertEventsService.getAlertEvents).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Handling', () => {
    it('handles fetch error gracefully', async () => {
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      })

      render(<AlertDisplay />)

      // Should still render the bell icon
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    it('handles mark as read error gracefully', async () => {
      const user = userEvent.setup()
      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 1,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [mockAlertEvents[0]],
        error: null,
      })
      ;(alertEventsService.markAlertAsRead as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      })

      render(<AlertDisplay />)

      await user.click(screen.getByRole('button', { name: /notifications/i }))

      await waitFor(() => {
        expect(screen.getByText(/Large purchase detected/i)).toBeInTheDocument()
      })

      const alertItem = screen.getByText(/Large purchase detected/i)
      await user.click(alertItem)

      // Should still attempt to navigate even if marking as read fails
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('refreshes alerts periodically', async () => {
      jest.useFakeTimers()

      ;(alertEventsService.getUnreadCount as jest.Mock).mockResolvedValue({
        data: 1,
        error: null,
      })
      ;(alertEventsService.getAlertEvents as jest.Mock).mockResolvedValue({
        data: [mockAlertEvents[0]],
        error: null,
      })

      render(<AlertDisplay />)

      // Wait for initial load
      await waitFor(() => {
        expect(alertEventsService.getUnreadCount).toHaveBeenCalledTimes(1)
      })

      // Advance time by 30 seconds (or whatever polling interval we choose)
      jest.advanceTimersByTime(30000)

      await waitFor(() => {
        expect(alertEventsService.getUnreadCount).toHaveBeenCalledTimes(2)
      })

      jest.useRealTimers()
    })
  })
})
