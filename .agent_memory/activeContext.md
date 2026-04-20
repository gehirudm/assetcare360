# Active Context

## Current Focus
Dashboard Web Components refactor execution for the active Supervisor residual slice remains complete (TASK034, TASK035, TASK036). TASK033 and TASK032 are also complete. Route-breakdown workflow correction (TASK039), GPS/map approval (TASK042), transportation cargo lifecycle + dangerous escalation (TASK043), TM cargo section split/navigation cleanup (TASK044), TM cargo catalogue/details UX refinement (TASK045), dangerous in-route priority lock + supervisor dangerous visibility hardening (TASK046), breakdown-view/ticket-flow unification with create-time linked fault-ticket creation (TASK047), Inventory insurance flow implementation (TASK048), Supervisor insurance-claim ticket flow implementation (TASK049), Driver/Machinery Operator fault-reporting 500 fix (TASK050), Machinery Operator duplicate ticket creation fix (TASK051), newest-first ticket rendering stabilization (TASK052), Inventory single-page analytics/reporting hub delivery (TASK060), optional insurance + removed last service date for machine/vehicle add flows (TASK063), SysAdmin user-accounts list/filter reliability fix (TASK064), Inventory Orders & Approvals approve/reject modal form rendering fix (TASK065), spare-part approval insufficient-stock blocking hardening (TASK066), inventory vehicle insurance real-data mapping fix (TASK067), inventory spare-part reject status + details-modal action fix (TASK068), maintenance-manager budget approval internal-error resilience fix (TASK069), spare-part-rejected workflow recovery after budget approval (TASK070), driver in-route breakdown transaction/toast reliability fix (TASK071), duplicate active route-breakdown ticket prevention per vehicle (TASK072), supervisor vehicle ticket-detail rendering fix (TASK073), supervisor nearby-garage modal bridge fix (TASK074), cross-dashboard ticket-detail return style-bleed cleanup (TASK075), route-breakdown garage continuity restoration across supervisor/driver/view-ticket flows (TASK076), and route-breakdown create 500 remediation for linked-ticket validation handling (TASK077) are now complete. Active remaining backlog is TASK003 migration verification plus pending monolith-final-decomposition cleanup tasks (TASK037, TASK038).

### Supervisor detail garage-approval resilience + modal cascade isolation completed (April 20, 2026)
- Followed up TASK037 after user-reported Supervisor detail errors: unresolved route-breakdown id during `Approve Nearby Garage`, oversized embedded toast rendering, and modal white-border/sizing regression.
- Updated `pages/dashboard/supervisor/components/ticket-details/script.js` to avoid hard fail on missing `routeBreakdownId` and delegate garage-approval handling to dashboard orchestration first.
- Updated `pages/view-ticket/script.js` to delegate embedded toasts to host context and add report-code-based route-breakdown id fallback for detail-triggered garage approval payloads.
- Updated `pages/dashboard/supervisor/script.js` host toast helper to target root dashboard toast (`body > #toast`) and support both legacy and current toast class/show patterns.
- Updated `pages/dashboard/supervisor/style.css` with high-specificity modal guards for Supervisor modal components so shared generic `.modal-content` rules from embedded detail assets no longer override Supervisor modal geometry.
- Validation snapshot:
	- diagnostics clean for touched Supervisor style/script files.
	- focused Playwright suite `transportation-manager-garages` passed (`2/2`).

### Supervisor detail approve-garage modal header rendering fix completed (April 20, 2026)
- Followed up TASK037 after user reported the `Approve Nearby Garage` modal header in Supervisor ticket-detail flow was not rendering properly.
- Root cause: shared ticket-detail stylesheet (`pages/dashboard/technical-officer/view-ticket/style.css`) applies id-scoped `#garageApprovalModal .modal-header` rules that overrode Supervisor header styling in detail context.
- Updated `pages/dashboard/supervisor/style.css` with host+id scoped overrides for:
	- `supervisor-garage-approval-modal #garageApprovalModal .modal-content`
	- `supervisor-garage-approval-modal #garageApprovalModal .modal-header`
	- `supervisor-garage-approval-modal #garageApprovalModal .modal-header h2`
	- `supervisor-garage-approval-modal #garageApprovalModal .modal-header .btn-close`
- Validation snapshot:
	- diagnostics clean for touched stylesheet.
	- focused Playwright suite `transportation-manager-garages` passed (`2/2`).
	- focused dashboard diagnostic with detail assets loaded confirms modal header gradient background and white title text.

### Supervisor route-detail issue/location parity follow-up completed (April 20, 2026)
- Followed up TASK037 for user-reported mismatch in Supervisor route breakdown detail flow (`View Ticket -> Approve Nearby Garage`) where issue description/location details diverged from list-level behavior.
- Updated `pages/view-ticket/script.js` to normalize route issue and location values from route-specific context (including legacy description parsing and `breakdown_context` fallback hydration), then reuse those values in overview rendering and garage-approval payloads.
- Updated `pages/dashboard/supervisor/script.js` to normalize detail-triggered garage-approval payloads with stronger route id/report-code/location/description fallback mapping so modal metadata is consistent with three-dots flow.
- Validation snapshot:
	- diagnostics clean for touched files.
	- focused existing Playwright suites still fail on pre-existing stale host/selector expectations (`supervisor-fault-ticket-tracking`, legacy `#ticketId`) before parity assertions.

### Supervisor breakdown report details form parity with machinery view completed (April 20, 2026)
- Followed up TASK037 for request to make `Breakdown Report Details` match machinery breakdown view form format.
- Updated `pages/dashboard/supervisor/components/page-modals/view-ticket-modal/script.js`:
	- `openBreakdownDetails(...)` now uses machinery-style section structure: Information, Description, Source.
	- retained route/vehicle report-specific fields (ID/status/severity/vehicle/driver/date/location where applicable).
	- added `escapeHtml(...)` and `toStatusClass(...)` helpers for safe and stable rendered output.
- Validation snapshot:
	- `node --check` passed for touched script.
	- Focused supervisor UI suite rerun still fails on known pre-existing missing `supervisor-fault-ticket-tracking` host selector before modal assertions.

### Driver popup workflow tracking clarity for VBD/RBD completed (April 20, 2026)
- Followed up TASK076 for user request to make ticket workflow details clearer in popup and allow explicit workflow tracking from View action.
- Updated `pages/dashboard/driver/components/page-modals/driver-breakdown-details-modal.js`:
	- added popup `Track Workflow` button.
	- workflow timeline now opens on demand from the button.
	- flow heading now clearly indicates ticket type (`RBD`/`VBD`) and current workflow stage.
	- route workflow path now maps clearly to supervisor-approved garage progression steps.
- Updated `testing/ui-validation/driver-dashboard/validate-driver-dashboard.spec.js` with assertions for:
	- Track Workflow button visibility and reveal behavior.
	- RBD workflow display with approved garage step details.
	- VBD workflow display according to vehicle ticket flow.
- Validation snapshot:
	- `node --check` passed for touched source and spec files.
	- `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`2/2`).

### Route breakdown report garage visibility follow-up completed (April 20, 2026)
- Followed up TASK076 for request: once garage approval is done, show approved garage under route breakdown reports.
- Updated route breakdown report-card renderers:
	- `pages/dashboard/driver/components/driver-breakdown.js`
	- `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js`
- Behavior update:
	- In-route breakdown cards now render `Nearby Garage: <garage name>` when approval metadata exists.
	- Supervisor route-breakdown cards render the same approved garage line under report details.
- Validation snapshot:
	- `node --check` passed for both touched files.
	- `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`2/2`).
	- Supervisor tracking suite remains blocked by known pre-existing host selector mismatch.

### Cross-actor ticket-detail return oversize follow-up completed (April 20, 2026)
- Followed up TASK075 after user-reported oversized fault-ticket list buttons when returning from View Ticket.
- Root cause: some section-switch/navigation paths left embedded ticket-detail hosts mounted without calling `closeView()`, so detail asset cleanup was skipped.
- Updated section-change orchestration guards to force detail cleanup whenever active section is not detail:
	- `pages/dashboard/technical-officer/script.js`
	- `pages/dashboard/driver/script.js`
	- `pages/dashboard/machinery-operator/script.js`
	- `pages/dashboard/supervisor/script.js` (also closes `ac-breakdown-detail-view` outside `breakdown-details`).
- Validation snapshot:
	- `node --check` passed for all touched scripts.
	- `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`4/4`).
	- `machinery-operator-dashboard` and `supervisor-fault-ticket-tracking` suites remain blocked by known pre-existing fixture/host issues.

### Supervisor View Ticket nearby-garage popup clarity fix completed (April 20, 2026)
- Followed up TASK080 after user reported the Supervisor popup form in standalone View Ticket looked unclear.
- Restored previous standalone View Ticket modal path:
	- removed standalone mount/load of `supervisor-garage-approval-modal` in `pages/view-ticket/index.html`.
	- removed standalone component-modal preference/event binding in `pages/view-ticket/script.js`.
	- kept dashboard-context delegation (`onRequestGarageApproval`) for embedded Supervisor dashboard flow.
- Updated focused validation spec back to local View Ticket modal selectors:
	- `testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js`.
- Validation snapshot:
	- `node --check pages/view-ticket/script.js` passed.
	- `node --check testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` passed.
	- `VAL_STAGE=after npx playwright test transportation-manager-garages/validate-transportation-manager-garages.spec.js --reporter=line` passed (`2/2`).

### Supervisor View Ticket garage modal parity hardening completed (April 20, 2026)
- Followed up TASK080 after user reported Supervisor `View Ticket -> Approve Nearby Garage` did not open the same form used by the three-dots action.
- Updated `pages/view-ticket/script.js` so View Ticket now prefers opening `supervisor-garage-approval-modal` component first; dashboard callback delegation remains primary, and local inline modal remains backup-only.
- Updated `pages/view-ticket/index.html` to mount/load `supervisor-garage-approval-modal` for standalone view-ticket supervisor flows.
- Updated `testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` supervisor assertions to target the component modal path.
- Validation snapshot:
	- `node --check pages/view-ticket/script.js` passed.
	- `node --check testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` passed.
	- `VAL_STAGE=after npx playwright test transportation-manager-garages/validate-transportation-manager-garages.spec.js --reporter=line` passed (`2/2`).

### Route-breakdown data full purge rerun completed (April 20, 2026)
- On a new user request, re-executed full in-route breakdown (RBD) purge across system tables.
- Transactional cleanup removed RBD records from core and dependent tables:
	- `vehicle_breakdown_inroute`, `route_breakdown_garage_workflow`, `route_breakdown_garage_updates`
	- RBD-linked `fault_tickets`
	- linked dependencies by fault ticket id: `fault_ticket_assignments`, `fault_ticket_images`, `ticket_work_updates`, `budget_reports`, `spare_part_requests`, `spare_part_request_items`
- Verification snapshot from rerun:
	- before: `inroute=2`, `garage_workflow=1`, `garage_updates=4`, `rbd_fault_tickets=2`
	- after: all above counts are `0`
	- orphan checks for assignments/images/work-updates linked to RBD tickets: `0`
- Cross-system scan for string residue:
	- scanned all DB text columns for `RBD-`; result `[]` (no remaining RBD text matches).

### Route-breakdown full-system purge rerun with residual cleanup completed (April 20, 2026)
- On user request, re-ran full route-breakdown cleanup across the system and verified route-related table counts.
- Core/dependent route-breakdown tables were already at zero, but full text-column scan found residual `RBD-` values in:
	- `notifications.message=27`
	- `spare_part_requests.ticket_id_formatted=6`
- Executed transactional residue cleanup:
	- deleted `spare_part_request_items` rows linked to `spare_part_requests.ticket_id_formatted LIKE 'RBD-%'`.
	- deleted `spare_part_requests` rows with `ticket_id_formatted LIKE 'RBD-%'`.
	- deleted `notifications` rows with `message LIKE '%RBD-%'`.
- Final verification snapshot:
	- all route-breakdown core/dependent counts remain `0`.
	- `notifications_rbd=0`, `spare_part_requests_ticket_id_formatted_rbd=0`.
	- full DB text-column scan now returns `RBD_TEXT_RESIDUE=NONE`.

### Route-breakdown sequence reset + Supervisor View Ticket garage-approval form parity completed (April 20, 2026)
- Completed TASK080 for two user requests:
	- new route-breakdown IDs should restart at `RBD-001` when prior RBD records are cleared.
	- Supervisor View Ticket `Approve Nearby Garage` should use the same form behavior as list-level approve action.
- Updated `app/controllers/RouteBreakdownController.php`:
	- create flow now uses a dedicated sequence lock (`GET_LOCK`) and `generateNextRouteBreakdownCode()` based on max existing `RBD-###` code.
	- sequence no longer depends on auto-increment row id, so empty RBD dataset restarts at `RBD-001`.
- Updated View Ticket garage approval fallback UI:
	- `pages/view-ticket/index.html` now uses breakdown meta card + garage dropdown (`#garageApprovalSelect`) + hidden breakdown id.
	- `pages/view-ticket/script.js` now normalizes approval payload, syncs map selection with dropdown, and submits selected garage via dropdown flow.
- Updated targeted Playwright validation suite `testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` for dropdown-based selection and `/api/garages` mock parity.
- Validation snapshot:
	- `php -l app/controllers/RouteBreakdownController.php` passed.
	- `node --check pages/view-ticket/script.js` passed.
	- `VAL_STAGE=after npx playwright test transportation-manager-garages/validate-transportation-manager-garages.spec.js` passed (`2/2`).

### Route-breakdown duplicate-link fix + full RBD purge completed (April 20, 2026)
- Completed TASK079 for duplicate route-breakdown ticket symptom in Driver flow and requested data cleanup.
- Root cause verified: `route_breakdown_id` reuse from count-based generation caused historical and new RBD tickets to share the same `breakdown_report_id` (`RBD-002`), creating duplicate-linked ticket results.
- Updated `RouteBreakdownController::create()` to:
	- lock the selected vehicle row (`FOR UPDATE`) before active-ticket checks, and
	- generate final `route_breakdown_id` from inserted row id (non-reused sequence) instead of table count.
- Updated Driver route-breakdown modal submit flow with in-flight guard + disabled submit button during API call.
- Executed requested full data purge in a transaction:
	- cleared `vehicle_breakdown_inroute`.
	- removed all RBD fault tickets (`breakdown_type='route_breakdown'` or `ticket_id LIKE 'RBD-%'`) and related non-cascading rows in `fault_ticket_assignments`/`fault_ticket_images`.
- Verification snapshot:
	- `vehicle_breakdown_inroute=0`
	- `fault_tickets_route_breakdown=0`
	- `route_breakdown_garage_workflow=0`
	- `route_breakdown_garage_updates=0`

