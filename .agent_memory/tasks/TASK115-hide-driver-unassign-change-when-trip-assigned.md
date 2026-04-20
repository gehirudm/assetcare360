# [TASK115] - Hide Driver Unassign/Change When Trip Assigned

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Transportation Manager Driver Assignment section: it is still possible to unassign a driver from a vehicle when they have an assigned trip. Do not show the Unassign/Change buttons; show that the driver already has a trip assigned.

## Thought Process
- Current Driver Assignment UI rendered `Change` and `Unassign` for every assigned driver without checking trip state.
- Backend already had unassign/replacement guards for active trips, but user asked specifically for a UI lock by hiding those buttons and presenting a visible reason.
- The UI needs trip-state context, so the component should evaluate `/trips` records per `(driver_id, vehicle_registration)` and treat assigned/active statuses as locked.

## Implementation Plan
- Extend TM driver-assignment component state with trip-lock mapping.
- Fetch trips during refresh and build lock keys for assigned/active statuses.
- Hide `Change`/`Unassign` actions when lock exists, and display lock badge/message.
- Add focused Playwright validation coverage for locked/unlocked/unassigned rows.
- Validate syntax, diagnostics, and before/after validation runs.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add assigned-trip lock state in TM driver assignment | Complete | 2026-04-20 | Added trip-lock map helpers and refresh-time trip fetch. |
| 1.2 | Hide Change/Unassign for locked rows | Complete | 2026-04-20 | Locked rows now render lock message instead of action buttons. |
| 1.3 | Show explicit lock reason in UI | Complete | 2026-04-20 | Added lock badge + lock message text for assigned-trip rows. |
| 1.4 | Add UI validation coverage | Complete | 2026-04-20 | Added new Playwright spec for TM driver assignment lock states. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/transportation-manager/components/driver-assignment/script.js`:
  - added trip-lock state (`_assignedTripLocks`) with helper methods.
  - refresh now fetches `/trips` and builds `(driver_id:number_plate)` lock keys for statuses: `Assigned`, `Pending`, `Accepted`, `In Progress`.
  - guarded click handlers so `change`/`unassign` actions do nothing when the row is locked.
  - changed row rendering:
    - locked assigned rows hide `Change` and `Unassign` buttons.
    - locked rows show lock badge and message: driver already has an assigned trip.
- Added validation spec:
  - `testing/ui-validation/transportation-manager-driver-assignment/validate-transportation-manager-driver-assignment.spec.js`.
  - validates locked row has lock indicators and no `change/unassign`, unlocked row still has actions, unassigned row has assign button.
- Validation evidence:
  - `node --check pages/dashboard/transportation-manager/components/driver-assignment/script.js` passed.
  - `node --check testing/ui-validation/transportation-manager-driver-assignment/validate-transportation-manager-driver-assignment.spec.js` passed.
  - diagnostics clean for touched files.
  - `VAL_STAGE=before` Playwright run passed (1/1).
  - `VAL_STAGE=after` Playwright run passed (1/1).
