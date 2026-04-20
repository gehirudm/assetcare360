# TASK072 - Prevent Duplicate Active Route Breakdown Tickets Per Vehicle

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
If a vehicle already has an in-route breakdown ticket, the driver must not be able to create another in-route breakdown ticket.

## Thought Process
The rule must be enforced server-side to guarantee data integrity regardless of frontend behavior.

A route breakdown always auto-creates a linked fault ticket. Preventing duplicates therefore means: before creating a new route breakdown, check whether the same vehicle already has an existing `route_breakdown` ticket that is still active (not `Resolved` and not `Closed`).

## Implementation Plan
- [x] Add backend guard in route breakdown create flow.
- [x] Reuse existing error response shape (`400`) for compatibility.
- [x] Validate syntax and run focused driver UI validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 72.1 | Identify insertion point in create flow | Complete | April 20, 2026 | Guard added before insert/ticket creation in `RouteBreakdownController::create()`. |
| 72.2 | Implement active ticket lookup helper | Complete | April 20, 2026 | Added helper to find active route-breakdown ticket for the selected vehicle. |
| 72.3 | Enforce create rejection when duplicate active ticket exists | Complete | April 20, 2026 | Returns `400` with clear message including active ticket label. |
| 72.4 | Validate and document | Complete | April 20, 2026 | PHP lint passed and driver dashboard Playwright suite passed (`2/2`). |

## Progress Log
### April 20, 2026
- Updated `app/controllers/RouteBreakdownController.php`:
  - Added pre-create check in `create()` to block duplicate route breakdown creation when an active route-breakdown ticket exists for the same vehicle.
  - Added `findActiveRouteBreakdownTicketForVehicle(int $vehicleId): ?array` helper.
  - Reused existing `400` error response shape to keep endpoint contract stable.
- Validation evidence:
  - `php -l app/controllers/RouteBreakdownController.php` passed.
  - `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`2/2`).
