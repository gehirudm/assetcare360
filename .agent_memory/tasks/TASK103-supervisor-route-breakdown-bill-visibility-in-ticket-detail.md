# [TASK103] - Supervisor Route Breakdown Bill Visibility in Ticket Detail

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- In route breakdown tickets, the Driver-submitted garage bill is not visible in the Supervisor's View Fault Ticket Details page.

## Thought Process
- Backend route breakdown workflow already persists and returns bill data (`bill_amount`, `bill_image_path`, `completion_remarks`) in `RouteBreakdownController`.
- The shared ticket detail page (`pages/view-ticket`) loads route context but currently does not render garage completion bill details in the flow UI.
- Safest fix is to add route-specific completion bill rendering in the resolved step without altering non-route ticket behavior.

## Implementation Plan
- Add route-garage completion bill UI block to resolved step in `pages/view-ticket/index.html`.
- Add script helpers and rendering logic in `pages/view-ticket/script.js` to read bill fields from `routeBreakdownContext`/`garage_workflow` and display amount, remarks, bill image link/preview.
- Add focused Supervisor Playwright regression spec under `testing/ui-validation/supervisor-fault-ticket-tracking`.
- Run the new validation spec and capture pass/fail evidence.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Confirm backend bill data availability | Complete | 2026-04-20 | Verified route workflow includes bill fields in controller responses. |
| 1.2 | Render bill details in shared ticket detail UI | Complete | 2026-04-20 | Added resolved-step bill card, remarks, bill link, and preview rendering for route breakdown completion context. |
| 1.3 | Add supervisor UI regression validation | Complete | 2026-04-20 | Added focused supervisor ticket-detail Playwright coverage for route bill visibility. |
| 1.4 | Run validation and finalize memory sync | Complete | 2026-04-20 | Targeted route-bill visibility suite passed on desktop/mobile; memory synced. |

## Progress Log
### 2026-04-20
- Created TASK103 for Supervisor route breakdown bill visibility issue.
- Confirmed backend availability of bill fields in route breakdown workflow responses.
- Identified rendering gap in `pages/view-ticket` shared flow UI as likely root cause.

### 2026-04-20 (Completion)
- Updated `pages/view-ticket/index.html`:
	- added route-garage completion bill section in Step 6 (Resolved) with amount, completed-at/by, remarks, bill image link, and image preview placeholders.
	- added `step6-resolver-role` id for dynamic resolver role labeling.
- Updated `pages/view-ticket/script.js`:
	- added route completion data helpers (`getRouteGarageCompletionDetails`, same-origin bill-image URL resolver, LKR formatter).
	- added `renderRouteGarageCompletionSection(...)` and integrated it into `renderResolvedStep(...)`.
	- Step 6 now renders route completion details when route workflow is completed and falls back cleanly for non-route tickets.
- Added `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-ticket-detail-route-bill-visibility.spec.js`:
	- asserts Supervisor detail view displays Driver-submitted bill amount, remarks, completed-by role, bill image link, and bill image preview.
	- validates both desktop and mobile viewports.
- Validation:
	- `cd testing/ui-validation && npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-ticket-detail-route-bill-visibility.spec.js --reporter=line` passed (2/2).
	- Additional regression check `validate-supervisor-fault-ticket-tracking.spec.js` currently fails due pre-existing missing component locator (`supervisor-fault-ticket-tracking`) in both viewport tests, unrelated to this route-bill rendering change.
