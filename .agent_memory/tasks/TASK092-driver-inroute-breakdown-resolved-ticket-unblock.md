# [TASK092] - Driver In-Route Breakdown Resolved Ticket Unblock

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Driver cannot create a new in-route breakdown ticket even when the existing in-route breakdown ticket is already resolved.

## Thought Process
- The route-breakdown create API has two anti-duplicate guards:
  - active route-breakdown ticket guard
  - active route-breakdown report guard
- Driver UI shows status using `ticket_status` first, so users can correctly see `Resolved` even if report-level status was not synchronized.
- The report guard was still treating some rows as active when linked ticket state was effectively resolved/closed and status normalization was strict.
- Fix should be in backend duplicate-guard SQL so new route-breakdown creation is allowed when existing linked ticket is resolved/closed.

## Implementation Plan
- Inspect route-breakdown create guard methods in `RouteBreakdownController`.
- Normalize ticket status comparisons to trim/lowercase in active-ticket checks.
- Update active-report check to ignore report rows when linked route-breakdown ticket is resolved/closed.
- Run syntax validation for touched backend file.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Trace duplicate guard behavior | Complete | 2026-04-20 | Confirmed block originated from route-breakdown active checks in create flow. |
| 1.2 | Patch active-ticket/report status logic | Complete | 2026-04-20 | Added trimmed/lowercase status normalization and resolved-ticket aware report filtering. |
| 1.3 | Validate controller syntax | Complete | 2026-04-20 | `php -l app/controllers/RouteBreakdownController.php` passed. |

## Progress Log
### 2026-04-20
- Updated `app/controllers/RouteBreakdownController.php`:
  - `findActiveRouteBreakdownTicketForVehicle(...)` now uses `LOWER(TRIM(COALESCE(ft.status, '')))` for resolved/closed filtering in both SQL branches.
  - `findActiveRouteBreakdownForVehicle(...)` now joins linked route-breakdown fault tickets and excludes reports whose linked ticket is already resolved/closed.
  - This keeps duplicate prevention for truly active workflows while allowing new in-route breakdown creation after resolved/closed ticket states.
- Validation:
  - `php -l app/controllers/RouteBreakdownController.php` -> no syntax errors.
  - editor diagnostics for touched file -> no errors.
- Testing note:
  - No end-to-end Playwright regression was executed in this pass; fix was validated by code-path analysis plus PHP lint/diagnostics.
