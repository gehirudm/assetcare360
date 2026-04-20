# [TASK049] - Supervisor Insurance Claim Fault Ticket Flow

**Status:** Completed  
**Added:** 2026-04-18  
**Updated:** 2026-04-18

## Original Request
- When a fault ticket is handled by Supervisor, show insurance details.
- Show whether insurance claim is eligible or not.
- If eligible, route next action through insurance claim instead of Technical Officer assignment.
- Change status to `Insurance Claimed` when claim is submitted.

## Thought Process
- Insurance claim behavior must be enforced in backend transitions, not only frontend buttons.
- The `Insurance Claimed` state needs full parity with existing status lifecycle: model constants, validation, workflow sync, reporting queries, and DB enum values.
- Supervisor UI should surface both insurance metadata and eligibility reason to make claim decisions transparent.
- Existing route and assignment workflows should not regress when a ticket is moved to insurance claim state.

## Implementation Plan
- Add `Insurance Claimed` status support in fault ticket model, services, workflow sync, and migration.
- Build insurance-claim context in fault ticket response payload (details + eligibility + reason).
- Enforce supervisor/admin-only insurance claim transition and eligibility checks in backend.
- Update shared ticket-detail UI and Supervisor list rendering for insurance claim branch behavior.
- Update OpenAPI schemas and run syntax, migration, and UI validation checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add backend status and migration support for Insurance Claimed | Complete | 2026-04-18 | Added status constant/validation and applied migration `059_add_insurance_claimed_status_to_fault_tickets.php`. |
| 1.2 | Implement insurance details and eligibility context in ticket payload | Complete | 2026-04-18 | `FaultTicketService::formatTicket` now returns `insurance_claim` context including eligibility and reason. |
| 1.3 | Enforce insurance-claim transition rules and assignment deactivation | Complete | 2026-04-18 | Backend enforces role gate + eligibility gate and deactivates technician assignments on claim transition. |
| 1.4 | Update Supervisor/shared UI for insurance branch and claim action | Complete | 2026-04-18 | Shared `pages/view-ticket` shows insurance panel and claim CTA; Supervisor tracking normalizes status display. |
| 1.5 | Update API docs and run verification | Complete | 2026-04-18 | OpenAPI status enums/schemas updated; diagnostics, lint, migration, and Playwright after-stage checks passed. |

## Progress Log
### 2026-04-18
- Updated backend status model and workflow handling:
  - `app/models/FaultTicket.php`
  - `app/services/FaultTicketWorkflowService.php`
  - `app/services/FaultTicketService.php`
- Added migration:
  - `migrations/059_add_insurance_claimed_status_to_fault_tickets.php`
- Updated related workload and active-ticket query guards so insurance-claimed tickets are treated as non-active where required:
  - `app/models/User.php`
  - `app/models/FaultTicketAssignment.php`
  - `app/services/TripService.php`
  - `app/controllers/RouteBreakdownController.php`

### 2026-04-18
- Updated shared ticket detail UI and Supervisor list behavior:
  - `pages/view-ticket/index.html`
  - `pages/view-ticket/script.js`
  - `pages/dashboard/technical-officer/view-ticket/style.css`
  - `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js`
- Updated API contract documentation:
  - `testing/openapi.yaml` (status enums + `FaultTicketInsuranceClaim` schema)
- Validation evidence:
  - Touched-file diagnostics: no new errors.
  - PHP lint: passed for touched backend and migration files.
  - Migration status: `59/59 applied, 0 pending` after applying migration 059.
  - UI validation: `VAL_STAGE=after` passed for `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` (desktop + mobile, `2/2`).
