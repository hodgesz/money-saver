# Transaction Linking Debug Session - 2025-10-26

## 🎯 Goal
Link individual Amazon purchase line items to credit card charges so users can categorize each item (dog food, toilet paper, etc.) separately instead of lumping everything under "Amazon" category.

## ✅ What We've Accomplished

### 1. Fixed File Upload Limits
- **Issue**: 50MB ZIP file rejected due to 10MB limit
- **Fix**: Increased `MAX_FILE_SIZE` to 100MB in `lib/utils/fileValidation.ts`
- **Commit**: `d555fa8` - "feat: Increase file upload limit to 100MB"

### 2. Added Automatic Linking Integration
- **Issue**: Import page wasn't calling automatic linking after import
- **Fix**: Added `autoLinkAmazonTransactions()` call in import flow (app/transactions/import/page.tsx:349)
- **Commit**: `4f63bca` - "fix: Add automatic transaction linking to import flow"

### 3. Fixed Date Window for Matching
- **Issue**: 5-day window too restrictive (Amazon order date vs CC charge date can be 1-2 weeks apart)
- **Fix**: Increased `dateWindow` from 5 to 14 days in `lib/types/transactionLinking.ts`
- **Commit**: `ee4ac26` - "fix: Increase date window to 14 days for transaction linking"

### 4. Added Line-Item Mode for Amazon Parser
- **Issue**: Parser was aggregating items into order totals, user wants individual items for categorization
- **Fix**: Added `aggregateOrders` option (default: false) to import line items separately
- **New Function**: `convertLineItemToTransaction()` - converts each CSV line to separate transaction
- **Commit**: `ea0ac8c` - "feat: Add line-item mode for Amazon Export parser"

## 🔴 Current Issue: No Links Appearing in UI

### Symptoms
- User cleared database and re-imported Chase + Amazon data
- No blue expand arrows (▶) visible on transactions page
- No link suggestions panel at top of page

### Data Imported
- **Chase Credit Card**: ~395 transactions (Oct 2025)
  - Includes charges like "Amazon.com*NU7SY9GM0 $10.44", "AMZN Digital*..."
- **Amazon Export**: 12,000+ individual line items (2008-2025)
  - Each line item is now a separate transaction with ASIN

### Expected Behavior
1. After import, automatic linking should run
2. Chase credit card charges (parents) should link to Amazon line items (children) by:
   - Date proximity (within 14 days)
   - Amount matching (sum of children = parent)
3. Transactions page should show:
   - Blue ▶ arrow next to parent transactions
   - Expandable child items underneath
   - Link suggestions panel for medium-confidence matches

### What's NOT Working
- No `parent_transaction_id` values being set in database
- No blue arrows appearing in UI
- No suggestions panel showing

## 🔍 Debugging Steps for Tomorrow

### 1. Verify Automatic Linking Actually Ran
Check dev server logs from the import to confirm:
```bash
# Look for console output from autoLinkAmazonTransactions()
# Should see logging about matches found, links created
```

### 2. Check Database State
```sql
-- Check if any links were created
SELECT COUNT(*) as linked_count
FROM transactions
WHERE parent_transaction_id IS NOT NULL;

-- Check for potential parent transactions (Chase charges)
SELECT date, merchant, amount
FROM transactions
WHERE merchant ILIKE '%amazon%'
  AND merchant NOT LIKE 'Amazon'
ORDER BY date DESC
LIMIT 10;

-- Check for potential child transactions (Amazon line items)
SELECT date, merchant, description, amount
FROM transactions
WHERE merchant = 'Amazon'
ORDER BY date DESC
LIMIT 10;
```

### 3. Test Matching Algorithm Manually
Run the linking service manually on a small sample:
```typescript
// In browser console or Node script:
import { getLinkSuggestions } from '@/lib/services/transactionLinking'

const suggestions = await getLinkSuggestions(userId, 70)
console.log('Found', suggestions.length, 'potential matches')
console.log('Suggestions:', suggestions)
```

### 4. Check Date Alignment
Verify dates of Chase charges vs Amazon line items overlap:
```sql
-- Date range of Chase Amazon charges
SELECT MIN(date), MAX(date)
FROM transactions
WHERE merchant ILIKE '%amazon.com%' OR merchant ILIKE '%amzn%';

-- Date range of Amazon line items
SELECT MIN(date), MAX(date)
FROM transactions
WHERE merchant = 'Amazon';
```

### 5. Verify Import Actually Used Line-Item Mode
Check transaction descriptions:
```sql
-- Should see individual ASINs, not "2 items | ASINs: ..."
SELECT description
FROM transactions
WHERE merchant = 'Amazon'
LIMIT 10;
```

