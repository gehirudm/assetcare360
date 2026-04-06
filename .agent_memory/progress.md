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
