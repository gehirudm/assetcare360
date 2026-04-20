# TASK037 - Supervisor Script Monolith Final Decomposition

**Status:** In Progress  
**Added:** April 14, 2026  
**Updated:** April 20, 2026

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

**Overall Status:** In Progress - 90%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 37.1 | Supervisor ownership audit and move-map | Not Started | April 14, 2026 | Map section/modal logic still in parent script |
| 37.2 | Fault-ticket logic migration from parent | In Progress | April 20, 2026 | Replaced iframe-based shared ticket detail host with actor-specific ticket-detail components and direct view-ticket page navigation (Supervisor role override + return path), aligned breakdown actions to ticket-flow semantics, consolidated active list ownership under `fault-ticket-tracking` (removed parallel technician-assignment section), and added component-owned route-description normalization with stable sorting logic. A final UX correction removed list-level map actions and moved route map display into `pages/view-ticket` detail UI. Follow-up fix restored missing driver vehicle breakdown feed in active Supervisor fault-ticket-tracking by ingesting `/breakdown-reports` with normalized vehicle breakdown rendering. Latest update switched list ordering to newest-first (timestamp-first, severity/id tie-breakers) so newly created faults render at the top. Hotfix updates include shared detail runtime handler export correction (`addPartRow` -> `addPartField`), component template hydration correction for required shared modal nodes, April 20 shared `partsModal` markup repair so modal card content renders instead of backdrop-only display, Supervisor detail-style cleanup/fallback hardening, and a new embedded assignment bridge so detail-page `Assign Technician` reuses `supervisor-assign-ticket-modal` from the list flow. Latest parity hardening normalizes route issue-description and location sources in both `pages/view-ticket/script.js` and Supervisor dashboard payload mapping so detail-triggered `Approve Nearby Garage` matches list-flow behavior for route tickets. |
| 37.3 | Repair-management + details-modal decomposition | Not Started | April 14, 2026 | Remove sample/TODO parent handlers |
| 37.4 | Budget/asset/technician detail modal extraction | Not Started | April 14, 2026 | One-modal-per-component under page-modals |
| 37.5 | Validation and cleanup | In Progress | April 20, 2026 | Supervisor ticket-flow validation and regression reruns passed desktop/mobile after UX fixes. Revalidated after removing shared iframe host files and moving Supervisor to actor-specific ticket-detail component with direct view-ticket navigation. Updated modal-suite assertions for breakdown create-or-open behavior and revalidated desktop/mobile pass. Added dedicated `supervisor-fault-ticket-tracking` before/after desktop+mobile validation for section consolidation, dangerous badge visibility, source filtering, button-label/action regressions, ordering/status rendering, and final map placement behavior (no list map button, embedded detail-page route map). Added follow-up regression coverage for detail-page nearby-garage modal centering + map marker selection, with desktop/mobile pass. Added driver vehicle breakdown visibility regression coverage in the same suite (`/api/breakdown-reports` fixture path + list/source-count assertions), passing desktop/mobile `2/2`. Latest validation update now asserts newest-first ordering so newly created faults appear first regardless of severity. Hotfix verification reran `VAL_STAGE=after` supervisor fault-ticket-tracking suite after runtime handler map fix and passed (`2/2`). Current isolated rerun of the same suite fails before detail-open interactions because the spec expects `supervisor-fault-ticket-tracking` while the rendered page snapshot shows legacy Technician Assignment markup in this environment; follow-up validation alignment is still needed. April 20 shared-modal regression check passed focused TO shared-page modal suite (`to-request-spare-parts-modal`, `2/2`) after `partsModal` structure repair. Additional focused Supervisor mocked-browser validation confirms View Ticket opens detail, list button font/padding remain unchanged after return, fallback redirect works when the embedded detail host is unavailable, and embedded detail `Assign Technician` opens `supervisor-assign-ticket-modal` while shared `#assignModal` remains inactive. Latest parity update aligns Supervisor Breakdown Report Details modal structure to the machinery breakdown form format and reruns syntax + focused suite checks (suite still blocked by pre-existing missing host selector). Current route issue/location parity follow-up has diagnostics clean in touched files; targeted Playwright suites remain blocked by pre-existing stale selector expectations (`supervisor-fault-ticket-tracking`, `#ticketId`). |

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

