# Active Context

## Current Focus
Dashboard Web Components refactor execution — finishing Inventory Manager section extraction and monolith cleanup, then rolling the same pattern into remaining dashboards.

## Recent Changes (April 6, 2026)

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
