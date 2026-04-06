# TASK003 - Run Migration 047 and Update OpenAPI Spec

**Status:** Pending  
**Added:** April 6, 2026  
**Updated:** April 6, 2026

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
**Overall Status:** Not Started — 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 3.1 | Run migration 047 | Not Started | Apr 6 | |
| 3.2 | Update openapi.yaml budget create | Not Started | Apr 6 | |
| 3.3 | Update openapi.yaml work-update create | Not Started | Apr 6 | |

## Progress Log
### April 6, 2026
- Task created as follow-up to TASK002
