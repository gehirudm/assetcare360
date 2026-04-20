# [TASK042] - Route Breakdown Driver Location Capture and Map-Based Garage Approval

**Status:** Completed  
**Added:** 2026-04-17  
**Updated:** 2026-04-17

## Original Request
When a driver creates an in-route breakdown ticket, collect the driver's location. When a supervisor views that ticket, show the driver's location and registered garages on a map, and allow selecting and approving a garage directly from the map.

## Thought Process
- Existing route-breakdown flow already supports garage approval, so map selection should extend the current flow instead of replacing it.
- Current route-breakdown schema stores only free-text `breakdown_location`; map rendering requires structured coordinates.
- Garages already include latitude/longitude via migration 052, so supervisor map can use existing garage endpoints.

## Implementation Plan
- Add migration to store route breakdown driver coordinates.
- Update route breakdown API create/update validation and persistence for coordinates.
- Update Driver in-route breakdown modal to capture browser geolocation and submit coordinates.
- Update Supervisor garage approval UI (dashboard modal + shared ticket detail flow) to render map with driver + garage markers and map-driven garage selection.
- Update OpenAPI and run validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Create memory task and scope plan | Complete | 2026-04-17 | TASK042 created and indexed. |
| 1.2 | Add DB schema fields for route breakdown coordinates | Complete | 2026-04-17 | Added migration 055 and applied successfully. |
| 1.3 | Backend route-breakdown API coordinate support | Complete | 2026-04-17 | Create/update now validate and persist coordinate pairs. |
| 1.4 | Driver geolocation capture in route-breakdown modal | Complete | 2026-04-17 | Added GPS capture UX and submit-time coordinate enforcement. |
| 1.5 | Supervisor map-based garage approval UI | Complete | 2026-04-17 | Dashboard + shared ticket flow now render map and support marker-driven selection. |
| 1.6 | OpenAPI and validation evidence update | Complete | 2026-04-17 | OpenAPI updated; before/after UI validation passed desktop + mobile. |

## Progress Log
### 2026-04-17
- Created TASK042 and linked it in tasks index.
- Completed code archaeology for route-breakdown create flow and existing supervisor garage approval flows (`pages/view-ticket` and supervisor dashboard modal).
- Identified required schema gap: route breakdown table currently has text location only, no coordinate columns.

### 2026-04-17 (Completion)
- Added `migrations/055_add_coordinates_to_route_breakdowns.php` with `breakdown_latitude`, `breakdown_longitude`, and index `idx_route_breakdown_coordinates`.
- Ran migration manager (`php scripts/migrate.php migrate`); migration 055 applied successfully and status now shows 0 pending.
- Updated `app/controllers/RouteBreakdownController.php`:
	- create flow now requires valid latitude/longitude pair and persists both values.
	- update flow now supports coordinate pair updates and safe pair clearing.
	- added coordinate parsing/validation helper.
- Updated Driver in-route modal (`driver-breakdown-in-route-modal.js`) to capture browser GPS, show capture status, and block create submit until coordinates are captured.
- Updated Supervisor garage approval modal to render driver + garage map markers and synchronize marker clicks with garage selection.
- Updated shared `pages/view-ticket` garage approval modal UI + script + styles to include map rendering and marker-based selection.
- Updated `testing/openapi.yaml` with route-breakdown CRUD/stats path documentation and coordinate-aware schemas.
- Added/refined validation spec `testing/ui-validation/route-breakdown-garage-workflow/validate-route-breakdown-garage-workflow.spec.js` for:
	- Driver GPS capture and coordinate payload assertion.
	- Supervisor map marker selection path.
	- desktop + mobile execution.
- Validation evidence:
	- `VAL_STAGE=before`: passed (2/2)
	- `VAL_STAGE=after`: passed (2/2)
	- PHP syntax checks passed for touched backend/migration files.
	- JS syntax checks and editor diagnostics passed for touched frontend/API-doc files.
