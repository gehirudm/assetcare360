# [TASK105] - Budget Approved Notify Requesting Technician

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Budget request approved -> notification goes to the technician that requested.

## Thought Process
- Budget-reviewed notifications were mapped to `submitted_by` in consumers, but approval via the dedicated `review()` endpoint did not emit `BUDGET_REPORT_REVIEWED`.
- This caused a producer gap: no event, no notification, even when consumer routing logic was correct.
- To guarantee recipient correctness across payload quality variance, consumer-side fallback was added to resolve submitter from `budget_reports` by `report_id` when `submitted_by` is omitted.
- Email parity should mirror in-app behavior for the same event.

## Implementation Plan
- Add `BUDGET_REPORT_REVIEWED` emit in `BudgetReportController::review()` after successful review write.
- Add in-app consumer fallback for submitter resolution via `budget_reports` lookup.
- Add email consumer fallback with the same lookup strategy.
- Validate via syntax checks and live RabbitMQ publish/consume with payload missing `submitted_by`.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Emit reviewed event from budget review endpoint | Complete | 2026-04-20 | `BudgetReportController::review()` now emits `BUDGET_REPORT_REVIEWED` with submitter/context payload. |
| 1.2 | Add in-app submitter fallback | Complete | 2026-04-20 | `consume_notification_events.php` now resolves `submitted_by` from `budget_reports` when missing. |
| 1.3 | Add email submitter fallback parity | Complete | 2026-04-20 | `consume_email_events.php` now resolves `submitted_by` from `budget_reports` when missing. |
| 1.4 | Runtime verification | Complete | 2026-04-20 | Live event with missing `submitted_by` persisted as user-targeted notification for report submitter (`user_id=30`). |

## Progress Log
### 2026-04-20
- Updated `app/controllers/BudgetReportController.php`:
  - `review()` now emits `BUDGET_REPORT_REVIEWED` after successful review and workflow sync.
  - emitted payload includes `report_id`, `fault_ticket_id`, `status`, `reviewed_by`, `submitted_by`, and `approval_level`.
- Updated `services/consume_notification_events.php`:
  - added `budget_reports` lookup statement and `resolveBudgetSubmitter(...)` helper.
  - `BUDGET_REPORT_REVIEWED` mapping now uses resolved submitter and skips unresolved recipient records safely.
- Updated `services/consume_email_events.php`:
  - added matching `resolveBudgetSubmitter(...)` helper.
  - `BUDGET_REPORT_REVIEWED` email routing now uses resolved submitter and skips unresolved cases with explicit log.
- Validation evidence:
  - `php -l app/controllers/BudgetReportController.php` passed.
  - `php -l services/consume_notification_events.php` passed.
  - `php -l services/consume_email_events.php` passed.
  - live in-app fallback test:
    - published `BUDGET_REPORT_REVIEWED` with `report_id=6` and no `submitted_by`.
    - consumer log persisted notification to `recipient=user:30`.
    - DB row verified: `id=24 | user_id=30 | source_event=BUDGET_REPORT_REVIEWED | source_event_id=6`.
  - email consumer parity evidence:
    - latest `processed_events` row for `email_consumer` advanced to id `72` at `2026-04-20 18:19:08` after publish/consume run.
