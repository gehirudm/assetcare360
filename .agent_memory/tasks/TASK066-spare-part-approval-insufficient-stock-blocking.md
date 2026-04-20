# TASK066 - Spare Part Approval Insufficient Stock Blocking

**Status:** Completed  
**Added:** April 19, 2026  
**Updated:** April 19, 2026

## Original Request
in the form of approve or reject in the requested spareparts. if there is no enough spareparts that should be shown and warning should be there and cannot approve

## Thought Process
The Inventory Manager approve flow already showed stock details in UI, but backend approval still allowed stock deduction without a hard re-check. This allowed edge cases where approval could pass even when stock was insufficient (especially with changing stock or aggregated quantities).

The fix needed both frontend and backend enforcement:
- Frontend warning and disabled approval state in the form.
- Backend hard-stop so approval cannot proceed when stock is insufficient.

## Implementation Plan
- [x] Confirm current approve/reject modal behavior and availability endpoint responses.
- [x] Strengthen frontend approve form blocking logic and warning details for unavailable items.
- [x] Enforce backend approval stock validation before updating request status or deducting inventory.
- [x] Ensure availability checking accounts for total requested quantity per part code.
- [x] Add/update targeted UI validation to prove blocked approval behavior.
- [x] Run syntax checks, diagnostics, and Playwright validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 66.1 | Analyze approve/reject stock flow | Complete | April 19, 2026 | Confirmed frontend-only check and missing backend enforcement gap. |
| 66.2 | Harden frontend blocked-approval UI | Complete | April 19, 2026 | Added blocking statuses, warning list, and disabled approval state with no submit path. |
| 66.3 | Add backend approval hard-stop | Complete | April 19, 2026 | Added stock validation with row locking and unavailable-item errors before approval commit. |
| 66.4 | Improve availability check accuracy | Complete | April 19, 2026 | check-availability now evaluates total requested quantity per part code. |
| 66.5 | Validate with UI automation | Complete | April 19, 2026 | Updated Playwright suite verifies stock warning visibility and blocked approval behavior. |
| 66.6 | Run checks and diagnostics | Complete | April 19, 2026 | PHP lint, node --check, diagnostics, and focused Playwright all passed. |

## Progress Log
### April 19, 2026
- Updated `pages/dashboard/inventory-manager/components/orders-approvals/script.js`:
  - Added stricter blocked statuses (`not_found`, `out_of_stock`, `insufficient`, `invalid`, `unknown`) for approval gating.
  - Improved availability mapping robustness and warning details per unavailable part.
  - Ensured approve form shows a clear warning and no submit action when stock is insufficient.
  - Added backend-error handling path that refreshes availability form when approval is rejected for stock issues.
- Updated `app/services/SparePartRequestService.php`:
  - Added pre-approval stock validation with inventory row locks (`FOR UPDATE`) and aggregated requested quantities.
  - Blocked approval when unavailable items exist and returned structured `unavailable_items` details.
  - Deducted stock only after validation passes.
- Updated `app/controllers/SparePartRequestController.php`:
  - Improved `/spare-part-requests/check-availability` to account for total requested quantity per part code.
- Updated targeted UI validation:
  - `testing/ui-validation/inventory-orders-approvals/validate-inventory-orders-approvals.spec.js`
  - Added assertions for warning visibility, blocked approve button, and zero approve API calls while blocked.
- Validation evidence:
  - `php -l app/services/SparePartRequestService.php` passed.
  - `php -l app/controllers/SparePartRequestController.php` passed.
  - `node --check pages/dashboard/inventory-manager/components/orders-approvals/script.js` passed.
  - `node --check testing/ui-validation/inventory-orders-approvals/validate-inventory-orders-approvals.spec.js` passed.
  - `VAL_STAGE=after npx playwright test inventory-orders-approvals/validate-inventory-orders-approvals.spec.js --reporter=line` passed (`2/2`).
