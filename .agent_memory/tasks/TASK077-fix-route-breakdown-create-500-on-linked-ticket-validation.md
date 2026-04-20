# TASK077 - Fix Route Breakdown Create 500 on Linked Ticket Validation

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
When creating a vehicle route breakdown report, the frontend shows `POST /api/route-breakdowns 500 (Internal Server Error)` and the ticket cannot be created.

## Thought Process
The route-breakdown create endpoint inserts the route report, then auto-creates a linked fault ticket. Initial fixes handled linked-ticket validation/client failures so they return 4xx instead of 500. A follow-up user report revealed a second crash path before that branch: schema-dependent pre-checks (duplicate active ticket lookup and dangerous-cargo context lookup) could throw uncaught DB exceptions in mixed legacy schemas.

## Implementation Plan
- [x] Inspect route-breakdown create flow and linked fault-ticket creation path.
- [x] Prevent short description inputs from failing linked ticket creation.
- [x] Return 4xx validation/client errors instead of 500 for expected linked-ticket failures.
- [x] Validate syntax.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 77.1 | Trace create path and failure handoff | Complete | April 20, 2026 | Confirmed auto-ticket creation failure was mapped to 500 in controller catch path. |
| 77.2 | Normalize short route description for linked ticket | Complete | April 20, 2026 | `buildAutoTicketDescription(...)` now expands short descriptions with context + route id. |
| 77.3 | Replace 500 with proper 4xx in linked ticket failure branch | Complete | April 20, 2026 | Validation errors return 422, not-found returns 404, other known failures return 400. |
| 77.4 | Verify syntax | Complete | April 20, 2026 | `php -l app/controllers/RouteBreakdownController.php` passed. |
| 77.5 | Harden duplicate active-ticket lookup for mixed fault-ticket schemas | Complete | April 20, 2026 | `findActiveRouteBreakdownTicketForVehicle(...)` now supports both with/without `fault_tickets.vehicle_id` and safely returns null on query failure. |
| 77.6 | Guard dangerous-cargo context lookup from blocking create flow | Complete | April 20, 2026 | Added `getDangerousCargoContextSafely(...)` and replaced direct TripService calls in create/severity-lock paths. |

## Progress Log
### April 20, 2026
- Updated `app/controllers/RouteBreakdownController.php`:
  - In `create()`, linked fault-ticket failure no longer throws into generic 500 path.
  - Added explicit rollback + `Response::validationError(...)` for structured validation failures.
  - Added explicit 404/400 mapping for non-validation linked-ticket errors.
  - In `buildAutoTicketDescription(...)`, short user descriptions are expanded to avoid linked ticket minimum-length validation failures.
- Validation evidence:
  - `php -l app/controllers/RouteBreakdownController.php` passed.

### April 20, 2026 (follow-up)
- Updated `app/controllers/RouteBreakdownController.php` to resolve remaining uncaught pre-transaction failures after user reported 500 persistence:
  - Made `findActiveRouteBreakdownTicketForVehicle(...)` schema-safe by dynamically handling environments that do not have `fault_tickets.vehicle_id`.
  - Added `hasFaultTicketVehicleIdColumn()` cache-backed schema check.
  - Added `getDangerousCargoContextSafely(...)` and replaced direct dangerous-cargo lookups in both `create()` and `shouldForceCriticalSeverity(...)`.
  - Added defensive error logging and fallback behavior so route-breakdown create is not blocked by optional dangerous-cargo context failures.
- Validation evidence:
  - `php -l app/controllers/RouteBreakdownController.php` passed.