### In-route breakdown data prune completed (April 20, 2026)
- Completed TASK078 for request to remove in-route vehicle breakdown report data while keeping only one resolved record.
- DB cleanup executed in a transaction:
	- kept latest resolved `vehicle_breakdown_inroute` row (`id=6`, `route_breakdown_id=RBD-006`).
	- removed all other in-route breakdown rows.
	- removed related records from `route_breakdown_garage_updates` and `route_breakdown_garage_workflow` for deleted route breakdown ids.
- Verification:
	- before: `total=15`, `resolved=2`.
	- after: `total=1`, `resolved=1`.

### Route-breakdown create persistent 500 follow-up hardening completed (April 20, 2026)
- Followed up TASK077 after user reported `POST /api/route-breakdowns` still returning 500.
- Root cause isolated to pre-transaction schema-dependent paths in `RouteBreakdownController::create()`:
	- duplicate active-ticket lookup referenced `fault_tickets.vehicle_id` directly in mixed schemas where the column may not exist.
	- dangerous-cargo context lookup could throw before route create transaction handling.
- Updated `app/controllers/RouteBreakdownController.php`:
	- `findActiveRouteBreakdownTicketForVehicle(...)` now supports both with/without `fault_tickets.vehicle_id` and safely falls back on query failure.
	- added `hasFaultTicketVehicleIdColumn()` schema cache helper.
	- added `getDangerousCargoContextSafely(...)` and replaced direct TripService dangerous-context calls in `create()` and `shouldForceCriticalSeverity(...)`.
- Validation evidence:
	- `php -l app/controllers/RouteBreakdownController.php` passed.

### Route-breakdown create 500 on linked ticket validation fixed (April 20, 2026)
- Completed TASK077 for user-reported `POST /api/route-breakdowns 500` failure during in-route breakdown submit.
- Updated `app/controllers/RouteBreakdownController.php`:
	- route create now returns 422 for linked fault-ticket validation errors and 400/404 for known client-side failure causes instead of surfacing a generic 500.
	- short route descriptions are auto-expanded in `buildAutoTicketDescription(...)` so linked ticket minimum-length validation no longer blocks valid route submissions.
- Validation evidence:
	- `php -l app/controllers/RouteBreakdownController.php` passed.

### Route-breakdown garage workflow continuity restoration completed (April 20, 2026)
- Completed TASK076 to restore end-to-end supervisor/driver route-breakdown garage workflow behavior.
- Supervisor dashboard updates:
	- `pages/dashboard/supervisor/components/fault-tickets/script.js` now exposes route-level `approve-garage` action in list cards when eligible.
	- `pages/dashboard/supervisor/script.js` now handles `approve-garage` action and forwards richer route metadata (location, coordinates, approved garage fallback id) into modal payloads.
	- `pages/dashboard/supervisor/components/page-modals/garage-approval-modal/script.js` now ranks garages by nearest distance to reported breakdown location and displays distance context in dropdown/map.
- Driver + shared detail alignment:
	- `pages/dashboard/driver/components/page-modals/driver-nearby-garages-modal.js` now ranks garages by reported location and opens Google Maps directions using coordinate-based destination (with fallback search URL).
	- `pages/view-ticket/script.js` route garage approval list/map now uses the same proximity ranking and distance labels.
- Validation evidence:
	- `node --check` passed for all touched scripts.
	- `driver-dashboard` Playwright suite passed (`2/2`).
	- `route-breakdown-garage-workflow` suite still fails in this environment on pre-existing fixture assertion (`RBD-701` card missing before modal action).
	- `supervisor-fault-ticket-tracking` suite still fails in this environment on pre-existing host-selector mismatch (`supervisor-fault-ticket-tracking` not rendered).

### Cross-dashboard ticket-detail return style-bleed cleanup completed (April 20, 2026)
- Completed TASK075 for the reported regression: fault-ticket list buttons enlarged after entering and returning from embedded ticket detail.
- Applied the style lifecycle cleanup pattern to all relevant dashboard hosts using shared `view-ticket` runtime:
	- `pages/dashboard/technical-officer/components/ticket-details/script.js`
	- `pages/dashboard/driver/components/ticket-details/script.js`
	- `pages/dashboard/machinery-operator/components/ticket-details/script.js`
- Each host now:
	- uses host-scoped style marker IDs (`detailStyleLinkId`, `detailOverridesStyleLinkId`, `detailInlineStyleId`),
	- removes injected shared styles on `closeView()` via `cleanupViewTicketAssets()`.
- Validation evidence:
	- `node --check` passed for all three touched scripts.
	- `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`4/4`).
	- MO suite remains blocked by pre-existing auth/fixture redirect to `/auth/login.html` before list assertions, unrelated to style cleanup.

### Supervisor embedded ticket-detail nearby-garage modal bridge fix completed (April 20, 2026)
- Completed TASK074 for Supervisor route-breakdown ticket detail flow where `Approve Nearby Garage` did not open the proper modal.
- Updated shared detail runtime `pages/view-ticket/script.js` so `openGarageApprovalModal()` delegates to dashboard context callback in component mode.
- Updated Supervisor detail host `pages/dashboard/supervisor/components/ticket-details/script.js` to expose `onRequestGarageApproval(...)` and emit `supervisor-ticket-detail-view:request-garage-approval`.
- Updated Supervisor orchestrator `pages/dashboard/supervisor/script.js` to:
	- open existing `supervisor-garage-approval-modal` from the new ticket-detail event,
	- normalize breakdown payload for modal consumption,
	- refresh fault-ticket data + detail view after `supervisor-garage-approval-modal:approved`.
- Validation evidence:
	- `node --check` passed for all touched scripts.
	- focused route-breakdown garage Playwright suite remains blocked by pre-existing fixture mismatch (`RBD-701` card not found) before modal assertions.

### Supervisor ticket-detail vehicle rendering fix completed (April 20, 2026)
- Completed TASK073 for Supervisor report that vehicle details were rendered incorrectly in View Fault Ticket flow.
- Updated `pages/js/fault-ticket-detail-template.js`:
	- added `isVehicleTicket(...)` helper.
	- updated `formatEquipmentLabel(...)` to render vehicle-aware labels using number plate with vehicle name/model fallbacks.
- Updated `pages/view-ticket/script.js`:
	- added `getFallbackEquipmentLabel(...)` and reused it in overview equipment field and spare-parts modal equipment prefill.
- Validation evidence:
	- `node --check pages/js/fault-ticket-detail-template.js` passed.
	- `node --check pages/view-ticket/script.js` passed.
	- `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` passed (`2/2`).
	- `supervisor-fault-ticket-tracking` suite remains blocked by pre-existing stale selector (`supervisor-fault-ticket-tracking` host visibility), unrelated to this formatter patch.

### Duplicate active route-breakdown ticket prevention completed (April 20, 2026)
- Completed TASK072 for the requested rule: a driver cannot create another in-route breakdown report when the selected vehicle already has an active route-breakdown ticket.
- Updated `app/controllers/RouteBreakdownController.php`:
	- `create()` now checks for an existing active `route_breakdown` ticket for the same vehicle before insert.
	- added `findActiveRouteBreakdownTicketForVehicle(int $vehicleId)` helper that treats `Resolved` and `Closed` as terminal; any other ticket status blocks new creation.
	- duplicate attempt now returns `400` with a clear message referencing the active ticket.
- Validation evidence:
	- `php -l app/controllers/RouteBreakdownController.php` passed.
	- `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`2/2`).

### Driver in-route breakdown transaction + toast mismatch fix completed (April 20, 2026)
- Completed TASK071 for the reported driver issue where failed route-breakdown creation appeared as a success-looking toast and returned `There is no active transaction`.
- Updated `app/controllers/RouteBreakdownController.php` create flow to guard `commit()` with `inTransaction()`.
- Updated `pages/dashboard/driver/style.css` to add toast variant styles (`.toast.error`, `.toast.warning`, `.toast.info`, `.toast.success`) so failure messages are visually classified correctly.
- Validation evidence:
	- `php -l app/controllers/RouteBreakdownController.php` passed.
	- `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (`2/2`).
	- `route-breakdown-garage-workflow` suite currently fails on existing supervisor fixture selector for `RBD-701` visibility (outside touched files).

### Inventory spare-part reject status fix + details modal action removal completed (April 20, 2026)
- Completed TASK068 for Inventory Manager reject-flow failure and details-modal action cleanup.
- Root cause: reject flow failed while syncing fault ticket status because `fault_tickets.status` enum did not include `Parts Rejected`.
- Added and executed migration `migrations/061_add_parts_rejected_status_to_fault_tickets.php` to align schema with workflow states.
- Updated `pages/dashboard/inventory-manager/components/orders-approvals/script.js` to remove approve/reject controls from request details modal (view modal now read-only).
- Updated `testing/openapi.yaml` fault-ticket status enums to include `Parts Rejected`.
- Validation evidence:
	- `php -l migrations/061_add_parts_rejected_status_to_fault_tickets.php` passed.
	- `node --check pages/dashboard/inventory-manager/components/orders-approvals/script.js` passed.
	- migration script executed successfully; enum verification confirms `Parts Rejected` is now supported.
	- transactional update test of `fault_tickets.status = 'Parts Rejected'` succeeded with rollback.
	- `VAL_STAGE=after npx playwright test inventory-orders-approvals/validate-inventory-orders-approvals.spec.js --reporter=line` passed (`2/2`).

### Maintenance manager budget approval internal-error fix completed (April 20, 2026)
- Completed TASK069 to prevent budget review API failures when workflow status sync encounters persistence issues.
- Updated `app/services/FaultTicketWorkflowService.php`:
	- wrapped `syncTicketStatus(...)` in defensive error handling so sync exceptions do not bubble as endpoint 500s.
	- added `attemptStatusUpdate(...)` helper to safely catch/log status update failures.
	- added fallback from `Parts Rejected` to `Waiting for Spare Parts` when legacy schemas cannot persist `Parts Rejected`.
- Updated `app/controllers/BudgetReportController.php` review path to log workflow sync warnings without failing successful budget-review updates.
- Validation evidence:
	- `php -l app/services/FaultTicketWorkflowService.php` passed.
	- `php -l app/controllers/BudgetReportController.php` passed.

### Spare-part rejected workflow recovery via budget approval completed (April 20, 2026)
- Completed TASK070 for the requested path: spare-part request rejected -> submit budget report -> maintenance approval -> workflow can proceed.
- Updated `app/controllers/BudgetReportController.php`:
	- Added `Parts Rejected` to allowed ticket statuses for budget report create/update/delete operations.
- Updated `app/services/FaultTicketWorkflowService.php`:
	- In `deriveTargetStatus(...)`, `partsStatus=rejected` now returns base status (`Assigned`/`Open`) when `budgetStatus=approved`.
	- This allows tickets to leave `Parts Rejected` after approved budget and continue toward work start.
- Validation evidence:
	- `php -l app/controllers/BudgetReportController.php` passed.
	- `php -l app/services/FaultTicketWorkflowService.php` passed.

### Shared ticket-detail modal hydration + budget null-guard hotfix in progress (April 19, 2026)
- Root cause confirmed for TO/Supervisor/MO budget modal crash path: component mode mounted only `body > .container` from shared view-ticket template while required modal nodes live outside that container.
- Updated ticket-detail component template mounting to append shared modal overlays in all actor-specific components:
	- `pages/dashboard/technical-officer/components/ticket-details/script.js`
	- `pages/dashboard/supervisor/components/ticket-details/script.js`
	- `pages/dashboard/machinery-operator/components/ticket-details/script.js`
- Hardened shared budget runtime in `pages/view-ticket/script.js` with guarded element resolution (`getBudgetModalElements`, `ensureBudgetModalElements`) and null-safe open/close/hint/submit handling; shared `showToast(...)` now also works when dashboards provide `#toast` without a nested `#toastMessage`.
- Validation evidence snapshot:
	- `node --check` passed for all touched scripts.
	- `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` passed (`2/2`).
	- Supervisor and MO reruns currently fail for environment/spec alignment reasons (legacy section locator mismatch and auth redirect), not due to the previous `openBudgetModal` null-reference line.

### Shared view-ticket modal card visibility follow-up (April 20, 2026)
- Investigated user-reported backdrop-only modal behavior in shared view-ticket flow.
- Root cause confirmed in `pages/view-ticket/index.html`: malformed `#partsModal` markup (missing inner `.modal` wrapper and stray `overview-actions` line).
- Fixed modal structure so card content renders correctly when `#partsModal` is activated.
- Validation evidence:
	- diagnostics clean for `pages/view-ticket/index.html`.
	- `VAL_STAGE=after npx playwright test to-request-spare-parts-modal/validate-to-request-spare-parts-modal.spec.js --reporter=line` passed (`2/2`).

### Supervisor ticket-detail reliability + list button style bleed fix (April 20, 2026)
- Investigated Supervisor report that View fault-ticket flow still failed intermittently and list buttons became enlarged after returning from detail view.
- Updated `pages/dashboard/supervisor/components/ticket-details/script.js`:
	- supervisor detail component now uses supervisor-scoped style marker IDs for shared view-ticket CSS/inline styles.
	- `closeView()` now removes injected detail-page styles (`view-ticket` base + overrides + inline style) to prevent style bleed into fault-ticket list buttons.
	- `open(...)` now returns explicit boolean success/failure for caller-side fallback handling.
- Updated `pages/dashboard/supervisor/script.js`:
	- `viewTicketDetails(...)` now has resilient fallback redirection to `/view-ticket/index.html` with `role_override=SUPERVISOR` and a return path when embedded detail host is unavailable/fails.
- Validation evidence:
	- `node --check pages/dashboard/supervisor/script.js` passed.
	- `node --check pages/dashboard/supervisor/components/ticket-details/script.js` passed.
	- Focused Playwright mocked flow confirmed detail section opens and button styling remains unchanged after back navigation (font-size/padding preserved).
	- Fallback simulation (removing `#ticket-details supervisor-ticket-detail-view`) confirmed redirect to shared view-ticket URL with correct `id`, `role_override`, and `return_to` params.

### Supervisor embedded ticket-detail assignment modal parity fix (April 20, 2026)
- Investigated Supervisor report that `Assign Technician` from embedded ticket detail did not open the assignment modal used in Supervisor fault-ticket list flow.
- Updated `pages/view-ticket/script.js`:
	- `openAssignModal()` now delegates assignment requests to dashboard context callback when running in dashboard component mode.
- Updated `pages/dashboard/supervisor/components/ticket-details/script.js`:
	- runtime context now exposes `onRequestAssignment(...)` and emits `supervisor-ticket-detail-view:request-assignment` with ticket id + edit mode.
