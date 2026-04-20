# [TASK093] - Driver Route Breakdown Delete Cascades Fault Ticket

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- When a driver deletes an in-route breakdown ticket from the dashboard, it is removed from `vehicle_breakdown_inroute` but not from `fault_tickets`.
- Fix backend root cause so linked fault ticket rows are deleted properly.

## Thought Process
- The issue is in the route-breakdown delete endpoint, not frontend.
- `RouteBreakdownController::delete()` previously deleted only from `vehicle_breakdown_inroute`.
- Linked route fault tickets are connected by `fault_tickets.breakdown_type = 'route_breakdown'` + `fault_tickets.breakdown_report_id = vehicle_breakdown_inroute.route_breakdown_id`.
- Correct behavior requires deleting linked fault tickets in the same backend transaction as report deletion.
- To avoid orphaned image files, linked `fault_ticket_images.file_path` entries should be collected before ticket deletion and removed from disk after commit.

## Implementation Plan
- Update route-breakdown delete flow to delete linked fault tickets by route breakdown code.
- Wrap ticket+report deletion in one transaction with rollback on failure.
- Add helper queries to collect linked fault-ticket image paths before delete.
- Extend file cleanup helper to handle both absolute and relative paths safely.
- Validate syntax and diagnostics for touched backend file.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Identify delete-flow root cause | Complete | 2026-04-20 | Confirmed route delete only removed in-route report row. |
| 1.2 | Implement transactional linked-ticket deletion | Complete | 2026-04-20 | Added linked `fault_tickets` delete in route delete flow. |
| 1.3 | Preserve file-system cleanup behavior | Complete | 2026-04-20 | Added linked image-path collection + cleanup handling for absolute/relative paths. |
| 1.4 | Validate backend changes | Complete | 2026-04-20 | `php -l` and diagnostics passed for controller. |

## Progress Log
### 2026-04-20
- Updated `app/controllers/RouteBreakdownController.php`:
  - `delete()` now:
    - resolves linked route fault ticket reference (`route_breakdown_id` / `fault_ticket_id`),
    - collects linked ticket image paths,
    - deletes linked route fault tickets and in-route report row in one transaction,
    - rolls back on failure and returns server error,
    - cleans image files after successful commit.
  - Added helper methods:
    - `getLinkedFaultTicketImagePaths(string $routeBreakdownCode): array`
    - `getFaultTicketImagePathsByTicketId(int $faultTicketId): array`
  - Improved `cleanupUploadedPaths(...)` to support both absolute and relative paths.
- Validation:
  - `php -l app/controllers/RouteBreakdownController.php` -> no syntax errors.
  - diagnostics for touched file -> no errors.
- API contract note:
  - No endpoint request/response schema changes; OpenAPI update not required.
