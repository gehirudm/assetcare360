# TASK003 - Run Migration 047 and Update OpenAPI Spec

**Status:** In Progress  
**Added:** April 6, 2026  
**Updated:** April 7, 2026

## Original Request
Follow-up from TASK002 budget fixes. Migration 047 was created (system_settings + budget approval level column) but may not have been run. OpenAPI spec also needs updating.

## Thought Process
Migration 047 adds `system_settings` table and `approval_level` column to `budget_reports`. Without running it, the budget petty-cash routing logic will fail at runtime. The openapi.yaml needs to reflect the new validation rule (total_amount > 0) and the new 400 error from TicketWorkUpdateController when budget is pending.

## Implementation Plan
- [ ] Run `php scripts/migrate.php migrate` and confirm 047 applies cleanly
- [ ] Update `testing/openapi.yaml` — budget report create/update: document `total_amount > 0` constraint
- [ ] Update `testing/openapi.yaml` — ticket-work-updates create: document 400 when budget pending
- [ ] Update Postman collection if applicable

## Progress Tracking
**Overall Status:** In Progress — 67%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 3.1 | Run migration 047 | Blocked | Apr 7 | `php scripts/migrate.php status` failed with DB connection refused in sandbox |
| 3.2 | Update openapi.yaml budget create | Complete | Apr 7 | Added `minimum: 0.01` and clarified 400 behavior for invalid totals |
| 3.3 | Update openapi.yaml work-update create | Complete | Apr 7 | Added Ticket Work Updates tag + endpoints + pending-budget 400 example |

## Progress Log
### April 6, 2026
- Task created as follow-up to TASK002

### April 7, 2026
- Ran `php scripts/migrate.php status`; database connection failed (`SQLSTATE[HY000] [2002] Connection refused`), so migration confirmation is blocked in this environment.
- Updated `testing/openapi.yaml` to explicitly constrain `total_amount` to `> 0` (`minimum: 0.01`) for budget report create/update payloads.
- Added Ticket Work Updates API documentation for create/list/latest endpoints, including 400 error example when latest budget report is pending.