- Updated `pages/dashboard/supervisor/script.js`:
	- supervisor detail binding now handles `supervisor-ticket-detail-view:request-assignment` and opens the existing `supervisor-assign-ticket-modal` via `assignTicket(...)` / `editTicketAssignment(...)`.
	- assign success bridge now refreshes the active detail component after `supervisor-assign-ticket-modal:assigned`.
- Validation evidence:
	- `node --check` passed for:
		- `pages/dashboard/supervisor/components/ticket-details/script.js`
		- `pages/dashboard/supervisor/script.js`
		- `pages/view-ticket/script.js`
	- Focused Playwright mocked check (April 20) passed: clicking `#assignTicketBtn` in Supervisor embedded detail opens `supervisor-assign-ticket-modal #assignTicketModal` and does not activate shared `#assignModal`.
	- Current `supervisor-fault-ticket-tracking` suite still fails early in this environment due stale locator (`supervisor-fault-ticket-tracking` component not present), unrelated to the new assignment-modal bridge path.

### Supervisor assign-ticket modal geometry parity fix (April 20, 2026)
- Investigated follow-up report that assign-ticket modal opened from embedded ticket detail had larger outer spacing and a narrower card compared to opening from fault-ticket list.
- Root cause confirmed: shared `pages/view-ticket/style.css` generic `.modal-content` rule (`max-width: 450px`, `padding: 30px`) overrode Supervisor modal card styles while detail-view assets were mounted.
- Updated `pages/dashboard/supervisor/style.css` with a high-specificity override:
	- `#assignTicketModal .modal-content { max-width: min(700px, 95vw); padding: 0; }`
- Validation evidence:
	- focused geometry check before/after shows parity restored:
		- list trigger: `cardWidth=700`, `cardPadding=0`
		- detail trigger: `cardWidth=700`, `cardPadding=0`
	- diagnostics clean for touched file `pages/dashboard/supervisor/style.css`.

### Inventory vehicle insurance real-data mapping fix completed (April 19, 2026)
- Completed TASK067 so Inventory vehicle-management and insurance-management surfaces use real backend vehicle data fields.
- Updated `pages/dashboard/inventory-manager/components/vehicles/script.js` to use backend-first mapping (`number_plate`, `current_mileage`) with legacy fallbacks and render insurance type/provider from API data.
- Updated shared vehicle fetch path in `pages/dashboard/inventory-manager/components/page-modals/script.js` by adding `normalizeVehicleRecord(...)` for local cache and API responses.
- Updated `pages/dashboard/inventory-manager/components/insurance-management/script.js` to fall back to `registration_number` when `number_plate` is unavailable.
- Validation evidence:
	- `node --check` passed for all touched inventory scripts.
	- diagnostics reported no errors for touched files.
	- `VAL_STAGE=after npx playwright test inventory-insurance-management/validate-inventory-insurance-management.spec.js --reporter=line` passed (`2/2`).

### Spare-part approval insufficient-stock blocking completed (April 19, 2026)
- Completed TASK066 so Inventory Manager cannot approve spare-part requests when stock is insufficient.
- Updated `pages/dashboard/inventory-manager/components/orders-approvals/script.js`:
	- approval form now blocks submit for statuses `not_found`, `out_of_stock`, `insufficient`, `invalid`, and `unknown`.
	- warning section now lists unavailable parts and reasons.
	- approve action now refreshes availability form when backend returns stock-blocking response.
- Updated `app/services/SparePartRequestService.php`:
	- added backend pre-approval stock validation with `FOR UPDATE` row locking and aggregated requested quantity per part code.
	- approval now returns error with `unavailable_items` and does not update status/deduct stock when availability fails.
- Updated `app/controllers/SparePartRequestController.php`:
	- `/spare-part-requests/check-availability` now evaluates total requested quantity per part code for accurate insufficient-stock detection.
- Updated UI validation in `testing/ui-validation/inventory-orders-approvals/validate-inventory-orders-approvals.spec.js`:
	- verifies stock-blocked approve warning visibility, disabled approval path, and no approve API call while blocked.
- Validation evidence:
	- `php -l app/services/SparePartRequestService.php` -> pass.
	- `php -l app/controllers/SparePartRequestController.php` -> pass.
	- `node --check` passed for touched frontend/spec files.
	- `VAL_STAGE=after npx playwright test inventory-orders-approvals/validate-inventory-orders-approvals.spec.js --reporter=line` -> pass (`2/2`).

### Inventory Orders & Approvals approve/reject form rendering fix completed (April 19, 2026)
- Completed TASK065 to resolve Inventory Manager approve/reject form presentation issues in Orders & Approvals.
- Updated `pages/dashboard/inventory-manager/components/orders-approvals/script.js`:
	- action modal now uses dashboard-compatible `modal-content` structure (instead of unstyled `modal-container` flow).
	- details modal now also uses `modal-content` structure with consistent close behavior.
	- close handlers now support backdrop click via modal root target check.
	- added resilient request extraction helper for mixed response wrappers (`data`, `data.requests`, `requests`).
- Updated `pages/dashboard/inventory-manager/components/orders-approvals/style.css`:
	- added scoped modal content sizing and body scroll/padding rules to ensure forms render cleanly on desktop and mobile.
- Added focused UI validation suite:
	- `testing/ui-validation/inventory-orders-approvals/validate-inventory-orders-approvals.spec.js`
	- validates approve and reject form visibility plus modal presentation metrics across desktop/mobile.
- Validation evidence:
	- `node --check` passed for touched source/spec files.
	- diagnostics clean for touched files.
	- `VAL_STAGE=after npx playwright test inventory-orders-approvals/validate-inventory-orders-approvals.spec.js --reporter=line` -> pass (`2/2`).

### Inventory Orders & Approvals view-form alignment + neutral background follow-up (April 20, 2026)
- Investigated Inventory Manager report that the request details "View Form" was visually misaligned and retained an unwanted light-blue form background.
- Updated `pages/dashboard/inventory-manager/components/orders-approvals/script.js`:
	- refactored details modal content from inline `p`-based grid blocks to class-based aligned fields (`order-details-grid`, `order-detail-field`, `order-detail-block`, `order-detail-text`).
	- removed inline blue-tinted linked-ticket summary container styles.
- Updated `pages/dashboard/inventory-manager/components/orders-approvals/style.css`:
	- changed `.form-section` background from light blue to neutral card white.
	- added scoped details modal field-grid styles for consistent alignment on desktop/mobile.
- Validation evidence:
	- `node --check ../../pages/dashboard/inventory-manager/components/orders-approvals/script.js` passed (from `testing/ui-validation` cwd).
	- `VAL_STAGE=after npx playwright test inventory-orders-approvals/validate-inventory-orders-approvals.spec.js --reporter=line` passed (`2/2`).
	- diagnostics clean for touched script/style files.

### Inventory Orders & Approvals spare-parts request form parity follow-up (April 20, 2026)
- Addressed request that Spare Parts Request view form should match the Approve Spare Parts Request form structure.
- Updated `pages/dashboard/inventory-manager/components/orders-approvals/script.js`:
	- converted details modal (`viewOrderDetails`) to use the same readonly `form-section` + `form-row` + `form-group` pattern used by approve flow.
	- replaced table-based `Spare Parts Requested` block with approve-style per-part readonly form fields.
	- aligned linked ticket, notes, and review details presentation to the same form control pattern.
- Validation evidence:
	- `node --check ../../pages/dashboard/inventory-manager/components/orders-approvals/script.js` passed.
	- `VAL_STAGE=after npx playwright test inventory-orders-approvals/validate-inventory-orders-approvals.spec.js --reporter=line` passed (`2/2`).
	- diagnostics clean for touched files.

### SysAdmin user accounts list + filtering fix completed (April 19, 2026)
- Completed TASK064 to ensure users render reliably in System Administration `user-accounts` and filters work against real backend value shapes.
- Updated `pages/dashboard/sysadministration/components/sa-user-accounts.js`:
	- `loadUsers()` now aggregates paginated user pages (`limit=100`) and deduplicates records before rendering.
	- Added response-shape extraction fallback (`response.data.users`, `response.data`, `response.users`).
	- Added role normalization for filter matching (`machinary`/`machinery` tolerant comparison).
	- Added resilient active/inactive parsing for `is_active` values represented as booleans, numbers, or strings.
	- Updated role filtering to use normalized matching and avoid persistent hidden-list state.
- Updated UI validation coverage in `testing/ui-validation/sysadmin-transportation-manager-role/validate-sysadmin-transportation-manager-role.spec.js`:
	- added inactive transportation-manager fixture and assertion for `statusFilter=inactive` visibility.
- Validation evidence:
	- `node --check` passed for touched source/spec files.
	- `VAL_STAGE=after npx playwright test sysadmin-transportation-manager-role/validate-sysadmin-transportation-manager-role.spec.js --reporter=line` -> pass (`2/2`).

### Machine/vehicle add flow optional insurance + removed last service date completed (April 19, 2026)
- Completed TASK063 to make insurance/warranty optional in machine and vehicle add flows and remove last service date from input capture.
- Backend create-flow updates:
	- `app/services/MachineService.php` now treats insurance fields as optional unless any insurance value is provided, in which case full insurance validation applies.
	- `app/services/VehicleService.php` now removes insurance from base required create fields and applies the same conditional strict-validation rule when insurance input is present.
- Inventory modal updates:
	- `pages/dashboard/inventory-manager/components/page-modals/machine-form-modal/script.js` removed last service date field and no longer sends `last_service_date`; insurance form controls are no longer required.
	- `pages/dashboard/inventory-manager/components/page-modals/vehicle-form-modal/script.js` removed last service date field and no longer sends `last_service_date`; insurance form controls are no longer required.
- API contract updates:
	- `testing/openapi.yaml` `MachineInput` and `VehicleInput` no longer require insurance fields and no longer include `last_service_date` in create input properties.
- Validation evidence:
	- `php -l` passed for `MachineService.php` and `VehicleService.php`.
	- `node --check` passed for both touched modal scripts.
	- `VAL_STAGE=after npx playwright test inventory-insurance-management/validate-inventory-insurance-management.spec.js --reporter=line` passed (`2/2`).

### Driver insurance-claimed status + supervisor eligible-claim assignment option completed (April 19, 2026)
- Completed TASK062 to align warranty/insurance-claim behavior across Supervisor and Driver flows.
- Updated driver ticket-tracking status helpers and filter mapping so `Insurance Claimed` is rendered/filtered as active workflow state.
- Updated driver route workflow label resolution to surface `Insurance Claimed` when linked fault-ticket status is claimed.
- Updated shared supervisor detail-page assignment action rendering so claim-eligible tickets show both actions:
	- `Assign Technician`
	- `Claim Insurance`
- Validation evidence:
	- `node --check` passed for touched source/spec files.
	- `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line` -> pass (`4/4`).

### Shared ticket-detail runtime handler crash fix completed (April 19, 2026)
- Fixed `pages/view-ticket/script.js` runtime crash caused by stale handler export `addPartRow` referenced inside `exposeInlineTemplateHandlers()`.
- Updated inline handler exposure map to export the actual implemented handlers used by `pages/view-ticket/index.html`:
	- `addPartField` (replacing stale `addPartRow`)
	- `toggleSparePartsSection`
	- `submitInsuranceClaim`
- Validation evidence:
	- `node --check pages/view-ticket/script.js` -> `syntax-ok`
	- `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line` -> pass (2/2)

### Machinery Operator single-page analytics hub charts completed (April 19, 2026)
- Completed TASK061 by adding a dedicated Machinery Operator `analytics` section with TM-style top tab options in one page.
- Added new `mo-analytics-hub` component with five chart sections:
	- Fault Analytics
	- Weekly Check Analytics
	- Machine Health Analytics
	- Workflow Analytics
	- Notification Analytics
- Implemented report toolbar support in the analytics hub:
	- From Date / To Date filters
	- Report scope selector
	- Apply time filter, generate report, and download CSV actions
- Wired section routing/refresh lifecycle in `pages/dashboard/machinery-operator/script.js` and shell updates in `pages/dashboard/machinery-operator/index.html`.
- Added and validated dedicated UI suite:
	- `testing/ui-validation/machinery-operator-analytics-hub/validate-machinery-operator-analytics-hub.spec.js`
- Validation evidence:
	- Passed: `VAL_STAGE=before npx playwright test machinery-operator-analytics-hub/validate-machinery-operator-analytics-hub.spec.js --reporter=line` (2/2)
	- Passed: `VAL_STAGE=after npx playwright test machinery-operator-dashboard/validate-machinery-operator-dashboard.spec.js machinery-operator-analytics-hub/validate-machinery-operator-analytics-hub.spec.js --reporter=line` (4/4)

### Inventory Manager single-page analytics hub charts completed (April 19, 2026)
- Completed TASK060 by adding a dedicated Inventory Manager `analytics` section with TM-style tabbed chart views in one page.
- Added new `inventory-analytics-hub` component with five chart sections:
	- Stock Analytics
	- Stock Additions
	- Usage Analytics
	- Request Analytics
	- Asset Coverage
- Implemented report toolbar support in the analytics hub:
	- From Date / To Date filters
	- Report scope selector
	- Generate report and Download CSV actions
- Wired section routing/refresh lifecycle in `pages/dashboard/inventory-manager/script.js` and shell updates in `pages/dashboard/inventory-manager/index.html`.
- Added and stabilized UI validation suite:
	- `testing/ui-validation/inventory-analytics-hub/validate-inventory-analytics-hub.spec.js`
	- fixed analytics-hub reconnect click-binding issue in `pages/dashboard/inventory-manager/components/analytics-hub/script.js`
- Validation evidence:
	- Passed: `VAL_STAGE=before npx playwright test inventory-analytics-hub/validate-inventory-analytics-hub.spec.js --reporter=line` (2/2)
	- Passed: `VAL_STAGE=after npx playwright test inventory-analytics-hub/validate-inventory-analytics-hub.spec.js --reporter=line` (2/2)

### Technical Officer single-page analytics hub charts completed (April 19, 2026)
- Completed TASK059 by adding a dedicated Technical Officer `analytics` section with TM-style tabbed chart views in one page.
- Added new `to-analytics-hub` component with five chart sections:
	- Tickets
	- Spare Parts
	- Work Updates
	- Assets
	- Notifications
- Wired section routing/refresh lifecycle in `pages/dashboard/technical-officer/script.js` and shell updates in `pages/dashboard/technical-officer/index.html`.
- Added TO sidebar parity update in `pages/dashboard/technical-officer/components/layout/sidebar/script.js` so subpage shell navigation includes `analytics`.
- Validation evidence:
	- Editor diagnostics clean for touched TO files.
	- Passed: `VAL_BASE_URL=http://127.0.0.1:3000 VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` (2/2).

