# TASK002 - Budget Step Correctness

**Status:** Completed  
**Added:** April 6, 2026  
**Updated:** April 6, 2026

## Original Request
> "Budget step should be properly handled. If the fault ticket has no budget given to it, it should be shown as so without showing it as 0 and marking it as pending. And check if the logic is correct on the backend as well, that we cannot move into ticket work in progress step if the budget request is still pending."

## Thought Process
The screenshot showed Step 3 (Budget, pending, LKR 0.00) while Step 4 (Spare Parts) was already green/completed. Two issues:
1. Frontend formatted 0.00 as a currency amount — misleading
2. Backend allowed TicketWorkUpdate creation even when budget report was still pending — no gate existed

Additionally, `BudgetReportController::create()` accepted `total_amount = 0` (only rejected `< 0`), which was the root cause of the zero-amount budget in the DB.

## Implementation Plan
- [x] Fix `BudgetReportController::create()` — reject `total_amount <= 0`
- [x] Fix `BudgetReportController::update()` — same guard
- [x] Fix `TicketWorkUpdateController::create()` — add pending-budget gate
- [x] Fix `renderBudgetStep()` in script.js — show `—` for zero amounts

## Progress Tracking
**Overall Status:** Completed — 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 2.1 | BudgetReportController create() zero guard | Complete | Apr 6 | `<= 0` with new message |
| 2.2 | BudgetReportController update() zero guard | Complete | Apr 6 | Same change |
| 2.3 | TicketWorkUpdateController budget pending gate | Complete | Apr 6 | Added BudgetReport model dep + check |
| 2.4 | Frontend renderBudgetStep zero display | Complete | Apr 6 | Shows `—` when amount is 0 |
| 2.5 | TecFaultRepairTicketController badRequest fix | Complete | Apr 6 | Response::badRequest→Response::error |

## Progress Log
### April 6, 2026
- Read BudgetReportController review() endpoint — on approve/reject both set ticket to Assigned
- Confirmed TicketWorkUpdateController had no budget-pending check
- Fixed total_amount validation in create() and update() to reject <= 0
- Added BudgetReport model require and instantiation to TicketWorkUpdateController
- Added pending-budget guard before work update creation
- Fixed renderBudgetStep to show dash for zero/missing amount
- Separately fixed TecFaultRepairTicketController: 6 Response::badRequest() calls replaced with Response::error()
