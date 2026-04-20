# [TASK082] - Maintenance Analytics Remove Service Activity Distribution

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Remove Service Activity Distribution from the Service & Warranty section.

## Thought Process
- The Service & Warranty analytics panel rendered three charts; the request targets removal of the Service Activity Distribution chart only.
- To avoid dead UI references, both the chart markup and its render branch should be removed from the analytics hub component.
- The maintenance analytics Playwright spec should be aligned to the new chart count in the active service panel.

## Implementation Plan
- Remove Service Activity Distribution chart card markup and related chart key/render logic from maintenance analytics hub script.
- Update the maintenance analytics UI validation assertion for service-panel chart count.
- Run diagnostics and maintenance analytics Playwright validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Remove service activity chart from analytics hub | Complete | 2026-04-20 | Removed chart card markup and render branch (`serviceActivity`) from Service & Warranty view. |
| 1.2 | Update analytics validation coverage | Complete | 2026-04-20 | Updated service view chart count assertion from 3 to 2. |
| 1.3 | Run verification | Complete | 2026-04-20 | Diagnostics clean; maintenance analytics hub after-stage suite passed desktop/mobile. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/maintenance/components/analytics-hub/script.js`:
  - removed `serviceActivity` from `_charts`.
  - removed Service Activity Distribution chart card markup from the Service & Warranty analytics panel.
  - removed service-activity chart data shaping and `renderChart(...)` invocation from `renderServiceView(...)`.
- Updated `testing/ui-validation/maintenance-analytics-hub/validate-maintenance-analytics-hub.spec.js`:
  - changed active service-panel chart count assertion from `3` to `2`.
- Validation evidence:
  - diagnostics clean for touched files.
  - `VAL_STAGE=after npx playwright test maintenance-analytics-hub/validate-maintenance-analytics-hub.spec.js --reporter=line` passed (desktop/mobile, 2/2).
