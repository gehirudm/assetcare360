# [TASK102] - Technician Spare-Part and Budget Notification Recipient Hardening

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Technician requests spare parts -> Notification goes to Inventory Manager.
- Technician submits new budget approval -> Notification goes to Supervisor when below petty cash amount; Maintenance Manager always.

## Thought Process
- Event producer and consumer paths for both workflows were already present (`SPARE_PART_REQUEST_CREATED`, `BUDGET_REPORT_CREATED`) in both in-app and email consumers.
- Recipient policy edge case existed in budget-created routing fallback:
  - Consumers always append Maintenance Manager recipient first.
  - Supervisor fallback incorrectly checked `empty($records)`, which is never true after Maintenance Manager recipient is added.
  - Result: supervisor fallback could be skipped for below-petty-cash budgets when assignment-based supervisor lookup yields no IDs.
- Additional compatibility hardening was needed so consumers accept either `approval_role` or legacy/alternate `approval_level` payload field.

## Implementation Plan
- Harden budget-created recipient resolution in in-app notification consumer.
- Apply the same hardening in email consumer to preserve channel parity.
- Validate touched files with diagnostics and PHP syntax checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Verify trigger-to-recipient mappings | Complete | 2026-04-20 | Confirmed spare-part and budget events were already routed to target roles/users with one fallback gap. |
| 1.2 | Patch in-app budget recipient fallback | Complete | 2026-04-20 | Added `approval_level` compatibility and supervisor-recipient fallback based on explicit supervisor delivery state. |
| 1.3 | Patch email budget recipient fallback parity | Complete | 2026-04-20 | Mirrored in-app hardening to email consumer and kept role/user routing consistent. |
| 1.4 | Validate touched backend files | Complete | 2026-04-20 | Diagnostics clean; PHP lint passed for both consumers; runtime DB checks confirmed recipient delivery for target events. |

## Progress Log
### 2026-04-20
- Updated `services/consume_notification_events.php`:
  - normalized budget approval selector from `approval_role` with fallback to `approval_level`.
  - widened supervisor-routing condition to treat all non-`maintenance_manager` budgets as supervisor-routed.
  - fixed supervisor fallback by tracking `supervisorRecipientAdded` instead of checking `empty($records)`.
- Updated `services/consume_email_events.php`:
  - applied the same `approval_role`/`approval_level` compatibility.
  - fixed supervisor fallback gating with `supervisorRecipientAdded` so supervisor email recipients are guaranteed when required.
- Validation evidence:
  - diagnostics: no errors in touched files.
  - `php -l services/consume_notification_events.php` passed.
  - `php -l services/consume_email_events.php` passed.

### 2026-04-20 (runtime verification update)
- Verified runtime prerequisites:
  - `.env` and `dev.env` both have `EVENTS_ENABLED=true` and RabbitMQ host/port/user configured.
- Queried persisted notifications for target workflows:
  - `SPARE_PART_REQUEST_CREATED` includes `target_role=Inventory Manager` (count 1).
  - `BUDGET_REPORT_CREATED` includes `target_role=Maintenance Manager` (count 1) and user-targeted supervisor record (`target_role=NULL`, `user_id=5`, count 1).
- Confirmed recent records:
  - `id=12` -> spare-part notification to Inventory Manager.
  - `id=17` -> budget notification to Maintenance Manager.
  - `id=18` -> budget notification to supervisor user (`user_id=5`, read-state observed as `is_read=1`).
