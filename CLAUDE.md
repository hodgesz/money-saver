# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Saver is an application for tracking spending to help with budgeting and saving money.

## Database & Backend

This project uses **Supabase** as its backend database and API platform.

### Supabase Configuration
- Project reference: `wudvwqumqzlviymxohta`
- MCP server is configured for database operations
- Access via the Supabase MCP tools available in Claude Code

### Database Design Considerations
When designing the database schema, consider:
- **Transactions table**: Track individual spending transactions with fields like amount, date, category, description, merchant
- **Categories table**: Organize spending into categories (groceries, utilities, entertainment, etc.)
- **Budgets table**: Set budget limits per category and time period
- **Users table**: Handled by Supabase Auth
- **Row Level Security (RLS)**: Enable RLS policies to ensure users can only access their own data

## Architecture

### Frontend Stack
- **Framework**: React with Next.js
- **UI/UX**: Web application designed for desktop and mobile browsers
- **State Management**: To be determined as complexity grows

### Development Tools
- **Chrome DevTools MCP Server**: Configured for debugging and testing the web application in real-time
- **Other MCP Servers**: Available for enhanced development and debugging capabilities

### Deployment Strategy
1. **Phase 1 - Local Development**: Develop and test locally with a local Supabase instance
2. **Phase 2 - Production Deployment**: Deploy to Supabase hosting when ready for production

### API Design
- Supabase REST API and Realtime for data operations
- Authentication flow with Supabase Auth
- Row Level Security (RLS) policies for data isolation

## Core Features

### Transaction Management
- **Transaction Import**: Upload transaction extracts from various sources (PDFs, CSV, Excel, etc.)
- **Bank Integration** (Future): Direct integration with credit card and checking account providers
- **Smart Parsing**: Break down complex transactions (e.g., Amazon orders with multiple items)
- **Receipt Management**: Attach and store receipts for individual transactions

### Analytics & Visualization
- **Charts and Graphs**: Visual representation of spending trends
- **Monthly Spend Reports**: Breakdown of expenses by category and time period
- **Category Analysis**: Insights into spending patterns across different categories

### Alerts & Notifications
- **Large Purchase Alerts**: Notifications when transactions exceed a threshold
- **Anomaly Detection**: Identify unusual spending patterns
- **Budget Warnings**: Alerts when approaching or exceeding budget limits

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access at http://localhost:3000
```

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Building for Production
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Database Migrations
- Use Supabase CLI for database migrations
- Run migrations locally before deploying to production
- Always test migrations on a development database first
