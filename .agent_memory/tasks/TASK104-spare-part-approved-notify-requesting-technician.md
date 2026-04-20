# [TASK104] - Spare Part Approved Notify Requesting Technician

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Spare parts request approved -> notification goes to the technician that requested it.

## Thought Process
- Existing approved/rejected spare-part routing targeted `requested_by` when present in event payload.
- Runtime behavior could degrade if legacy/manual events omit `requested_by`; this produced broad/global notifications instead of technician-targeted delivery.
- To guarantee recipient correctness, requester resolution was hardened at consumer side with DB fallback by `request_db_id` / `request_id`.
- Producer payload was also enriched to always include both request identifiers and context metadata.

## Implementation Plan
- Harden in-app notification consumer to resolve requester from `spare_part_requests` when payload `requested_by` is missing.
- Apply the same recipient-resolution fallback in email consumer for in-app/email parity.
- Enrich spare-part approve/reject event payload with request identifiers and context.
- Validate with syntax checks plus live RabbitMQ publish/consume verification.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add requester fallback for in-app notifications | Complete | 2026-04-20 | `consume_notification_events.php` now resolves requester from request table if payload lacks `requested_by`. |
| 1.2 | Add requester fallback for email notifications | Complete | 2026-04-20 | `consume_email_events.php` now mirrors same fallback strategy. |
| 1.3 | Enrich approve/reject producer payload | Complete | 2026-04-20 | `SparePartRequestController` now emits `request_id`, ticket context IDs, and `request_context`. |
| 1.4 | Runtime verification | Complete | 2026-04-20 | Live event without `requested_by` resolved to `user:8` and persisted correctly. |

## Progress Log
### 2026-04-20
- Updated `services/consume_notification_events.php`:
  - added lookup statements for `spare_part_requests` by numeric id and request code.
  - added `resolveSparePartRequester(...)` fallback used by approved/rejected event mapping.
  - hardened mapping to skip unresolved recipients instead of generating broad/global records.
  - improved message/source id formatting using canonical request id when available.
- Updated `services/consume_email_events.php`:
  - added equivalent requester fallback resolver and unresolved-recipient guard.
  - aligned approved/rejected email subject/body to include request identifier.
- Updated `app/controllers/SparePartRequestController.php`:
  - approval/rejection emits now include `request_id`, `fault_ticket_id`, `service_ticket_id`, and `request_context` metadata.
- Validation evidence:
  - `php -l app/controllers/SparePartRequestController.php` passed.
  - `php -l services/consume_notification_events.php` passed.
  - `php -l services/consume_email_events.php` passed.
  - live fallback test:
    - published `SPARE_PART_REQUEST_APPROVED` with `request_db_id=11` and no `requested_by`.
    - updated notification consumer log confirmed recipient resolution and persistence: `recipient=user:8`.
    - DB row persisted: `id=23 | user_id=8 | source_event=SPARE_PART_REQUEST_APPROVED | source_event_id=SPR-010 | message=Your spare-part request SPR-010 was approved.`