# [TASK099] - Driver Breakdown Status and Action Logic Parity

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Driver dashboard:
  1. Read Ticket Tracking ticket status logic and add it into Breakdown Report.
  2. Read Ticket Tracking ticket action logic and add it into Breakdown Report.

## Thought Process
- `driver-ticket-tracking` already uses canonical ticket status normalization (`normalizeTicketFilterStatus`) and ticket status display mappings (`getTicketStatusInfo`, `getTicketUpdateText`).
- `driver-breakdown` still had simplified status filters and reduced workflow action set.
- Safest implementation is to align Breakdown Report status semantics and route-workflow action gating with Ticket Tracking while preserving existing Driver Breakdown-specific actions (`edit`, `delete`, and linked ticket detail navigation).

## Implementation Plan
- Expand Breakdown Report status filters to include Pending/Open and Closed categories.
- Replace Breakdown Report status normalization with `DriverUtils.normalizeTicketFilterStatus(...)`.
- Align Breakdown Report status chip and ticket update messaging with Ticket Tracking helper logic.
- Port route workflow actions from Ticket Tracking logic to Breakdown Report: add progress + complete repair (with proper workflow-state gates).
- Update Driver UI validation to assert transferred status logic and action behavior.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Port ticket status normalization/filter logic | Complete | 2026-04-20 | Added Pending/Open and Closed filters and switched breakdown status mapping to DriverUtils ticket normalization. |
| 1.2 | Port ticket workflow action logic | Complete | 2026-04-20 | Added workflow-gated `Add Progress` and `Complete Repair` actions to Breakdown route items. |
| 1.3 | Validate status/action parity behavior | Complete | 2026-04-20 | Updated Driver Playwright spec assertions and passed desktop/mobile run. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/driver/components/driver-breakdown.js`:
  - expanded status filters: `Pending (open)`, `In Progress`, `Resolved`, `Closed`.
  - aligned status filtering to `DriverUtils.normalizeTicketFilterStatus(...)`.
  - aligned status chip/update messaging to `DriverUtils.getTicketStatusInfo(...)` and `DriverUtils.getTicketUpdateText(...)`.
  - ported ticket workflow action logic from tracking:
    - route-only workflow actions now include `Add Progress` and `Complete Repair` when garage workflow state is `garage_entry_logged` or `repair_in_progress`.
    - preserved and validated gating for `Log Garage Entry` on `garage_approved`.
    - reused existing modal endpoints (`garageProgressModal`, `completeBreakdownModal`, `nearbyGaragesModal`) with route-only guards.
- Updated `testing/ui-validation/driver-dashboard/validate-driver-dashboard.spec.js`:
  - added explicit assertions for Breakdown status filters (`open`, `resolved`, `closed`).
  - validated expected filtered rows and empty closed-state message.
  - retained breakdown action flow assertions.
- Validation:
  - `cd testing/ui-validation && npx playwright test driver-dashboard/validate-driver-dashboard.spec.js --reporter=line` passed (2/2).
