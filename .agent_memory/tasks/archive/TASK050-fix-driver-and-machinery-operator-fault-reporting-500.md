# [TASK050] - Fix Driver And Machinery Operator Fault Reporting 500

**Status:** Completed  
**Added:** 2026-04-18  
**Updated:** 2026-04-18

## Original Request
- Driver and Machinery Operator cannot report fault tickets.
- UI shows unexpected error during submit.

## Thought Process
- Both failing flows (`/breakdown-reports` and `/machine-breakdowns`) auto-create linked fault tickets.
- The same generic `An unexpected error occurred` indicated an exception escaping controller-level handling.
- Root cause likely shared in backend create path (transactions, service call side effects), not role-specific frontend code.

## Implementation Plan
- Reproduce both API submits with real Driver and Machinery Operator accounts.
- Capture backend runtime error and trace it through controller + service create flow.
- Patch shared ticket-creation logic to avoid transaction invalidation and preserve schema compatibility.
- Re-run both submit flows and syntax checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Reproduce Driver and MO submit failures | Complete | 2026-04-18 | Both endpoints returned 500 with generic unexpected error. |
| 1.2 | Identify and patch root cause in backend create flow | Complete | 2026-04-18 | Removed BaseModel-instantiation side effects during ticket create and hardened transaction guards. |
| 1.3 | Ensure fault ticket model handles mixed DB schemas | Complete | 2026-04-18 | Added runtime `vehicle_id` column detection for reads/inserts to support environments with/without the column. |
| 1.4 | Verify fixes and regressions | Complete | 2026-04-18 | PHP lint passed; both role submit endpoints return 201 Created. |

## Progress Log
### 2026-04-18
- Reproduced failures via API:
  - `POST /api/breakdown-reports` returned `500` with global `An unexpected error occurred`.
  - `POST /api/machine-breakdowns` returned `500` with global `An unexpected error occurred`.
- Captured server runtime error: `There is no active transaction`.
- Root cause:
  - `FaultTicketService::create()` instantiated `Machine`/`Vehicle` models while controller transaction was open.
  - `BaseModel` constructor runs DDL (`CREATE TABLE IF NOT EXISTS` + index creation), causing implicit transaction boundary behavior and commit/rollback mismatch.
  - Controller catch block rollback then threw again when no active transaction existed, surfacing global unexpected error.

### 2026-04-18
- Applied backend fixes:
  - `app/services/FaultTicketService.php`
    - Replaced model-instantiation lookups with direct PDO lookups (`machines` / `vehicles`) in ticket create path.
    - Added `vehicle_id` into ticket payload when available.
  - `app/models/FaultTicket.php`
    - Added schema support for `vehicle_id`.
    - Added schema-compatible read/write behavior (dynamic column presence check) for environments where `fault_tickets.vehicle_id` may not exist.
    - Removed unconditional `vehicle_id` index declaration to avoid runtime index-create noise on legacy schemas.
  - `app/controllers/BreakdownReportController.php`
    - Guarded commit/rollback with `inTransaction()`.
  - `app/controllers/MachineBreakdownController.php`
    - Guarded commit/rollback with `inTransaction()`.

### 2026-04-18
- Validation evidence:
  - `php -l` passed:
    - `app/services/FaultTicketService.php`
    - `app/models/FaultTicket.php`
    - `app/controllers/BreakdownReportController.php`
    - `app/controllers/MachineBreakdownController.php`
  - Runtime submit checks passed:
    - Driver: `POST /api/breakdown-reports` -> `201 Created`
    - Machinery Operator: `POST /api/machine-breakdowns` -> `201 Created`
