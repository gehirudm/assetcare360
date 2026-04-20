# [TASK104] - TO View-Ticket Modal Layout and Budget Header Alignment

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- In Technical Officer View Fault Ticket Details:
  - Request Spare Parts modal appears compressed/shrunk.
  - Request Budget modal header looks inconsistent compared to other modals.

## Thought Process
- Shared view-ticket page (`pages/view-ticket`) serves the TO detail view.
- Spare-parts modal uses the default modal width while rendering a large multi-section form with `form-grid` rows, causing cramped layout.
- Budget modal header copy (`Submit Budget Report`) is inconsistent with request-oriented modal naming in the same flow.

## Implementation Plan
- Widen the Request Spare Parts modal container in shared detail UI.
- Align budget modal header text with request modal naming.
- Extend existing TO request-spare-parts Playwright validation to assert:
  - budget modal header text
  - spare-parts modal width is not compressed on desktop
- Run validation on desktop and mobile.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Fix spare-parts modal compression | Complete | 2026-04-20 | Added wide modal class and modal-specific max-width for parts modal. |
| 1.2 | Align budget modal header wording | Complete | 2026-04-20 | Changed header text to `Request Budget Report`. |
| 1.3 | Add UI regression assertions and validate | Complete | 2026-04-20 | Updated TO spare-parts validation spec and passed desktop/mobile run. |

## Progress Log
### 2026-04-20
- Updated `pages/view-ticket/index.html`:
  - changed budget modal header text to `Request Budget Report`.
  - changed parts modal container class to `modal modal-wide modal-parts`.
- Updated `pages/dashboard/technical-officer/view-ticket/style.css`:
  - added `#partsModal > .modal.modal-parts { max-width: 860px; }` to prevent compressed layout.
- Updated `testing/ui-validation/to-request-spare-parts-modal/validate-to-request-spare-parts-modal.spec.js`:
  - added budget modal header assertion.
  - added parts modal width/layout metric assertion for desktop viewport.
- Validation:
  - `cd testing/ui-validation && npx playwright test to-request-spare-parts-modal/validate-to-request-spare-parts-modal.spec.js --reporter=line` passed (2/2).
