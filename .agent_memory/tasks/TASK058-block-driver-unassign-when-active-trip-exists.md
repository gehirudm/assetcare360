# [TASK058] - Block Driver Unassign When Active Trip Exists

**Status:** Completed  
**Added:** 2026-04-19  
**Updated:** 2026-04-19

## Original Request
- When a driver is on a trip, it should not be possible to unassign the driver from a vehicle.

## Thought Process
- The unassign flow is initiated from the TM dashboard but must be enforced on the backend to guarantee correctness regardless of client behavior.
- Existing trip status semantics already define active trips in `Trip::getActiveTripCount()` as `Pending`, `Accepted`, and `In Progress`.
- The safest implementation is a guard in `VehicleService::unassignDriverFromVehicle(...)` before any unassign update is executed, and the same guard condition must apply to implicit unassign during `assignDriverToVehicle(...)` reassignment.

## Implementation Plan
- Add trip-model access in `VehicleService`.
- Add active-trip guard before vehicle unassignment.
- Add active-trip guard before implicit unassign in reassignment flow.
- Update OpenAPI docs for `POST /vehicles/{id}/unassign-driver` with blocked-400 response behavior.
- Validate syntax, runtime behavior, and dashboard regression.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add backend unassign/reassign guards | Complete | 2026-04-19 | Added active trip checks for both `unassignDriverFromVehicle` and reassignment path in `assignDriverToVehicle`. |
| 1.2 | Update API documentation | Complete | 2026-04-19 | Added 400 response documentation for blocked unassign in OpenAPI. |
| 1.3 | Validate behavior and regression | Complete | 2026-04-19 | PHP lint clean; direct service check returned expected block; TM after-stage Playwright spec passed (`1/1`). |

## Progress Log
### 2026-04-19
- Updated `app/services/VehicleService.php` to require `Trip` model, instantiate it, and reject both unassign and reassignment when assigned driver has active trips.
- Updated `testing/openapi.yaml` for `POST /vehicles/{id}/unassign-driver` to document the new 400 blocked-unassignment response.
- Verified runtime behavior with direct service execution against current DB state:
	- `UNASSIGN_BLOCKED:Cannot unassign driver while they have active trips`
	- `REASSIGN_BLOCKED:driver=6:Cannot reassign driver while they have active trips`
- Ran TM UI validation: `VAL_STAGE=after npx playwright test transportation-manager-fuel-fleet/validate-transportation-manager-fuel-fleet.spec.js --reporter=line` -> pass (`1/1`).
