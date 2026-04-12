# TASK036 - Supervisor Residual Modal And Monolith Cleanup

**Status:** Pending  
**Added:** April 12, 2026  
**Updated:** April 12, 2026

## Original Request
"Analyze the supervisor dashboard. There are still a few modals left out in the HTML and the JS file is still monolithic, It's either not cleared out from the refactors or it needs to be properly broken into components."

## Thought Process
Supervisor dashboard refactor is partially complete, but high-level analysis shows remaining legacy ownership:
1. `pages/dashboard/supervisor/index.html` still contains inline modal blocks for `createTicketModal`, `assignTicketModal`, and `viewTicketModal`, plus inline handlers (`onclick`, `onsubmit`, `onchange`).
2. `pages/dashboard/supervisor/script.js` remains very large (~3671 lines) with extensive feature logic still in parent scope.
3. Fault-ticket rendering in parent script still generates HTML with inline `onclick` actions rather than component-local event handling.
4. Duplicate function declarations exist in the monolithic script (for example `approveBudget`, `rejectBudget`, `greenLightRepair`, `markAsOutsourced`, `displayDriverReports`, `displayOperatorReports`), indicating stale/overlapping code paths.

## Implementation Plan
- [ ] Extract remaining supervisor modals to one-modal-per-component files under `pages/dashboard/supervisor/components/page-modals/` and replace inline modal markup in `index.html` with component hosts.
- [ ] Move create/assign/view ticket modal logic from parent script into modal components with explicit event contracts.
- [ ] Move fault-ticket row rendering/action handling into `supervisor-fault-tickets` component using delegated `data-action` patterns.
- [ ] Remove inline handlers from supervisor HTML and from parent-script-generated HTML templates.
- [ ] Remove duplicate and dead function declarations from parent script and keep orchestration-only responsibilities (bootstrap, section routing, cross-component bridges).
- [ ] Add or update stage-based validation under `testing/ui-validation/supervisor-dashboard/` (or equivalent scope) to cover ticket list actions + modal flows before/after on desktop and mobile.

## Acceptance Criteria
- `pages/dashboard/supervisor/index.html` contains no inline event handler attributes.
- Create/assign/view ticket modal markup and behavior are componentized one-modal-per-component.
- `pages/dashboard/supervisor/script.js` no longer holds feature-specific modal/ticket rendering logic and has no duplicate function declarations.
- Fault-ticket interaction actions are routed through component events instead of inline `onclick` strings.
- Before/after validation confirms no regressions in ticket filtering, modal open/close, assignment flow, and detail viewing on desktop and mobile.

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 36.1 | Extract create/assign/view ticket modals to page-modals components | Not Started | - | |
| 36.2 | Move fault-ticket rendering/actions into supervisor-fault-tickets component | Not Started | - | |
| 36.3 | Remove duplicate/dead parent-script functions and enforce orchestration-only scope | Not Started | - | |
| 36.4 | Run before/after desktop+mobile UI validation for supervisor ticket flows | Not Started | - | |

## Progress Log
### April 12, 2026
- Task created after confirming residual modal blocks in supervisor HTML and identifying a still-monolithic supervisor parent script with duplicate function declarations and inline action template strings.