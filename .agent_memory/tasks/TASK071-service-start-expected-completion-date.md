# [TASK071] - Service Start Expected Completion Date Capture

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- After Technical Officer optionally requests spare parts and starts a service ticket, require an expected completion date.
- Ensure this captured value is visible to Maintenance Manager in service-ticket detail view.

## Thought Process
- Reuse existing `service_tickets.scheduled_date` as the canonical expected-completion field (no schema change needed).
- Enforce expected date capture at service start for Technical Officers on backend and frontend.
- Surface the same field in MM detail with explicit expected-completion labeling.

## Implementation Plan
- Extend service-ticket start API to accept and validate `expected_completion_date`.
- Require this field for TO role when starting service and persist into `scheduled_date`.
- Update TO start flows (detail action + no-spare modal path) to prompt and submit expected date.
- Update MM detail labels to clearly show expected completion value.
- Update OpenAPI and run targeted validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Backend start endpoint date handling | Complete | 2026-04-20 | Added start payload parsing + TO-required expected date validation in controller/service. |
| 1.2 | TO start-flow expected date prompt | Complete | 2026-04-20 | Added prompt/validation in detail start and no-spare modal start paths. |
| 1.3 | MM detail visibility update | Complete | 2026-04-20 | Relabeled detail and overview metrics to expected completion terminology. |
| 1.4 | API docs and validation | Complete | 2026-04-20 | OpenAPI updated for `/service-tickets/{id}/start`; diagnostics + Playwright suite passed. |

## Progress Log
### 2026-04-20
- Updated backend start flow:
  - `app/services/ServiceTicketService.php`
    - `start(...)` now accepts payload data.
    - validates `expected_completion_date` format.
    - enforces expected date for `Technical Officer` role.
    - blocks past dates.
    - persists expected date into `scheduled_date` when starting.
  - `app/controllers/ServiceTicketController.php`
    - `start()` now parses optional JSON payload and forwards data to service layer.
- Updated TO frontend start paths:
  - `pages/dashboard/technical-officer/components/service-ticket-details/script.js`
    - start action now prompts for expected completion date and validates before API call.
    - sends `expected_completion_date` in `/service-tickets/{id}/start` request.
  - `pages/dashboard/technical-officer/script.js`
    - no-spare service start path now prompts/validates expected completion date and submits it.
- Updated MM detail presentation:
  - `pages/dashboard/maintenance/components/service-ticket-details/script.js`
    - labels now show `Expected Completion Date` / `Expected Completion` (from `scheduled_date`).
- Updated TO detail labels for consistency:
  - `pages/dashboard/technical-officer/components/service-ticket-details/script.js`
    - labels now show expected completion terminology.
- Updated API contract:
  - `testing/openapi.yaml`
    - `/service-tickets/{id}/start` now documents request body with `ServiceTicketStartInput`.
    - added validation-failure (`422`) response.
    - clarified `scheduled_date` semantics as expected completion date.
- Validation evidence:
  - `php -l app/services/ServiceTicketService.php app/controllers/ServiceTicketController.php` passed.
  - `npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js` passed (desktop/mobile, 2/2).