### April 18, 2026 (Driver Breakdown Visibility Fix)
- Fixed missing driver-reported vehicle breakdown visibility in active Supervisor list by updating `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js` to fetch and normalize `GET /breakdown-reports` alongside existing machine and route feeds.
- Added `normalizeVehicleBreakdown(...)` mapping and included the normalized vehicle dataset in combined severity/date sort and source-filter rendering.
- Hardened unlinked breakdown fallback behavior by switching `openDetails(...)` to use per-item `reportType` instead of forcing all vehicle-source rows through `route_breakdown`.
- Updated and executed `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` with added `/api/breakdown-reports` fixture coverage and vehicle-row assertions; `VAL_STAGE=after` passed desktop + mobile (`2/2`).

### April 18, 2026 (Newest-First Fault Ordering Update)
- Updated active Supervisor list sort in `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js` to prioritize latest timestamps first so newly created faults appear at the top.
- Added robust timestamp selection (`date`, `created_at`, `breakdown_datetime`, `breakdown_date`, `updated_at`) with severity and ID tie-breakers for deterministic ordering.
- Updated `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` fixtures/assertions to verify newest-first behavior for both all-sources and vehicle-source filters.
- Executed `VAL_STAGE=after` run; desktop + mobile passed (`2/2`).

### April 19, 2026 (Shared Ticket Runtime Handler Hotfix)
- Fixed shared detail-page runtime bootstrap crash in `pages/view-ticket/script.js` where `exposeInlineTemplateHandlers()` referenced undefined `addPartRow`.
- Replaced stale export with `addPartField` and added missing exports for inline template handlers (`toggleSparePartsSection`, `submitInsuranceClaim`) used by `pages/view-ticket/index.html`.
- Verified syntax with `node --check pages/view-ticket/script.js`.
- Executed `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line`; desktop + mobile passed (`2/2`).

### April 19, 2026 (Shared Detail Modal Hydration Hotfix)
- Diagnosed `openBudgetModal` null-reference failures to template hydration mismatch: dashboard ticket-detail components mounted only `body > .container` from `pages/view-ticket/index.html` while shared modal nodes live outside that container.
- Updated `pages/dashboard/supervisor/components/ticket-details/script.js` (and matching TO/MO component counterparts) to append required shared modal nodes from the parsed template document:
	- `#budgetModal`, `#partsModal`, `#completeModal`, `#assignModal`, `#garageApprovalModal`.
- Hardened shared budget actions in `pages/view-ticket/script.js` by adding guarded modal element resolution (`getBudgetModalElements`, `ensureBudgetModalElements`) to prevent runtime crashes if template DOM is partially unavailable; updated `showToast(...)` fallback to support dashboards that expose `#toast` without `#toastMessage`.
- Validation evidence:
	- `node --check` passed for all touched scripts.
	- `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` passed (`2/2`).
	- Supervisor fault-ticket-tracking isolated rerun currently fails at initial component locator expectation mismatch (rendered legacy section in snapshot), not at budget modal action execution.

### April 20, 2026 (Shared Spare-Parts Modal Card Visibility Fix)
- Investigated user-reported view-ticket modal behavior where backdrop appeared but modal card was not visible.
- Root cause in shared template `pages/view-ticket/index.html` was malformed `#partsModal` structure:
	- missing inner `.modal` wrapper required by scoped modal CSS,
	- stray `overview-actions` div line in the modal block.
- Applied markup repair so modal card renders correctly in shared detail across role component-mode hosts.
- Validation evidence:
	- diagnostics clean for `pages/view-ticket/index.html`.
	- `VAL_STAGE=after npx playwright test to-request-spare-parts-modal/validate-to-request-spare-parts-modal.spec.js --reporter=line` passed (`2/2`).

### April 20, 2026 (Supervisor View Ticket Reliability + Button Style Regression Fix)
- Reproduced Supervisor post-detail style regression: fault-ticket list `VIEW TICKET` buttons were enlarged after returning from ticket-details due shared `pages/view-ticket/style.css` `.btn` rules staying mounted in the dashboard document.
- Updated `pages/dashboard/supervisor/components/ticket-details/script.js`:
	- switched to supervisor-scoped style marker IDs for shared detail styles/inline styles,
	- added `cleanupViewTicketAssets()` and invoked it in `closeView()` so shared detail styles are removed when returning to list sections,
	- changed `open(...)` to return explicit boolean success/failure.
- Updated `pages/dashboard/supervisor/script.js`:
	- hardened `viewTicketDetails(...)` with fallback redirection to `/view-ticket/index.html` (with `role_override=SUPERVISOR` and `return_to`) when embedded component is missing/fails.
- Validation evidence:
	- `node --check pages/dashboard/supervisor/script.js` passed.
	- `node --check pages/dashboard/supervisor/components/ticket-details/script.js` passed.
	- Focused Playwright mocked flow confirmed `ticket-details` opens and `VIEW TICKET` button font-size/padding remain unchanged after returning.
	- Fallback simulation (removing embedded detail host) confirmed redirect URL includes correct `id`, `role_override`, and `return_to` params.

