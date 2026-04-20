# [TASK087] - Inventory Insurance Scheduled Filter and Sorting

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Filter section add Scheduled filter, Add sorting options.

## Thought Process
- The Inventory Manager request targets Insurance Management filters and list ordering behavior.
- Existing renewal-state logic already labeled future renewals as `Scheduled` but did not expose a dedicated filter button.
- Sorting should be user-controllable from the same controls area and should support date-, status-, and name-based ordering without changing backend contracts.

## Implementation Plan
- Add a `Scheduled` filter control and wire it to renewal-state filtering.
- Add sort dropdown controls and comparators for common list ordering options.
- Update section styles for the new sort controls and scheduled status chip.
- Extend Playwright validation to cover Scheduled filter behavior and sorting behavior.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add Scheduled filter | Complete | 2026-04-20 | Added Scheduled filter button and renewal-state key alignment.
| 1.2 | Add sorting options | Complete | 2026-04-20 | Added sort select and comparators (nearest/farthest renewal, status priority, asset name A-Z/Z-A).
| 1.3 | Validate UI behavior | Complete | 2026-04-20 | Playwright after-stage suite updated and passed desktop/mobile.

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/inventory-manager/components/insurance-management/script.js`:
  - added `Scheduled` filter button in controls.
  - added sort control state (`currentSort`), `#insuranceSort` listener, and `sortAssets(...)` comparators.
  - aligned renewal-state key for future renewals to `scheduled` and kept missing renewals sorted last.
- Updated `pages/dashboard/inventory-manager/components/insurance-management/style.css`:
  - added control layout styles for sort label/select.
  - added `.insurance-status-chip.scheduled` visual state.
- Updated `testing/ui-validation/inventory-insurance-management/validate-inventory-insurance-management.spec.js`:
  - expanded fixtures with a scheduled renewal asset.
  - added assertions for `Scheduled` filter and `asset-name-desc` sorting behavior.
  - persisted new interaction-summary fields for scheduled filter count and first sorted item.
  - aligned `VAL_STAGE=before` baseline assertions to current dashboard baseline (Insurance Management is now expected to be present).
- Validation evidence:
  - diagnostics clean for touched files.
  - `cd testing/ui-validation && VAL_STAGE=before npx playwright test inventory-insurance-management/validate-inventory-insurance-management.spec.js` passed (desktop/mobile, 2/2).
  - `cd testing/ui-validation && VAL_STAGE=after npx playwright test inventory-insurance-management/validate-inventory-insurance-management.spec.js` passed (desktop/mobile, 2/2).
