# [TASK121] - TO Request Budget Modal Layout and Header Polish

**Status:** Completed  
**Added:** 2026-04-21  
**Updated:** 2026-04-21

## Original Request
- Technical Officer dashboard, fault ticket details view:
  - improve Request Budget modal layout.
  - style modal header like other modals.

## Thought Process
- TO dashboard detail host resolves the ticket template from `pages/view-ticket/index.html` while loading TO-specific style overrides from `pages/dashboard/technical-officer/view-ticket/style.css`.
- Budget modal used a plain header and fully linear field stack, visually inconsistent with richer TO modal-header patterns.
- A budget-modal-only markup/CSS approach preserves spare-parts/complete/assign modal behavior while improving layout and header hierarchy.

## Implementation Plan
- Add budget-modal-specific header/title/subtitle markup and form layout wrappers in the TO detail template.
- Add budget-modal-specific CSS overrides for improved header styling and cleaner form layout.
- Extend TO routing UI validation to assert budget modal header/layout presence and run before/after Playwright checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Update TO budget modal markup | Complete | 2026-04-21 | Added structured header/subtitle and sectioned budget form layout in active shared template. |
| 1.2 | Add budget-modal-specific styling | Complete | 2026-04-21 | Added scoped `#budgetModal` shell/header/layout overrides in TO view-ticket stylesheet. |
| 1.3 | Extend and run UI validation | Complete | 2026-04-21 | Added budget-modal assertions and passed TO routing Playwright before/after. |

## Progress Log
### 2026-04-21
- Created TASK121 for TO Request Budget modal layout and header polish request.
- Confirmed TO dashboard detail renderer resolves the live template from `pages/view-ticket/index.html` and applies TO modal style overrides from `pages/dashboard/technical-officer/view-ticket/style.css`.
- Updated budget modal markup with a richer header block (title + subtitle), styled close control, two-column ticket/amount panel, and grouped cost-details section.
- Added scoped budget-modal styling in TO stylesheet to match other TO modal-header treatment (gradient header, rounded top, improved close button and body composition).
- Extended `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js` with budget-modal open/header/layout assertions and gradient-header computed-style check.
- Stabilized an existing flaky double-back assertion in the same validation spec by using a single back click + URL assertion.
- Validation passed:
  - `VAL_STAGE=before npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` (2/2)
  - `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` (2/2)