### 6. Add Debug Logging
Add console.log statements to:
- `autoLinkAmazonTransactions()` in `lib/services/automaticLinking.ts`
- `getLinkSuggestions()` in `lib/services/transactionLinking.ts`
- `findMatchingTransactions()` in `lib/services/transactionMatching.ts`

## 📁 Key Files Modified

### Parser Files
- `lib/services/parsers/amazonExportParser.ts` - Line-item mode added
- `app/transactions/import/page.tsx` - Automatic linking integration
- `lib/utils/fileValidation.ts` - File size limit increase
- `components/features/FileUpload.tsx` - UI file size message

### Linking Logic
- `lib/types/transactionLinking.ts` - Date window configuration
- `lib/services/automaticLinking.ts` - Auto-linking service (already existed)
- `lib/services/transactionLinking.ts` - Core linking functions (already existed)
- `lib/services/transactionMatching.ts` - Matching algorithm (already existed)

### UI Components
- `app/transactions/page.tsx` - Shows expand arrows and suggestions panel
- `components/features/LinkedTransactionRow.tsx` - Renders expandable rows
- `components/features/TransactionList.tsx` - Builds parent-child hierarchy
- `components/features/LinkSuggestionsPanel.tsx` - Shows matching suggestions

## 🤔 Possible Root Causes

### Theory 1: Automatic Linking Not Running
- Import completes but `autoLinkAmazonTransactions()` silently fails
- No error shown to user
- Check: Look for try/catch swallowing errors

### Theory 2: No Matches Found by Algorithm
- Date windows still don't overlap
- Amount totals don't match
- Merchant keywords don't match correctly
- Check: Run matching algorithm manually with debug output

### Theory 3: Links Created But Not Displayed
- Links exist in database but UI doesn't show them
- `getLinkSuggestions()` not fetching properly
- Child transactions not being grouped with parents
- Check: Query database directly for parent_transaction_id values

### Theory 4: Wrong Import Format
- Import still using aggregated mode somehow
- Line items not importing as expected
- Check: Verify transaction descriptions match line-item format

## 📊 Expected Data Flow

```
1. User imports Chase CSV
   └─> Creates parent transactions (credit card charges)
       Example: "Amazon.com*NU7SY9GM0" $52.31 on Oct 14

2. User imports Amazon ZIP
   └─> Creates child transactions (line items)
       Example: "Order: 114-1611703-7485021 | ASIN: B00JLNEWOC" $49.00 on Oct 14
       Example: "Order: 114-1611703-7485021 | ASIN: B0CRH8JXXV" $3.31 on Oct 14

3. Import calls autoLinkAmazonTransactions(userId)
   └─> getLinkSuggestions() finds potential matches
       └─> findMatchingTransactions() calculates scores
           └─> Groups children by date, sums amounts
           └─> Checks if sum matches parent within tolerance
           └─> Returns matches >= 70% confidence

4. High confidence (≥90%) auto-linked
   └─> Updates child transactions: parent_transaction_id = parent.id

5. Medium confidence (70-89%) shown as suggestions
   └─> User can accept/reject on transactions page

6. Transactions page loads
   └─> TransactionList groups children with parents
   └─> LinkedTransactionRow shows ▶ arrow for parents
   └─> Click arrow expands to show children
```

## 🎯 Success Criteria

When working correctly, user should see:
1. ✅ Import success message shows "✓ Automatically linked X transactions"
2. ✅ /transactions page shows blue ▶ arrows next to Chase charges
3. ✅ Clicking arrow expands to show individual Amazon items
4. ✅ Each child item shows confidence badge (EXACT, PARTIAL, MANUAL)
5. ✅ Unlink button available on child items
6. ✅ Suggestions panel shows medium-confidence matches
7. ✅ User can categorize individual items separately

## 📝 Next Session Action Plan

1. **Check logs** - Did automatic linking run? Any errors?
2. **Query database** - Are there any linked transactions?
3. **Run manual test** - Call getLinkSuggestions() directly
4. **Add debug logging** - Instrument the matching algorithm
5. **Verify line-item format** - Check transaction descriptions
6. **Test with small dataset** - 1 Chase charge, 2 Amazon items matching exactly

## 🔗 Related Documentation

- Amazon Export Parser: `docs/AMAZON_EXPORT_PARSER.md`
- UI Test Summary: `AMAZON_EXPORT_UI_TEST_SUMMARY.md`
- Original PRD: `docs/PRD.md`
- Testing Guide: `docs/TESTING.md`

---

**Status**: 🔴 **BLOCKED** - Links not appearing in UI after fresh import
**Priority**: HIGH - Core feature blocking user workflow
**Complexity**: Medium - Linking logic exists, needs debugging
**ETA**: 1-2 hours of focused debugging tomorrow

**Last Updated**: 2025-10-26 01:59 UTC
**Session Duration**: ~2 hours
**Files Changed**: 7 files, 5 commits
