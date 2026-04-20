# TASK075 - Fix Ticket-Detail Return Button Size Bleed Across Dashboards

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
In all dashboards that have a view ticket details view, once the user goes into the view ticket details view and comes back, the buttons on the fault tickets list size increases. Fix it across all dashboards.

## Thought Process
The size bleed was caused by shared `pages/view-ticket/style.css` and inline style injection into `document.head` from embedded detail host components. Some dashboards cleaned those injected styles on `closeView()`, while others did not. The safe cross-dashboard fix is to standardize style marker scoping and explicit head-style cleanup in each embedded ticket-detail host.

## Implementation Plan
- [x] Identify all dashboard embedded ticket-detail hosts that load shared view-ticket assets.
- [x] Add scoped style marker getters per host to avoid shared marker collisions.
- [x] Add `cleanupViewTicketAssets()` in each host and call it from `closeView()`.
- [x] Run syntax checks and focused UI validation suites.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 75.1 | Enumerate all affected dashboard ticket-detail hosts | Complete | April 20, 2026 | Confirmed hosts: supervisor, technical-officer, driver, machinery-operator. |
| 75.2 | Apply cleanup pattern to missing hosts | Complete | April 20, 2026 | Patched technical-officer, driver, and machinery-operator hosts; supervisor already had cleanup. |
| 75.3 | Validate code quality and UI behavior | Complete | April 20, 2026 | `node --check` passed for all touched files; TO/Driver Playwright suites passed; MO suite failed on pre-existing auth redirect fixture issue. |

## Progress Log
### April 20, 2026 (Follow-up)
- Addressed follow-up regression where button-size bleed could still appear when users left `ticket-details` via section navigation paths that did not emit the detail back event.
- Updated orchestration scripts to enforce cleanup on any non-detail section activation:
  - `pages/dashboard/technical-officer/script.js`
  - `pages/dashboard/driver/script.js`
  - `pages/dashboard/machinery-operator/script.js`
  - `pages/dashboard/supervisor/script.js`
- Added section-change guards that call `closeView()` when the active section is not `ticket-details` (and for supervisor also `breakdown-details` cleanup).
- Validation evidence:
  - `node --check` passed for all touched dashboard scripts.
  - `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`4/4`).
  - `machinery-operator-dashboard` suite remains blocked by pre-existing auth redirect to `/auth/login.html`.
  - `supervisor-fault-ticket-tracking` suite remains blocked by pre-existing missing host selector (`supervisor-fault-ticket-tracking`).

### April 20, 2026
- Updated `pages/dashboard/technical-officer/components/ticket-details/script.js`:
  - added scoped getters for style marker IDs (`detailStyleLinkId`, `detailOverridesStyleLinkId`, `detailInlineStyleId`).
  - switched style/inline injection calls to those scoped IDs.
  - added `cleanupViewTicketAssets()` and called it in `closeView()`.
- Updated `pages/dashboard/driver/components/ticket-details/script.js`:
  - added scoped getters for style marker IDs.
  - switched style/inline injection calls to scoped IDs.
  - added `cleanupViewTicketAssets()` and called it in `closeView()`.
- Updated `pages/dashboard/machinery-operator/components/ticket-details/script.js`:
  - added scoped getters for style marker IDs.
  - switched style/inline injection calls to scoped IDs.
  - added `cleanupViewTicketAssets()` and called it in `closeView()`.
- Validation evidence:
  - `node --check pages/dashboard/technical-officer/components/ticket-details/script.js` passed.
  - `node --check pages/dashboard/driver/components/ticket-details/script.js` passed.
  - `node --check pages/dashboard/machinery-operator/components/ticket-details/script.js` passed.
  - `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`4/4`).
  - `VAL_STAGE=after npx playwright test machinery-operator-dashboard/validate-machinery-operator-dashboard.spec.js --reporter=line` failed on pre-existing redirect to `/auth/login.html` before list assertions (not caused by the style-cleanup patch).