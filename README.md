# Money Saver

A web-based personal finance application designed to help users track, analyze, and optimize their spending habits. Money Saver provides intelligent transaction management, comprehensive analytics, and proactive alerts to support better financial decision-making and improved savings outcomes.

## Product Vision

To create an intuitive, powerful financial tracking platform that transforms raw transaction data into actionable insights, helping users take control of their finances and achieve their savings goals.

## Features

### Phase 1: Core Features (MVP)

#### User Authentication & Profile Management
- User registration and login via Supabase Auth
- Email/password authentication with password reset
- Secure session management

#### Transaction Import & Management
- Upload transaction extracts (PDF, CSV, Excel)
- Drag-and-drop file upload interface
- Manual transaction creation and editing
- Sortable, filterable transaction table with search
- Support for both income and expenses

#### Category Management
- Pre-defined categories (groceries, utilities, entertainment, dining, transportation, etc.)
- Custom category creation and editing
- Auto-categorization based on merchant/description patterns
- Bulk re-categorization

#### Basic Budget Management
- Set monthly budget limits per category
- View budget vs. actual spending
- Budget period selection (weekly, monthly, quarterly)
- Budget templates for quick setup

#### Dashboard & Basic Analytics
- Overview of current month spending
- Category breakdown with charts
- Spending trends over time
- Budget status indicators

### Phase 2: Advanced Features

#### Intelligent Transaction Parsing
- **Amazon Transaction Breakdown**: Parse Amazon orders into individual line items
- **Receipt Management**: Upload and attach receipt images to transactions
- OCR for receipt data extraction

#### Alerts & Notifications
- **Large Purchase Alerts**: Configurable threshold notifications
- **Anomaly Detection**: Identify unusual spending patterns
- **Budget Warnings**: Alerts when approaching or exceeding budget limits

#### Advanced Analytics & Reporting
- Monthly spending trends and comparisons
- Category comparison over time
- Year-over-year analysis
- Export reports to PDF/CSV

#### Multi-Account Support
- Add multiple bank accounts and credit cards
- Account-level transaction filtering
- Cross-account analytics

### Phase 3: Integration & Advanced Intelligence

- Direct bank and credit card integration (via Plaid or similar)
- Automatic transaction sync
- Savings goals with progress tracking
- AI-powered spending recommendations
- Shared accounts and family features

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ with React 18+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts, Chart.js, or D3.js
- **State Management**: React Context API (Zustand or Redux as complexity grows)

### Backend & Database
- **Platform**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for receipts and uploaded files
- **APIs**: Supabase REST API and Realtime subscriptions
- **Project Reference**: `wudvwqumqzlviymxohta`

### Development Tools
- Chrome DevTools MCP Server for debugging
- Supabase MCP tools for database operations

## Database Schema

### Core Tables
- **Users**: Managed by Supabase Auth
- **Transactions**: Track individual spending with amount, date, category, merchant, description
- **Categories**: Organize spending (system and custom categories)
- **Budgets**: Set budget limits per category and time period
- **Accounts**: Support for multiple accounts (checking, savings, credit cards)
- **Alerts**: Configure notifications and alerts

### Security
- **Row Level Security (RLS)**: Enabled on all tables to ensure users can only access their own data
- Data encryption at rest
- Server-side validation for all inputs

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (for database and authentication)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/money-saver.git
cd money-saver

# Install dependencies
npm install

# Set up environment variables
# Create a .env.local file with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Run the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Available Scripts

```bash
# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint
```

### Database Migrations

- Use Supabase CLI for database migrations
- Run migrations locally before deploying to production
- Always test migrations on a development database first

```bash
# Example: Create a new migration
supabase migration new migration_name

# Apply migrations locally
supabase db push

# Reset local database (development only)
supabase db reset
```

## Development Roadmap

### Phase 1: MVP (Months 1-3)
- Project setup, authentication, database schema
- Transaction import and category management
- Basic dashboard and budget management

### Phase 2: Enhanced Features (Months 4-6)
- Advanced analytics with charts and graphs
- Alerts and notifications system
- Receipt management and Amazon transaction parsing

### Phase 3: Integration & Polish (Months 7-9)
- Bank integration exploration
- Multi-account support
- Performance optimization and security audit

### Phase 4: Launch & Beyond (Month 10+)
- Production deployment to Supabase
- User feedback and iterative improvements
- Savings goals, family features, mobile app consideration

## Architecture

### Frontend Structure
- **Pages**: Next.js app router for routing and SSR
- **Components**: Reusable React components
- **Hooks**: Custom hooks for data fetching and state management
- **Utils**: Helper functions and utilities

### Backend Architecture
- **Supabase REST API**: For CRUD operations
- **Supabase Realtime**: For real-time updates
- **Server-side Functions**: For file processing (PDF/CSV parsing)
- **Row Level Security**: Database-level security policies

### Deployment Strategy
1. **Phase 1**: Local development with local Supabase instance
2. **Phase 2**: Staging environment on Supabase
3. **Phase 3**: Production deployment on Supabase with monitoring

## Testing Strategy

- **Unit Tests**: Jest for component and utility testing
- **Integration Tests**: Testing Library for user flow testing
- **E2E Tests**: Playwright or Cypress for critical paths
- **Manual Testing**: User acceptance testing with real transaction files

## Performance Goals

- Page load time: < 2 seconds for dashboard
- Support for files up to 10MB
- Handle 1000+ concurrent users
- Efficient pagination (50-100 items per page)

## User Personas

### Budget-Conscious Professional
Working professionals (25-45) looking to reduce unnecessary spending, save for specific goals, and understand their spending patterns.

### Family Financial Manager
Household financial managers (30-50) tracking family spending, managing multiple accounts, and staying within budget.

## Contributing

This project is under active development. For details on the development process and contribution guidelines, please refer to the [CLAUDE.md](CLAUDE.md) file.

## Documentation

- [Product Requirements Document](docs/PRD.md) - Detailed feature specifications and requirements
- [CLAUDE.md](CLAUDE.md) - Development guidelines and project context
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## Future Enhancements

- Native mobile applications (iOS/Android)
- AI-powered predictive analytics
- Investment tracking
- Bill reminders
- Tax preparation exports
- Debt management tools
- Multi-currency and internationalization

## License

[Add your license information here]

## Contact

[Add contact information or links here]
