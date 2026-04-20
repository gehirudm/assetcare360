# [TASK098] - Supervisor Fault Ticket Created Notifications

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- When a new fault ticket is created from:
  - Vehicle Breakdown
  - In-route Vehicle Breakdown
  - Machine Fault Report
  Supervisor should receive a notification.
- Those notifications must appear in the Supervisor notification section.

## Thought Process
- Event contract already supported `FAULT_TICKET_CREATED`, and email consumer already handled it.
- In-app notifications were missing because:
  - `consume_notification_events.php` was not bound to `fault.ticket.created`.
  - no in-app record builder existed for `DomainEvents::FAULT_TICKET_CREATED`.
- Auto-created fault tickets from breakdown controllers were not emitting `FAULT_TICKET_CREATED` at all.
- Supervisor dashboard also had no notifications section wired to `/notifications`.

## Implementation Plan
- Add `fault.ticket.created` routing + `FAULT_TICKET_CREATED` notification record mapping in notification consumer.
- Emit `FAULT_TICKET_CREATED` after successful linked ticket creation in:
  - `BreakdownReportController::create`
  - `MachineBreakdownController::create`
  - `RouteBreakdownController::create`
- Add Supervisor dashboard notifications section and component backed by `/notifications` + `/notifications/read`.
- Add unread badge sync in Supervisor sidebar.
- Add focused Playwright validation for Supervisor notifications list/badge/read-state behavior.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Audit event pipeline for fault-ticket-created in-app path | Complete | 2026-04-20 | Confirmed missing notification consumer binding/handler and missing producer emits in auto-ticket flows. |
| 1.2 | Implement backend producer + consumer notification flow | Complete | 2026-04-20 | Added producer emits in 3 controllers and consumer bind/record mapping. |
| 1.3 | Add Supervisor notifications UI section and badge flow | Complete | 2026-04-20 | Added section/component/styles and sidebar badge syncing. |
| 1.4 | Add and run UI validation | Complete | 2026-04-20 | New Playwright suite passed desktop/mobile. |

## Progress Log
### 2026-04-20
- Updated `services/consume_notification_events.php`:
  - bound `fault.ticket.created` routing key.
  - added `DomainEvents::FAULT_TICKET_CREATED` record builder targeting role `Supervisor`.
- Updated ticket auto-create producers to emit `FAULT_TICKET_CREATED` after successful commit:
  - `app/controllers/BreakdownReportController.php`
  - `app/controllers/MachineBreakdownController.php`
  - `app/controllers/RouteBreakdownController.php`
- Added Supervisor notifications UI flow:
  - `pages/dashboard/supervisor/index.html` (sidebar nav item + notifications section + script include)
  - `pages/dashboard/supervisor/components/notifications/script.js` (API-backed list, mark read, mark all, badge update)
  - `pages/dashboard/supervisor/script.js` (notifications binding, section refresh, badge polling)
  - `pages/dashboard/supervisor/style.css` (notification card styles)
- Added focused validation suite:
  - `testing/ui-validation/supervisor-notifications/validate-supervisor-notifications.spec.js`
- Validation evidence:
  - `php -l app/controllers/BreakdownReportController.php` passed.
  - `php -l app/controllers/MachineBreakdownController.php` passed.
  - `php -l app/controllers/RouteBreakdownController.php` passed.
  - `php -l services/consume_notification_events.php` passed.
  - `cd testing/ui-validation && npx playwright test supervisor-notifications/validate-supervisor-notifications.spec.js --reporter=line` passed (2/2).
