# TASK014 - Inline Events To Component Events Migration

**Status:** Completed  
**Added:** April 7, 2026  
**Updated:** April 12, 2026

## Original Request
Create comprehensive refactor tasks from all dashboard analysis.

## Thought Process
All active dashboards still have significant inline handlers (`onclick`, `onchange`, `oninput`) in HTML. This creates tight coupling and makes section extraction brittle. A cross-cutting task is needed to enforce event ownership inside components with custom-event communication.

## Implementation Plan
- [x] Audit inline handlers by dashboard and section
- [x] Move handlers into component class listeners
- [x] Emit custom events for parent orchestration needs
- [x] Remove global function dependencies from markup

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 14.1 | Inline handler inventory | Complete | Apr 12, 2026 | Driver inventory completed; all active dashboard page HTML scopes now have zero inline handlers |
| 14.2 | Convert handlers in extracted components | Complete | Apr 12, 2026 | Driver section/modal interactions moved to component-local delegated handlers; no inline handler attributes remain in `pages/dashboard/driver/**` |
| 14.3 | Introduce custom-event contracts | Complete | Apr 12, 2026 | Added Driver custom-event contracts (`driver-ui:toast`, `driver:modal-open`, `driver:modal-close`, `driver:data-*`) for orchestration-only parent script wiring |
| 14.4 | Remove obsolete global handlers | Complete | Apr 12, 2026 | Driver root script reduced to orchestration-only; section/modal business logic removed from parent scope |

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

### April 12, 2026 (Maintenance Cost-Approvals Inline Event Migration Slice)
- Replaced inline cost-approvals section handlers in `pages/dashboard/maintenance/index.html` by extracting the section into `maintenance-cost-approvals` with component-local event delegation and state ownership.
- Extracted cost-approval modals into dedicated modal components (`maintenance-approve-cost-modal`, `maintenance-reject-cost-modal`, `maintenance-cost-details-modal`) and moved modal submit/close behavior into those components.
- Added parent bridge `maintenance-ui:toast` handling in `pages/dashboard/maintenance/script.js` and converted global cost-approval actions to orchestration wrappers that call component methods.
- Validated before/after behavior with `testing/ui-validation/maintenance-cost-approvals/validate-maintenance-cost-approvals.spec.js` (`VAL_STAGE=before` and `VAL_STAGE=after`: 2/2 desktop+mobile, no console/network regressions).

### April 12, 2026 (Maintenance Service-Reports Inline Event Migration Slice)
- Replaced inline service-report filter/action handlers by extracting `service-reports` into `maintenance-service-reports` with component-local delegated events (`data-action` patterns for filter/approve/view).
- Extracted report details modal into `maintenance-report-details-modal` and removed inline modal close handlers from page HTML.
- Reduced root maintenance script for this feature path to orchestration wrappers (`filterServiceReports`, `viewReportDetails`, `approveReport`, `reviewReport`) delegating to component methods.
- Validated before/after behavior with `testing/ui-validation/maintenance-service-reports/validate-maintenance-service-reports.spec.js` (`VAL_STAGE=before` and `VAL_STAGE=after`: 2/2 desktop+mobile, no console/network regressions).

### April 12, 2026 (Maintenance Remaining Sections Inline Event Migration Slice)
- Removed all remaining inline handlers from `pages/dashboard/maintenance/index.html` by extracting dashboard/fault-tickets/service-records/service-warranty/notifications into dedicated section components.
- Replaced inline maintenance modal blocks and close handlers with one-modal-per-component files (`maintenance-ticket-details-modal`, `maintenance-warranty-details-modal`, `maintenance-service-schedule-modal`, `maintenance-add-service-record-modal`) using component-local event handling.
- Converted remaining maintenance interaction flows to delegated `data-action` listeners and component method/event calls; no `onclick`/`onchange`/`oninput`/`onkeyup` attributes remain in `pages/dashboard/maintenance/**`.
- Reduced maintenance parent script to orchestration-only delegates, global modal utilities, and toast bridge.
- Validation evidence:
	- `maintenance-remaining-sections` `VAL_STAGE=before`: 2/2 passed (desktop + mobile)
	- `maintenance-remaining-sections` `VAL_STAGE=after`: 2/2 passed (desktop + mobile)
	- Regression reruns: `maintenance-cost-approvals` `VAL_STAGE=after` 2/2, `maintenance-service-reports` `VAL_STAGE=after` 2/2
	- Console warnings/errors: none
	- Failed network requests: none

### April 12, 2026 (Machinery Operator Inline Event Migration Slice)
- Removed inline handlers from `pages/dashboard/machinery-operator/index.html` by replacing inline section and modal markup with dashboard-scoped component hosts.
- Moved section interactions into component-local delegated events in:
	- `mo-dashboard-overview`
	- `mo-fault-reporting`
	- `mo-condition-updates`
	- `mo-ticket-tracking`
	- `mo-notifications`
- Replaced page modal handlers with one-modal-per-component files and modal-local logic:
	- `mo-report-fault-modal`
	- `mo-edit-fault-modal`
	- `mo-condition-update-modal`
	- `mo-machine-details-modal`
	- `mo-machine-breakdown-details-modal`
	- `mo-weekly-check-details-modal`
- Added event contracts for component-to-parent orchestration (`mo-ui:toast`, `mo:open-*`, `mo:fault-created`, `mo:fault-updated`, `mo:weekly-check-submitted`, `mo:notifications-count`).
- Reduced `pages/dashboard/machinery-operator/script.js` to orchestration-only responsibilities (auth/bootstrap, section refresh routing, modal bridges, toast/badge wiring).
- Validation evidence (`testing/ui-validation/machinery-operator-dashboard/validate-machinery-operator-dashboard.spec.js`):
	- `VAL_STAGE=before`: 2/2 passed (desktop + mobile)
	- `VAL_STAGE=after`: 2/2 passed (desktop + mobile)
	- Console warnings/errors: none in final after artifacts
	- Failed network requests: none in final after artifacts

### April 12, 2026 (Driver Inline Event Migration Closure)
- Removed all inline handlers from `pages/dashboard/driver/index.html` by replacing inline section and modal markup with dashboard-scoped section components and one-modal-per-component hosts.
- Converted Driver section interactions to component-local event handling in:
	- `driver-dashboard-overview`
	- `driver-trip-log`
	- `driver-vehicle-check`
	- `driver-breakdown`
	- `driver-fuel-mileage`
	- `driver-transport-ticket`
	- `driver-garages`
- Converted Driver modal interactions to modal-local handlers in all modal component files under `pages/dashboard/driver/components/page-modals/`.
- Added Driver custom-event contracts for parent orchestration and cross-component coordination (`driver-ui:toast`, `driver:modal-open`, `driver:modal-close`, `driver:data-trips-changed`, `driver:data-checks-changed`, `driver:data-breakdowns-changed`, `driver:data-summary-updated`).
- Reduced `pages/dashboard/driver/script.js` to orchestration-only responsibilities (auth/bootstrap, section refresh routing, shared toast bridge, modal escape close, periodic refresh).
- Validation evidence (`testing/ui-validation/driver-dashboard/validate-driver-dashboard.spec.js`):
	- `VAL_STAGE=before`: 2/2 passed (desktop + mobile)
	- `VAL_STAGE=after`: 2/2 passed (desktop + mobile)
	- Console warnings/errors: 0
	- Failed network requests: 0