### Supervisor single-page analytics hub charts completed (April 19, 2026)
- Completed TASK058 by adding a dedicated Supervisor `analytics` section with TM-style tabbed chart views in one page.
- Added new `supervisor-analytics-hub` component with five chart sections:
	- Fault Tickets
	- Breakdowns
	- Weekly Checks
	- Budget Queue
	- Technicians
- Wired section routing/refresh lifecycle in `pages/dashboard/supervisor/script.js` and shell updates in `pages/dashboard/supervisor/index.html`.
- Validation evidence:
	- Editor diagnostics clean for touched Supervisor files.
	- Passed: `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js supervisor-daily-check-reports/validate-daily-check.spec.js --reporter=line` (4/4).

### Transportation Manager analytics report generation + download completed (April 19, 2026)
- Completed TASK057 by extending the unified TM analytics hub with report generation controls and downloadable exports.
- Added report toolbar in `tm-analytics-hub`:
	- From Date / To Date filters
	- Report scope selector (active tab, per-domain, and all-summary)
	- Generate report and Download CSV actions
- Implemented API-backed report builders for Trip, Fuel, Cargo, Driver, Garage, and All Analytics Summary scopes with summary metrics and preview table rendering.
- Added in-page report status messaging and CSV export file generation.
- Validation evidence:
	- Editor diagnostics clean for touched analytics-hub files.
	- Passed: `VAL_BASE_URL=http://127.0.0.1:3000 VAL_STAGE=after npx playwright test transportation-manager-fuel-fleet/validate-transportation-manager-fuel-fleet.spec.js transportation-cargo-section-split/validate-transportation-cargo-section-split.spec.js --reporter=line`

### Transportation Manager analytics consolidated into single page (April 19, 2026)
- Completed TASK056 by replacing five separate analytics sections with one unified `analytics` page in the TM dashboard.
- Added `tm-analytics-hub` with top selector options:
	- Trip Analytics
	- Fuel Analytics
	- Cargo Analytics
	- Driver Analytics
	- Garage Analytics
- Updated TM orchestration so section activation refreshes the unified analytics page and old analytics query-section ids normalize to `analytics`.
- Validation evidence:
	- Passed: `VAL_STAGE=after npx playwright test transportation-manager-fuel-fleet/validate-transportation-manager-fuel-fleet.spec.js --reporter=line`
	- Passed: `VAL_STAGE=after npx playwright test transportation-cargo-section-split/validate-transportation-cargo-section-split.spec.js --reporter=line`

### Transportation Manager separate analytics pages implementation completed (April 19, 2026)
- Completed TASK055 by implementing dedicated TM analytics sections/pages for Trip, Fuel, Cargo, Driver, and Garage analytics.
- Updated TM dashboard shell and orchestration to refresh analytics pages on section activation and relevant modal completion events.
- Added shared analytics-page styling and component-level Chart.js rendering with empty-state fallbacks and API-response guards.
- Validation evidence:
	- Passed: `VAL_STAGE=after npx playwright test transportation-manager-fuel-fleet/validate-transportation-manager-fuel-fleet.spec.js --reporter=line`
	- Passed: `VAL_STAGE=after npx playwright test transportation-cargo-section-split/validate-transportation-cargo-section-split.spec.js --reporter=line`

### Dashboard chart recommendation roadmap completed (April 19, 2026)
- Completed TASK054 as an advisory discovery/recommendation slice (no production code changes).
- Verified current chart infrastructure and insertion points:
	- Existing Chart.js bootstrapping in Transportation Manager dashboard.
	- Existing chart renderers in TM fleet details and TM cargo details.
	- Chart-ready summary/report sections across Supervisor, Technical Officer, Inventory, Driver, Machinery Operator, SysAdministration, Maintenance, and Auction dashboards.
- Produced prioritized where-to-update + chart-type guidance focused on quick wins first, then cross-dashboard expansion.
- Expanded recommendations to an all-project practical chart catalog with decision/report-focused chart choices per dashboard module and section.

### Rebase conflict recovery completed (April 19, 2026)
- Recovered an interrupted rebase on `spare-parts-and-garage` with multiple conflict stops across shared ticket detail runtime, role dashboard files, UI validation artifacts, and memory docs.
- Preserved additive behavior in shared ticket detail runtime by keeping both supervisor insurance assessment rendering and machinery-operator pending edit action handling.
- Completed rebase successfully after resolving code conflicts and skipping stale memory/testing conflict commits that were superseded by current branch state.
- Final state verified clean: branch restored to `spare-parts-and-garage` with no unresolved files (`UU`) and ahead-of-origin status.

### Cross-dashboard newest-first fault ticket ordering + sort/filter toolbar alignment completed (April 19, 2026)
- Implemented explicit sort controls (`Created Date`, `Priority`) and default newest-first behavior across active fault-ticket/fault-reporting list components:
	- `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js`
	- `pages/dashboard/technical-officer/components/tickets/script.js`
	- `pages/dashboard/driver/components/driver-ticket-tracking.js`
	- `pages/dashboard/machinery-operator/components/mo-fault-reporting.js`
	- `pages/dashboard/maintenance/components/maintenance-fault-tickets.js`
- Added responsive filter-toolbar layout patterns in role stylesheets for Supervisor, Technical Officer, Driver, Machinery Operator, and Maintenance dashboards.
- Updated UI validation suites to assert sort-control visibility and created-vs-priority behavior, with `VAL_STAGE=after` combined run passing desktop+mobile (`10/10` tests):
	- `supervisor-fault-ticket-tracking`
	- `to-ticket-routing`
	- `driver-dashboard`
	- `machinery-operator-dashboard`
	- `maintenance-remaining-sections`

### Supervisor driver breakdown visibility regression fix completed (April 18, 2026)
- Fixed missing driver-reported vehicle breakdown rows in active Supervisor list by updating `pages/dashboard/supervisor/components/fault-ticket-tracking/script.js` to fetch and normalize `GET /breakdown-reports` in the same pipeline as machine and route breakdown feeds.
- Added `normalizeVehicleBreakdown(...)` and included vehicle reports in the merged list sorting and source-filter rendering path.
- Updated `openDetails(...)` fallback to use per-row `reportType` so legacy unlinked vehicle rows are not forced through the route-breakdown path.
- Validation evidence: updated `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` with `/api/breakdown-reports` fixture coverage and vehicle visibility assertions; `VAL_STAGE=after` passed desktop + mobile (`2/2`).

### Supervisor newest-first fault ordering update completed (April 18, 2026)
- Updated active Supervisor fault-ticket-tracking sort behavior to timestamp-first so newly created faults always appear at the top of the list.
- Added candidate timestamp fallback handling (`date`, `created_at`, `breakdown_datetime`, `breakdown_date`, `updated_at`) with severity and ID tie-breakers for stable ordering.
- Updated supervisor tracking validation fixtures/assertions to verify newest-first behavior in both all-source and vehicle-source views.
- Validation evidence: `VAL_STAGE=after` Playwright run passed for `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` (desktop + mobile, `2/2`).

### TO view-ticket Finish Work modal and resolve flow parity fix completed (April 18, 2026)
- Updated shared TO detail route `pages/view-ticket/index.html` complete modal to match TO fault-ticket list Finish Work modal structure (ticket ID, parts-used checklist, time spent, machine update description).
- Updated `pages/view-ticket/script.js` completion workflow to match TO list behavior:
	- load parts-used checklist from ticket spare-part requests,
	- submit work update via `POST /ticket-work-updates`,
	- mark ticket resolved via `PUT /fault-tickets/{id}` with `status: Resolved` and `resolution_notes`.
- Added targeted UI validation suite `testing/ui-validation/to-finish-work-modal/validate-to-finish-work-modal.spec.js`.
- Validation evidence: `VAL_STAGE=before` and `VAL_STAGE=after` runs both passed desktop + mobile (`2/2` each) with zero console warnings/errors and zero failed requests.

### TO view-ticket spare-parts modal and logic parity fix completed (April 18, 2026)
- Updated shared TO detail route `pages/view-ticket/index.html` to use TO dashboard list parity Request Spare Parts modal structure (ticket context fields, no-spare-parts path, dynamic part rows).
- Updated `pages/view-ticket/script.js` request-parts workflow to align with TO list logic:
	- prefill ticket context and priority,
	- load product options from `GET /products`,
	- check stock via `POST /spare-part-requests/check-availability`,
	- submit TO-aligned request payload to `POST /spare-part-requests`,
	- support no-spare-parts fast path via `PUT /fault-tickets/{id}` -> `In Progress`.
- Added targeted UI validation suite `testing/ui-validation/to-request-spare-parts-modal/validate-to-request-spare-parts-modal.spec.js`.
- Validation evidence: `VAL_STAGE=before` and `VAL_STAGE=after` runs both passed desktop + mobile (`2/2` each) with zero console warnings/errors and zero failed requests.

### Newest-first ticket rendering stabilization completed (April 18, 2026)
- Completed TASK052 to ensure newly created tickets/breakdowns consistently render at the top of dashboard lists.
- Updated list sorting in:
	- `pages/dashboard/machinery-operator/components/mo-fault-reporting.js`
	- `pages/dashboard/driver/components/driver-ticket-tracking.js`
	- `pages/dashboard/driver/components/driver-transport-ticket.js`
- Replaced single-field timestamp sorting with robust candidate timestamp selection and deterministic ID fallback tie-breakers for equal/missing timestamps.
- Validation evidence:
	- Editor diagnostics clean for all touched files.
	- Sort helper methods confirmed present and used in each component.

### Machinery Operator double fault-ticket creation fix completed (April 18, 2026)
- Completed TASK051 to fix duplicated fault ticket creation from Machinery Operator fault-report submission.
- Root cause was a stale frontend sequence in `mo-report-fault-modal` that still posted `POST /fault-tickets` after `POST /machine-breakdowns`, while backend auto-link creation was already enabled in TASK047.
- Updated MO submit flow to rely on backend auto-created linked tickets and removed manual ticket create call.
- Preserved photo upload by resolving the linked ticket ID from machine-breakdown list data and uploading selected photos via `PUT /fault-tickets/{id}`.
- Validation evidence:
	- Editor diagnostics clean for touched modal file.
	- Code scan confirms no remaining manual fault-ticket create call in the MO report modal.

### Driver and machinery operator fault-reporting 500 fix completed (April 18, 2026)
- Completed TASK050 to restore both Driver and Machinery Operator breakdown submission flows.
- Root cause was a transaction-state failure (`There is no active transaction`) caused by `FaultTicketService::create()` instantiating BaseModel-backed `Machine`/`Vehicle` models during active controller transactions.
- Replaced model-instantiation lookups with direct PDO queries in `FaultTicketService::create()` to avoid transaction side effects.
- Added defensive transaction guards (`inTransaction()`) before commit/rollback in:
	- `BreakdownReportController::create()`
	- `MachineBreakdownController::create()`
- Updated `FaultTicket` model to support `vehicle_id` in schema and use runtime column detection for backward-compatible reads/inserts on mixed DB states.
- Validation evidence:
	- PHP lint passed for touched files.
	- Runtime API validation passed:
		- Driver `POST /api/breakdown-reports` -> `201 Created`
		- Machinery Operator `POST /api/machine-breakdowns` -> `201 Created`

### Supervisor insurance-claim ticket flow completed (April 18, 2026)
- Completed TASK049 to support insurance-claim decisioning in Supervisor fault-ticket flow.
- Added and applied migration `059_add_insurance_claimed_status_to_fault_tickets.php` and extended status model/workflow handling for `Insurance Claimed`.
- `FaultTicketService` now returns insurance context payload (`insurance_claim`) with asset/provider/type/renewal details, eligibility state, and eligibility reason.
- Backend transition guard now enforces Supervisor/Admin role checks, eligibility checks, allowed source statuses, and deactivates technician assignments when insurance claim is submitted.
- Shared detail page now renders insurance overview and claim action branch for Supervisor/Admin; Supervisor tracking list now recognizes and displays `Insurance Claimed` consistently.
- Updated `testing/openapi.yaml` status enums and fault-ticket schema with insurance-claim contract.
- Validation evidence:
	- PHP lint passed for touched backend and migration files.
	- Migration status confirmed `59/59 applied, 0 pending`.
	- `VAL_STAGE=after` Playwright validation passed for `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` (desktop + mobile, `2/2`).

### Inventory insurance flow completed (April 18, 2026)
- Completed TASK048 for Inventory Manager insurance lifecycle support across machine/vehicle create/edit flows and insurance renewals management.
- Added and applied migration `058_add_insurance_fields_to_assets.php` with insurance columns, renewal-date indexes, and backfill of next renewal dates.
- Updated machine/vehicle models and services to validate and normalize insurance payload fields and compute `next_insurance_renew_date`.
- Added new Inventory Manager section component `insurance-management` with summary cards, filtering, upcoming renewals list, and renewal submission modal.
- Updated machine/vehicle form and details modal UIs to capture and display insurance fields.
- Updated `testing/openapi.yaml` schemas (`Machine`, `MachineInput`, `Vehicle`, `VehicleInput`) to reflect insurance fields and create requirements.
- Validation evidence:
	- PHP lint and JS syntax checks passed for touched files.
	- Migration status confirmed `58/58 applied, 0 pending`.
	- Playwright after-stage validation passed for `testing/ui-validation/inventory-insurance-management/validate-inventory-insurance-management.spec.js` (desktop + mobile, `2/2`) after selector hardening and fixture alignment.

### Supervisor view-ticket garage-approval modal regression fix completed (April 18, 2026)
- Fixed shared detail-page modal style conflict causing `Approve Nearby Garage` modal to render top-left/unstyled for Supervisor route-breakdown tickets.
- Updated `pages/dashboard/technical-officer/view-ticket/style.css` modal card selector to neutralize inherited dashboard `.modal` overlay properties and keep modal card centered inside `.modal-overlay`.
- Added explicit garage map styling in the same detail stylesheet (`.garage-approval-map`, `.garage-approval-map-hint`) to preserve map container sizing in the modal.
- Extended `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` to validate:
	- opening Supervisor detail-page garage-approval modal,
	- visible map markers,
	- marker-click garage selection,
	- submit payload (`garage_id`) path,
	- modal centering geometry assertions.
- Validation evidence:
	- `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line`
	- passed desktop + mobile (`2/2`).

### Supervisor fault-ticket section consolidation and UX fixes completed (April 18, 2026)
- Removed the duplicate Supervisor Technician Assignment section (`fault-tickets`) from dashboard navigation/layout and standardized active fault-ticket ownership under `fault-ticket-tracking`.
- Updated Supervisor routing defaults and legacy section aliases so detail returns and old links normalize to `fault-ticket-tracking`.
- Updated `supervisor-fault-ticket-tracking` list behavior to:
	- show dangerous-cargo badge + summary/trip metadata for vehicle route breakdowns,
	- remove list-level approve-garage button,
	- rename action label from `VIEW TICKET` to `View`,
	- add source filter controls (`All Sources`, `Vehicle`, `Machine`).
