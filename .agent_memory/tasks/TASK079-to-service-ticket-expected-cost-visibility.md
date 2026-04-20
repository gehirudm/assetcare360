# [TASK079] - TO Service Ticket Expected Cost Visibility

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Technical Officer service-ticket details view: Expected Cost should be shown.

## Thought Process
- Service report card is conditionally hidden when report data is absent, so cost information must be surfaced in always-visible summary area.
- Use `estimated_cost` as the expected cost source and align label terminology to `Expected Cost`.
- Add TO routing regression check to ensure Expected Cost remains visible in detail view.

## Implementation Plan
- Add Expected Cost to TO detail overview metrics.
- Rename report field label from Estimated Cost to Expected Cost for consistency.
- Update TO routing validation to assert Expected Cost and LKR value marker are visible.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add Expected Cost in overview | Complete | 2026-04-20 | Added always-visible overview metric using `estimated_cost`. |
| 1.2 | Align field label terminology | Complete | 2026-04-20 | Updated report field label from `Estimated Cost` to `Expected Cost`. |
| 1.3 | Validate with TO routing suite | Complete | 2026-04-20 | Added regression assertions and passed desktop/mobile validation. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/technical-officer/components/service-ticket-details/script.js`:
  - added `Expected Cost` metric to `overviewMetrics` using `formatCurrency(ticket.estimated_cost)`.
  - renamed report-card field label from `Estimated Cost` to `Expected Cost`.
- Updated `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js`:
  - added assertions that service-ticket detail overview grid contains `Expected Cost` and `LKR`.
- Validation evidence:
  - diagnostics clean for touched files.
  - `npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js` passed (desktop/mobile, 2/2).
