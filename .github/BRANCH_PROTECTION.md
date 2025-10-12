# Branch Protection Setup

To enforce that tests must pass before merging pull requests, follow these steps:

## Enable Branch Protection Rules

1. Go to your GitHub repository
2. Navigate to **Settings** > **Branches**
3. Click **Add branch protection rule**
4. Configure the following settings:

### Branch Name Pattern
- For main branch: `main`
- For develop branch: `develop`

### Protection Settings

#### Require a pull request before merging
- ✅ Enable this option
- Optionally: Require approvals (recommended: at least 1)

#### Require status checks to pass before merging
- ✅ Enable this option
- ✅ **Require branches to be up to date before merging**
- Search and select the following status checks:
  - `Test and Lint` (from the CI workflow)

#### Additional Recommended Settings
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

### Apply the Rules
Click **Create** or **Save changes** to apply the branch protection rules.

## What This Protects

With these settings enabled:
- All code changes must go through pull requests
- The CI workflow must complete successfully (tests pass, lint passes, build succeeds)
- PRs cannot be merged if the CI checks fail
- Branches must be up to date with the target branch before merging

## Testing the Setup

1. Create a new branch: `git checkout -b test-ci`
2. Make a change that breaks a test
3. Push and create a pull request
4. Verify that the CI runs and the merge button is blocked until tests pass
