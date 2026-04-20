# [TASK109] - Asset Service Due/Overdue Maintenance Manager Routing

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Asset due maintenance: send notification to Maintenance Manager.
- Asset overdue maintenance: send notification to Maintenance Manager and send email to all Maintenance Manager emails.
- Potentially update `services/check_service_due.php`.

## Thought Process
- Existing service-due producer emits only `ASSET_SERVICE_DUE_SOON` and consumers currently route that event to Inventory Manager.
- Current due queries include both near-due and overdue states, so producer must classify status and emit correct event semantics.
- To avoid duplicate suppression collisions, lock keys must include service status (due/overdue) so an asset can emit due and later overdue once each.

## Implementation Plan
- Add a dedicated overdue domain event and register it in envelope validation.
- Update `check_service_due.php` to classify due vs overdue for date and usage thresholds and emit correct event.
- Update notification consumer routing so both due and overdue notify Maintenance Manager.
- Update email consumer routing so only overdue sends to all Maintenance Managers.
- Run syntax checks and update memory/task records.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add event contract for overdue maintenance | Complete | 2026-04-20 | Added `ASSET_SERVICE_OVERDUE` to DomainEvents catalog/all(). |
| 1.2 | Classify due vs overdue in producer | Complete | 2026-04-20 | `check_service_due.php` now classifies date + usage windows and emits due/overdue events. |
| 1.3 | Route in-app notifications to Maintenance Manager | Complete | 2026-04-20 | Notification consumer binds overdue routing key and maps due+overdue to `target_role=Maintenance Manager`. |
| 1.4 | Route overdue email to all Maintenance Managers | Complete | 2026-04-20 | Email consumer now sends overdue alerts to all Maintenance Managers; due-soon is in-app only. |
| 1.5 | Validate and finalize memory sync | Complete | 2026-04-20 | Lint and diagnostics clean for all touched backend files. |

## Progress Log
### 2026-04-20
- Loaded memory-bank core files and notification/event pipeline anchors.
- Confirmed current behavior:
  - `check_service_due.php` emits only `ASSET_SERVICE_DUE_SOON`.
  - Notification consumer maps service-due to Inventory Manager.
  - Email consumer maps service-due to Inventory Manager.
- Identified needed changes for requested behavior:
  - add overdue event contract.
  - classify due/overdue in producer.
  - re-route recipients to Maintenance Manager with overdue-only email fanout.
- Implemented `app/events/DomainEvents.php` update:
  - added `ASSET_SERVICE_OVERDUE` constant and registered it in `DomainEvents::all()`.
- Implemented `services/check_service_due.php` updates:
  - added due/overdue classification for service-date and usage thresholds (vehicle mileage, machine hours).
  - emits `ASSET_SERVICE_DUE_SOON` for due assets and `ASSET_SERVICE_OVERDUE` for overdue assets.
  - enriched payload with `service_status`, `service_basis`, `status_message`, and remaining/overdue metrics.
  - lock keys now include service status + metric reference to allow one due event and one overdue event per asset lifecycle.
- Implemented `services/consume_notification_events.php` updates:
  - added `asset.service.overdue` binding.
  - routes due and overdue maintenance notifications to `target_role = Maintenance Manager`.
- Implemented `services/consume_email_events.php` updates:
  - due-soon events remain in-app only.
  - overdue events send email to all Maintenance Manager recipients.
- Validation evidence:
  - `php -l app/events/DomainEvents.php` passed.
  - `php -l services/check_service_due.php` passed.
  - `php -l services/consume_notification_events.php` passed.
  - `php -l services/consume_email_events.php` passed.
  - diagnostics clean for all touched files.
