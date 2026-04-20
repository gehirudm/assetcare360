# [TASK113] - Block Driver Unassign When Active Trip Exists for Same Vehicle

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Transportation manager, Driver assignment section: it should not be possible to unassign a driver from a vehicle if the driver has an active trip for that vehicle. An error should be shown.

## Thought Process
- Existing guard checked active trips by driver globally, but the requirement is vehicle-specific and should also cover implicit unassign when replacing a vehicle's current driver.
- Enforcement must remain backend-first so the rule is applied regardless of UI path.

## Implementation Plan
- Add a Trip model helper that counts active trips by both driver and vehicle registration.
- Use this helper in the vehicle unassign flow.
- Add the same guard to assignment flow when replacing an already assigned driver on a vehicle.
- Update OpenAPI descriptions for assign/unassign error behavior.
- Validate syntax and diagnostics.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add vehicle-scoped active trip query | Complete | 2026-04-20 | Added `Trip::getActiveTripCountByDriverAndVehicle(...)`. |
| 1.2 | Enforce unassign guard | Complete | 2026-04-20 | `VehicleService::unassignDriverFromVehicle(...)` now blocks by active trip on same vehicle. |
| 1.3 | Enforce replacement guard | Complete | 2026-04-20 | `assignDriverToVehicle(...)` now blocks replacing current assigned driver when same-vehicle active trip exists. |
| 1.4 | Update API docs + validate | Complete | 2026-04-20 | Updated `testing/openapi.yaml`; ran php lint and diagnostics checks. |

## Progress Log
### 2026-04-20
- Updated `app/models/Trip.php` with `getActiveTripCountByDriverAndVehicle($driver_id, $vehicle_registration)` using active statuses `Pending`, `Accepted`, `In Progress`.
- Updated `app/services/VehicleService.php`:
  - `unassignDriverFromVehicle(...)` now blocks with message: `Cannot unassign driver while they have an active trip for this vehicle`.
  - `assignDriverToVehicle(...)` now blocks replacing an already assigned driver when that driver has an active trip for that same vehicle.
  - Added helper `getActiveTripCountForVehicleDriver(...)` to centralize vehicle-scoped checks.
- Updated `testing/openapi.yaml` descriptions for `POST /vehicles/{id}/assign-driver` and `POST /vehicles/{id}/unassign-driver` to reflect the vehicle-scoped block behavior.
- Validation:
  - `php -l app/models/Trip.php` passed.
  - `php -l app/services/VehicleService.php` passed.
  - `php -l app/controllers/VehicleController.php` passed.
  - diagnostics clean for touched files.
