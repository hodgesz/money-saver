# Git Workflow

## Branching Strategy

This project uses a **GitHub Flow with Development Branch** strategy for early-stage development.

### Main Branches

- **`main`** - Production-ready code only
  - Always deployable
  - Protected branch (requires PR review)
  - Merges only from `develop` via PR

- **`develop`** - Active development and integration branch
  - All feature branches branch from here
  - All completed features merge back here
  - Integration testing happens here
  - When stable, merge to `main` for release

### Feature Branches

Create feature branches from `develop` using this naming convention:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

#### Branch Naming Conventions

- `feature/*` - New features (e.g., `feature/transaction-ui`, `feature/budget-alerts`)
- `fix/*` - Bug fixes (e.g., `fix/auth-redirect`, `fix/csv-import`)
- `chore/*` - Maintenance tasks (e.g., `chore/update-deps`, `chore/add-tests`)
- `docs/*` - Documentation updates (e.g., `docs/api-documentation`)

### Workflow Steps

#### 1. Starting New Work

```bash
# Make sure you're on develop and up to date
git checkout develop
git pull origin develop

# Create your feature branch
git checkout -b feature/transaction-import

# Do your work, commit frequently
git add .
git commit -m "feat: add CSV parsing for transaction import"
```

#### 2. Committing Changes

Use **Conventional Commits** format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks (dependencies, config)
- `refactor:` - Code refactoring (no functional changes)
- `test:` - Adding or updating tests
- `style:` - Formatting, white-space, etc.

Examples:
```
feat: add transaction filtering by date range
fix: correct budget calculation for monthly limits
docs: update README with setup instructions
chore: upgrade Next.js to v14
refactor: extract transaction logic to separate service
```

#### 3. Running Security Review

Before creating a PR, run a security review using Claude Code:

```bash
# In Claude Code, run the security review command
/security-review

# Review the findings and address any HIGH or MEDIUM severity issues
# Document any accepted risks or false positives in PR description
```

#### 4. Creating a Pull Request

```bash
# Push your branch to GitHub
git push -u origin feature/transaction-import

# Create a PR on GitHub targeting 'develop'
# Fill out the PR template with description and testing notes
# Include security review results or confirmation that review was clean
```

#### 5. Code Review Process

- All PRs require at least one approval before merging
- Address review comments by pushing new commits to your branch
- Keep PRs focused and reasonably sized (< 400 lines when possible)
- Include tests with your changes

#### 6. Merging

```bash
# After PR approval, merge using GitHub's "Squash and merge" option
# Delete the feature branch after merging
```

#### 7. Releasing to Production

When `develop` is stable and ready for release:

```bash
# Create a PR from develop to main
git checkout main
git pull origin main
git checkout -b release/v1.0.0

# Create PR: release/v1.0.0 -> main
# After approval and merge, tag the release
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Branch Protection Rules

### For `main` branch:
- Require pull request reviews before merging
- Require status checks to pass (tests, linting)
- No direct pushes allowed
- Require branches to be up to date before merging

### For `develop` branch:
- Require pull request reviews before merging
- Require status checks to pass
- Allow force pushes (use with caution)

## Best Practices

1. **Commit Often**: Make small, logical commits with clear messages
2. **Pull Before Push**: Always pull latest changes before pushing
3. **Keep Branches Short-Lived**: Aim to merge feature branches within 1-3 days
4. **Update from Develop**: Regularly sync your feature branch with develop
   ```bash
   git checkout feature/your-feature
   git fetch origin
   git rebase origin/develop
   ```
5. **Run Security Reviews**: Always run `/security-review` before creating PRs
6. **Clean Up**: Delete merged branches to keep repository tidy
7. **Write Tests**: Include tests with new features (follow TDD methodology)
8. **Update Documentation**: Keep docs in sync with code changes

## Hotfix Process

For urgent production fixes:

```bash
# Branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-auth-bug

# Make your fix
git add .
git commit -m "fix: resolve authentication bypass vulnerability"

# Push and create PR to main
git push -u origin fix/critical-auth-bug

# After merging to main, also merge to develop
git checkout develop
git pull origin main
```

## Getting Help

- Questions about workflow? Check this document first
- Unsure about a merge? Ask for a review
- Complex rebases? Consider using `git merge` instead
- Need to undo something? `git reflog` is your friend
