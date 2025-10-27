-- Money Saver Initial Database Schema
-- Phase 1: MVP Tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- System categories (user_id is NULL for predefined categories)
INSERT INTO categories (user_id, name, color, icon) VALUES
    (NULL, 'Groceries', '#10b981', 'shopping-cart'),
    (NULL, 'Utilities', '#3b82f6', 'lightning-bolt'),
    (NULL, 'Entertainment', '#8b5cf6', 'film'),
    (NULL, 'Dining', '#f59e0b', 'utensils'),
    (NULL, 'Transportation', '#06b6d4', 'car'),
    (NULL, 'Healthcare', '#ef4444', 'heart'),
    (NULL, 'Shopping', '#ec4899', 'shopping-bag'),
    (NULL, 'Housing', '#6366f1', 'home'),
    (NULL, 'Income', '#22c55e', 'currency-dollar'),
    (NULL, 'Other', '#6b7280', 'dots-horizontal');

-- Accounts Table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card')),
    balance DECIMAL(12, 2),
    last_synced TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    merchant TEXT,
    description TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    receipt_url TEXT,
    is_income BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets Table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_id, period, start_date)
);

-- Alerts Table (for Phase 2+)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('large_purchase', 'anomaly', 'budget_warning')),
    threshold DECIMAL(12, 2),
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Categories
CREATE POLICY "Users can view system categories and their own categories"
    ON categories FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can create their own categories"
    ON categories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for Transactions
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transactions"
    ON transactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions"
    ON transactions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own transactions"
    ON transactions FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for Budgets
CREATE POLICY "Users can view their own budgets"
    ON budgets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own budgets"
    ON budgets FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own budgets"
    ON budgets FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own budgets"
    ON budgets FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for Accounts
CREATE POLICY "Users can view their own accounts"
    ON accounts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own accounts"
    ON accounts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own accounts"
    ON accounts FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own accounts"
    ON accounts FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for Alerts
CREATE POLICY "Users can view their own alerts"
    ON alerts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own alerts"
    ON alerts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own alerts"
    ON alerts FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own alerts"
    ON alerts FOR DELETE
    USING (user_id = auth.uid());

-- Functions for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
