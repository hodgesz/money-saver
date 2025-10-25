# Alerts & Notifications System Design

**Phase**: 2.2 - Alerts & Notifications
**Priority**: P1 (High)
**Status**: In Development

---

## Overview

Implement a comprehensive alerts and notifications system to help users stay informed about their spending patterns, large purchases, budget status, and anomalies.

## Features

### 1. Large Purchase Alerts
- Configurable threshold for what constitutes a "large" purchase
- Real-time notifications when threshold is exceeded
- Transaction context included in alert

### 2. Anomaly Detection
- Identify unusual spending patterns based on historical data
- Alert on suspicious transactions
- Learn from user feedback (future enhancement)

### 3. Budget Warnings
- Alert when approaching budget limit (configurable threshold, default 80%)
- Notify when budget is exceeded
- Projected overspending warnings based on current trajectory

---

## Database Schema

### `alerts` Table (User Alert Settings)
Stores user preferences for alert configurations.

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('large_purchase', 'anomaly', 'budget_warning')),
  threshold DECIMAL(10, 2) NULL, -- Amount for large_purchase, percentage for budget_warning (e.g., 80.0)
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- Enable Row Level Security
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
  ON alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_type ON alerts(type);
```

### `alert_events` Table (Alert History)
Stores individual alert occurrences for display and tracking.

```sql
CREATE TABLE alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id UUID NULL REFERENCES alerts(id) ON DELETE SET NULL,
  transaction_id UUID NULL REFERENCES transactions(id) ON DELETE CASCADE,
  budget_id UUID NULL REFERENCES budgets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('large_purchase', 'anomaly', 'budget_warning')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NULL, -- Additional context data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own alert events"
  ON alert_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert events"
  ON alert_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert events"
  ON alert_events FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_alert_events_user_id ON alert_events(user_id);
CREATE INDEX idx_alert_events_type ON alert_events(type);
CREATE INDEX idx_alert_events_created_at ON alert_events(created_at DESC);
CREATE INDEX idx_alert_events_is_read ON alert_events(is_read);
CREATE INDEX idx_alert_events_transaction_id ON alert_events(transaction_id);
CREATE INDEX idx_alert_events_budget_id ON alert_events(budget_id);
```

---

## TypeScript Types

```typescript
// Alert Settings
export type AlertType = 'large_purchase' | 'anomaly' | 'budget_warning'
export type AlertSeverity = 'low' | 'medium' | 'high'

