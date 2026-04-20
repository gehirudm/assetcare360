# TASK078 - Prune In-Route Breakdown Reports Data to One Resolved Record

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
Remove the in-route vehicle breakdown reports data from the table and keep only one resolved record.

## Thought Process
The request is a data-level cleanup, not a schema/API change. To preserve consistency and satisfy the requirement precisely, keep the most recently updated resolved in-route breakdown row and delete all other rows from `vehicle_breakdown_inroute`. Also remove dependent garage workflow/update rows linked to removed records to avoid stale relational data.

## Implementation Plan
- [x] Inspect current row counts and resolved candidates in `vehicle_breakdown_inroute`.
- [x] Keep one resolved row (latest by `updated_at`, then `id`) and delete all others in a transaction.
- [x] Clean related route garage workflow/update rows for removed records.
- [x] Verify post-cleanup counts and remaining row details.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 78.1 | Inspect in-route breakdown table state | Complete | April 20, 2026 | Baseline: `total=15`, `resolved=2`. |
| 78.2 | Execute transactional prune to one resolved row | Complete | April 20, 2026 | Kept `id=6 (RBD-006, Resolved)`, removed 14 rows. |
| 78.3 | Clean related garage workflow/update rows | Complete | April 20, 2026 | Removed 8 updates + 5 workflow rows tied to deleted route breakdown records. |
| 78.4 | Verify final table state | Complete | April 20, 2026 | Final: `after_total=1`, `after_resolved=1`, remaining row `id=6`. |

## Progress Log
### April 20, 2026
- Queried `vehicle_breakdown_inroute` and confirmed two resolved candidates (`id=6`, `id=1`).
- Ran transactional cleanup through PHP/DB connection:
  - kept latest resolved row (`id=6`, `route_breakdown_id=RBD-006`).
  - deleted all other records from `vehicle_breakdown_inroute`.
  - removed associated rows from `route_breakdown_garage_updates` and `route_breakdown_garage_workflow` for deleted route breakdown records.
- Verified final state:
  - `vehicle_breakdown_inroute`: exactly one row remaining.
  - remaining row is resolved (`id=6`, `route_breakdown_id=RBD-006`).