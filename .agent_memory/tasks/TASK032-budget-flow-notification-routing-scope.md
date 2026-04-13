# TASK032 - Budget Flow Notification Routing Scope

**Status:** Completed  
**Added:** April 9, 2026  
**Updated:** April 13, 2026

## Original Request
Throughout the budget flow process, notifications should be issued to relevant users. For now, send notifications to all Maintenance Managers and Supervisors the same. Later, refine this so notifications are sent only to the Supervisor who controls the assigned Technical Officer.

## Thought Process
The workflow correctness for budget and spare-part processing is complete, but notification targeting policy is intentionally deferred. Capturing interim and target routing rules in memory prevents accidental loss and enables a clean future implementation without changing behavior now.

## Implementation Plan
- [x] Define budget-flow notification trigger points (create, review, approval/rejection, status transition)
- [x] Implement interim routing: notify all `maintenance_manager` and `supervisor` users uniformly
- [x] Add configurable routing strategy for supervisor-targeted scope
- [x] Implement final routing: notify only the supervisor responsible for the assigned Technical Officer
- [x] Validate notification recipients via role-based E2E scenarios

## Progress Tracking
**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 32.1 | Map budget-flow notification events and payload requirements | Complete | April 13, 2026 | Confirmed `BUDGET_REPORT_CREATED`/`BUDGET_REPORT_REVIEWED` recipient behavior in notification consumer |
| 32.2 | Add interim broad routing to all supervisors + maintenance managers | Complete | April 13, 2026 | Preserved role-target broadcast as fallback and for maintenance-manager approvals |
| 32.3 | Design ownership mapping between TO and controlling supervisor | Complete | April 13, 2026 | Used active `fault_ticket_assignments` ownership (`assigned_to` -> `assigned_by`) |
| 32.4 | Switch routing from broad broadcast to controlling supervisor only | Complete | April 13, 2026 | Implemented supervisor user-id targeting with assignment and ticket-level fallback lookup |
| 32.5 | Execute role-based notification recipient validation | Complete | April 13, 2026 | Added stage-based desktop/mobile validation artifacts for notification interaction flow |

## Progress Log
### April 9, 2026
- Task created to capture deferred notification-routing requirements for budget flow.
- Recorded interim rule: notify all Maintenance Managers and Supervisors.
- Recorded future rule: notify only the Supervisor responsible for the assigned Technical Officer.

### April 13, 2026
- Implemented targeted supervisor routing in `services/consume_notification_events.php` for `BUDGET_REPORT_CREATED` when `approval_role=Supervisor`.
- Added ownership resolution using active `fault_ticket_assignments`:
	- First lookup by `(fault_ticket_id, submitted_by technical officer)`
	- Fallback lookup by `(fault_ticket_id)` active assignments
	- Safety fallback to role broadcast `target_role=Supervisor` when ownership cannot be resolved
- Preserved Maintenance Manager routing behavior for `approval_role=Maintenance Manager` notifications.
- Added validation spec `testing/ui-validation/budget-notification-routing/validate-budget-notification-routing.spec.js` and ran:
	- `VAL_STAGE=before` passed (2/2 desktop + mobile)
	- `VAL_STAGE=after` passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none
- Verified syntax and diagnostics for touched files (`php -l` and file diagnostics clean).
