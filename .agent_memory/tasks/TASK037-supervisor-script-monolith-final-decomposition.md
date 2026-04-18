# TASK037 - Supervisor Script Monolith Final Decomposition

**Status:** In Progress  
**Added:** April 14, 2026  
**Updated:** April 18, 2026

## Original Request
Supervisor and technical officer JS scripts are still monolithic. Analyze them and figure out why, and create tasks to address those issues via proper refactoring.

## Thought Process
High-level audit shows `pages/dashboard/supervisor/script.js` is still large (1759 lines) even after section component extraction. The root causes are:
- Parent script still owns section-level business logic and API orchestration for fault tickets, technicians, repair-management actions, budget details, and asset details.
- Several section components remain view/event shells while the parent script performs heavy workflows (`loadFaultTickets`, filter state, assignment map creation, details rendering).
- `repair-management` behavior is still placeholder-heavy with sample data and TODO markers in the parent script.
- Parent still builds large modal/detail HTML strings (`createDetailsModal`, budget/asset/technician detail renderers) instead of one-modal-per-component ownership.
- Global mutable state (`allTickets`, `allBreakdownItems`, technician maps, filters) is retained in parent scope rather than section-local/component-local state.

## Implementation Plan
- [ ] Complete ownership map for supervisor dashboard features and classify parent-script responsibilities as keep (orchestration) vs move (section/modal-specific).
- [ ] Move fault-ticket data orchestration, filtering, and rendering-state ownership into `supervisor-fault-tickets` plus dedicated dashboard-scoped helpers where needed.
- [ ] Refactor repair-management flow to remove parent sample-data handlers and TODO placeholders; move action APIs and detail rendering into component + modal components.
- [ ] Extract budget, asset, and technician detail rendering to one-modal-per-component files under `pages/dashboard/supervisor/components/page-modals/`.
- [ ] Reduce `pages/dashboard/supervisor/script.js` to orchestration-only responsibilities: auth/bootstrap, section activation routing, cross-component event bridges, shared toast helpers.
- [ ] Re-run before/after UI validation for supervisor flows (desktop + mobile) and confirm no regressions in ticket actions, modal flows, and section state.

## Acceptance Criteria
- `pages/dashboard/supervisor/script.js` no longer contains section-specific API workflows, sample-data detail renderers, or modal-specific business logic.
- Section components and page-modal components own their API calls, validation, and modal behavior according to decomposition rules.
- No remaining TODO/sample-data placeholders for repair-management actions in parent script.
- Parent script remains orchestration-only and significantly reduced in size.
- Before/after validation evidence is captured for supervisor dashboard interactions with no console/network regressions.

## Progress Tracking

**Overall Status:** In Progress - 74%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 37.1 | Supervisor ownership audit and move-map | Not Started | April 14, 2026 | Map section/modal logic still in parent script |
| 37.2 | Fault-ticket logic migration from parent | In Progress | April 18, 2026 | Replaced iframe-based shared ticket detail host with actor-specific ticket-detail components and direct view-ticket page navigation (Supervisor role override + return path), aligned breakdown actions to ticket-flow semantics, consolidated active list ownership under `fault-ticket-tracking` (removed parallel technician-assignment section), and added component-owned criticality sorting plus legacy route-description normalization. A final UX correction removed list-level map actions and moved route map display into `pages/view-ticket` detail UI. |
| 37.3 | Repair-management + details-modal decomposition | Not Started | April 14, 2026 | Remove sample/TODO parent handlers |
| 37.4 | Budget/asset/technician detail modal extraction | Not Started | April 14, 2026 | One-modal-per-component under page-modals |
| 37.5 | Validation and cleanup | In Progress | April 18, 2026 | Supervisor ticket-flow validation and regression reruns passed desktop/mobile after UX fixes. Revalidated after removing shared iframe host files and moving Supervisor to actor-specific ticket-detail component with direct view-ticket navigation. Updated modal-suite assertions for breakdown create-or-open behavior and revalidated desktop/mobile pass. Added dedicated `supervisor-fault-ticket-tracking` before/after desktop+mobile validation for section consolidation, dangerous badge visibility, source filtering, button-label/action regressions, criticality ordering, garage-approved status rendering, and final map placement behavior (no list map button, embedded detail-page route map). Added follow-up regression coverage for detail-page nearby-garage modal centering + map marker selection, with desktop/mobile pass. |

