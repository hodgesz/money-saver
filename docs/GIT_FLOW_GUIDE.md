# Git Flow Guide - Money Saver Project

## Overview

This project follows **Git Flow** branching strategy to maintain code quality and enable safe, controlled releases.

## Branch Structure

```
main (production)
  ↑
  └── develop (integration)
        ↑
        └── feature/* (new features)
        └── bugfix/* (bug fixes)
        └── hotfix/* (emergency fixes from main)
```

### Branch Descriptions

- **`main`** - Production-ready code only
  - Protected branch
  - All merges must pass CI
  - Only accepts PRs from `develop` (releases) or `hotfix/*`
  - Never commit directly to main

- **`develop`** - Integration branch for ongoing development
  - Protected branch
  - All merges must pass CI
  - Accepts PRs from `feature/*` and `bugfix/*` branches
  - Always ahead of `main` with new features

- **`feature/*`** - New feature development
  - Branch from: `develop`
  - Merge back to: `develop`
  - Naming: `feature/phase-X-Y-description`

- **`bugfix/*`** - Bug fixes for features in develop
  - Branch from: `develop`
  - Merge back to: `develop`
  - Naming: `bugfix/issue-number-description`

- **`hotfix/*`** - Emergency production fixes
  - Branch from: `main`
  - Merge to: `main` AND `develop`
  - Naming: `hotfix/critical-bug-description`

## Workflow

### 1. Starting New Feature Development

```bash
# Ensure develop is up to date
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/phase-2-5-budget-alerts

# Work on your feature...
git add .
git commit -m "feat: implement budget alert notifications"

# Push to remote
git push origin feature/phase-2-5-budget-alerts
```

### 2. Creating Pull Request

```bash
# Create PR targeting develop
gh pr create --base develop --head feature/phase-2-5-budget-alerts \
  --title "feat: Phase 2.5 Budget Alert Notifications" \
  --body "Implements real-time budget alerts when spending exceeds thresholds"
```

**IMPORTANT**: Always ensure PR base branch is `develop`, NOT `main`!

### 3. Merging Feature to Develop

After PR approval and CI passes:

```bash
# Merge PR (squash commits for clean history)
gh pr merge <PR-NUMBER> --squash --delete-branch
```

### 4. Creating Production Release

When `develop` is ready for production:

```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.5.0

# Update version numbers, CHANGELOG, etc.
# ... make any release-specific changes ...

# Create PR to main
gh pr create --base main --head release/v1.5.0 \
  --title "Release v1.5.0: Budget Alerts & Reports" \
  --body "Production release including:
- Phase 2.5 Budget Alerts
- Phase 2.4 Multi-Account Support
- Bug fixes and improvements"

# After PR approval and CI passes, merge to main
gh pr merge <PR-NUMBER> --squash --delete-branch

# Merge main back to develop to sync
git checkout develop
git merge main
git push origin develop

# Tag the release on main
git checkout main
git pull origin main
git tag -a v1.5.0 -m "Release v1.5.0: Budget Alerts & Reports"
git push origin v1.5.0
```

### 5. Emergency Hotfix

For critical production bugs:

```bash
# Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-data-loss

# Fix the bug
git commit -m "fix: prevent data loss in transaction deletion"

# Create PR to main
gh pr create --base main --head hotfix/critical-data-loss \
  --title "hotfix: Fix critical data loss bug" \
  --body "Emergency fix for production issue"

# After merge to main, also merge to develop
git checkout develop
git merge hotfix/critical-data-loss
git push origin develop
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, semicolons, etc)
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Examples
```
feat(transactions): add account filtering to transactions page
fix(dashboard): resolve chart rendering issue on mobile
docs: update Git Flow guide with hotfix workflow
test(analytics): add integration tests for report generation
```

## Branch Protection Rules

### Main Branch (`main`)
- ✅ Require pull request before merging
- ✅ Require approvals (1)
- ✅ Require status checks to pass (Test and Lint)
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing settings (enforce for administrators)
- ✅ Restrict pushes to administrators only
- ✅ Do not allow force pushes
- ✅ Do not allow deletions

### Develop Branch (`develop`)
- ✅ Require pull request before merging
- ✅ Require status checks to pass (Test and Lint)
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing settings (enforce for administrators)
- ✅ Do not allow force pushes
- ✅ Do not allow deletions

## Common Mistakes to Avoid

### ❌ DON'T: Create PR directly to main
```bash
gh pr create --base main  # WRONG!
```

### ✅ DO: Create PR to develop
```bash
gh pr create --base develop  # CORRECT!
```

### ❌ DON'T: Commit directly to main or develop
```bash
git checkout main
git commit -m "quick fix"  # WRONG!
```

### ✅ DO: Always use feature branches
```bash
git checkout -b feature/my-change
git commit -m "feat: add new feature"
gh pr create --base develop  # CORRECT!
```

### ❌ DON'T: Merge without CI passing
```bash
gh pr merge --admin  # WRONG! Bypasses checks
```

### ✅ DO: Wait for CI and use standard merge
```bash
# Wait for checks to pass
gh pr checks --watch
gh pr merge --squash  # CORRECT!
```

## Troubleshooting

### "PR is not mergeable: base branch policy prohibits the merge"
- Ensure CI checks have passed
- Ensure branch is up to date with base branch
- Don't use `--admin` flag to bypass protections

### Accidentally merged to main instead of develop
1. Don't panic - the code is safe
2. Sync develop with main via PR:
   ```bash
   git checkout -b chore/sync-main-to-develop
   git merge origin/main
   git push origin chore/sync-main-to-develop
   gh pr create --base develop --head chore/sync-main-to-develop
   ```
3. Going forward, always double-check base branch

### Need to update develop with main changes
```bash
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

## CI/CD Pipeline

All PRs must pass these checks before merging:
1. ✅ Linting (ESLint)
2. ✅ Type checking (TypeScript)
3. ✅ Unit tests (Jest)
4. ✅ Integration tests
5. ✅ Build succeeds

## Resources

- [Git Flow Original Article](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow vs Git Flow](https://lucamezzalira.com/2014/03/10/git-flow-vs-github-flow/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)

## Questions?

If you're unsure about any Git Flow process, ask before merging!
