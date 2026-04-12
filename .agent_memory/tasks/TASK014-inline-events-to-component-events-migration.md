# TASK014 - Inline Events To Component Events Migration

**Status:** In Progress  
**Added:** April 7, 2026  
**Updated:** April 12, 2026

## Original Request
Create comprehensive refactor tasks from all dashboard analysis.

## Thought Process
All active dashboards still have significant inline handlers (`onclick`, `onchange`, `oninput`) in HTML. This creates tight coupling and makes section extraction brittle. A cross-cutting task is needed to enforce event ownership inside components with custom-event communication.

## Implementation Plan
- [ ] Audit inline handlers by dashboard and section
- [ ] Move handlers into component class listeners
- [ ] Emit custom events for parent orchestration needs
- [ ] Remove global function dependencies from markup

## Progress Tracking

**Overall Status:** In Progress - 65%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 14.1 | Inline handler inventory | In Progress | Apr 12, 2026 | SysAdministration audited; extracted sections now handler-local |
| 14.2 | Convert handlers in extracted components | In Progress | Apr 12, 2026 | Converted SysAdministration user/service sections to component-local handlers; moved user-management API/edit/reset/delete/detail logic into `sa-user-accounts` |
| 14.3 | Introduce custom-event contracts | In Progress | Apr 12, 2026 | Added `sa-ui:toast` event bridge for component-to-parent messaging |
| 14.4 | Remove obsolete global handlers | In Progress | Apr 12, 2026 | Removed SysAdministration filter/dropdown/service globals and parent `UserManagement` class/bootstrap; cross-dashboard cleanup still pending |

## Progress Log
### April 7, 2026
- Task created from cross-dashboard inline-event density findings.

### April 12, 2026
- Completed a SysAdministration conversion slice by replacing inline section handlers in extracted sections (`petty-cash-config`, `notifications-config`, `system-logs`, `activity-tracking`) with component-local event delegation.
- Added component-to-parent custom event wiring (`sa-ui:toast`) in `pages/dashboard/sysadministration/script.js` for shared toast orchestration.
- Remaining inline handlers are primarily in modal markup and non-converted dashboard scopes; final global-handler cleanup remains tracked under subtask 14.4.

### April 12, 2026 (Cleanup Pass)
- Removed obsolete SysAdministration global handlers that were no longer referenced after section extraction.
- Kept parent-level helper contracts needed by component events (`viewUserDetails`, shared modal open/close flow).
- Confirmed no regressions with `VAL_STAGE=after` SysAdministration validation (desktop + mobile pass, no console/network regressions).

### April 12, 2026 (Modal + Handler Migration Pass)
- Replaced inline page modal blocks in SysAdministration with one-modal-per-component hosts and moved modal close/submit interactions into modal component files under `components/page-modals/`.
- Added `sa-edit-user-modal` so edit-user modal lifecycle no longer relies on runtime HTML string construction with inline close handlers.
- Removed remaining inline `onclick` usage from `sa-user-accounts`, `sa-service-config`, and dynamic user-row rendering in parent script by adopting `data-action` + component event delegation.
- Removed obsolete global handlers for user dropdown/filter UI and service-config actions from parent script.
- Re-validated `VAL_STAGE=before` and `VAL_STAGE=after` for SysAdministration scope (desktop + mobile) with no console/network regressions.

### April 12, 2026 (Final SysAdministration Global Cleanup)
- Removed the remaining parent-script `UserManagement` class and bootstrap from `pages/dashboard/sysadministration/script.js`.
- Migrated remaining user-management feature APIs and modal workflows into `pages/dashboard/sysadministration/components/sa-user-accounts.js`.
- Confirmed SysAdministration scope has no inline `onclick`/`onchange`/`oninput`/`onkeyup` attributes and no parent `UserManagement` runtime coupling.
- Re-ran SysAdministration validation (`VAL_STAGE=after`) for desktop + mobile: 2/2 passed, console warnings/errors = 0, failed network requests = 0.