## Progress Log
### April 14, 2026
- Task created from script decomposition analysis request.
- Confirmed parent script remains monolithic due section-specific workflow ownership, placeholder repair handlers, and modal rendering in parent scope.

### April 17, 2026
- Implemented supervisor in-dashboard ticket detail section routing via shared `ac-ticket-detail-view` component.
- Updated `viewTicketDetails(...)` to open `ticket-details` section and preserve return-section behavior instead of redirecting to standalone page.
- Removed remaining legacy redirect fallback in `supervisor-fault-ticket-tracking` for existing ticket IDs.
- Updated and executed `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` (desktop + mobile passed).
- Applied UX stabilization for Supervisor ticket-details component usage:
	- Added shared back-icon button styling in `ac-ticket-detail-view.css`.
	- Added scroll-to-top handling when opening ticket details to prevent deep-list offset carryover.
	- Clarified `VIEW TICKET` vs `VIEW BREAKDOWN` labels in supervisor ticket/breakdown lists to match actual behavior.
- Re-executed `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` after UX fixes (desktop + mobile passed).
- Added shared `ac-breakdown-detail-view` component and mounted Supervisor `breakdown-details` section to provide a dedicated, view-only breakdown detail experience similar to ticket-details.
- Rewired Supervisor `View Breakdown` actions (fault-tickets + fault-ticket-tracking) to the new section and removed automatic route breakdown fault-ticket creation from view flows.
- Removed breakdown-to-ticket create CTA/event wiring from supervisor view-ticket modal to prevent accidental conversion from any modal path.
- Updated `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` to assert `View Breakdown` opens `breakdown-details` and does not issue `POST /api/fault-tickets` requests.
- Executed updated Supervisor validation suite with `VAL_STAGE=after` (desktop + mobile passed).

### April 18, 2026
- Fixed dual-scroll UX issue in shared ticket details by updating `ac-ticket-detail-view` to lock parent dashboard scroll while the `ticket-details` section is active with an open ticket.
- Added class-based lock (`ac-ticket-detail-parent-scroll-locked`) and section activity observation so scroll lock is applied only in active ticket-detail view and released on navigation away.
- Executed `VAL_STAGE=after` for `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` (desktop + mobile passed).
- Executed `VAL_STAGE=after` for `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js` as shared-component regression guard (desktop + mobile passed).
- Replaced Supervisor dashboard ticket-detail section host with actor-specific `supervisor-ticket-detail-view` component under `pages/dashboard/supervisor/components/ticket-details/` and removed dependency on shared iframe host.
- Updated Supervisor orchestration to open standalone `pages/view-ticket/index.html` directly (no iframe), preserving existing View Ticket UI and using role override + return path.
- Updated UI validation expectations for direct detail-page navigation and back-return flow; `VAL_STAGE=after` reruns for supervisor and TO suites passed desktop/mobile after the migration.
- Applied updated behavior direction for breakdown entries in Supervisor lists:
	- normalized breakdown card actions to `VIEW TICKET`
	- routed breakdown actions through a view-or-create ticket path for legacy unlinked records
	- reused existing linked tickets where present to prevent duplicate creation
- Updated `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` assertions/mocks for unified breakdown ticket-flow behavior and reran `VAL_STAGE=after` (desktop + mobile passed).