- Updated overview card and ticket-detail fallback return section to use `fault-ticket-tracking`.
- Validation evidence:
	- Added `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js`.
	- `VAL_STAGE=before`: passed (desktop + mobile).
	- `VAL_STAGE=after`: passed (desktop + mobile).
	- Final artifacts show zero console warnings/errors and zero failed network requests.
	- Legacy `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` is now explicitly skipped/deprecated because it targets the removed `fault-tickets` section.

### Supervisor fault-ticket critical sorting and route-breakdown presentation refinement completed (April 18, 2026)
- Updated `supervisor-fault-ticket-tracking` list ordering to prioritize ticket criticality (Critical > High > Medium > Low) before date.
- Removed verbose card-level metadata lines for:
	- dangerous cargo summary text,
	- dangerous cargo trip line,
	- garage workflow details line.
- Added route-workflow-aware status normalization in the active list so rows with `garage_approved` show `Garage Approved` instead of `Pending`.
- Added legacy route-description normalization for converted in-route records and introduced `Map View` action with coordinate parsing from both stored coordinate columns and legacy text payloads.
- Updated route auto-ticket description generation (`RouteBreakdownController::buildAutoTicketDescription`) to store concise issue text for newly created linked tickets.
- Added and applied migration `057_normalize_legacy_route_breakdown_descriptions.php` to normalize incompatible existing route description blobs in DB records (`fault_tickets` updated: 6 rows).
- Validation evidence:
	- `VAL_STAGE=before` and `VAL_STAGE=after` both passed for `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` (desktop + mobile).
	- Assertions include criticality sort order, Garage Approved status display, hidden verbose metadata text, legacy description cleanup, and map-view action behavior.

### Supervisor list-vs-detail map placement correction completed (April 18, 2026)
- Applied follow-up UX correction to keep list cards focused and move location map context into detail view:
	- removed list-level map button/action from `supervisor-fault-ticket-tracking`,
	- removed list coordinate text and `Ticket:` line from cards,
	- moved role display next to reportee metadata row,
	- added embedded route location panel and map in shared `pages/view-ticket` for route breakdown tickets.
- Updated `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` to assert:
	- no map button in list,
	- no coordinates rendered in list,
	- no `Ticket:` line in list cards,
	- role rendered next to reportee,
	- embedded route map panel visible on detail page.
- Validation evidence:
	- `VAL_STAGE=after` passed desktop + mobile (`2/2`).
	- Touched-file diagnostics clean.

### Breakdown-view/ticket-flow unification + create-time linkage completed (April 18, 2026)
- Completed TASK047 to align breakdown and fault-ticket View behavior around ticket flow semantics.
- Backend now auto-creates linked fault tickets transactionally for new breakdown reports across all three create paths:
	- `BreakdownReportController` (vehicle)
	- `RouteBreakdownController` (in-route)
	- `MachineBreakdownController` (machine)
- Supervisor breakdown actions now resolve to ticket flow (`VIEW TICKET`) and use create-or-open fallback only for legacy unlinked breakdown rows.
- `FaultTicketService` now merges specialized source-table data into ticket payloads using `breakdown_context` for vehicle/route/machine breakdowns.
- OpenAPI note updated in `testing/openapi.yaml` for route-breakdown create auto-link behavior.
- Validation evidence:
	- PHP lint passed for all touched backend controllers/service.
	- `VAL_STAGE=after` `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` passed (desktop + mobile).
	- `VAL_STAGE=after` `testing/ui-validation/route-breakdown-garage-workflow/validate-route-breakdown-garage-workflow.spec.js` passed (desktop + mobile).

### Actor-specific ticket-detail component migration completed (April 18, 2026)
- Replaced iframe-based shared ticket detail host usage in dashboards with actor-specific components:
	- `supervisor-ticket-detail-view`
	- `to-ticket-detail-view`
- Updated Supervisor and Technical Officer dashboard orchestration to open standalone `pages/view-ticket/index.html` directly with role override and dashboard-section return path.
- Removed shared iframe host implementation files (`pages/components/shared/ac-ticket-detail-view.js` and `.css`) to prevent regressions back to iframe rendering.
- Preserved existing View Ticket UI by keeping `pages/view-ticket/*` unchanged.
- Validation evidence:
	- `VAL_STAGE=after` `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` passed (desktop + mobile).
	- `VAL_STAGE=after` `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js` passed (desktop + mobile).

### Shared ticket-detail dual-scroll fix superseded by actor-specific detail components (April 18, 2026)
- Initial dual-scroll mitigation was implemented on the shared ticket-detail host, then superseded in the same day by removing iframe-based host usage entirely.
- Current architecture uses actor-specific components (`supervisor-ticket-detail-view`, `to-ticket-detail-view`) that open standalone `pages/view-ticket/index.html` directly (no iframe).
- Shared iframe host files were removed to avoid regression to nested scrolling behavior.
- Validation evidence:
	- `VAL_STAGE=after` `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` passed (desktop + mobile).
	- `VAL_STAGE=after` `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js` passed (desktop + mobile).

### Supervisor view-breakdown side-effect slice superseded (April 17, 2026)
- This view-only slice was later superseded by TASK047 product-direction changes that unified Supervisor breakdown actions to ticket-flow semantics (`VIEW TICKET`).
- Added shared `ac-breakdown-detail-view` host and mounted a dedicated `breakdown-details` dashboard section in Supervisor.
- Rewired Supervisor breakdown view actions from fault-ticket and fault-ticket-tracking lists to open the new section instead of creating/converting tickets.
- Removed breakdown-to-ticket create CTA/event handling from Supervisor view-ticket modal breakdown content.
- Historical validation evidence (superseded behavior only):
	- Updated and executed `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js`.
	- Desktop + mobile passed for the former view-only path before TASK047 replaced it.

### Supervisor ticket-detail UX stabilization completed (April 17, 2026)
- Addressed three supervisor-facing issues in ticket detail flow:
	- Back button styling for shared `ac-ticket-detail-view` was added and aligned with project navigation standards.
	- Opening ticket details from deep list positions now resets viewport to top.
	- Supervisor view actions are now clearly labeled by behavior (`VIEW TICKET` vs `VIEW BREAKDOWN`) to remove modal/page ambiguity.
- Validation evidence:
	- `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` passed desktop + mobile after changes.
	- TO regression guard `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js` passed desktop + mobile after shared component updates.

### TO + Supervisor in-dashboard ticket detail componentization completed (April 17, 2026)
- Replaced remaining Supervisor ticket-detail redirect behavior with section-based component flow in `pages/dashboard/supervisor/script.js` (`viewTicketDetails`) and removed fallback redirect in `supervisor-fault-ticket-tracking`.
- TO and Supervisor dashboards now both rely on `ticket-details` section + shared `ac-ticket-detail-view` behavior with return-section handling.
- Updated UI validation suites for the new section-based behavior:
	- `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js`
	- `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js`
- Validation evidence:
	- Desktop + mobile passed for both specs (4/4 total) after serving frontend at `127.0.0.1:3000`.
- Task tracking updates:
	- TASK037 set to In Progress (fault-ticket detail routing slice complete; broader decomposition pending).
	- TASK038 set to In Progress (TO ticket detail routing slice complete; broader decomposition pending).

### Dangerous in-route priority lock + supervisor visibility hardening completed (April 17, 2026)
- Completed TASK046 to enforce dangerous-cargo route-breakdown urgency lock and consistent supervisor visibility.
- Backend updates complete:
	- `RouteBreakdownController` now normalizes incoming severity and forces `critical` for dangerous-cargo in-route breakdown contexts during create/update.
	- `FaultTicketService` now enriches route-breakdown tickets with `is_dangerous_cargo`, `dangerous_cargo_present`, `dangerous_cargo_summary`, and `dangerous_cargo_trip_id` during formatting.
- Frontend updates complete:
	- Driver in-route breakdown modal now auto-locks urgency to critical, disables severity editing, and shows contextual dangerous-cargo lock notice.
- Validation evidence:
	- `VAL_STAGE=after` run passed for `testing/ui-validation/transportation-cargo-lifecycle/validate-transportation-cargo-lifecycle.spec.js` (1/1).
	- PHP lint passed for `app/controllers/RouteBreakdownController.php` and `app/services/FaultTicketService.php`.

### Transportation Manager cargo catalogue/details UX refinement completed (April 17, 2026)
- Completed TASK045 to improve TM cargo management information architecture and interactions.
- Frontend updates complete:
	- Removed embedded Cargo Analytics subsection from `tm-cargo-management` and retained catalogue-focused UI only.
	- Added catalogue filters (search + cargo type + status) and action-first item rows.
	- Follow-up UI cleanup removed explicit refresh buttons and restructured cargo toolbar into cleaner grouped rows.
	- Follow-up modal polish fixed `Mark as dangerous cargo` checkbox alignment in add-cargo modal.
	- Second-pass modal polish adjusted dangerous-checkbox margins/padding and centered checkbox row content.
	- Replaced inline cargo create form with modal flow using `tm-cargo-item-modal`.
	- Added dedicated cargo details section/component `tm-cargo-details` with breadcrumb/back layout, item profile, analytics cards, trend chart, and recent trip usage.
	- Updated parent TM orchestration for cargo create modal open, details navigation/back flow, and cargo details refresh.
- Validation evidence:
	- Updated and executed `testing/ui-validation/transportation-cargo-section-split/validate-transportation-cargo-section-split.spec.js` with `VAL_STAGE=after` (pass: 1/1).
	- Updated and executed `testing/ui-validation/transportation-cargo-lifecycle/validate-transportation-cargo-lifecycle.spec.js` with `VAL_STAGE=after` (pass: 1/1).

### Transportation Manager cargo section split completed (April 17, 2026)
- Completed TASK044 to separate cargo management from Trips into a dedicated TM dashboard section and sidebar entry.
- Frontend updates complete:
	- Added new `cargo-management` section + sidebar item and mounted `<tm-cargo-management>` in TM dashboard layout.
	- Added `pages/dashboard/transportation-manager/components/cargo-management/script.js` and `style.css` to own cargo analytics and cargo catalog behavior.
	- Refactored `tm-trips` to trips-only ownership (trip lifecycle/list actions retained; cargo analytics/catalog removed).
	- Updated parent TM orchestration refresh to include cargo section on trip modal completion and section navigation.
- Validation evidence:
	- Added `testing/ui-validation/transportation-cargo-section-split/validate-transportation-cargo-section-split.spec.js`.
	- `VAL_STAGE=before`: passed (1/1).
	- `VAL_STAGE=after`: passed (1/1) with desktop and mobile viewport checks.
	- Regression guard `VAL_STAGE=after` for `testing/ui-validation/transportation-cargo-lifecycle/validate-transportation-cargo-lifecycle.spec.js`: passed (1/1).
	- Final rerun from `testing/ui-validation` workspace reconfirmed both after-stage specs passing (1/1 each).
	- `VAL_STAGE=before` remains baseline-only and is expected to fail if rerun on post-refactor code.

### Transportation cargo lifecycle + dangerous route-breakdown escalation completed (April 17, 2026)
- Completed TASK043 end-to-end for TM cargo management/analytics, Driver cargo visibility, and Supervisor dangerous-cargo escalation visibility.
- Backend/domain updates complete:
	- Added migration `056_add_cargo_lifecycle_and_route_dangerous_snapshot.php` for cargo catalog/trip cargo assignments and route-breakdown dangerous snapshot fields.
	- Added cargo APIs in Trip domain (`/trips/cargo-items` CRUD + `/trips/cargo-analytics`).
	- Trip payloads now include structured cargo fields (`cargo_items`, `total_cargo_quantity`, `dangerous_cargo_quantity`, `has_dangerous_cargo`, `cargo_summary`).
	- Fault-ticket/route-breakdown dangerous context flow now exposes dangerous snapshot metadata for escalation visibility.
- Frontend updates complete:
	- TM trip assignment/edit/view modals now support structured cargo rows with quantity/notes and dangerous indicators.
	- TM trips page now includes cargo catalog management + cargo analytics UI.
	- Driver trip log + trip/ticket modals now show structured cargo summaries/details and dangerous markers.
	- Supervisor ticket lists now show dangerous-cargo chip/summary/trip context for route-breakdown tickets.
	- Shared `pages/view-ticket` now renders dangerous cargo panel + flow narrative context.
- API contract + validation:
	- Updated `testing/openapi.yaml` for cargo endpoints/schemas and dangerous snapshot fields.
	- Executed `VAL_STAGE=after` for `testing/ui-validation/transportation-cargo-lifecycle/validate-transportation-cargo-lifecycle.spec.js` (pass: 1/1).
	- Editor diagnostics reported no errors for touched files.

### Route-breakdown driver GPS + map-based garage approval completed (April 17, 2026)
- Completed TASK042 end-to-end for driver coordinate capture and supervisor map-based garage approval.
- Backend/data updates complete:
	- Added and applied migration `055_add_coordinates_to_route_breakdowns.php`.
	- `vehicle_breakdown_inroute` now stores `breakdown_latitude` and `breakdown_longitude`.
	- `RouteBreakdownController` create/update now validate/persist coordinate pairs.
- Frontend updates complete:
	- Driver route-breakdown modal now captures browser geolocation and requires GPS capture before create submit.
	- Supervisor garage approval modal now renders driver + garage markers and allows marker-based garage selection.
	- Shared `pages/view-ticket` garage approval modal now includes map container, marker rendering, and marker-driven selection.
- API contract + validation:
	- Updated `testing/openapi.yaml` route-breakdown CRUD/stats docs and coordinate-aware schemas.
	- Updated and executed `testing/ui-validation/route-breakdown-garage-workflow/validate-route-breakdown-garage-workflow.spec.js`.
	- Validation evidence:
		- `VAL_STAGE=before`: passed (2/2 desktop+mobile)
		- `VAL_STAGE=after`: passed (2/2 desktop+mobile)
		- PHP lint, JS syntax checks, and editor diagnostics passed for touched files.