export interface Alert {
  id: string
  user_id: string
  type: AlertType
  threshold: number | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateAlertInput {
  type: AlertType
  threshold?: number
  is_enabled?: boolean
}

export interface UpdateAlertInput {
  threshold?: number
  is_enabled?: boolean
}

// Alert Events
export interface AlertEvent {
  id: string
  user_id: string
  alert_id: string | null
  transaction_id: string | null
  budget_id: string | null
  type: AlertType
  message: string
  severity: AlertSeverity
  is_read: boolean
  metadata: Record<string, any> | null
  created_at: string
}

export interface CreateAlertEventInput {
  alert_id?: string
  transaction_id?: string
  budget_id?: string
  type: AlertType
  message: string
  severity: AlertSeverity
  metadata?: Record<string, any>
}
```

---

## Service Architecture

### 1. Alert Settings Service (`lib/services/alertSettings.ts`)
CRUD operations for user alert preferences.

**Functions**:
- `getAlertSettings(userId: string): Promise<Alert[]>`
- `getAlertSettingByType(userId: string, type: AlertType): Promise<Alert | null>`
- `createAlertSetting(userId: string, input: CreateAlertInput): Promise<Alert>`
- `updateAlertSetting(id: string, input: UpdateAlertInput): Promise<Alert>`
- `deleteAlertSetting(id: string): Promise<void>`
- `initializeDefaultAlerts(userId: string): Promise<Alert[]>` - Create defaults on signup

### 2. Alert Detection Service (`lib/services/alertDetection.ts`)
Business logic to detect when alerts should be triggered.

**Functions**:
- `checkLargePurchaseAlert(userId: string, transaction: Transaction): Promise<AlertEvent | null>`
- `checkAnomalyAlert(userId: string, transaction: Transaction): Promise<AlertEvent | null>`
- `checkBudgetWarningAlert(userId: string, budgetId: string): Promise<AlertEvent | null>`
- `detectAnomalies(userId: string, transaction: Transaction): Promise<boolean>` - Statistical analysis
- `calculateBudgetStatus(userId: string, budgetId: string): Promise<{ spent: number, limit: number, percentage: number }>`

### 3. Alert Events Service (`lib/services/alertEvents.ts`)
Manage alert event history and notifications.

**Functions**:
- `getAlertEvents(userId: string, options?: { limit?: number, unreadOnly?: boolean }): Promise<AlertEvent[]>`
- `getAlertEventById(id: string): Promise<AlertEvent | null>`
- `createAlertEvent(userId: string, input: CreateAlertEventInput): Promise<AlertEvent>`
- `markAlertAsRead(id: string): Promise<AlertEvent>`
- `markAllAlertsAsRead(userId: string): Promise<void>`
- `deleteAlertEvent(id: string): Promise<void>`
- `getUnreadCount(userId: string): Promise<number>`

---

## UI Components

### 1. Alert Settings Page (`app/settings/alerts/page.tsx`)
Allow users to configure their alert preferences.

**Features**:
- Toggle alerts on/off
- Set large purchase threshold (dollar amount)
- Set budget warning threshold (percentage)
- Enable/disable anomaly detection

### 2. Alert Display Component (`components/features/AlertDisplay.tsx`)
Show active alerts and notification history.

**Features**:
- Notification bell icon with unread count badge
- Dropdown list of recent alerts
- Mark as read functionality
- Link to related transaction/budget
- Clear all alerts

### 3. Alert Toast/Modal (`components/features/AlertToast.tsx`)
Real-time alert notifications (future enhancement).

---

## Integration Points

### Transaction Creation/Import
When a transaction is created or imported:
1. Check large purchase alert threshold
2. Run anomaly detection against historical patterns
3. Update budget spending and check for budget warnings
4. Create alert events as needed

### Budget Updates
When budget spending changes:
1. Calculate current spending percentage
2. Check if threshold crossed (80%, 100%, etc.)
3. Create budget warning alert event

---

## Default Alert Settings

On user signup, initialize with sensible defaults:
- **Large Purchase**: Enabled, threshold $100.00
- **Anomaly Detection**: Enabled, threshold calculated from user data
- **Budget Warning**: Enabled, threshold 80%

---

## Testing Strategy

### Unit Tests
- Alert Settings service CRUD operations
- Alert Detection logic (thresholds, anomalies, budget calculations)
- Alert Events service operations

### Component Tests
- Alert Settings form interactions
- Alert Display rendering and interactions
- Mark as read functionality

### Integration Tests
- Complete alert flow: transaction → detection → event creation → display
- Budget spending → warning alert
- User preferences → alert behavior

---

## Future Enhancements

1. **Email Notifications**: Send alerts via email
2. **Push Notifications**: Browser/mobile push notifications
3. **Alert Frequency**: Daily digest option
4. **Machine Learning**: Improved anomaly detection with ML
5. **Custom Alert Rules**: User-defined alert conditions
6. **Alert Analytics**: Track alert effectiveness and user responses

---

## Implementation Checklist

- [ ] Database migrations for `alerts` and `alert_events` tables
- [ ] TypeScript types in `types/index.ts`
- [ ] Alert Settings service with tests
- [ ] Alert Detection service with tests
- [ ] Alert Events service with tests
- [ ] Alert Settings UI with tests
- [ ] Alert Display component with tests
- [ ] Integration with transaction creation
- [ ] Integration with budget updates
- [ ] Initialize default alerts on signup
- [ ] Documentation and PR

---

**Last Updated**: 2025-10-25
**Author**: Hive Mind Collective Intelligence System
