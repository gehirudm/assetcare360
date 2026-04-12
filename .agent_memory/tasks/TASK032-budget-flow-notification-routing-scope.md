# TASK032 - Budget Flow Notification Routing Scope

**Status:** Pending  
**Added:** April 9, 2026  
**Updated:** April 9, 2026

## Original Request
Throughout the budget flow process, notifications should be issued to relevant users. For now, send notifications to all Maintenance Managers and Supervisors the same. Later, refine this so notifications are sent only to the Supervisor who controls the assigned Technical Officer.

## Thought Process
The workflow correctness for budget and spare-part processing is complete, but notification targeting policy is intentionally deferred. Capturing interim and target routing rules in memory prevents accidental loss and enables a clean future implementation without changing behavior now.

## Implementation Plan
- [ ] Define budget-flow notification trigger points (create, review, approval/rejection, status transition)
- [ ] Implement interim routing: notify all `maintenance_manager` and `supervisor` users uniformly
- [ ] Add configurable routing strategy for supervisor-targeted scope
- [ ] Implement final routing: notify only the supervisor responsible for the assigned Technical Officer
- [ ] Validate notification recipients via role-based E2E scenarios

## Progress Tracking
**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 32.1 | Map budget-flow notification events and payload requirements | Not Started | April 9, 2026 | Keep event names aligned with event catalog |
| 32.2 | Add interim broad routing to all supervisors + maintenance managers | Not Started | April 9, 2026 | Temporary behavior requested by user |
| 32.3 | Design ownership mapping between TO and controlling supervisor | Not Started | April 9, 2026 | Needed for final routing behavior |
| 32.4 | Switch routing from broad broadcast to controlling supervisor only | Not Started | April 9, 2026 | Future change after ownership logic is available |
| 32.5 | Execute role-based notification recipient validation | Not Started | April 9, 2026 | Include regression checks for maintenance-manager notifications |

## Progress Log
### April 9, 2026
- Task created to capture deferred notification-routing requirements for budget flow.
- Recorded interim rule: notify all Maintenance Managers and Supervisors.
- Recorded future rule: notify only the Supervisor responsible for the assigned Technical Officer.
