# TASK064 - SysAdmin User Accounts List and Filter Fix

**Status:** Completed  
**Added:** April 19, 2026  
**Updated:** April 19, 2026

## Original Request
"the users should shown in the system admin under the user accounts..the filtering system should be worked"

## Thought Process
The SysAdmin user-accounts component loaded only the first backend page (`/users` defaults to `limit=20`) and relied on strict role/status comparisons.

Likely failure modes:
- users missing from UI because only first page was fetched,
- filters failing for role spelling variants (`Machinary` vs `Machinery`),
- inactive filter failing when backend sends `is_active` as string (`'0'`/`'1'`).

## Implementation Plan
- [x] Update user loading to aggregate paginated `/users` responses.
- [x] Normalize role matching for filter comparisons.
- [x] Normalize `is_active` handling for boolean/number/string shapes.
- [x] Add/extend UI validation to assert inactive status filtering works.
- [x] Run targeted validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 64.1 | Fix user list loading depth | Complete | April 19, 2026 | Added paginated aggregation with `page` + `limit` and dedupe. |
| 64.2 | Fix role filter matching | Complete | April 19, 2026 | Added normalized role comparisons including `machinary`/`machinery` handling. |
| 64.3 | Fix status filter matching | Complete | April 19, 2026 | Added resilient `isUserActive()` parsing for bool/number/string values. |
| 64.4 | Validation coverage update | Complete | April 19, 2026 | Updated sysadmin transportation-manager UI spec with inactive-status assertion. |
| 64.5 | Execute validation | Complete | April 19, 2026 | Playwright targeted suite passed desktop + mobile. |

## Progress Log
### April 19, 2026
- Updated `pages/dashboard/sysadministration/components/sa-user-accounts.js`:
  - `loadUsers()` now fetches all pages (`limit=100`) and merges users before rendering.
  - Added `extractUsersFromResponse(...)` and `dedupeUsersById(...)`.
  - Added role normalization helpers (`normalizeRole`, `isRoleMatch`) to make role filtering robust.
  - Added `isUserActive(...)` parsing for mixed API value shapes and used it in render/status attributes.
  - Updated filter application to use normalized role matching and non-destructive list display restoration.
- Updated `testing/ui-validation/sysadmin-transportation-manager-role/validate-sysadmin-transportation-manager-role.spec.js`:
  - Added an inactive transportation manager fixture (`is_active: '0'`).
  - Added assertion that `statusFilter=inactive` returns visible transportation-manager rows.
- Validation evidence:
  - `node --check pages/dashboard/sysadministration/components/sa-user-accounts.js` passed.
  - `node --check testing/ui-validation/sysadmin-transportation-manager-role/validate-sysadmin-transportation-manager-role.spec.js` passed.
  - `VAL_STAGE=after npx playwright test sysadmin-transportation-manager-role/validate-sysadmin-transportation-manager-role.spec.js --reporter=line` passed (`2/2`).
  - `VAL_STAGE=after npx playwright test sysadmin-dashboard/validate-sysadmin-dashboard.spec.js --reporter=line` passed (`2/2`).
