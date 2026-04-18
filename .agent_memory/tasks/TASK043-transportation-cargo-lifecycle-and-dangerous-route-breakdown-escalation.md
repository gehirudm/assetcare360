# [TASK043] - Transportation Cargo Lifecycle and Dangerous Route Breakdown Escalation

**Status:** Completed  
**Added:** 2026-04-17  
**Updated:** 2026-04-17

## Original Request
Transportation Manager should be able to create/manage cargo items, assign cargo items with quantities to trips, track transported quantities, and view analytics/graphs. Drivers must see cargo items in assigned trip details. If a driver reports an in-route breakdown while carrying dangerous cargo, that ticket must be escalated to highest priority and shown to Supervisor as dangerous.

## Thought Process
- Current trip model stores only free-text `cargo_description`; structured cargo lifecycle requires normalized cargo master + trip-assignment tables.
- Dangerous-cargo escalation must be deterministic at route-breakdown creation time, so hazardous state should be snapshotted in route-breakdown data.
- Existing supervisor flows already consume route-breakdown + fault-ticket data, so hazardous visibility can be added through enriched payload fields and UI badges.

## Implementation Plan
- Add migration for `cargo_items`, `trip_cargo_items`, and dangerous-cargo snapshot columns on route breakdowns.
- Extend trip backend/service/controller to support cargo item CRUD, trip cargo assignment, and cargo analytics.
- Enforce dangerous-cargo priority escalation when creating fault tickets from route breakdowns.
- Update Transportation Manager UI for cargo management/analytics and trip cargo assignment.
- Update Driver and Supervisor UI surfaces to display assigned cargo details and dangerous-cargo indicators.
- Update OpenAPI and run backend/frontend validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Create memory task and scope baseline | Complete | 2026-04-17 | TASK043 created and indexed. |
| 1.2 | Add schema migration for cargo lifecycle + dangerous snapshot | Complete | 2026-04-17 | Implemented `056_add_cargo_lifecycle_and_route_dangerous_snapshot.php`. |
| 1.3 | Implement backend cargo APIs + trip cargo enrichment | Complete | 2026-04-17 | Added `/trips/cargo-items`, `/trips/cargo-analytics`, and trip payload enrichment (`cargo_items`, totals, dangerous flags, summary). |
| 1.4 | Implement dangerous-cargo ticket escalation logic | Complete | 2026-04-17 | Route breakdown snapshot and fault-ticket creation now escalate dangerous route breakdowns to Critical with dangerous metadata. |
| 1.5 | Update TM/Driver/Supervisor UI for cargo + dangerous indicators | Complete | 2026-04-17 | TM cargo catalog/analytics + assignment/edit/view, Driver cargo visibility, Supervisor dangerous badges, and shared ticket dangerous panel shipped. |
| 1.6 | Update OpenAPI and run validation | Complete | 2026-04-17 | Updated `testing/openapi.yaml`; Playwright after-stage validation passed. |

## Progress Log
### 2026-04-17
- Created TASK043 and linked it in tasks index.
- Completed code archaeology of trip, route-breakdown, fault-ticket, and dashboard UI integration points.
- Finalized implementation plan for normalized cargo lifecycle + dangerous-cargo escalation.

### 2026-04-17
- Completed backend cargo lifecycle implementation:
	- Added cargo catalog CRUD + analytics APIs in Trip domain.
	- Trip responses now include structured cargo payload (`cargo_items`, quantity totals, dangerous flags, summary).
	- Dangerous cargo snapshot captured on route breakdown creation and used by fault-ticket escalation.
- Completed frontend implementation:
	- Transportation Manager trip assignment/edit/view now supports structured cargo rows with quantities.
	- Transportation Manager trips page includes cargo catalog management and analytics visualization.
	- Driver trip/ticket surfaces now show structured cargo summaries/details and dangerous markers.
	- Supervisor ticket lists now show dangerous-cargo chips/summary/trip context for route-breakdown tickets.
	- Shared `pages/view-ticket` overview now renders dangerous-cargo panel and flow narrative context.
- Completed contract and validation:
	- Updated `testing/openapi.yaml` for trip cargo endpoints/schemas and dangerous snapshot fields.
	- Executed `VAL_STAGE=after` for `testing/ui-validation/transportation-cargo-lifecycle/validate-transportation-cargo-lifecycle.spec.js` with pass result (1/1).
