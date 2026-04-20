# [TASK103] - Fault Ticket Resolved Notify Reporter

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Ticket gets resolved -> notification goes to the one who made the fault ticket.

## Thought Process
- Existing event pipeline covered fault-ticket create/assign, budget, spare-parts, and service-due events, but no dedicated resolved event existed.
- Fault ticket status transitions to `Resolved` can happen through:
  - `POST /fault-tickets/:id/complete`
  - `PUT/PATCH /fault-tickets/:id` with status transition to `Resolved`
- To preserve event-contract clarity and consumer parity, introduced a new domain event (`FAULT_TICKET_RESOLVED`) and mapped it in both in-app and email consumers.
- Reporter visibility risk was identified in Machinery Operator dashboard: its notifications component was static/mock, so it would not show real `/notifications` records. Updated this component to API-backed rendering with read actions and unread badge sync.

## Implementation Plan
- Add a new domain event constant for ticket resolution and include it in envelope validation scope.
- Emit `FAULT_TICKET_RESOLVED` when fault-ticket status transitions into `Resolved`.
- Consume and route resolved notifications to the original reporter in both in-app and email channels.
- Replace Machinery Operator mock notification panel with `/notifications`-backed rendering and read-state actions.
- Validate syntax, diagnostics, and runtime persistence evidence.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add resolved domain event contract | Complete | 2026-04-20 | Added `FAULT_TICKET_RESOLVED` to `DomainEvents` and `DomainEvents::all()`. |
| 1.2 | Emit event at resolved transition points | Complete | 2026-04-20 | Emitted from fault-ticket controller after successful status transition to `Resolved` in update and complete flows. |
| 1.3 | Add in-app and email recipient routing | Complete | 2026-04-20 | Notification/email consumers now route resolved event to reporter user (`reported_by`). |
| 1.4 | Migrate MO notifications panel to API | Complete | 2026-04-20 | Replaced static mock panel with live `/notifications` list + mark-read actions + unread badge updates. |
| 1.5 | Validate runtime delivery | Complete | 2026-04-20 | Published resolved event and verified persisted notification row targets reporter user. |

## Progress Log
### 2026-04-20
- Updated `app/events/DomainEvents.php`:
  - added `FAULT_TICKET_RESOLVED` constant.
  - added to `DomainEvents::all()`.
- Updated `app/controllers/FaultTicketController.php`:
  - added resolved-transition snapshot checks in `update()` and `complete()`.
  - added `emitResolvedNotificationEventIfNeeded(...)` helper.
  - emits `FAULT_TICKET_RESOLVED` with payload: `ticket_db_id`, `ticket_id`, `reported_by`, `status`, `resolved_at`, `resolved_by`.
- Updated `services/consume_notification_events.php`:
  - bound routing key `fault.ticket.resolved`.
  - added `DomainEvents::FAULT_TICKET_RESOLVED` case to create user-targeted in-app notification for reporter.
- Updated `services/consume_email_events.php`:
  - added `DomainEvents::FAULT_TICKET_RESOLVED` case to send reporter email notification.
- Updated `pages/dashboard/machinery-operator/components/mo-notifications.js`:
  - replaced static notifications array with API-backed `/notifications?limit=50` fetch.
  - added `Mark as Read` and `Mark All Read` actions (`/notifications/read`).
  - preserved unread badge updates via `mo:notifications-count`.
- Validation evidence:
  - `php -l` passed for:
    - `app/events/DomainEvents.php`
    - `app/controllers/FaultTicketController.php`
    - `services/consume_notification_events.php`
    - `services/consume_email_events.php`
  - diagnostics: no errors for touched backend and MO notifications files.
  - attempted UI validation:
    - `cd testing/ui-validation && npx playwright test machinery-operator-dashboard/validate-machinery-operator-dashboard.spec.js --reporter=line`
    - current failure is environment/auth redirect (`/dashboard/machinery-operator/index.html` -> `/auth/login.html`) before notifications assertions, indicating pre-existing fixture/auth mocking mismatch rather than component runtime exceptions.
  - live consumer runtime evidence:
    - consumer received `routing_key=fault.ticket.resolved` and acknowledged event.
    - DB row persisted: `id=20 | user_id=7 | source_event=FAULT_TICKET_RESOLVED | src=MBD-003 | title=Ticket resolved`.
