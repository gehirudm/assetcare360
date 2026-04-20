# [TASK067] - Maintenance Service Ticket Asset-Level View Flow

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- In Maintenance Manager Service Tickets section, do not show service tickets as a separate bottom list.
- For each asset, check whether a service ticket already exists.
- If a service ticket exists, show `View Ticket` instead of `Create Ticket`.
- Show asset status as `Service In Progress` when ticket exists.
- `View Ticket` should open the service ticket details component.

## Thought Process
- Keep the workflow centered on the asset status panel and remove duplicate list-level ticket rendering from the section.
- Determine active ticket presence per asset using service-ticket API data already loaded in the component.
- Keep `View Ticket` wired to the existing maintenance service-ticket details component (`maintenance-report-details-modal`).
- Preserve create-ticket entry points for assets without active tickets.

## Implementation Plan
- Remove bottom service-ticket list markup from the maintenance service-management section render.
- Add active-ticket-per-asset mapping logic.
- Override per-asset status to `Service In Progress` when active ticket exists.
- Swap per-asset action button from `Create Ticket` to `View Ticket` accordingly.
- Update maintenance UI validation spec to assert new behavior and run before/after checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Remove bottom service-ticket list UI | Complete | 2026-04-20 | Removed ticket list block from service-management render markup. |
| 1.2 | Add asset-level active-ticket detection | Complete | 2026-04-20 | Added active-ticket map and status override in maintenance service component. |
| 1.3 | Add Create/View ticket action switching | Complete | 2026-04-20 | Assets with active ticket now show View Ticket; others keep Create Ticket. |
| 1.4 | Validate and update UI test coverage | Complete | 2026-04-20 | Updated maintenance validation spec and re-ran before/after Playwright checks. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/maintenance/components/maintenance-service-tickets.js`:
  - Removed bottom service-ticket list section from rendered markup.
  - Added `buildActiveTicketByAssetMap()`.
  - Asset rows now set status to `Service In Progress` when an active ticket exists.
  - Asset action button now switches between:
    - `Create Ticket` (no active ticket)
    - `View Ticket` (active ticket exists), opening service-ticket details modal.
- Updated validation suite `testing/ui-validation/maintenance-remaining-sections/validate-maintenance-remaining-sections.spec.js`:
  - Removed assertions tied to removed `#maintenanceServiceTicketList` list.
  - Added assertions for asset-level `View Ticket` behavior and `Service In Progress` status.
  - Added flow check for newly created ticket changing asset action to `View Ticket`.
- Validation evidence:
  - `VAL_STAGE=before` maintenance remaining-sections suite: passed (2/2).
  - `VAL_STAGE=after` maintenance remaining-sections suite: passed (2/2).
  - Editor diagnostics clean for touched files.
