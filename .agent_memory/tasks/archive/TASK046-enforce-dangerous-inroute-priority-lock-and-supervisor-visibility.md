# [TASK046] - Enforce Dangerous In-Route Priority Lock and Supervisor Visibility

**Status:** Completed  
**Added:** 2026-04-17  
**Updated:** 2026-04-17

## Original Request
Implement two behaviors for dangerous-cargo in-route breakdowns:
1. Lock priority to maximum when a driver reports an in-route breakdown while transporting dangerous cargo.
2. Ensure supervisors can clearly see that related fault tickets come from dangerous-cargo in-route breakdowns.

## Thought Process
- Backend must be the source of truth for safety-critical priority enforcement, not only frontend UX controls.
- Driver modal UX should still communicate and enforce the lock to prevent confusion and reduce accidental low-priority submissions.
- Supervisor visibility should not depend only on client-side report merge logic; fault-ticket API payloads should carry dangerous context consistently.

## Implementation Plan
- Enforce/normalize route breakdown severity in backend create/update logic and force `critical` when dangerous context is active.
- Add/keep frontend lock behavior in driver in-route breakdown modal with clear notice.
- Enrich fault-ticket formatting for route-breakdown tickets with dangerous-cargo context.
- Validate with targeted Playwright flow and syntax checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Trace dangerous-cargo route breakdown and fault-ticket flows | Complete | 2026-04-17 | Confirmed existing trip dangerous detection and partial ticket escalation path. |
| 1.2 | Enforce backend route-breakdown severity lock | Complete | 2026-04-17 | `RouteBreakdownController` now normalizes severity and forces `critical` for dangerous context on create/update. |
| 1.3 | Add driver modal lock UX | Complete | 2026-04-17 | Driver in-route modal now auto-locks urgency to critical for active dangerous trips and shows lock notice. |
| 1.4 | Ensure supervisor-visible dangerous context in ticket payload | Complete | 2026-04-17 | `FaultTicketService::formatTicket` enriches route-breakdown tickets with dangerous flags/summary/trip id. |
| 1.5 | Run validation checks | Complete | 2026-04-17 | Playwright after-stage cargo lifecycle spec passed; PHP lint passed for touched backend files. |

## Progress Log
### 2026-04-17
- Implemented backend severity normalization + dangerous-cargo critical lock in route breakdown create/update pathways.
- Implemented driver modal dangerous-cargo lock UX (`critical` + disabled severity selector + contextual notice).
- Hardened fault-ticket formatting to consistently expose dangerous-cargo context for route-breakdown tickets.
- Updated cargo lifecycle Playwright validation to assert in-route dangerous-cargo priority lock behavior.
- Validation evidence:
  - `VAL_STAGE=after npx playwright test transportation-cargo-lifecycle/validate-transportation-cargo-lifecycle.spec.js --reporter=line` (pass: 1/1)
  - `php -l app/controllers/RouteBreakdownController.php` (pass)
  - `php -l app/services/FaultTicketService.php` (pass)
