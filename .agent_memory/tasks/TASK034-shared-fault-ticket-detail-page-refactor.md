# TASK034 - Shared Fault Ticket Detail Page Refactor

**Status:** Pending  
**Added:** April 12, 2026  
**Updated:** April 12, 2026

## Original Request
"Fault ticket details page should be properly refactored as well."

## Thought Process
High-level analysis shows the canonical ticket detail page is currently `pages/view-ticket/` (while Technical Officer still links to a dashboard-local detail page).

Observed refactor gaps in the canonical page:
1. `pages/view-ticket/index.html` still contains multiple inline handlers (`onclick`, `onsubmit`) for logout, modal close/open, image viewer, and budget form actions.
2. `pages/view-ticket/script.js` remains monolithic (~706 lines) and mixes rendering, modal control, navigation, role actions, and budget workflows.
3. The script contains duplicate function names (for example `viewTicket`) and placeholder action handlers that should be cleaned up or formalized.
4. The page already relies on `fault-ticket-detail-template.js`, so the refactor should preserve and strengthen that shared abstraction instead of reintroducing role-specific duplication.

## Implementation Plan
- [ ] Define canonical responsibilities for `pages/view-ticket/` and document role-specific behavior (Technical Officer, Supervisor, Admin) in-code via explicit contracts.
- [ ] Remove inline handlers from `pages/view-ticket/index.html` and replace with delegated/event-driven listeners.
- [ ] Split `pages/view-ticket/script.js` into focused modules/components (navigation, ticket data rendering, history modal, image modal, budget workflow).
- [ ] Eliminate duplicate/dead handlers and keep one authoritative implementation per action.
- [ ] Preserve/extend integration with `pages/js/fault-ticket-detail-template.js` for shared formatting and status/priority mapping.
- [ ] Add or update stage-based Playwright validation under `testing/ui-validation/fault-ticket-detail/` for before/after desktop and mobile interaction paths.

## Acceptance Criteria
- No inline event attributes remain in `pages/view-ticket/index.html`.
- `pages/view-ticket/script.js` is no longer a single monolith; major feature areas are separated into clear modules/components.
- Duplicate function declarations are removed.
- Ticket details, history modal, image viewer, and budget report flows work without console errors or failed requests in validated paths.
- Before/after validation artifacts exist for desktop and mobile with no regressions in core interactions.

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 34.1 | Remove inline handlers from shared detail page HTML | Not Started | - | |
| 34.2 | Decompose shared detail page script into focused modules/components | Not Started | - | |
| 34.3 | Clean duplicate/dead action handlers and finalize event contracts | Not Started | - | |
| 34.4 | Add before/after desktop+mobile UI validation coverage | Not Started | - | |

## Progress Log
### April 12, 2026
- Task created after identifying remaining monolithic and inline-handler patterns in `pages/view-ticket/index.html` and `pages/view-ticket/script.js` during dashboard cleanup analysis.