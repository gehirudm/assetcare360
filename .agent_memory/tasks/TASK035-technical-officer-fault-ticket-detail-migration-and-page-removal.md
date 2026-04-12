# TASK035 - Technical Officer Fault Ticket Detail Migration And Page Removal

**Status:** Pending  
**Added:** April 12, 2026  
**Updated:** April 12, 2026

## Original Request
"The technical officer dashboard view ticket page should be removed from the technical officer dashboard folder, and any links from the technical officer dashboard to the fault ticket details page should be updated properly to the proper fault ticket details page."

## Thought Process
Current Technical Officer routing still points to a dashboard-local detail page:
- `pages/dashboard/technical-officer/script.js` routes `viewTicket` and `requestSparePartsForTicket` to `fault-ticket-detail/?id=...`.
- `pages/dashboard/technical-officer/fault-ticket-detail/` exists as a separate page (HTML + script + style), creating duplicate detail-page ownership.

Observed migration risks:
1. Dual detail-page implementations (`pages/dashboard/technical-officer/fault-ticket-detail/` and `pages/view-ticket/`) can diverge in behavior and bug fixes.
2. TO dashboard currently includes residual monolithic ticket action bridges that assume the local detail page path.
3. Redirect handling must remain relative to base URL and preserve return context to `?section=tickets`.

## Implementation Plan
- [ ] Define `pages/view-ticket/` as the canonical fault-ticket detail destination for Technical Officer ticket actions.
- [ ] Update Technical Officer dashboard links/events (`view ticket`, `request spare parts`, and related ticket navigation paths) to the canonical detail page route.
- [ ] Add a route helper/path contract so TO detail navigation is not hardcoded to a local folder path.
- [ ] Remove `pages/dashboard/technical-officer/fault-ticket-detail/` and clean any includes/references to it.
- [ ] Verify back-navigation from canonical detail page returns to Technical Officer dashboard tickets section correctly.
- [ ] Add or update UI validation path covering TO dashboard ticket click -> canonical detail page -> back navigation.

## Acceptance Criteria
- No Technical Officer dashboard code references `fault-ticket-detail/?id=`.
- `pages/dashboard/technical-officer/fault-ticket-detail/` is removed and no runtime references remain.
- Ticket action links from TO dashboard open the canonical detail page reliably.
- Back navigation from detail view returns users to TO dashboard tickets context.
- Navigation path changes are validated with no new console errors or failed requests in the tested flow.

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 35.1 | Replace TO detail-page links with canonical route contract | Not Started | - | |
| 35.2 | Remove dashboard-local TO fault-ticket-detail page folder and references | Not Started | - | |
| 35.3 | Validate TO dashboard -> detail -> back navigation flow | Not Started | - | |

## Progress Log
### April 12, 2026
- Task created after finding TO script redirects to `fault-ticket-detail/?id=...` and confirming duplicate detail-page directories in `pages/dashboard/technical-officer/` and `pages/view-ticket/`.