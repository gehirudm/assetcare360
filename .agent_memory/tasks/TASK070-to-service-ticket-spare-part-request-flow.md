# [TASK070] - TO Service Ticket Spare Part Request Flow

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Enable Technical Officers to optionally request spare parts from the service-ticket detail page before starting service work.
- Route requests to Inventory Manager approval, matching the existing fault-ticket spare-part request behavior.
- Support end-to-end backend + frontend + API contract + UI validation updates.

## Thought Process
- Extend spare-part request backend from fault-ticket-only to dual-context (fault or service ticket) while preserving existing fault workflow behavior.
- Reuse TO shared request modal for parity and consistency, with context-aware payload branching.
- Keep start-service action visible for service tickets but lock it while spare-part request approval is pending.

## Implementation Plan
- Extend spare-part request backend model/service/controller/routes for service ticket linkage.
- Add DB migration for nullable `fault_ticket_id` and new `service_ticket_id` foreign-key path.
- Add TO service-ticket detail action to open request modal and show latest request status.
- Update TO modal submit flow for context-aware fault/service payloads and start behavior.
- Update OpenAPI and TO routing validation spec.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Extend backend request context support | Complete | 2026-04-20 | Added service-ticket linkage support in model/service/controller/routes. |
| 1.2 | Apply schema migration for service linkage | Complete | 2026-04-20 | Added and executed migration `063_extend_spare_part_requests_for_service_tickets.php`. |
| 1.3 | Implement TO detail modal integration | Complete | 2026-04-20 | Added detail-page request action + context-aware shared modal handling. |
| 1.4 | Validate and document contract updates | Complete | 2026-04-20 | Updated OpenAPI and passed TO routing Playwright desktop/mobile suite. |

## Progress Log
### 2026-04-20
- Updated backend dual-context spare-part request flow:
  - `app/models/SparePartRequest.php` query joins/fields normalized for fault and service ticket metadata.
  - `app/services/SparePartRequestService.php` create/approve/reject paths updated for service-ticket context safety.
  - `app/controllers/SparePartRequestController.php` added service-ticket filter and `getByServiceTicket` endpoint support.
  - `public/index.php` added route `GET /spare-part-requests/service-ticket/:id`.
- Added and ran migration:
  - `migrations/063_extend_spare_part_requests_for_service_tickets.php`.
- Updated TO frontend flow:
  - `pages/dashboard/technical-officer/components/service-ticket-details/script.js` now exposes optional `Request Spare Parts` action in assigned state and locks start action while pending approval exists.
  - `pages/dashboard/technical-officer/script.js` added service-ticket modal launcher and context-aware request submit/start branching.
  - `pages/dashboard/technical-officer/index.html` added hidden modal context field.
- Updated IM approvals rendering:
  - `pages/dashboard/inventory-manager/components/orders-approvals/script.js` now resolves ticket type/status generically for fault/service contexts.
- Updated API docs:
  - `testing/openapi.yaml` now documents spare-part request CRUD/list/filter endpoints including service-ticket route and dual-context request schema.
- Validation evidence:
  - `php -l` passed for touched backend files and migration.
  - `php migrations/063_extend_spare_part_requests_for_service_tickets.php` executed successfully.
  - `npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js` passed (desktop + mobile, 2/2).
