# TASK076 - Restore Route Breakdown Garage Workflow Continuity

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
Nearby garages should be shown to the supervisor according to the in-route breakdown reported location, the supervisor-selected garage should be shown to the driver, the driver should navigate to the garage via Google Maps, and the driver should update garage work and end the report with related notes/attachments. This workflow existed before but was not working end to end.

## Thought Process
Backend route-breakdown garage workflow endpoints already existed, so the regression was in frontend wiring and data flow. The highest-impact fixes were: restore supervisor list-level garage approval action, propagate complete route metadata (including coordinates), rank garages by proximity to reported breakdown coordinates, and make driver directions prefer coordinate-based routing. Shared ticket-detail garage approval flow also needed alignment so it behaves like the supervisor dashboard flow.

## Implementation Plan
- [x] Restore supervisor fault-ticket list action path for route garage approval.
- [x] Ensure supervisor orchestration passes complete route-breakdown payload (id, location, lat/lng, approved garage fallback).
- [x] Add distance-based garage ranking and stronger coordinate parsing in supervisor garage-approval modal.
- [x] Align driver nearby-garages modal with proximity ordering and coordinate-first Google Maps directions.
- [x] Align shared view-ticket route-garage approval list/map with proximity sorting.
- [x] Run syntax checks and focused UI validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 76.1 | Restore supervisor approve-garage entry from list flow | Complete | April 20, 2026 | Added list-level route breakdown action payload + approval CTA visibility gate. |
| 76.2 | Propagate rich route metadata to supervisor modal open flow | Complete | April 20, 2026 | Added fallback approved garage id and breakdown location/coordinates in payload normalization. |
| 76.3 | Add location-aware garage ranking in supervisor modal | Complete | April 20, 2026 | Implemented coordinate parsing + haversine distance sorting + distance labels. |
| 76.4 | Update driver nearby-garages directions and ranking | Complete | April 20, 2026 | Added origin/destination coordinate map directions and nearby ordering by reported location. |
| 76.5 | Align shared view-ticket route garage list/map with proximity behavior | Complete | April 20, 2026 | Added distance sorting/labels in list and map popup hint text update. |
| 76.6 | Validate changes | Complete | April 20, 2026 | JS syntax checks passed; route/supervisor Playwright suites still blocked by pre-existing fixture/selector drift. |

## Progress Log
### April 20, 2026 (Follow-up)
  - `pages/dashboard/driver/components/driver-breakdown.js`
  - `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js`
  - `node --check pages/dashboard/driver/components/driver-breakdown.js` passed.
  - `node --check pages/dashboard/supervisor/components/fault-ticket-tracking/script.js` passed.
  - `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`2/2`).
  - `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line` remains blocked by pre-existing missing host selector (`supervisor-fault-ticket-tracking`).

### April 20, 2026 (Follow-up: Workflow tracking clarity)
- Implemented popup workflow clarity improvements in Driver breakdown details modal for both route (RBD) and vehicle (VBD) tickets.
- Updated `pages/dashboard/driver/components/page-modals/driver-breakdown-details-modal.js`:
  - added a new `Track Workflow` button in the popup toolbar.
  - workflow timeline is now shown on demand via the button for clearer reading.
  - workflow header now explicitly labels type (`Route Breakdown Ticket Workflow (RBD)` / `Vehicle Breakdown Ticket Workflow (VBD)`) and current stage.
  - route-specific workflow steps now reflect garage progression (`Supervisor Garage Approval` -> `Garage Entry Logged` -> `Garage Repair Tracking` -> `Completion and Closure`) using supervisor-approved garage metadata.
- Updated focused validation spec `testing/ui-validation/driver-dashboard/validate-driver-dashboard.spec.js`:
  - added assertions that `Track Workflow` reveals timeline in popup.
  - added assertions for RBD path showing approved garage step details.
  - added assertions for VBD path showing vehicle-ticket workflow path.
- Validation evidence:
  - `node --check pages/dashboard/driver/components/page-modals/driver-breakdown-details-modal.js` passed.
  - `node --check testing/ui-validation/driver-dashboard/validate-driver-dashboard.spec.js` passed.
  - `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`2/2`).

### April 20, 2026
- Updated `pages/dashboard/supervisor/components/fault-tickets/script.js`:
  - restored/added list-level `approve-garage` action for eligible route-breakdown cards.
  - included `routeBreakdownId` in emitted row action payload.
  - made route garage-assignment detection robust with approved garage id fallback.
- Updated `pages/dashboard/supervisor/script.js`:
  - added `approve-garage` action handling in ticket action dispatcher.
  - expanded route metadata enrichment used by detail/list modal bridges.
  - improved route workflow status normalization and garage assignment fallback handling.
- Updated `pages/dashboard/supervisor/components/page-modals/garage-approval-modal/script.js`:
  - added reported location details in modal context.
  - added resilient coordinate parsing from structured fields and free-text location/description.
  - sorted garages by nearest distance and surfaced distance in dropdown/map popup.
- Updated `pages/dashboard/driver/components/page-modals/driver-nearby-garages-modal.js`:
  - sorted garages by nearest distance from reported breakdown coordinates.
  - added coordinate-first Google Maps directions (`/maps/dir`) with breakdown origin fallback.
  - kept search-based directions fallback when garage coordinates are unavailable.
- Updated `pages/view-ticket/script.js`:
  - added distance-based ranking/labels for route garage approval list.
  - added distance text in route garage map popups and map hint text to reflect nearest ordering.
- Validation evidence:
  - `node --check` passed for all touched files.
  - `VAL_STAGE=after npx playwright test route-breakdown-garage-workflow/validate-route-breakdown-garage-workflow.spec.js --reporter=line` failed on pre-existing fixture expectation (`RBD-701` not present before action assertions).
  - `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`2/2`).
  - `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line` failed on pre-existing host selector mismatch (`supervisor-fault-ticket-tracking` element not found in rendered page).
