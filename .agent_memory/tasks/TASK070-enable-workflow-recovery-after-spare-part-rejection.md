# TASK070 - Enable Workflow Recovery After Spare-Part Rejection

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
If spare-part approval is rejected by Inventory Manager, the team should still be able to add a budget report, and after Maintenance Manager approves the budget, the ticket workflow should continue so work can start.

## Thought Process
Two backend guards blocked this flow:
1. `BudgetReportController` only allowed budget report create/update/delete on pre-work statuses that excluded `Parts Rejected`.
2. `FaultTicketWorkflowService::deriveTargetStatus()` always kept tickets at `Parts Rejected` when latest spare-part request was rejected, even after budget approval.

Fixing both ensures the intended sequence works:
- spare-part rejected -> submit budget report -> budget approved -> ticket returns to actionable base status.

## Implementation Plan
- [x] Allow budget report operations when ticket status is `Parts Rejected`.
- [x] Update workflow derivation so approved budget clears `Parts Rejected` hold.
- [x] Run backend validation checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 70.1 | Diagnose workflow blockers | Complete | April 20, 2026 | Confirmed status gating and workflow derivation logic were both blocking this path. |
| 70.2 | Patch budget report status gates | Complete | April 20, 2026 | Added `Parts Rejected` to create/update/delete allowed statuses. |
| 70.3 | Patch workflow target derivation | Complete | April 20, 2026 | `partsStatus=rejected` now returns base status when `budgetStatus=approved`. |
| 70.4 | Validate changes | Complete | April 20, 2026 | PHP lint passed and diagnostics clean for touched files. |

## Progress Log
### April 20, 2026
- Updated `app/controllers/BudgetReportController.php`:
  - Added `Parts Rejected` to allowed ticket statuses for budget report create/update/delete operations.
- Updated `app/services/FaultTicketWorkflowService.php`:
  - In `deriveTargetStatus(...)`, when spare-part status is `rejected` and budget status is `approved`, workflow now returns to base ticket status (`Assigned` if assigned, else `Open`) instead of staying on `Parts Rejected`.
- Validation evidence:
  - `php -l app/controllers/BudgetReportController.php` passed.
  - `php -l app/services/FaultTicketWorkflowService.php` passed.
  - diagnostics reported no errors for touched files.
