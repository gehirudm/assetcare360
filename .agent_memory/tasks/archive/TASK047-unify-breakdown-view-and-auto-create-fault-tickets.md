# [TASK047] - Unify Breakdown View and Auto-Create Fault Tickets

**Status:** Completed  
**Added:** 2026-04-18  
**Updated:** 2026-04-18

## Original Request
- Vehicle Breakdown and Fault Ticket cards should have the same View behavior.
- Viewing breakdown items should open the fault-ticket-style flow with actions.
- In-route breakdown creation must auto-create a linked fault ticket.
- Extend linked fault-ticket auto-creation to all breakdown types (vehicle, in-route, machine).
- Keep specialized breakdown details in specialized tables and aggregate them into ticket-view payloads.

## Thought Process
- Link creation should happen at breakdown-create time to avoid inconsistent reporting and ad-hoc UI conversion behavior.
- Supervisor view behavior should be deterministic: always open ticket flow for breakdown entries.
- Legacy unlinked records still require a safe fallback path (create or open linked ticket) until historical data is fully normalized.
- Specialized table data must remain normalized at source tables while ticket payloads expose an aggregated read model.

## Implementation Plan
- Add transactional fault-ticket auto-creation to vehicle, route, and machine breakdown create flows.
- Unify Supervisor breakdown actions to ticket-view semantics (`VIEW TICKET`) and route actions through create-or-open behavior.
- Enrich fault-ticket formatting with specialized breakdown context from source tables.
- Update OpenAPI notes for affected route-breakdown create behavior.
- Update UI validation assertions and rerun targeted tests.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add backend create-time ticket linkage for all breakdown types | Complete | 2026-04-18 | Implemented in vehicle, route, and machine breakdown controllers with transactional rollback safety. |
| 1.2 | Unify Supervisor breakdown view actions to ticket flow | Complete | 2026-04-18 | Breakdown cards now use `VIEW TICKET` semantics and route through view-or-create ticket handling. |
| 1.3 | Add legacy unlinked fallback behavior | Complete | 2026-04-18 | Supervisor create-or-open path creates ticket only when linkage is missing and then opens ticket view. |
| 1.4 | Aggregate specialized breakdown context in ticket payload | Complete | 2026-04-18 | `FaultTicketService` now resolves vehicle/route/machine context and merges `breakdown_context` fields for consumers. |
| 1.5 | Update validation and contract notes | Complete | 2026-04-18 | Supervisor ticket-modal and route-breakdown workflow specs passed; OpenAPI route-breakdown create docs updated. |

## Progress Log
### 2026-04-18
- Implemented transactional auto fault-ticket creation in:
  - `app/controllers/BreakdownReportController.php`
  - `app/controllers/RouteBreakdownController.php`
  - `app/controllers/MachineBreakdownController.php`
- Added specialized breakdown-context aggregation in `app/services/FaultTicketService.php` so ticket payloads include normalized source-table context.
- Unified Supervisor breakdown action behavior in:
  - `pages/dashboard/supervisor/components/fault-tickets/script.js`
  - `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js`
  - `pages/dashboard/supervisor/script.js`
- Updated UI assertions and mock behavior in `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` for create-or-open linked ticket flow.
- Updated API documentation note in `testing/openapi.yaml` for route-breakdown create behavior.
- Validation evidence:
  - `php -l app/controllers/BreakdownReportController.php` (pass)
  - `php -l app/controllers/RouteBreakdownController.php` (pass)
  - `php -l app/controllers/MachineBreakdownController.php` (pass)
  - `php -l app/services/FaultTicketService.php` (pass)
  - `VAL_STAGE=after npx playwright test supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js --reporter=line` (pass: 2/2)
  - `VAL_STAGE=after npx playwright test route-breakdown-garage-workflow/validate-route-breakdown-garage-workflow.spec.js --reporter=line` (pass: 2/2)
