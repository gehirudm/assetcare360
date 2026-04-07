# Active Context

## Current Focus
Dashboard Web Components refactor execution — TASK007 remains active; TASK016 baseline bootstrap is now complete. Event architecture execution has moved from program setup (TASK018) into implementation slices (TASK019+).

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
