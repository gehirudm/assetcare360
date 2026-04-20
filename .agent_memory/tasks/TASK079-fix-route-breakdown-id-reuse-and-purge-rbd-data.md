# TASK079 - Fix Route Breakdown ID Reuse and Purge RBD Data

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
Fix duplicate route-breakdown ticket creation in the driver dashboard, clear in-route breakdown table data, and remove RBD tickets across the system.

## Thought Process
The duplicate symptom was caused by `route_breakdown_id` reuse (`RBD-002`) after earlier data pruning. Route breakdown IDs were generated from table count, so deleted rows allowed old identifiers to be reused and re-linked with historical `fault_tickets`, making a single route breakdown appear with duplicate linked tickets. The fix required stable non-reused ID generation and submission hardening, then a full transactional cleanup of route-breakdown records and RBD tickets.

## Implementation Plan
- [x] Confirm duplicate root cause and current DB state for in-route rows and RBD tickets.
- [x] Update backend route-breakdown create flow to avoid reusable IDs and reduce race conditions.
- [x] Add frontend submit guard to prevent accidental double-submits.
- [x] Execute requested full RBD data purge and verify post-cleanup counts.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 79.1 | Diagnose duplicate route-breakdown linkage | Complete | April 20, 2026 | Found reused `route_breakdown_id=RBD-002` linking to two RBD tickets. |
| 79.2 | Implement backend create-flow hardening | Complete | April 20, 2026 | `RouteBreakdownController::create()` now locks vehicle row and derives final `route_breakdown_id` from inserted row id. |
| 79.3 | Prevent duplicate UI submit calls | Complete | April 20, 2026 | Added in-flight submit guard + disabled submit button in driver route-breakdown modal. |
| 79.4 | Purge in-route and RBD ticket data | Complete | April 20, 2026 | Transactional delete completed: in-route rows and RBD tickets removed system-wide. |
| 79.5 | Validate post-change state | Complete | April 20, 2026 | Verified cleanup counts (`after_inroute=0`, `after_rbd_tickets=0`) and PHP lint success. |
| 79.6 | Re-run full RBD purge on new request | Complete | April 20, 2026 | Executed second transactional cleanup across in-route + linked workflow/ticket tables; all RBD traces removed. |

## Progress Log
### April 20, 2026
- Queried DB and confirmed duplicate mapping: `fault_tickets` had two `route_breakdown` rows for `breakdown_report_id=RBD-002`.
- Updated `app/controllers/RouteBreakdownController.php` create flow:
  - moved active-ticket check into transaction after `SELECT ... FOR UPDATE` vehicle lock.
  - replaced count-based route-breakdown ID generation with post-insert ID-based code assignment (`RBD-{row_id}`).
  - kept linked fault-ticket create in same transaction and preserved existing validation handling.
- Updated `pages/dashboard/driver/components/page-modals/driver-breakdown-in-route-modal.js` to block re-entrant submit requests while API call is in flight.
- Executed transactional cleanup via PHP/DB script:
  - removed all `vehicle_breakdown_inroute` rows.
  - removed all route-breakdown tickets (`breakdown_type='route_breakdown'` or `ticket_id LIKE 'RBD-%'`).
  - cleaned non-cascading linked rows in `fault_ticket_assignments` and `fault_ticket_images` before ticket delete.
- Verified final DB state:
  - `vehicle_breakdown_inroute=0`
  - `route_breakdown_garage_workflow=0`
  - `route_breakdown_garage_updates=0`
  - `fault_tickets_route_breakdown=0`
  - no orphan `fault_ticket_assignments` / `fault_ticket_images` rows from deleted RBD tickets.
- Validation evidence:
  - `php -l app/controllers/RouteBreakdownController.php` passed.

### April 20, 2026 (follow-up purge rerun)
- User requested another full cleanup of in-route breakdown (RBD) data across system tables.
- Executed transactional purge script that removed RBD-linked rows from:
  - `vehicle_breakdown_inroute`
  - `route_breakdown_garage_workflow`
  - `route_breakdown_garage_updates`
  - `fault_tickets` (`breakdown_type='route_breakdown'` or `breakdown_report_id/ticket_id LIKE 'RBD-%'`)
  - linked dependents by ticket id: `fault_ticket_assignments`, `fault_ticket_images`, `ticket_work_updates`, `budget_reports`, `spare_part_requests`, `spare_part_request_items`
- Before/after verification:
  - before: `vehicle_breakdown_inroute=2`, `route_breakdown_garage_workflow=1`, `route_breakdown_garage_updates=4`, `rbd_fault_tickets=2`
  - after: `vehicle_breakdown_inroute=0`, `route_breakdown_garage_workflow=0`, `route_breakdown_garage_updates=0`, `rbd_fault_tickets=0`
  - orphan checks: `orphan_rbd_assignments=0`, `orphan_rbd_images=0`, `orphan_rbd_work_updates=0`
- Cross-system residue scan:
  - searched all text columns in DB for `RBD-` pattern; result `[]` (no remaining rows containing RBD codes).
