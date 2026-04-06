# System Patterns

## Architecture
- **PHP REST API** — no framework; custom `Router.php` dispatches to controllers
- **Entry point**: `public/index.php` — loads router, registers all routes
- **Models** extend `BaseModel.php` — handles auto-table creation, basic CRUD
- **Controllers** — thin orchestration; call models, return via `Response` helper
- **Frontend** — vanilla HTML/CSS/JS; each role has a subdirectory under `pages/dashboard/`

## Key Patterns

### Response Helper (`app/helpers/Response.php`)
Centralised static methods — **always use these, never `echo json_encode(...)` directly**:
- `Response::success($data, $message, $statusCode=200)`
- `Response::error($message, $statusCode=400, $errors=null)`
- `Response::unauthorized($message)`
- `Response::forbidden($message)`
- `Response::notFound($message)`
- `Response::validationError($errors, $message)`
- `Response::serverError($message)`
- `Response::json($data, $statusCode)`
- ⚠️ **No `badRequest()` method** — use `Response::error('…', 400)` instead

### Authentication
- JWT stored in HTTP-only cookie (`auth_token`)
- `RoleMiddleware::getCurrentUser()` — returns current user array or `null`
- `RoleMiddleware::requireRole([...])` — halts with 403 if role not in list

### Frontend Auth Flow
- Script load order: `config.js` → `api.js` → `auth.js` → `dashboard-init.js` → page `script.js`
- `Auth.checkAuth()` validates session; `DashboardInit.updateUserInfo(user)` populates header
- All paths are relative to `public/` root; detail pages one level deeper use `../../../js/`

### Migrations
- Located in `migrations/` — numbered `NNN_description.php`
- Run via `scripts/migrate.php` (custom manager)
- **Never modify existing migration files** — always create new numbered ones
- Use `tableExists()` / `columnExists()` helpers for safety
- Latest: `047_create_system_settings_and_budget_approval.php`

### Frontend Navigation (dashboard sub-pages)
- Query-param navigation: `?section=sectionId` → `navigateTo()` / `activateSection()`
- Sub-headers: icon-only back button (`back-icon-btn`) + breadcrumb — **no background on sub-header divs**
- Breadcrumb separators: `color: var(--muted)` (not `--stone-200`)
- Step completed state: `--ok: #16a34a` (overridden in detail page CSS)
- Budget level chip: neutral grey (`var(--stone-200)` bg, `var(--text-700)` fg) — not blue

### Budget Approval Logic
- `BudgetReportController::create()` — validates `total_amount > 0` (rejects `<= 0`)
- `petty_cash_limit` from `SystemSetting` — determines `approval_level`: `supervisor` or `maintenance_manager`
- Budget `pending` → blocks `TicketWorkUpdateController::create()` with 400 error
- Budget `approved`/`rejected` → ticket moves back to `Assigned`

## Component Relationships
```
FaultTicket ←—— BudgetReport (latest per ticket)
FaultTicket ←—— SparePartRequest
FaultTicket ←—— TicketWorkUpdate (one per ticket)
FaultTicket ←—— TecFaultRepairTicket (TO's repair record)
Machine / Vehicle ←—— FaultTicket
User ←—— FaultTicketAssignment
SystemSetting ——→ BudgetReport (petty_cash_limit)
```