### April 18, 2026 (Fault Ticket Section Consolidation Slice)
- Removed Supervisor Technician Assignment section from sidebar/layout (`fault-tickets` section host removed) and normalized all detail-return defaults to `fault-ticket-tracking`.
- Updated Supervisor section normalization/routing to alias legacy `fault-tickets` and `technician-assignments` routes to `fault-ticket-tracking`.
- Updated `supervisor-fault-ticket-tracking` component to:
	- add source filter controls (`All Sources`, `Vehicle`, `Machine`),
	- render dangerous-cargo badge/summary/trip metadata for route/vehicle breakdown rows,
	- remove list-level approve-garage action button,
	- rename action label from `VIEW TICKET` to `View`.
- Updated Supervisor overview fault-ticket card navigation and ticket-detail default return-section fallback to `fault-ticket-tracking`.
- Added and executed `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js`:
	- `VAL_STAGE=before`: pass (desktop + mobile)
	- `VAL_STAGE=after`: pass (desktop + mobile)
	- Console/network regressions: none in final artifact run.
- Deprecated legacy `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` with a file-level skip guard because it targets the removed `fault-tickets` section.

### April 18, 2026 (Criticality + Route Ticket Presentation Slice)
- Updated `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js` to sort cards by criticality first (Critical > High > Medium > Low) with date fallback.
- Removed noisy list-level route metadata lines from Supervisor cards:
	- dangerous cargo summary text,
	- dangerous cargo trip line,
	- garage workflow line.
- Added route workflow-aware effective status mapping so `garage_approved` route breakdown rows display `Garage Approved` instead of `Pending`.
- Added legacy route-description normalization for converted records so issue text no longer renders as concatenated payload blobs.
- Added route location UI details and `Map View` action button in list cards, with coordinate parsing from both dedicated columns and legacy text payloads.
- Updated route auto-ticket description generation in `app/controllers/RouteBreakdownController.php` to store concise issue text for new records instead of verbose legacy formatted blocks.
- Added migration `migrations/057_normalize_legacy_route_breakdown_descriptions.php` and applied it via migration manager to clean incompatible existing records.
- Migration execution result:
	- `vehicle_breakdown_inroute` descriptions normalized: 0
	- `fault_tickets` route descriptions normalized: 6
	- `php scripts/migrate.php status` now reports 55/55 applied, 0 pending.
- Updated and executed `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js`:
	- `VAL_STAGE=before`: pass (desktop + mobile)
	- `VAL_STAGE=after`: pass (desktop + mobile)
	- Assertions cover critical sort order, Garage Approved display status, hidden verbose metadata lines, legacy description cleanup, and map-view action.

### April 18, 2026 (List Map Removal + Detail Embedded Map Correction)
- Applied final UX correction after review feedback:
	- removed list-level map button/action from `supervisor-fault-ticket-tracking`,
	- removed route coordinate text from list cards,
	- removed `Ticket:` row from cards,
	- moved reporter role display next to reportee metadata row,
	- added embedded route-location map panel to shared detail page (`pages/view-ticket`) for route breakdown tickets.
- Updated `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` assertions to enforce:
	- no list map button,
	- no list coordinate text,
	- no `Ticket:` line,
	- role-next-to-reportee rendering,
	- route map panel visibility in detail view.
- Validation rerun status:
	- desktop + mobile pass (`2/2`),
	- touched-file diagnostics clean.

### April 18, 2026 (Supervisor Garage Approval Modal Regression Fix)
- Fixed shared detail-page `Approve Nearby Garage` modal CSS conflict that caused top-left/unstyled rendering for Supervisor route-breakdown tickets.
- Updated `pages/dashboard/technical-officer/view-ticket/style.css` to neutralize inherited dashboard `.modal` overlay properties on detail-page modal cards and added explicit garage map sizing styles.
- Extended `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` with assertions for:
	- detail-page garage approval modal open path,
	- map marker visibility,
	- marker-click selection sync,
	- submit payload garage ID,
	- modal centering geometry.
- Executed `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line` with desktop + mobile pass (`2/2`).
