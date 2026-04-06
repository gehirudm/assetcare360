# Active Context

## Current Focus
Budget step correctness — ensuring fault tickets cannot progress to work-in-progress while budget approval is pending, and that the UI displays sensible values when no/zero budget is set.

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

### Incremental TO model extraction (latest session)
- Extracted first dashboard-scoped component: `pages/dashboard/technical-officer/components/create-fault-ticket-model/`
	- `script.js` defines `<create-fault-ticket-model>` with shadow DOM, local state, event handling, and style.css loading
	- `style.css` encapsulates button, modal, and form styling for this model section
- Replaced in-page create-ticket trigger/modal HTML with `<create-fault-ticket-model>` tag in `technical-officer/index.html`
- Removed create-ticket form/toggle logic from monolithic `technical-officer/script.js`
- Added parent orchestration listener (`bindCreateFaultTicketModel`) using custom event `create-fault-ticket-created`

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

### Inventory Manager execution slice (current)
- Claimed Inventory Manager componentization issue and started section-by-section extraction.
- Extracted Notifications section into `pages/dashboard/inventory-manager/components/notifications-model/`.
- Replaced inline notifications HTML handlers with custom-event contracts (`reorder`, `view-part`, `view-order`, `count-change`).
- Removed notification-specific helpers from the Inventory Manager monolith (`dismissNotification`, `quickApprove`, `quickReject`, `viewRequest`, `configureAlerts`, `viewAllActivities`, `approveAllOrders`).
- Extracted Dashboard Overview section into `pages/dashboard/inventory-manager/components/dashboard-overview-model/`.
- Replaced inline dashboard summary/activity markup with `<inventory-dashboard-overview-model>` and moved metric/activity refresh into the component.
- Added parent wiring for overview navigation events and removed legacy dashboard functions (`loadDashboardData`, `updateUrgentItems`, `updateRecentActivity`).
- Extracted Usage Tracking section into `pages/dashboard/inventory-manager/components/usage-tracking-model/` with component-scoped search/table/modal logic.
- Replaced inline usage section markup with `<inventory-usage-tracking-model>` and switched section load to `refreshUsageTrackingModel()`.
- Removed usage-specific monolith handlers (`loadUsageTracking`, `filterUsageTable`, `openIssueModal`, `viewUsageDetails`, `editUsageRecord`, `deleteUsageRecord`, `generateMachineReport`, usage/report form listeners).
- Extracted Orders & Approvals section into `pages/dashboard/inventory-manager/components/orders-approvals-model/` with component-owned approval/rejection workflows and details modal.
- Replaced inline orders section markup with `<inventory-orders-approvals-model>` and removed legacy orderActionModal from page HTML.
- Added `refreshOrdersApprovalsModel()` parent bridge that sets currentUser and calls component refresh.
- Fixed notification-to-orders navigation to trigger component `viewOrderDetails()` method.
- Removed 15 order management functions (470 lines) and global state variables (`allSparePartRequests`, `currentOrderFilter`).
- Monolithic script reduced from 3580 lines to 3129 lines (12.6% reduction).
- 70% complete; remaining sections: machines, vehicles, catalog, sparepart-addition.
