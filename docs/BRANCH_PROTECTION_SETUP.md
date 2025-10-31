# Branch Protection Setup Guide

## Overview

To enforce Git Flow and prevent accidental merges to production, configure these branch protection rules via GitHub Settings.

## How to Configure

1. Go to: **Settings** → **Branches** → **Branch protection rules**
2. Click **Add rule** for each branch below

---

## Main Branch Protection (`main`)

### Pattern
```
main
```

### Settings to Enable

#### Protect matching branches
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional)
  - ✅ Require approval of the most recent reviewable push

#### Status checks
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Search and add: **Test and Lint (20.x)**

#### Additional restrictions
- ✅ **Require conversation resolution before merging**
- ✅ **Require signed commits** (optional, recommended)
- ✅ **Require linear history** (optional, keeps clean history)
- ✅ **Do not allow bypassing the above settings**
  - ⚠️ **CRITICAL**: Check "Include administrators"
- ❌ Allow force pushes: **Nobody**
- ❌ Allow deletions: **Unchecked**

### Why These Settings?

- **Require PR + Approvals**: Ensures code review happens
- **Status checks**: Ensures all tests pass before merge
- **Include administrators**: Prevents using `--admin` flag to bypass (THIS IS KEY!)
- **No force pushes**: Protects commit history
- **Conversation resolution**: Ensures all PR comments are addressed

---

## Develop Branch Protection (`develop`)

### Pattern
```
develop
```

### Settings to Enable

#### Protect matching branches
- ✅ **Require a pull request before merging**
  - Require approvals: **0** (or 1 for extra safety)
  - ✅ Dismiss stale pull request approvals when new commits are pushed

#### Status checks
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Search and add: **Test and Lint (20.x)**

#### Additional restrictions
- ✅ **Require conversation resolution before merging**
- ✅ **Do not allow bypassing the above settings**
  - ✅ Check "Include administrators"
- ❌ Allow force pushes: **Nobody**
- ❌ Allow deletions: **Unchecked**

### Why These Settings?

- **Lower approval requirement**: Develop moves faster, but still requires PR
- **Status checks still required**: Quality gate before integration
- **Include administrators**: Consistent enforcement

---

## Feature Branch Naming

### Recommended Pattern (Optional)
```
feature/*
bugfix/*
hotfix/*
```

### Settings (Optional)
- ✅ **Require a pull request before merging**
- ✅ **Require status checks to pass before merging**

This prevents direct pushes to feature branches and ensures CI runs.

---

## Current Status

### ✅ Already Configured
- `main`: Has protection but **does NOT enforce for admins** ⚠️
- `develop`: Has protection and **enforces for admins** ✅

### ⚠️ Action Required
**Update `main` branch protection:**
1. Go to Settings → Branches → Edit rule for `main`
2. Scroll to "Do not allow bypassing the above settings"
3. ✅ **Check "Include administrators"**
4. Click **Save changes**

This prevents future use of `--admin` flag to bypass protections.

---

## Verification

After configuration, test that protection works:

```bash
# This should fail
git checkout main
echo "test" >> README.md
git commit -m "test"
git push origin main
# Expected: "protected branch hook declined"

# This should fail
gh pr create --base main --head feature/test
gh pr merge --admin <PR-NUMBER>
# Expected: "Cannot bypass required status checks"
```

---

## GitHub Settings Path

```
Repository → Settings → Branches → Branch protection rules
```

Or direct URL:
```
https://github.com/hodgesz/money-saver/settings/branches
```

---

## Questions?

If you have questions about branch protection settings, refer to:
- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Git Flow Guide](./GIT_FLOW_GUIDE.md)
