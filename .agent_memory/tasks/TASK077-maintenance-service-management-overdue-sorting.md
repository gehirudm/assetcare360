# [TASK077] - Maintenance Service Management Overdue Sorting

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Maintenance Manager Service Management section: add sorting options to sort by most overdue, etc.

## Thought Process
- Service Management currently supports status filtering and search, but no asset sorting controls.
- Add a dedicated asset sort dropdown in the section toolbar and keep default behavior backward-compatible.
- Include overdue-focused sort modes and verify with existing maintenance UI validation flow.

## Implementation Plan
- Add asset sort control to Service Management toolbar.
- Add state and change-handler support for asset sort selection.
- Implement sorting logic for: service priority, most overdue, least overdue, due-soon first, and A-Z.
- Extend Playwright maintenance validation to assert most-overdue sorting.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add asset sort UI control | Complete | 2026-04-20 | Added `maintenanceAssetSort` select with multiple sorting options in Service Management toolbar. |
| 1.2 | Implement asset sorting logic | Complete | 2026-04-20 | Added sort state/handlers and sorting comparators, including overdue-focused modes. |
| 1.3 | Validate with maintenance UI suite | Complete | 2026-04-20 | Added Playwright assertion for most-overdue sort and passed desktop/mobile suite. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/maintenance/components/maintenance-service-tickets.js`:
  - Added `currentAssetSort` state defaulting to `service-priority`.
  - Added `Sort Assets` dropdown (`maintenanceAssetSort`) with options:
    - Service Priority
    - Most Overdue First
    - Least Overdue First
    - Due Soon First
    - Asset Name (A-Z)
  - Added `set-asset-sort` event handling.
  - Added asset sorting pipeline (`sortAssets`, `compareByServicePriority`, `getAssetUrgencyRank`) used by filtered asset list rendering.
  - Kept default service-priority ordering behavior as baseline while enabling overdue-focused sorting options.
- Updated `testing/ui-validation/maintenance-remaining-sections/validate-maintenance-remaining-sections.spec.js`:
  - Added assertion that selecting `most-overdue` puts `MC702` first in the Service Management asset list.
- Validation evidence:
  - diagnostics: no errors for touched files.
  - `npx playwright test maintenance-remaining-sections/validate-maintenance-remaining-sections.spec.js --reporter=line` passed (desktop/mobile, 2/2).
