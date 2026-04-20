# [TASK076] - Hide Empty Service Report Details in TO View

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Don't show the Service Report Details section if there is no service report.

## Thought Process
- Apply the behavior in Technical Officer service-ticket detail renderer where the section is currently always shown.
- Detect report presence from completion/report-specific fields only to avoid false positives from base ticket metadata.
- Add UI validation assertions to ensure the section is hidden for non-report states.

## Implementation Plan
- Add computed `hasServiceReport` flag in TO detail render flow.
- Conditionally render Service Report Details card only when report exists.
- Update TO routing Playwright test to assert hidden section for no-report tickets.
- Validate diagnostics and desktop/mobile test flow.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add conditional report-section rendering | Complete | 2026-04-20 | Service Report Details now rendered only when completion/report fields are present. |
| 1.2 | Refine report-presence logic | Complete | 2026-04-20 | Excluded `service_meter_reading` from report detection to avoid false positives on assigned tickets. |
| 1.3 | Add regression assertions and validate | Complete | 2026-04-20 | Updated TO routing spec and validated desktop/mobile pass. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/technical-officer/components/service-ticket-details/script.js`:
  - introduced `hasServiceReport` computation using completion/report fields (`completed_at`, `completion_notes`, `component_comments`, `actual_cost`, warranty-report fields).
  - made Service Report Details card conditional on `hasServiceReport`.
  - refined logic to remove `service_meter_reading` from presence detection after validation showed pre-existing values in assigned fixtures.
- Updated `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js`:
  - added assertions that `Service Report Details` card title count is 0 for no-report tickets (`SVT-901`, `SVT-902`).
- Validation evidence:
  - diagnostics clean for touched files.
  - `npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js` passed (desktop/mobile, 2/2).
