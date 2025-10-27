# Database Migrations

This directory contains SQL migration files for the Money Saver database schema.

## Applying Migrations

### Using Supabase CLI

1. Install Supabase CLI if not already installed:
```bash
npm install -g supabase
```

2. Link to your Supabase project:
```bash
supabase link --project-ref wudvwqumqzlviymxohta
```

3. Apply migrations:
```bash
supabase db push
```

### Manual Application via Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/wudvwqumqzlviymxohta
2. Navigate to SQL Editor
3. Copy the contents of the migration file
4. Paste and run the SQL

### Using MCP Supabase Tools

If you have Supabase MCP configured in Claude Code, you can execute migrations directly through the MCP tools.

## Migration Files

- `20251012_initial_schema.sql` - Initial database schema with tables for:
  - Categories (with pre-populated system categories)
  - Transactions
  - Budgets
  - Accounts
  - Alerts
  - Row Level Security (RLS) policies for all tables
  - Indexes for query performance
  - Automatic updated_at triggers

## Schema Overview

See [PRD.md](../../docs/PRD.md) for detailed schema documentation.
