# [TASK057] - Fix TM Assign-Driver Availability Labeling

**Status:** Completed  
**Added:** 2026-04-19  
**Updated:** 2026-04-19

## Original Request
- In the Transportation Manager "Assign Driver to Vehicle" modal, do not show a driver as `Available` when the driver is already assigned to another vehicle or has active trips.

## Thought Process
- The modal workload chip currently derives `Available` strictly from `active_trip_count === 0`.
- Driver assignment to another vehicle is loaded separately from `/vehicles/with-drivers`, so this condition was not part of status-chip logic.
- The fix should be UI-only and preserve backend assignment behavior (reassign is still allowed by design).

## Implementation Plan
- Update modal status computation to evaluate both active trips and assignment-to-other-vehicle.
- Ensure `Available` is only rendered when both conditions are clear.
- Keep existing current-driver badge behavior unchanged.
- Validate with editor diagnostics.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Locate assign-driver status rendering logic | Complete | 2026-04-19 | Confirmed logic in `pages/dashboard/transportation-manager/components/page-modals/tm-assign-driver-modal.js`. |
| 1.2 | Implement combined availability condition | Complete | 2026-04-19 | `Available` now requires no active trips and no assignment to another vehicle. |
| 1.3 | Validate updated component behavior | Complete | 2026-04-19 | `get_errors` reports no issues; Playwright `VAL_STAGE=after` TM fuel/fleet validation passed (`1/1`). |
| 1.4 | Remove assignment warning row text | Complete | 2026-04-19 | Removed caution warning row `Assigned to: ...` while preserving workload chip and current badge behavior. |

## Progress Log
### 2026-04-19
- Updated `_renderDriversList()` in `tm-assign-driver-modal` to compute workload labels from both `active_trip_count` and cross-vehicle assignment state.
- Added fallback-safe assignment labeling when number plate is missing.
- Verified diagnostics are clean for the updated modal component.
- Ran `VAL_STAGE=after npx playwright test transportation-manager-fuel-fleet/validate-transportation-manager-fuel-fleet.spec.js --reporter=line` from `testing/ui-validation`; pass (`1/1`).

### 2026-04-19 (follow-up)
- Removed rendering of the inline assignment warning row (`Assigned to: ...`) under driver names in the assign-driver list per UI request.
- Preserved workload status chip behavior and current-assignment badge logic.
- Re-ran `VAL_STAGE=after npx playwright test transportation-manager-fuel-fleet/validate-transportation-manager-fuel-fleet.spec.js --reporter=line`; pass (`1/1`).
