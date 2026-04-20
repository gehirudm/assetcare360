# TASK080 - Reset Route Breakdown Sequence and Unify Supervisor View-Ticket Garage Approval Form

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
- New route breakdown IDs should restart from `RBD-001` across dashboards.
- In Supervisor View Ticket, clicking `Approve Nearby Garage` should open the same form behavior used by the three-dots action.

## Thought Process
The backend was still deriving `route_breakdown_id` from the table row id, so IDs could continue from high numbers after data cleanup. The View Ticket modal also used an older radio-list form shape, which differed from the supervisor dropdown-based approval experience. The fix needed a safe sequence generator under concurrency and a UI-form parity update in shared ticket detail.

## Implementation Plan
- [x] Replace route-breakdown code generation with sequence-by-existing-RBD logic that starts at `RBD-001` when no RBD rows exist.
- [x] Add locking around code generation to prevent duplicate IDs under concurrent creates.
- [x] Update View Ticket garage approval form markup/logic to align with supervisor flow style (meta card + garage dropdown + map sync).
- [x] Re-run targeted syntax and UI validation, then update memory/task records.
- [x] Harden View Ticket to always prefer supervisor garage-approval modal component for parity with three-dots action.
- [x] Restore previous local View Ticket modal for clarity in standalone supervisor ticket view.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 80.1 | Implement safe RBD sequence generation | Complete | April 20, 2026 | Added advisory lock + `generateNextRouteBreakdownCode()` to issue `RBD-001` when sequence is empty. |
| 80.2 | Align View Ticket approval modal form | Complete | April 20, 2026 | Switched fallback modal to dropdown-based garage selection with shared breakdown meta context. |
| 80.3 | Validate syntax and UI behavior | Complete | April 20, 2026 | PHP lint, JS syntax check, diagnostics clean, Playwright after-stage spec passed (`transportation-manager-garages`). |
| 80.4 | Enforce supervisor modal parity in View Ticket | Complete | April 20, 2026 | View Ticket now opens `supervisor-garage-approval-modal` first (same modal as three-dots action) and keeps local fallback only as backup. |
| 80.5 | Restore previous popup clarity path | Complete | April 20, 2026 | Reverted standalone View Ticket supervisor popup to previous local modal (clear layout), while keeping dashboard callback path for supervisor modal in embedded flow. |

## Progress Log
### April 20, 2026
- Updated `app/controllers/RouteBreakdownController.php` create flow to acquire/release advisory sequence lock (`route_breakdown_id_sequence`) and generate RBD codes using max existing `RBD-###` value instead of row id.
- Added helper methods:
  - `acquireRouteBreakdownIdLock(...)`
  - `releaseRouteBreakdownIdLock()`
  - `generateNextRouteBreakdownCode()`
- Updated `pages/view-ticket/index.html` garage approval modal structure:
  - added hidden breakdown id field.
  - added summary meta section.
  - replaced radio-list garage chooser with `#garageApprovalSelect` dropdown.
- Updated `pages/view-ticket/script.js` to:
  - build a normalized breakdown payload for approval context.
  - render breakdown meta details in modal.
  - keep dashboard callback delegation when available.
  - drive map selection from dropdown and submit selected garage id from dropdown.
- Updated `testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` to match dropdown-based supervisor approval flow and to mock `/api/garages` consistently.
- Validation evidence:
  - `php -l app/controllers/RouteBreakdownController.php` passed.
  - `node --check pages/view-ticket/script.js` passed.
  - diagnostics clean for touched backend/frontend files.
  - `VAL_STAGE=after npx playwright test transportation-manager-garages/validate-transportation-manager-garages.spec.js` passed (`2/2`).

### April 20, 2026 (follow-up parity hardening)
- Addressed user follow-up that Supervisor `View Ticket -> Approve Nearby Garage` should open the exact same form as the three-dots ticket action.
- Updated `pages/view-ticket/script.js` to prefer opening `supervisor-garage-approval-modal` component before local fallback and to bind modal success/toast events.
- Updated `pages/view-ticket/index.html` to mount and load supervisor garage-approval modal component for standalone View Ticket usage.
- Updated `testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` supervisor assertions to target the component modal path.
- Validation evidence:
  - `node --check pages/view-ticket/script.js` passed.
  - `node --check testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` passed.
  - `VAL_STAGE=after npx playwright test transportation-manager-garages/validate-transportation-manager-garages.spec.js --reporter=line` passed (`2/2`).

### April 20, 2026 (follow-up popup clarity restore)
- Addressed additional user report that Supervisor `View Ticket -> Approve Nearby Garage` popup looked unclear.
- Restored previous clear standalone View Ticket modal path:
  - removed standalone injection/use of `supervisor-garage-approval-modal` from `pages/view-ticket/index.html`.
  - removed standalone component-modal preference and event-binding logic from `pages/view-ticket/script.js`.
  - retained dashboard callback delegation (`onRequestGarageApproval`) so embedded Supervisor dashboard flow continues using dashboard modal.
- Updated `testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` back to View Ticket local modal selectors.
- Validation evidence:
  - `node --check pages/view-ticket/script.js` passed.
  - `node --check testing/ui-validation/transportation-manager-garages/validate-transportation-manager-garages.spec.js` passed.
  - `VAL_STAGE=after npx playwright test transportation-manager-garages/validate-transportation-manager-garages.spec.js --reporter=line` passed (`2/2`).
