# [TASK124] - TO Ticket Detail Start Work Button and Modal

**Status:** Completed  
**Added:** 2026-04-21  
**Updated:** 2026-04-21

## Original Request
- In Technical Officer dashboard ticket detail view (component-driven view), the **Start Fault Ticket Work** button was missing.
- Reuse the logic and modal pattern from the TO Fault & Repair ticket list section.

## Thought Process
- The TO dashboard detail section (`to-ticket-detail-view`) renders shared assets from `pages/view-ticket/index.html` + `pages/view-ticket/script.js` with TO override styles from `pages/dashboard/technical-officer/view-ticket/style.css`.
- Missing behavior root cause was in shared detail template/runtime: Step 5 had only `Mark as Resolved` action and no start-work modal flow.
- To align with list behavior, start-work should perform the same status transition (`Parts Approved` -> `In Progress`) and provide a start modal collecting initial assessment + estimated completion time.

## Implementation Plan
- Add Step-5 Start Work action and start-work modal to shared detail template.
- Add start-work modal open/close/submit logic in shared detail runtime.
- Show start action only when status is `parts approved` and hide once status becomes `in progress`.
- Ensure TO detail component copies/injects the new modal and applies scoped modal reset rules.
- Extend TO routing Playwright spec to verify the new start-work flow.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add start-work action + modal in template | Complete | 2026-04-21 | Added Step 5 action and `#processTicketModal` in shared `pages/view-ticket/index.html`. |
| 1.2 | Wire runtime logic + visibility rules | Complete | 2026-04-21 | Added `openStartWorkModal/closeStartWorkModal/submitStartWork` and Step-5 display logic in `pages/view-ticket/script.js`. |
| 1.3 | Include modal in TO component/style pipeline | Complete | 2026-04-21 | Added `#processTicketModal` to TO component template node list and TO modal style selectors. |
| 1.4 | Validate before/after UI flow | Complete | 2026-04-21 | Updated Playwright assertions for start-work button/modal and status transition; before/after passed. |

## Progress Log
### 2026-04-21
- Updated `pages/view-ticket/index.html`:
  - added `#start-work-action` button in Step 5 (`Start Fault Ticket Work`).
  - added `#processTicketModal` with fields:
    - `#processTicketId` (readonly)
    - `#processInitialAssessment`
    - `#processEstimatedCompletion`
- Updated `pages/view-ticket/script.js`:
  - `renderInProgressStep(...)` now:
    - shows Start Work action only for TO when status is `parts approved`
    - hides Start Work action at/after `in progress`
  - added start modal handlers:
    - `openStartWorkModal()`
    - `closeStartWorkModal()`
    - `submitStartWork(event)`
  - `submitStartWork` validates modal inputs and applies the list-equivalent transition via:
    - `PUT /fault-tickets/:id` with `status: 'In Progress'`
  - exposed new handlers in `exposeInlineTemplateHandlers()` for inline template actions.
- Updated `pages/dashboard/technical-officer/components/ticket-details/script.js`:
  - added `#processTicketModal` to scoped modal reset selector list.
  - added `#processTicketModal` to template node extraction list so it is injected with other modals.
- Updated `pages/dashboard/technical-officer/view-ticket/style.css`:
  - extended shared TO modal selectors to include `#processTicketModal` for consistent modal styling in dashboard component mode.
- Updated `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js`:
  - fixture ticket status set to `Parts Approved` for detail start-flow coverage.
  - mocked `PUT /api/fault-tickets/:id` to mutate fixture status.
  - added assertions for:
    - Start Work button visibility in detail view
    - `#processTicketModal` visibility + ticket id field
    - successful modal submit path
    - `#complete-action` visible and `#start-work-action` hidden after start
- Validation evidence:
  - `VAL_STAGE=before npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` passed (2/2)
  - `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` passed (2/2)
  - `node --check` passed for touched JS files
  - diagnostics clean for touched files