### Transportation Manager garage management + supervisor map approval update (April 17, 2026)
- Implemented backend garage creation endpoint in `app/controllers/GarageController.php` and registered `POST /garages` in `public/index.php`.
- Added missing `GET /route-breakdowns/garages` route registration in `public/index.php` for route-breakdown garage workflows.
- Added TM dashboard garages section + component (`pages/dashboard/transportation-manager/components/garages/*`) with create/search/list/call/directions and section-refresh orchestration.
- Enhanced shared ticket page garage approval modal (`pages/view-ticket/index.html`, `pages/view-ticket/script.js`) with map panel, Leaflet integration, marker/list synchronization, and modal cleanup.
- Updated API contract and collection docs (`testing/openapi.yaml`, `testing/postman/postman_collection.json`) for garage create/list and route-breakdown garage list endpoints.
- Validation status:
	- Syntax checks passed for touched PHP/JS files.
	- Touched-file diagnostics show no new errors.
	- Playwright validation passed: `VAL_STAGE=after` for `testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` (desktop + mobile).

### Inventory usage tracking view-chart popup update (April 17, 2026)
- Updated `pages/dashboard/inventory-manager/components/usage-tracking` so table row action now uses `View Usage` instead of `Update`.
- Replaced Issue Sparepart modal flow in this component with a dedicated Usage Overview popup showing:
	- usage summary stats
	- per-date usage line chart
	- selectable per-date detail cards and a dedicated selected-date records panel
	- recent issuance history table
- Added stage-based UI validation scope `testing/ui-validation/inventory-usage-tracking/validate-inventory-usage-tracking.spec.js` with desktop/mobile before and after artifacts.
- Validation status:
	- `VAL_STAGE=before`: passed (desktop + mobile)
	- `VAL_STAGE=after`: passed (desktop + mobile)

### Vehicle government fuel QR image flow completed (April 16, 2026)
- Completed TASK041 for Sri Lanka external-fuel QR support across vehicle management, TM dashboard, and Driver dashboard.
- Backend updates complete:
	- Added migration `054_add_government_fuel_qr_image_to_vehicles.php` and applied it successfully.
	- Added vehicle field `government_fuel_qr_image`.
	- Added new upload endpoint `POST /vehicles/:id/fuel-qr` in `VehicleController` + `public/index.php` route registration.
	- `VehicleService` now validates/stores QR images under publicly-served `public/uploads/vehicle-fuel-qr/`, keeps DB-relative path `uploads/vehicle-fuel-qr/...`, auto-recovers legacy root-stored QR files into public storage on read, and cleans old QR files from both public + legacy paths when replaced.
- Frontend updates complete:
	- `tm-fleet-details` now shows QR preview and supports upload/replace for the currently selected vehicle.
	- Follow-up UX refinement applied: Government Fuel QR section is positioned directly above Recent Fuel Records in TM vehicle details.
	- QR URL resolution now prefers API-origin asset URLs for `uploads/...` paths to avoid frontend-origin static 404 probes in split-host local setups.
	- Driver dashboard overview now shows assigned-vehicle government QR image and allows opening full-size view.
- OpenAPI updated in `testing/openapi.yaml`:
	- Added `/vehicles/{id}/fuel-qr` multipart endpoint.
	- Added `government_fuel_qr_image` on `Vehicle` and `VehicleInput` schemas.
- Validation status:
	- Editor diagnostics: no new errors in touched files.
	- PHP lint and JS syntax checks passed for all touched files.
	- Migration status confirms `054` applied and zero pending migrations.

### Fuel logging + TM fleet detail enhancement completed (April 16, 2026)
- Completed TASK040 end-to-end for fuel logging contract improvements and Transportation Manager fleet detail conversion.
- Backend updates complete:
	- Added migration `053_add_fuel_source_and_nullable_total_cost.php`.
	- Fuel payload validation now derives `fuel_type` from vehicle and enforces `fuel_source` (`internal`/`external`) rules.
	- External fueling now requires positive `total_cost` + bill image; internal fueling supports nullable cost.
- Frontend updates complete:
	- Driver and TM fuel modals now use source-aware UX and no longer require manual fuel type input.
	- TM fuel list/view now display fuel source and handle internal entries without mandatory cost.
	- TM fleet `View` action now routes to dedicated `fleet-details` section with metrics, Chart.js trend chart, and driver/fuel history.
- OpenAPI updated in `testing/openapi.yaml` for fuel-log endpoints, schemas, and source-aware request rules.
- Validation status:
	- PHP syntax checks passed for all touched backend/migration files.
	- Editor diagnostics reported no new errors in touched files.
	- UI validation `VAL_STAGE=after` passed.
	- `VAL_STAGE=before` assertions now fail as expected against post-change behavior (old modal/manual field expectations).

### Route-breakdown garage workflow alignment completed (April 16, 2026)
- Completed TASK039 across Supervisor, shared ticket detail, Driver ticket tracking/modals, and backend assignment enforcement.
- `pages/dashboard/supervisor/script.js` now routes route-breakdown pending-stage VIEW actions to shared `pages/view-ticket/` flow.
- `pages/view-ticket/script.js` + `pages/view-ticket/index.html` now support Supervisor dual assignment decision for route tickets:
	- assign technical officer
	- approve nearby garage via `/route-breakdowns/{id}/garage-approval`
- Assignment step rendering in shared detail page now treats approved-garage workflows as fulfillment of step 2 and marks technician assignment optional.
- `app/services/FaultTicketService.php` now blocks `assignTechnicians` updates for route tickets when garage workflow is active (`garage_approved`, `garage_entry_logged`, `repair_in_progress`, `completed`).
- Updated `testing/openapi.yaml` to document `/fault-tickets/{id}/assign` and the new route-garage-workflow assignment-block response case.
- Driver ticket/garage view updates:
	- `pages/dashboard/driver/components/page-modals/driver-nearby-garages-modal.js` now shows only the approved garage when one is assigned.
	- `pages/dashboard/driver/components/driver-ticket-tracking.js` suppresses technician-assignment badge when garage workflow is active.
- Diagnostics: no new editor errors across touched files; PHP syntax check passed for `FaultTicketService.php`.

### Budget-flow notification routing refinement completed (April 13, 2026)
- Implemented targeted supervisor routing for `BUDGET_REPORT_CREATED` events in `services/consume_notification_events.php`.
- For supervisor-level approvals, recipient resolution now uses active ticket assignment ownership:
	- First pass: match `(fault_ticket_id, submitted_by Technical Officer)` to `assigned_by` Supervisor.
	- Fallback pass: match active assignments by `(fault_ticket_id)` to `assigned_by` Supervisor.
	- Safety fallback: role broadcast to `Supervisor` when ownership cannot be resolved.
- Preserved maintenance manager routing for maintenance-manager approval events.
- Validation evidence (`testing/ui-validation/budget-notification-routing/validate-budget-notification-routing.spec.js`):
	- `VAL_STAGE=before`: passed (2/2 desktop + mobile)
	- `VAL_STAGE=after`: passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none

### Transportation Manager role creation support completed (April 12, 2026)
- Completed TASK033 by adding `Transportation Manager` in SysAdministration user-management create/edit modal role selectors and user role filter tabs:
	- `pages/dashboard/sysadministration/components/page-modals/sa-create-user-modal.js`
	- `pages/dashboard/sysadministration/components/page-modals/sa-edit-user-modal.js`
	- `pages/dashboard/sysadministration/components/sa-user-accounts.js`
- Aligned backend role acceptance so create/edit flows succeed end-to-end:
	- `app/services/UserService.php` valid role list includes Transportation Manager
	- `app/middleware/RoleMiddleware.php` hierarchy includes Transportation Manager
	- `app/models/User.php` schema enum includes Transportation Manager for model/schema parity
- Updated `testing/openapi.yaml` to include Transportation Manager in Users role enums and role documentation.
- Added and executed dedicated validation scope:
	- `testing/ui-validation/sysadmin-transportation-manager-role/validate-sysadmin-transportation-manager-role.spec.js`
	- `VAL_STAGE=before`: passed (2/2 desktop + mobile)
	- `VAL_STAGE=after`: passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none

### Newly identified follow-up refactor backlog (April 12, 2026)
- TASK034 completed: canonical shared fault-ticket detail page (`pages/view-ticket/`) was refactored to modular scripts with inline-handler removal and before/after desktop+mobile validation.
- TASK035 completed: Technical Officer detail routing now targets canonical `pages/view-ticket/`; dashboard-local TO detail page folder was removed and navigation/back flow was validated.
- TASK036 completed: Supervisor create/assign/view modal business logic was co-located into modal components, parent modal internals were removed from `pages/dashboard/supervisor/script.js`, and before/after desktop+mobile validation passed.

### Supervisor residual cleanup progress (April 12, 2026)
- `pages/dashboard/supervisor/components/fault-tickets/script.js` now owns ticket/breakdown list rendering and delegated `data-action` handling with local dropdown state.
- `pages/dashboard/supervisor/script.js` fault-ticket rendering templates with inline `onclick` strings were removed; parent now consumes component action events and routes to orchestration handlers.
- `pages/dashboard/supervisor/components/page-modals/{create-ticket-modal,assign-ticket-modal,view-ticket-modal}` now own modal-local open/close flow, API operations, and modal rendering behavior.
- Removed large dead legacy reports block, duplicate modal helper declarations, and stale global modal/dropdown listeners from supervisor parent script.
- Removed remaining inline handler strings from supervisor scope (`pages/dashboard/supervisor/**`).
- Validation evidence (`testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js`):
	- `VAL_STAGE=before` rerun passed (2/2 desktop + mobile)
	- `VAL_STAGE=after` rerun passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none

### Driver dashboard componentization + inline-events migration completed (April 12, 2026)
- Extracted all Driver sections into dashboard-scoped components under `pages/dashboard/driver/components/`:
	- `driver-dashboard-overview`
	- `driver-trip-log`
	- `driver-vehicle-check`
	- `driver-breakdown`
	- `driver-fuel-mileage`
	- `driver-transport-ticket`
	- `driver-garages`
- Extracted all Driver page modals one-modal-per-component under `pages/dashboard/driver/components/page-modals/`.
- Replaced inline section and modal markup in `pages/dashboard/driver/index.html` with component hosts and script includes.
- Replaced `pages/dashboard/driver/script.js` monolith with orchestration-only bridges (auth/bootstrap, section refresh routing, toast bridge, modal bridge wiring, periodic refresh).
- Completed inline-events migration for Driver scope by moving interactions to component-local handlers and event contracts (`driver-ui:toast`, `driver:modal-open`, `driver:modal-close`, `driver:data-*`).
- Validation evidence (`testing/ui-validation/driver-dashboard/validate-driver-dashboard.spec.js`):
	- Before run: `VAL_STAGE=before` passed (2/2 desktop + mobile)
	- After run: `VAL_STAGE=after` passed (2/2 desktop + mobile)
	- Console warnings/errors: 0
	- Failed network requests: 0

### Machinery Operator dashboard componentization completed (April 12, 2026)
- Extracted all Machinery Operator sections into dashboard-scoped components under `pages/dashboard/machinery-operator/components/`:
	- `mo-dashboard-overview`
	- `mo-fault-reporting`
	- `mo-condition-updates`
	- `mo-ticket-tracking`
	- `mo-notifications`
- Extracted all Machinery Operator page modals one-modal-per-component under `pages/dashboard/machinery-operator/components/page-modals/`:
	- `mo-report-fault-modal`
	- `mo-edit-fault-modal`
	- `mo-condition-update-modal`
	- `mo-machine-details-modal`
	- `mo-machine-breakdown-details-modal`
	- `mo-weekly-check-details-modal`
- Replaced inline section and modal markup in `pages/dashboard/machinery-operator/index.html` with component hosts and component script includes.
- Replaced `pages/dashboard/machinery-operator/script.js` monolith with orchestration-only bridges (auth/bootstrap, section refresh routing, modal orchestration, toast and sidebar notification badge wiring).
- Added dashboard utility module `pages/dashboard/machinery-operator/components/mo-utils.js` for shared status/date/toast helpers across section and modal components.
- Validation evidence (`testing/ui-validation/machinery-operator-dashboard/validate-machinery-operator-dashboard.spec.js`):
	- Before run: `VAL_STAGE=before` passed (2/2 desktop + mobile)
	- After run: `VAL_STAGE=after` passed (2/2 desktop + mobile)
	- Console warnings/errors: none in final after artifacts
	- Failed network requests: none in final after artifacts

### Maintenance dashboard componentization completed (April 12, 2026)
- Started TASK011 execution with focused Maintenance slices for `cost-approvals` and `service-reports`.
- Extracted cost-approvals section into `pages/dashboard/maintenance/components/maintenance-cost-approvals.js` with component-owned filter state, pending/approved/rejected rendering, budget approval API mapping/loading, and review actions.
- Extracted cost-approval modals into dashboard-scoped one-modal-per-component files under `pages/dashboard/maintenance/components/page-modals/`:
	- `maintenance-approve-cost-modal.js`
	- `maintenance-reject-cost-modal.js`
	- `maintenance-cost-details-modal.js`
- Replaced inline cost-approvals section and legacy approve/reject/details modal blocks in `pages/dashboard/maintenance/index.html` with component hosts.
- Reduced `pages/dashboard/maintenance/script.js` for this scope to orchestration wrappers (`refreshMaintenanceCostApprovals`, `approveCost`, `rejectCost`, `viewCostDetails`) and added `maintenance-ui:toast` bridge.
- Validation evidence (`testing/ui-validation/maintenance-cost-approvals/validate-maintenance-cost-approvals.spec.js`):
	- Before run: `VAL_STAGE=before` passed (2/2 desktop + mobile)
	- After run: `VAL_STAGE=after` passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none
	- Interaction path checks passed for filters, details modal, approve modal submit, reject modal submit
- Extracted service-reports section into `pages/dashboard/maintenance/components/maintenance-service-reports.js` with component-owned filter/actions, report rendering, and approval transition behavior.
- Extracted report details modal into `pages/dashboard/maintenance/components/page-modals/maintenance-report-details-modal.js` and replaced inline report-details modal block with component host.
- Reduced root script ownership for service-reports to orchestration wrappers (`filterServiceReports`, `viewReportDetails`, `approveReport`, `reviewReport`).
- Validation evidence (`testing/ui-validation/maintenance-service-reports/validate-maintenance-service-reports.spec.js`):
	- Before run: `VAL_STAGE=before` passed (2/2 desktop + mobile)
	- After run: `VAL_STAGE=after` passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none
	- Interaction path checks passed for filters, report detail modal, and approve transition
- Regression guard: reran maintenance cost-approvals `VAL_STAGE=after` after service-reports extraction (2/2 desktop + mobile pass).
- Completed remaining section extraction by adding dashboard-scoped components:
	- `maintenance-dashboard-overview`
	- `maintenance-fault-tickets`
	- `maintenance-service-records`
	- `maintenance-service-warranty`
	- `maintenance-notifications`
- Completed remaining modal extraction one-modal-per-component:
	- `maintenance-ticket-details-modal`
	- `maintenance-warranty-details-modal`
	- `maintenance-service-schedule-modal`
	- `maintenance-add-service-record-modal`
