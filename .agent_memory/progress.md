# Progress

## What Works
- ✅ JWT auth with HTTP-only cookies; login/logout flow
- ✅ Role-based access control (7 roles)
- ✅ API request logging with analytics (Admin)
- ✅ User management (CRUD, search, filters, force-password-change)
- ✅ Machine & vehicle inventory management
- ✅ Spare-parts inventory (additions, usage tracking)
- ✅ Fault ticket system — full lifecycle (Open → Closed)
  - Image uploads (up to 5 per ticket, UUID filenames)
  - Assignment to Technical Officers
  - Budget report submission & approval workflow (petty-cash routing)
  - Spare-part request workflow
  - Ticket work-update record (TO marks work done)
  - Breakdown report linking
- ✅ TecFaultRepairTicket — TO's own repair record per ticket
- ✅ Trip & vehicle check logs (Driver role)
- ✅ Machine weekly checks
- ✅ SystemSetting model + controller (petty_cash_limit, etc.)
- ✅ Technical Officer dashboard (query-param navigation, fault-ticket-detail page)
  - Full dashboard shell (header + sidebar) on detail page
  - Step-by-step ticket flow visualisation (7 steps)
  - Breadcrumb sub-header with icon back-button
- ✅ Shared modal/form components (`ac-modal`, `ac-input-group`, `ac-form-control`)
  - TO "Create New Repair Ticket" modal refactored to component-based structure
  - Component styles encapsulated in shadow DOM (constructable stylesheets), not page stylesheet
- ✅ Technical Officer first model extraction to dashboard component structure
  - Added `components/create-fault-ticket-model/script.js` + `style.css`
  - Removed create-ticket modal-specific logic from monolithic TO script
  - Parent/child communication now event-driven (`create-fault-ticket-created`)
- ✅ Inventory Manager notifications extraction (first TASK008 execution slice)
  - Added `components/notifications-model/script.js` + `style.css`
  - Replaced inline notifications section markup with `<inventory-notifications-model>`
  - Removed notification helpers from monolithic `inventory-manager/script.js`
  - Added event bridge for sidebar badge updates and cross-section actions
- ✅ Inventory Manager dashboard overview extraction (second TASK008 execution slice)
  - Added `components/dashboard-overview-model/script.js` + `style.css`
  - Replaced inline dashboard section markup with `<inventory-dashboard-overview-model>`
  - Added parent event bridge for dashboard section navigation + refresh
  - Removed legacy dashboard functions from monolithic `inventory-manager/script.js`
- ✅ Inventory Manager usage-tracking extraction (third TASK008 execution slice)
  - Added `components/usage-tracking-model/script.js` + `style.css`
  - Replaced inline usage section markup with `<inventory-usage-tracking-model>`
  - Added parent refresh bridge (`refreshUsageTrackingModel`) for section loading
  - Removed legacy usage handlers/listeners from monolithic `inventory-manager/script.js`
- ✅ Inventory Manager orders-approvals extraction (fourth TASK008 execution slice)
  - Added `components/orders-approvals-model/script.js` + `style.css`
  - Replaced inline orders section markup with `<inventory-orders-approvals-model>`
  - Removed legacy orderActionModal from page HTML (now component-internal)
  - Added `refreshOrdersApprovalsModel()` parent bridge with currentUser injection
  - Fixed notification-to-orders navigation to use component `viewOrderDetails()` method
  - Removed 15 order management functions (470 lines) and 2 global state variables
  - Monolithic script reduced from 3580 → 3129 lines (12.6% reduction)
- ✅ 47 database migrations applied

## What's Left / Known Issues
- ⏳ Migration `047` may not have been run yet (pending confirmation)
- ⏳ `testing/openapi.yaml` may be out of date with latest budget/work-update gating changes
- ⏳ Frontend budget-submission form should validate `total_amount > 0` before POSTing
- ⏳ Other role dashboards (supervisor, driver, maintenance, etc.) — status varies
- ⏳ Dashboard Web Components refactor backlog created (agent-memory TASK004–TASK016 + Beads epic/children) and ready for staged execution

## Known Bugs Fixed (this session)
- `Response::badRequest()` used in `TecFaultRepairTicketController` — doesn't exist; replaced with `Response::error('…', 400)`
- Budget step showing `LKR 0.00` when no amount provided
- No backend gate preventing work-update while budget is pending
- Zero-amount budget could be submitted (`total_amount = 0` was accepted)
