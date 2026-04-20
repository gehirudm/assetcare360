# [TASK118] - Supervisor Assign Modal Past Date Guard

**Status:** In Progress  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Supervisor Assign Ticket to technician modal: expected completion date cannot be in the past.

## Thought Process
- Supervisor assignment can be initiated from both dashboard modal component and the view-ticket page fallback modal.
- The expected completion date field was required, but lacked an enforced lower bound of today and did not consistently reject past dates on submit.
- Both entry points should enforce the same rule to avoid behavioral drift.

## Implementation Plan
- Add date constraints (`min=today`) and submit-time validation to supervisor dashboard assign-ticket modal component.
- Add the same constraints and validation to view-ticket assign modal flow used by supervisor detail page.
- Add/adjust UI validation assertions in supervisor fault-ticket-tracking Playwright coverage.
- Run syntax checks and targeted UI validation.

## Progress Tracking

**Overall Status:** In Progress - 90%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add no-past-date constraint in supervisor assign modal component | Complete | 2026-04-20 | Added `min=today`, live validity checks, and submit-time no-past-date rejection in dashboard modal component. |
| 1.2 | Add no-past-date constraint in view-ticket assign modal flow | Complete | 2026-04-20 | Added `min=today`, live validity checks, default-today for fresh assignment, and submit-time no-past-date rejection in view-ticket modal. |
| 1.3 | Extend supervisor fault-ticket-tracking UI validation | Complete | 2026-04-20 | Added assertions for assign modal expected-completion `min` attribute and past-date `rangeUnderflow` invalid state. |
| 1.4 | Run validations and capture results | In Progress | 2026-04-20 | `node --check` and diagnostics passed; Playwright suite blocked by pre-existing missing `supervisor-fault-ticket-tracking` element bootstrap in this environment. |

## Progress Log
### 2026-04-20
- Created TASK118 for supervisor assignment expected-completion no-past-date enforcement.
- Confirmed affected surfaces:
  - `pages/dashboard/supervisor/components/page-modals/assign-ticket-modal/script.js`
  - `pages/view-ticket/script.js` + `#assignExpectedCompletion` modal input path.
- Confirmed current gap: required field exists but no enforced past-date rejection in submit flow.

### 2026-04-20
- Implemented supervisor no-past-date enforcement in both assignment entry points:
  - `pages/dashboard/supervisor/components/page-modals/assign-ticket-modal/script.js`
  - `pages/view-ticket/script.js`
- Added expected completion constraints and validation behavior:
  - set date input minimum to today.
  - reject submit when selected date is before today.
  - preserve native field validity messaging and toast feedback.
- Updated `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js` to assert assign modal `min` date and past-date invalidity.
- Validation results captured:
  - `node --check` passed for all touched JS/spec files.
  - diagnostics clean for touched files.
  - Playwright `VAL_STAGE=before` and `VAL_STAGE=after` both fail at pre-existing `supervisor-fault-ticket-tracking` element visibility assertion before reaching new date assertions.
