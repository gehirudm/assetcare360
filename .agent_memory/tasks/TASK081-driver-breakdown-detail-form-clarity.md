# TASK081 - Driver Breakdown Detail Form Clarity

**Status:** In Progress  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
In Driver dashboard ticket tracking, breakdown detail popup content is too packed and hard to read. Make route breakdown (RBD) and vehicle breakdown (VBD) detail presentation clear and aligned with the machinery breakdown view form style.

## Thought Process
The current driver details modal renders many dense `<p>` rows and inline-styled blocks, especially for route breakdown workflow/garage sections. The required outcome is improved readability and visual grouping while preserving backend field mapping and existing workflow data.

## Implementation Plan
- [ ] Refactor driver breakdown details modal rendering structure for RBD/VBD into clear sectioned form rows.
- [ ] Add driver dashboard CSS classes for key-value row layout, status chips, and garage update cards.
- [ ] Keep field mapping aligned with `BreakdownReportController::show()` and `RouteBreakdownController::show()` response shapes.
- [ ] Update driver UI validation spec assertions for the new detail form readability structure.
- [ ] Run targeted validation (`driver-dashboard` desktop + mobile) and capture outcomes.

## Acceptance Criteria
- RBD and VBD details in Driver ticket tracking modal are visually separated into clear form sections and rows.
- Garage workflow and garage updates remain visible but no longer appear as dense packed text.
- Field labels/values map to real backend response keys; no guessed properties.
- Existing workflow tracking behavior (`Track Workflow`) remains functional.
- Driver dashboard validation passes (or blockers are documented with evidence).

## Progress Tracking

**Overall Status:** In Progress - 10%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 81.1 | Refactor driver detail modal structure (RBD/VBD) | In Progress | April 20, 2026 | Pending code implementation |
| 81.2 | Add/adjust CSS for readable detail form rows | Not Started | April 20, 2026 | |
| 81.3 | Update driver UI validation assertions | Not Started | April 20, 2026 | |
| 81.4 | Run targeted validation and document result | Not Started | April 20, 2026 | |

## Progress Log
### April 20, 2026
- Task created for Driver breakdown detail readability refactor request.
- Confirmed target component is `pages/dashboard/driver/components/page-modals/driver-breakdown-details-modal.js` and style support comes from `pages/dashboard/driver/style.css`.
- Confirmed backend response field contracts from `BreakdownReportController::show()` and `RouteBreakdownController::show()` for RBD/VBD detail rendering.
