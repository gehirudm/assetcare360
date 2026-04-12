# Active Context

## Current Focus
Dashboard Web Components refactor execution — TASK007, TASK012, and TASK013 are now complete; next pending dashboard decomposition work is TASK009/TASK010/TASK011/TASK014. Event architecture execution has moved from program setup (TASK018) into implementation slices (TASK019+).

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
- Budget-flow notifications are deferred for now with interim routing to all supervisors and maintenance managers; future routing should target only the supervisor responsible for the assigned Technical Officer (tracked in TASK032)

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
