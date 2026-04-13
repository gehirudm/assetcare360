# TASK037 - Supervisor Script Monolith Final Decomposition

**Status:** Pending  
**Added:** April 14, 2026  
**Updated:** April 14, 2026

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

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 37.1 | Supervisor ownership audit and move-map | Not Started | April 14, 2026 | Map section/modal logic still in parent script |
| 37.2 | Fault-ticket logic migration from parent | Not Started | April 14, 2026 | Move API/filter/workflow logic to component scope |
| 37.3 | Repair-management + details-modal decomposition | Not Started | April 14, 2026 | Remove sample/TODO parent handlers |
| 37.4 | Budget/asset/technician detail modal extraction | Not Started | April 14, 2026 | One-modal-per-component under page-modals |
| 37.5 | Validation and cleanup | Not Started | April 14, 2026 | Before/after desktop+mobile validation artifacts |

## Progress Log
### April 14, 2026
- Task created from script decomposition analysis request.
- Confirmed parent script remains monolithic due section-specific workflow ownership, placeholder repair handlers, and modal rendering in parent scope.
