-- Transaction Linking Feature Migration
-- Adds fields to support parent-child transaction relationships

-- Add linking columns to transactions table
ALTER TABLE transactions
ADD COLUMN parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
ADD COLUMN link_type TEXT CHECK (link_type IN ('auto', 'manual', 'suggested')),
ADD COLUMN link_confidence INTEGER CHECK (link_confidence >= 0 AND link_confidence <= 100),
ADD COLUMN link_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for parent_transaction_id lookups
CREATE INDEX idx_transactions_parent_id ON transactions(parent_transaction_id);

-- Add index for finding unlinked transactions
CREATE INDEX idx_transactions_unlinked ON transactions(user_id) WHERE parent_transaction_id IS NULL;

-- Add comment
COMMENT ON COLUMN transactions.parent_transaction_id IS 'Links child transactions to a parent transaction (e.g., Amazon items to credit card charge)';
COMMENT ON COLUMN transactions.link_type IS 'Type of link: auto (algorithm), manual (user), or suggested (pending)';
COMMENT ON COLUMN transactions.link_confidence IS 'Confidence score (0-100) for auto-matched links';
COMMENT ON COLUMN transactions.link_metadata IS 'Additional linking metadata (match scores, notes, etc.)';
