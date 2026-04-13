# TASK028 - Fault Ticket Budget + Spare Workflow Correctness

**Status:** Completed  
**Added:** April 9, 2026  
**Updated:** April 9, 2026

## Original Request
When a fault ticket is assigned to a technician, budget request and spare-parts request must both be available and can be submitted in parallel (neither mandatory). UI must clearly indicate whether each request exists. Supervisor approves within petty cash; Maintenance Manager can approve all. Run full end-to-end validation.

## Thought Process
Current implementation mixes status-driven workflow updates with separate budget/spare APIs, causing state collisions (one request path overwrites the other). Approval views are partially mock-data based. Fix should prioritize backend workflow correctness first, then update dashboards to consume API truth, then execute role-based E2E tests.

## Implementation Plan
- [x] Add workflow-safe status synchronization for budget/spare events
- [x] Allow budget submission in all pre-work statuses needed for parallel request flow
- [x] Ensure maintenance-manager approval visibility and permissions cover all pending budgets
- [x] Expose/consume explicit request-presence indicators in detail UI
- [x] Execute full role-based E2E scenario validation

## Progress Tracking
**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 28.1 | Analyze current backend + frontend workflow gaps | Complete | 2026-04-09 | Identified status collision and mock approval UI gaps |
| 28.2 | Implement backend workflow/state fixes | Complete | 2026-04-09 | Added `FaultTicketWorkflowService` and integrated sync hooks |
| 28.3 | Implement frontend request-indicator + approval wiring fixes | Complete | 2026-04-09 | Added workflow fallback indicators in TO detail page |
| 28.4 | Run full E2E and capture results | Complete | 2026-04-09 | Executed role-based API E2E for TO/Supervisor/Maintenance/Inventory |

## Progress Log
### 2026-04-09
- Completed deep analysis of budget report, spare-part request, fault-ticket status transition, and dashboard implementations.
- Confirmed supervisor budget approval component still uses static/mock rows rather than API-driven records.
- Confirmed maintenance dashboard cost approval flow is static and disconnected from budget APIs.
- Confirmed status transition paths can overwrite each other when budget/spare requests are submitted in the same lifecycle.

### 2026-04-09 (implementation + validation)
- Added `app/services/FaultTicketWorkflowService.php` to centralize ticket status derivation from budget/spare workflow state.
- Integrated sync into budget create/review/delete/update and spare request create/approve/reject paths.
- Added workflow gating in `FaultTicketService::update` so `In Progress` is blocked while budget or spare approvals are pending.
- Added `workflow` indicators to `/fault-tickets/{id}` payload for explicit budget/spare presence/status signaling.
- Created and ran migrations `049_align_fault_ticket_status_enum.php` and `050_fix_budget_reports_fault_ticket_fk.php`.
- Executed E2E checks with real role logins:
	- TO submitted spare request and budget request in parallel on the same ticket.
	- Ticket status moved `Assigned -> Waiting for Spare Parts -> Waiting for Budget Approval` with both indicators present.
	- Supervisor approved petty-cash budget; supervisor blocked from approving maintenance-manager-level budget.
	- Maintenance Manager successfully approved both supervisor-level visibility and maintenance-manager-level report.
	- Inventory Manager approved spare request; ticket moved to `Parts Approved` and TO could start work.
	- Verified a separate ticket could move directly to `In Progress` with no budget/spare requests, proving optional flow.