- Replaced all remaining inline section/modal markup in `pages/dashboard/maintenance/index.html` with component hosts and script includes.
- Reduced `pages/dashboard/maintenance/script.js` to orchestration-only delegates, modal helpers, toast bridge, and bootstrap.
- Validation evidence (`testing/ui-validation/maintenance-remaining-sections/validate-maintenance-remaining-sections.spec.js`):
	- Before run: `VAL_STAGE=before` passed (2/2 desktop + mobile)
	- After run: `VAL_STAGE=after` passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none
	- Interaction path checks passed for fault-ticket filters/modal, service-record tabs, service-warranty filters/modal, add-service flow, and notifications filters/actions
- Post-completion regression guards:
	- `maintenance-cost-approvals` `VAL_STAGE=after`: 2/2 passed (desktop + mobile)
	- `maintenance-service-reports` `VAL_STAGE=after`: 2/2 passed (desktop + mobile)

### SysAdministration componentization completed (April 12, 2026)
- Extracted the remaining inline SysAdministration sections into dashboard-scoped components under `pages/dashboard/sysadministration/components/`:
	- `sa-petty-cash-config.js`
	- `sa-notifications-config.js`
	- `sa-system-logs.js`
	- `sa-activity-tracking.js`
- Replaced the corresponding inline section markup in `pages/dashboard/sysadministration/index.html` with component hosts.
- Added script includes for the four new components and added a parent bridge in `pages/dashboard/sysadministration/script.js` for `sa-ui:toast` events.
- Added dedicated validation script `testing/ui-validation/sysadmin-dashboard/validate-sysadmin-dashboard.spec.js`.
- Validation evidence:
	- Before run: `VAL_STAGE=before` passed (2/2)
	- After run: `VAL_STAGE=after` passed (2/2)
	- Console warnings/errors: none (desktop + mobile)
	- Failed network requests: none (desktop + mobile)
	- Interaction summary parity preserved (`activeSection=activity-tracking`, `visibleLogs=1`, `visibleActiveUsers=1`)
- Performed follow-up root-script cleanup pass: removed obsolete globals for petty cash, notifications templates, system logs, and activity tracking from `pages/dashboard/sysadministration/script.js` after section extraction.
- Re-validated after cleanup with `VAL_STAGE=after` (2/2 passed; console warnings/errors: 0; failed requests: 0).
- Completed one-modal-per-component page modal extraction for SysAdministration by replacing inline modal blocks with modal component hosts and dedicated files under `pages/dashboard/sysadministration/components/page-modals/`.
- Added a dedicated `sa-edit-user-modal` component and removed dynamic edit-modal construction from parent script.
- Updated `sa-user-accounts` + `sa-service-config` to component-local event handling and removed inline handlers from section markup and dynamic user-row rendering.
- Removed obsolete user dropdown/filter/service global handlers from parent script and retained shared orchestration bridges (`sa-ui:toast`, modal utilities, user detail bridge).
- Validation evidence for this pass:
	- Before run: `VAL_STAGE=before` passed (2/2)
	- After run: `VAL_STAGE=after` passed (2/2)
	- Console warnings/errors: none (desktop + mobile)
	- Failed network requests: none (desktop + mobile)
	- Interaction summary parity unchanged (`activeSection=activity-tracking`, `visibleLogs=1`, `visibleActiveUsers=1`)
- Completed final TASK012 root-script decomposition by moving user-management API/edit/reset/delete/detail flows from parent script into `sa-user-accounts`.
- Parent SysAdministration script is now orchestration-only (toast bridge, modal helpers, overview navigation bridge, compatibility user-details fallback).
- Final validation evidence for completion pass:
	- `VAL_STAGE=after` passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none
	- Interaction summary parity unchanged (`activeSection=activity-tracking`, `visibleLogs=1`, `visibleActiveUsers=1`)

### Auction dashboard componentization completed (April 12, 2026)
- Completed full Auction dashboard section extraction into dashboard-scoped components under `pages/dashboard/auction/components/`:
	- `dashboard-overview.js`
	- `active-auctions.js`
	- `assets.js`
	- `bidders.js`
	- `schedule.js`
	- `reports.js`
- Completed one-modal-per-component decomposition under `pages/dashboard/auction/components/page-modals/`:
	- `create-auction-modal.js`
	- `register-bidder-modal.js`
	- `schedule-auction-modal.js`
	- `auction-details-modal.js`
	- `auction-bidders-modal.js`
- Replaced inline section and modal markup in `pages/dashboard/auction/index.html` with component hosts and direct section shells for `<ac-layout>`.
- Reduced `pages/dashboard/auction/script.js` to orchestration-only logic (auth/bootstrap, section navigation bridge, toast bridge, modal bridge wiring).
- Added dedicated validation script `testing/ui-validation/auction-dashboard/validate-auction-dashboard.spec.js` with stage-based artifact output (`VAL_STAGE=before` and `VAL_STAGE=after`).
- Validation evidence:
	- Before run: `VAL_STAGE=before` passed (2/2)
	- After run: `VAL_STAGE=after` passed (2/2)
	- Console warnings/errors: none (desktop + mobile)
	- Failed network requests: none (desktop + mobile)
	- Interaction summary parity preserved (`activeSection=reports`, modal states closed, section-visible counts unchanged)

### Dashboard decomposition instruction hardening (April 9, 2026)
- Updated `.github/instructions/component-decomposition-completeness.instructions.md` with mandatory dashboard refactor rules:
  - extract all sections with logic into components
  - extract all modals one-modal-per-component with logic co-location
  - clear main dashboard scripts to orchestration-only after extraction
  - enforce shared-first component decisions before dashboard-specific extraction
  - enforce component placement paths for shared styles/components and dashboard-specific components/modals

### Inventory Manager sidebar notification badge styling fix (April 9, 2026)
- Resolved unstyled Notifications badge in Inventory Manager sidebar by adding shared badge CSS injection in `pages/components/shared/ac-sidebar.js`.
- Root cause: badge markup existed in `<ac-sidebar>` but no shared `.nav-badge` styles were provided outside Technical Officer page-specific stylesheet.
- Verified with Playwright MCP after login:
	- badge rendered with red pill styling (background `rgb(239, 68, 68)`, white text, 20px pill size)
	- no console errors/warnings during validation

### Inventory Manager post-refactor MCP regression fix (April 9, 2026)
- Ran Playwright MCP validation on Inventory Manager dashboard and resolved three regressions:
	- Added `window.API = API` compatibility mapping in `pages/js/api.js` to support extracted components that still reference `window.API`.
	- Added missing `pages/dashboard/inventory-manager/components/notifications/style.css` to remove notifications stylesheet 404.
	- Added idempotent event binding guard in `pages/dashboard/inventory-manager/components/catalog/script.js` to prevent duplicate View modal openings.
- Post-fix MCP validation confirmed:
	- No console errors/warnings
	- No notifications stylesheet 404
	- No "API client is not available" banners in usage-tracking/notifications
	- Single details modal opens per catalog View click

### TO dashboard section visibility regression fix (April 9, 2026)
- Resolved a Technical Officer dashboard regression where sidebar rendered but all content sections were missing.
- Root cause: `ac-layout` `attributeChangedCallback` executed during custom-element upgrade and re-rendered before first mount, clearing light-DOM `<section class="content-section">` children.
- Fix applied in `pages/components/shared/ac-layout.js`:
	- Added first-mount guard (`_isMounted`) to block pre-mount attribute rerenders.
	- Added resilient initial mount flow with bounded animation-frame retries for section capture.
- Verified with browser testing: TO dashboard now loads 7 sections and section switching works again.

### Shared header dropdown styling normalization (April 9, 2026)
- Resolved cross-dashboard profile dropdown styling drift where some dashboards showed an unstyled inline menu.
- Root cause: dropdown CSS existed only in Technical Officer stylesheet while other dashboards retained legacy header styles.
- Fix applied in `pages/components/shared/ac-header.js`:
	- Added shared, prefixed `ac-header` dropdown styles injected once into `document.head`.
	- Standardized trigger/avatar/panel/item styles and panel positioning (`position:absolute`, fixed width, elevated z-index).
- Verified with browser testing in SysAdministration and Technical Officer dashboards: dropdown now renders as a styled floating panel consistently.

### Shared header profile hydration fix (April 9, 2026)
- Resolved profile dropdown placeholder issue where many dashboards showed `Loading...` with empty role/employee ID.
- Root cause: some dashboards relied on page-specific bootstrap and did not consistently call user header update paths.
- Fix applied in `pages/components/shared/ac-header.js`:
	- Added component-level user hydration from Auth/localStorage with fallback live auth check.
	- Persisted hydrated user state across header rerenders.
	- Hardened dropdown listener lifecycle to avoid repeated global listener buildup.
- Verified with browser testing:
	- Technical Officer shows `Technical Officer One / Technical Officer / LITRO-TECHOFFICER-001`.
	- SysAdministration shows `Admin User / Admin / LITRO-ADMIN-001`.

## Recent Changes (April 6, 2026)

### TASK003 + TASK016 + Program task sync (latest session)
- Updated `testing/openapi.yaml` for budget/work-update correctness:
  - Added explicit `minimum: 0.01` constraints for `total_amount` in budget create/update payloads.
  - Added Ticket Work Updates API docs (`/ticket-work-updates`, `/ticket-work-updates/ticket/{id}`, `/ticket-work-updates/latest/{id}`), including 400 pending-budget error example.
- Attempted migration status check via `php scripts/migrate.php status`; blocked in sandbox with DB connection refused.
- Bootstrapped previously empty Transportation Manager dashboard:
  - Added `pages/dashboard/transportation-manager/index.html` with shared `<ac-layout>` shell and baseline section map.
  - Added `pages/dashboard/transportation-manager/script.js` auth/bootstrap via `DashboardInit` and section-change URL synchronization.
  - Added first component scaffold `pages/dashboard/transportation-manager/components/dashboard-overview/script.js` defining `<transport-overview>`.
  - Added baseline `style.css` for shell placeholders/loading state.
- Updated memory task tracking:
  - TASK004 marked Completed (program orchestration finalized)
  - TASK016 marked Completed (dashboard bootstrap complete)
  - TASK018 marked Completed (program decomposition complete; execution delegated to TASK019–TASK027)
  - TASK003 moved to In Progress (OpenAPI done; migration confirmation blocked by environment DB availability)

### Budget Step Fixes
1. **`BudgetReportController.php`** — `create()` and `update()` now reject `total_amount <= 0` (changed from `< 0`). Error message: "Total amount must be greater than zero".
2. **`TicketWorkUpdateController.php`** — Added `BudgetReport` model dependency. Before creating a work update, checks latest budget report for the ticket: if status is `pending`, returns 400 "Cannot submit work update: the budget report for this ticket is still pending approval."
3. **`fault-ticket-detail/script.js`** `renderBudgetStep()` — When `total_amount` is 0 or missing, displays `—` instead of `LKR 0.00`.

### TecFaultRepairTicketController.php errors fixed
- Replaced all `Response::badRequest()` calls with `Response::error('…', 400)` — `badRequest()` does not exist on the `Response` helper.

### Instructions file fix
- `memory_bank_instructions.md` renamed to `memory_bank.instructions.md` so VS Code Copilot detects it.

## Active Decisions
- Budget `approved`/`rejected` both move ticket back to `Assigned` (intentional — technician proceeds from assigned state after review)
- `petty_cash_limit` is a `SystemSetting` value (seeded at 50000.00); drives `approval_level` (supervisor / maintenance_manager)
- Budget-flow notifications now use assignment ownership for supervisor-level budget events and retain safe role-broadcast fallback when ownership resolution is unavailable.

### TO Dashboard UI Polish (latest session)
- Removed **Recent Activities** section from dashboard
- Added **Notifications** nav item with red `.nav-badge` (actionable-count only)
- Added Notifications content section with `loadNotifications()` in `script.js`
- Stripped box/shadow wrapper from `.content-section` (now transparent on stone-100 bg)
- Bumped `.main-content` padding to `40px 30px 30px 36px`
- Documented full TO dashboard stylesheet into `.agent_memory/dashboard-styling-guide.md` for reuse across other role dashboards

### Shared modal + form componentization (latest session)
- Added shared components: `ac-modal`, `ac-input-group`, `ac-form-control`
- Refactored TO **Create New Repair Ticket** modal to use those shared components
- Moved component styling into component internals using shadow DOM + Constructable Stylesheets (no dashboard CSS dependency)
- Kept existing JS integration (`document.getElementById(...).value`, required toggles) compatible via `control-id` host mapping in `<ac-form-control>`
- Updated `web-components.instructions.md` with Rule 10 and component table entries for modal/form components

### Incremental TO component extraction (latest session)
- Extracted first dashboard-scoped component: `pages/dashboard/technical-officer/components/create-fault-ticket/`
	- `script.js` defines `<create-fault-ticket>` with shadow DOM, local state, event handling, and style.css loading
	- `style.css` encapsulates button, modal, and form styling for this section
- Replaced in-page create-ticket trigger/modal HTML with `<create-fault-ticket>` tag in `technical-officer/index.html`
- Removed create-ticket form/toggle logic from monolithic `technical-officer/script.js`
- Added parent orchestration listener (`bindCreateFaultTicket`) using custom event `create-fault-ticket-created`

### TO notifications extraction slice (latest)
- Added `pages/dashboard/technical-officer/components/notifications/script.js` with `<to-notifications>` component.
- Replaced inline notifications section markup with `<to-notifications>` in `technical-officer/index.html`.
- Moved notifications rendering and badge updates from parent monolith into component.
- Added parent bridge methods in `technical-officer/script.js`:
	- `bindTONotifications()` for event wiring
	- `refreshTONotifications()` for refresh + user context
- Added auto-refresh hook when navigating to notifications section.
- Removed legacy `loadNotifications()` from parent script and validated syntax/diagnostics.

### TO inventory extraction slice (latest)
- Added `pages/dashboard/technical-officer/components/inventory/script.js` with `<to-inventory>` component.
- Replaced inline inventory section markup in `technical-officer/index.html` with `<to-inventory>` and loaded the new script.
- Moved inventory loading/filtering/details modal behavior into the component, including backend-aligned parsing for `/vehicles` and `/machines` responses.
- Added parent bridge methods in `technical-officer/script.js`:
	- `bindTOInventory()` for component error-to-toast wiring
	- `refreshTOInventory()` for startup and section activation refresh
- Removed stale inventory monolith logic and duplicate inventory helper definitions from parent script.
- Validation: `node --check` and diagnostics passed for touched TO files.