### April 20, 2026 (Supervisor Embedded Assign Modal Bridge)
- Investigated report that `Assign Technician` did not open in Supervisor embedded ticket-details flow and requirement to reuse the same modal used in fault-ticket list actions.
- Updated `pages/view-ticket/script.js` so `openAssignModal()` delegates to dashboard context callback when running in dashboard component mode.
- Updated `pages/dashboard/supervisor/components/ticket-details/script.js` to expose `onRequestAssignment(...)` in runtime context and emit `supervisor-ticket-detail-view:request-assignment` with ticket id/edit-mode metadata.
- Updated `pages/dashboard/supervisor/script.js`:
	- added `supervisor-ticket-detail-view:request-assignment` bridge handler that opens existing `supervisor-assign-ticket-modal` via `assignTicket(...)` / `editTicketAssignment(...)`.
	- refreshed active detail component after `supervisor-assign-ticket-modal:assigned`.
- Validation evidence:
	- `node --check` passed for all touched scripts (`pages/view-ticket/script.js`, `pages/dashboard/supervisor/components/ticket-details/script.js`, `pages/dashboard/supervisor/script.js`).
	- Focused mocked Playwright check passed: clicking `#assignTicketBtn` inside embedded Supervisor detail opens `supervisor-assign-ticket-modal #assignTicketModal` and keeps shared `#assignModal` inactive.
	- Existing `supervisor-fault-ticket-tracking` suite currently fails early due stale locator expectation (`supervisor-fault-ticket-tracking`), not due the new assignment bridge.

### April 20, 2026 (Supervisor Assign Modal Layout Parity)
- Investigated follow-up issue: assign modal opened from embedded detail had narrower width/extra apparent outer spacing compared to list-triggered modal.
- Root cause confirmed via geometry capture: while detail assets were mounted, shared `pages/view-ticket/style.css` generic `.modal-content` (`max-width: 450px`, `padding: 30px`) overrode Supervisor modal card.
- Updated `pages/dashboard/supervisor/style.css` with high-specificity guard:
	- `#assignTicketModal .modal-content { max-width: min(700px, 95vw); padding: 0; }`
- Validation evidence:
	- before fix geometry:
		- from list: width `700`, padding `0px`
		- from detail: width `450`, padding `30px`
	- after fix geometry:
		- from list: width `700`, padding `0px`
		- from detail: width `700`, padding `0px`
	- diagnostics clean for `pages/dashboard/supervisor/style.css`.

### April 20, 2026 (Breakdown Report Form Parity With Machinery View)
- Updated `pages/dashboard/supervisor/components/page-modals/view-ticket-modal/script.js` `openBreakdownDetails(...)` so Breakdown Report Details now follows the same section structure as machinery breakdown view forms: Information, Description, and Source.
- Preserved route/vehicle-specific fields while matching machinery-form presentation and badge style patterns.
- Added defensive helpers for rendered values:
	- `escapeHtml(...)` for modal content safety.
	- `toStatusClass(...)` for stable status/severity class mapping.
- Validation evidence:
	- `node --check pages/dashboard/supervisor/components/page-modals/view-ticket-modal/script.js` passed.
	- `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line` still fails on pre-existing missing `supervisor-fault-ticket-tracking` host selector before modal interaction assertions.

### April 20, 2026 (Route Detail Issue/Location Parity Follow-up)
- Implemented route-breakdown detail parity fixes so Supervisor `View Ticket -> Approve Nearby Garage` uses the same normalized location/description behavior as the list-level flow.
- Updated `pages/view-ticket/script.js`:
	- added legacy route description parser + normalized issue resolver for route tickets.
	- hardened route context hydration from `ticketData.breakdown_context` and `route_breakdown_numeric_id` fallback paths even when `/route-breakdowns` list responses are empty.
	- updated route overview and garage payload mapping to prefer route-specific location/issue values over generic ticket fields.
- Updated `pages/dashboard/supervisor/script.js`:
	- added route description/location normalization helpers in `buildGarageApprovalBreakdownPayload(...)`.
	- expanded payload fallbacks for route numeric id/report code/reporter/vehicle to keep detail-triggered modal metadata aligned with list flow.
- Validation evidence:
	- diagnostics clean for touched files.
	- focused Playwright suites in this environment still fail on pre-existing stale host/selector expectations before route-detail assertions (`supervisor-fault-ticket-tracking` and legacy `#ticketId`).
