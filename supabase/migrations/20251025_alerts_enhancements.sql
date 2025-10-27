-- Alerts System Enhancements
-- Phase 2.2: Alerts & Notifications
-- Created: 2025-10-25

-- Add updated_at column and unique constraint to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE alerts ADD CONSTRAINT unique_user_alert_type UNIQUE (user_id, type);

-- Add trigger for updated_at on alerts
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index on alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

-- Create alert_events table for alert history
CREATE TABLE IF NOT EXISTS alert_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('large_purchase', 'anomaly', 'budget_warning')),
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on alert_events
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_events
CREATE POLICY "Users can view their own alert events"
    ON alert_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert events"
    ON alert_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert events"
    ON alert_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert events"
    ON alert_events FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance on alert_events
CREATE INDEX idx_alert_events_user_id ON alert_events(user_id);
CREATE INDEX idx_alert_events_type ON alert_events(type);
CREATE INDEX idx_alert_events_created_at ON alert_events(created_at DESC);
CREATE INDEX idx_alert_events_is_read ON alert_events(is_read);
CREATE INDEX idx_alert_events_transaction_id ON alert_events(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX idx_alert_events_budget_id ON alert_events(budget_id) WHERE budget_id IS NOT NULL;
CREATE INDEX idx_alert_events_unread_user ON alert_events(user_id, is_read) WHERE is_read = FALSE;