### TO feedback extraction slice (latest)
- Added `pages/dashboard/technical-officer/components/feedback/script.js` with `<to-feedback>` component.
- Replaced inline feedback section markup in `technical-officer/index.html` with `<to-feedback>` and removed the legacy feedback modal markup from page-level HTML.
- Moved feedback modal open/close and submit behavior into the component with local event handling.
- Added parent bridge method `bindTOFeedback()` in `technical-officer/script.js` to convert component submit events into global toast notifications.
- Removed old parent `assetFeedbackForm` submit listener and validated syntax/diagnostics.

### TO service-warranty extraction slice (latest)
- Added `pages/dashboard/technical-officer/components/service-warranty/script.js` with `<to-service-warranty>` component.
- Replaced inline service-warranty section markup in `technical-officer/index.html` with `<to-service-warranty>` and removed page-level warranty modal markup.
- Moved warranty modal open/close, filter state handling, and submit behavior into the component.
- Added parent bridge method `bindTOServiceWarranty()` in `technical-officer/script.js` to convert component submit events into global toast notifications.
- Removed legacy parent `filterWarrantyByStatus()` and `warrantyClaimForm` listener and validated syntax/diagnostics.

### TO spare-parts extraction slice (latest)
- Added `pages/dashboard/technical-officer/components/spare-parts/script.js` with `<to-spare-parts>` component.
- Replaced inline spare-parts section markup in `technical-officer/index.html` with `<to-spare-parts>`.
- Added parent bridge methods `bindTOSpareParts()` + `refreshTOSpareParts()` in `technical-officer/script.js` so component actions still open the existing `requestPartsModal` flow.
- Removed legacy parent section filter handler `filterPartsByStatus()`.
- Validation: `node --check` and diagnostics passed for touched TO files.

### TO tickets extraction slice (latest)
- Added `pages/dashboard/technical-officer/components/tickets/script.js` with `<to-tickets>` component.
- Replaced inline tickets section markup in `technical-officer/index.html` with `<to-tickets>` and loaded the component script.
- Expanded `<to-tickets>` so ticket rendering/filtering and action click dispatch are component-owned (`renderTickets`, `applyFilter`, loading/error/empty states).
- Updated parent bridges in `technical-officer/script.js` to consume component ticket events (`view-ticket`, `request-spare-parts`, `start-work`, `update-work`) and call existing workflow handlers.
- Updated `loadTickets()` and `renderTickets()` to use tickets component APIs directly.
- Removed duplicate parent filter wiring; filter state is now owned by the tickets component.
- TASK006 is now complete and moved to Completed in task index.
- Validation: `node --check` and diagnostics passed for touched TO files.

### TO shell + navigation migration slice (latest)
- Replaced TO legacy shell wrapper (`to-shell-header`/`to-shell-sidebar`) with shared `<ac-layout>` in `technical-officer/index.html`, including full nav config and preserved section IDs.
- Updated script include stack to shared shell components (`ac-header`, `ac-sidebar`, `ac-layout`) and removed legacy TO shell include usage on main dashboard.
- Migrated TO script navigation from manual `.nav-item` activation to `<ac-layout>` `section-change` orchestration with query-param URL synchronization and browser history deep-link behavior.
- Migrated auth/bootstrap to `DashboardInit.init('Technical Officer', { updateUserDisplay: true })` and removed manual per-field header user rendering.
- Updated notifications badge updates to write through `ac-layout ac-sidebar` (with legacy fallback), preserving notifications badge behavior after shell migration.
- TASK005 is now complete and moved to Completed in task index.
- Validation: `node --check` and diagnostics passed for touched TO files.

### Supervisor componentization slice (latest)
- Added `pages/dashboard/supervisor/components/asset-status/script.js` defining `<supervisor-asset-status>`.
- Replaced inline asset-status markup in `pages/dashboard/supervisor/index.html` with `<supervisor-asset-status>` and added script include.
- Moved asset-status filtering + dropdown handling into component-owned event delegation and local filter state.
- Added parent bridges in `pages/dashboard/supervisor/script.js`:
	- `bindSupervisorAssetStatus()` for view/update/filter event routing
	- `refreshSupervisorAssetStatus()` for section activation refresh
- Updated `loadSectionData('asset-status')` to use component refresh instead of legacy placeholder loader.
- TASK007 moved to In Progress with first extraction slice completed.
- Validation: `node --check` and diagnostics passed for touched supervisor files.

### Supervisor technicians extraction slice (latest)
- Added `pages/dashboard/supervisor/components/technicians/script.js` defining `<supervisor-technicians>` with component-owned section layout and list state rendering (`setLoading`, `setEmpty`, `setError`, `renderTechnicians`).
- Replaced inline technicians section markup in `pages/dashboard/supervisor/index.html` with `<supervisor-technicians>` and added script include.
- Added parent bridge `bindSupervisorTechnicians()` in `pages/dashboard/supervisor/script.js` to route component `supervisor-technicians:view` events to existing `viewTechnicianDetails(...)` behavior.
- Updated parent `loadTechnicians()` to use component APIs and remove inline `onclick` rendering for technician view actions.
- TASK007 progress advanced with technicians section now extracted; remaining supervisor extractions are checks/tickets/repair and budget.
- Validation: `node --check` and diagnostics passed for touched supervisor files.

### Supervisor budget-approval extraction slice (latest)
- Added `pages/dashboard/supervisor/components/budget-approval/script.js` defining `<supervisor-budget-approval>`.
- Replaced inline budget-approval markup in `pages/dashboard/supervisor/index.html` with `<supervisor-budget-approval>` and added script include.
- Moved budget filter/dropdown/approve/reject UI handling into component-owned event delegation and local state.
- Added parent bridges in `pages/dashboard/supervisor/script.js`:
	- `bindSupervisorBudgetApproval()` for component view/filter/status-change events
	- `refreshSupervisorBudgetApproval()` for section activation refresh
- Updated `loadSectionData('budget-approval')` to refresh component state and hardened legacy `loadBudgets()` with null guard against removed IDs.
- TASK007 progress advanced further; remaining supervisor extractions are checks/tickets/repair sections.
- Validation: `node --check` and diagnostics passed for touched supervisor files.

### Supervisor repair-management extraction slice (latest)
- Added `pages/dashboard/supervisor/components/repair-management/script.js` defining `<supervisor-repair-management>`.
- Replaced inline repair-management markup in `pages/dashboard/supervisor/index.html` with `<supervisor-repair-management>` and added script include.
- Moved repair action/dropdown interactions into component-owned event delegation and custom events.
- Added parent bridges in `pages/dashboard/supervisor/script.js`:
	- `bindSupervisorRepairManagement()` for action routing
	- `refreshSupervisorRepairManagement()` for section activation refresh
- Updated `loadSectionData('repair-management')` to use component refresh bridge.
- Fixed legacy selector mismatch in `loadRepairs()` (`pendingRepairsList` plus null guards) to avoid stale ID runtime errors after section extraction.
- TASK007 now has fault-tickets extracted; daily-check-reports remains the primary pending extraction.
- Validation: `node --check` and diagnostics passed for touched supervisor files.

### Supervisor fault-tickets extraction slice (latest)
- Added `pages/dashboard/supervisor/components/fault-tickets/script.js` defining `<supervisor-fault-tickets>`.
- Replaced inline fault-tickets markup in `pages/dashboard/supervisor/index.html` with `<supervisor-fault-tickets>` and added script include.
- Moved status/source filter controls and create-ticket trigger into component-owned event delegation.
- Added parent bridges in `pages/dashboard/supervisor/script.js`:
	- `bindSupervisorFaultTickets()` for filter/create event routing
	- `refreshSupervisorFaultTickets()` for section activation refresh
- Updated `loadSectionData('fault-tickets')` to use component refresh bridge and hardened fault-ticket loading/error rendering to prefer component APIs.
- Refactored `filterTicketsByStatus` and `filterTicketsBySource` to remove implicit `event` dependency and support component-driven calls.
- Validation: `node --check` and diagnostics passed for touched supervisor files.

### Supervisor daily-check-reports extraction slice (latest)
- Added `pages/dashboard/supervisor/components/daily-check-reports/script.js` defining `<supervisor-daily-check-reports>` and moved weekly-check report loading, filtering, detail display, approve/reject actions, and section state into component-local logic.
- Added one-modal-per-component daily-check modals under `pages/dashboard/supervisor/components/page-modals/`:
	- `report-details-modal/script.js`
	- `rejection-reason-modal/script.js`
- Replaced inline daily-check section and page-level report/rejection modal markup in `pages/dashboard/supervisor/index.html` with component hosts and script includes.
- Updated `pages/dashboard/supervisor/script.js` to orchestration-only daily-check bridges (`bindSupervisorDailyCheckReports`, `refreshSupervisorDailyCheckReports`) and removed legacy daily-check modal/report handlers from parent scope.
- UI validation evidence:
	- Baseline artifacts: `testing/ui-validation/supervisor-daily-check-reports/before-desktop.json` and `before-mobile.json`.
	- Post-change run: `VAL_STAGE=after npx playwright test testing/ui-validation/supervisor-daily-check-reports/validate-daily-check.spec.js --reporter=line`.
	- Results: 2/2 tests passed; console warnings/errors = 0; failed network requests = 0; active section remained `daily-check-reports`; modal interaction succeeded on desktop + mobile (`modalOpened: true`).
- TASK007 is now complete.

## Next Steps
- Run pending migration `047_create_system_settings_and_budget_approval.php`
- Update `testing/openapi.yaml` with any API changes from budget fixes
- Verify frontend budget-step form validates `total_amount > 0` before submitting
- Use `dashboard-styling-guide.md` as template when building Supervisor / Manager / Admin dashboards

### Dashboard Refactor Backlog Setup (latest session)
- Completed full dashboard analysis (sections, script size, shell pattern, event density, script bootstraps)
- Created agent-memory tasks `TASK004` to `TASK016` covering:
	- Program coordination
	- Per-dashboard section componentization tasks
	- Cross-cutting inline-event migration and bootstrap normalization
	- Transportation Manager dashboard bootstrap
- Created matching Beads epic `assetcare-backend-new-t2k` and linked 12 child parent-child issues for execution tracking

### Inventory Manager execution slice (completed)
- Completed section-by-section extraction for all 8 Inventory Manager sections:
	- `dashboard-overview`
	- `machines`
	- `vehicles`
	- `catalog`
	- `sparepart-addition`
	- `orders-approvals`
	- `usage-tracking`
	- `notifications`
- Replaced inline Sparepart Addition section markup with `<inventory-sparepart-addition>` and removed inline handler usage.
- Added parent action/refresh bridge for addition events (`bindSparepartAddition`, `refreshSparepartAddition`).
- Removed legacy Sparepart Addition load/filter/render monolith logic and redirected post-save/delete refreshes through component APIs.
- Inventory Manager monolith script reduced from `3580` to `2672` lines (about 25% reduction) while preserving existing modal workflows.

### Dashboard bootstrap normalization slice (completed)
- Claimed and completed bootstrap normalization task for dashboard entrypoints.
- Fixed include order mismatch in `pages/dashboard/machinery-operator/index.html` (`config` → `api` → `auth` → `utils`).
- Removed duplicate `config.js` include from `pages/dashboard/maintenance/index.html`.
- Corrected style dependency load order in `pages/dashboard/technical-officer/index.html` (shared style modules now load before `create-fault-ticket`).
- Standardized auth redirect paths to `CONFIG.ROUTES.LOGIN` in Inventory Manager and TO fault-ticket-detail scripts.
- Ran syntax and diagnostics checks on changed files; no errors.
- Transportation Manager dashboard remains intentionally empty and is tracked under TASK016.

### Completed-dashboard quality remediation (latest)
- Renamed completed section component folders, custom-element tags, and bridge helper names to remove `-model` suffixes in Inventory Manager and TO create-ticket.
- Added `pages/dashboard/inventory-manager/components/page-modals/script.js` and moved popup modal HTML out of `inventory-manager/index.html` into `<inventory-page-modals>`.
- Migrated large catalog and sparepart-addition modal/action logic block from `inventory-manager/script.js` into `components/page-modals/script.js` to reduce section-specific monolith code.
- Follow-up decomposition completed: replaced monolithic `<inventory-page-modals>` with one-modal-per-component hosts and added dedicated modal component files for add/edit/delete/reorder/add-stock.
- Follow-up compliance pass completed: moved spare-part modal handlers/feature logic from shared `components/page-modals/script.js` into the matching per-modal component files so UI and behavior are co-located.
- Additional decomposition completed: extracted remaining machine/vehicle modal workflows from shared `components/page-modals/script.js` into dedicated scripts (`machine-form`, `machine-details`, `vehicle-form`, `vehicle-details`, `vehicle-mileage`).
- Verified dashboard codebase has no remaining `*-model` component/tag usage (`pages/dashboard/**`).
- Ran diagnostics and syntax checks on touched Inventory Manager and TO files; no errors.

### RabbitMQ event architecture backlog setup (latest)
- Created new implementation program task `TASK018` plus execution tasks `TASK019` to `TASK027` in `.agent_memory/tasks/`.
- Created Beads epic `assetcare-backend-new-lm7` for event-driven architecture and linked child issues:
	- `assetcare-backend-new-de6` (event contract)
	- `assetcare-backend-new-506` (publisher integration)
	- `assetcare-backend-new-042` (event emission points)
	- `assetcare-backend-new-2jm` (audit consumer)
	- `assetcare-backend-new-7i9` (notification consumer)
	- `assetcare-backend-new-1cp` (scheduler producer)
	- `assetcare-backend-new-1ew` (notifications API)
	- `assetcare-backend-new-6qe` (frontend integration)
	- `assetcare-backend-new-81v` (reliability hardening)
- Added parent-child and blocks dependencies in Beads to enforce practical implementation order.

### RabbitMQ event architecture implementation (latest)
- Implemented TASK018–TASK027 end-to-end:
	- Added composer dependency `php-amqplib/php-amqplib` and RabbitMQ env/config constants.
	- Added event contract layer (`DomainEvents`, `EventEnvelope`) and reusable backend `EventPublisher`/`EventEmitter`.
	- Added migration `048_create_event_pipeline_tables.php` (`event_audit_logs`, `notifications`, `processed_events`, `service_due_event_locks`).
	- Wired event emission into machine/vehicle creation, fault ticket create/assign, budget report create/review, and spare-part request create/approve/reject.
	- Added workers `scripts/consume_audit_events.php` and `scripts/consume_notification_events.php` with manual ack/nack, idempotency checks, and DLQ exchange binding.
	- Added scheduled producer `scripts/check_service_due.php` for `ASSET_SERVICE_DUE_SOON` events with duplicate suppression locks.
	- Added notifications API (`GET /api/notifications`, `POST /api/notifications/read`) and Technical Officer dashboard integration for API-backed notification rendering and mark-as-read.
