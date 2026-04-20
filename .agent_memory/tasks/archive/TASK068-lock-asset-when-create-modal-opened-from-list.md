# [TASK068] - Lock Asset on List-Triggered Service Ticket Modal

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- When the Create Service Ticket modal is triggered from a list item, the Asset should be locked.

## Thought Process
- The modal already receives `defaultAssetKey` from row-triggered opens.
- Lock behavior should apply only to row-triggered opens, not to global/header-triggered opens.
- A disabled `<select>` does not submit value in form data, so a hidden field mirror is required when locked.

## Implementation Plan
- Add lock-state handling in create-service-ticket modal.
- Disable asset select and mirror selected asset key in hidden input when opened from row trigger.
- Keep asset editable when modal is opened from general create action.
- Add UI validation assertions for both locked and unlocked paths.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Implement asset lock state in modal | Complete | 2026-04-20 | Added lock/unlock handling and hidden input mirror for form submission. |
| 1.2 | Validate list-triggered lock behavior | Complete | 2026-04-20 | Added Playwright assertion: row-triggered modal has disabled asset select with correct value. |
| 1.3 | Validate header-triggered editability | Complete | 2026-04-20 | Added Playwright assertion: header-triggered modal has enabled asset select. |

## Progress Log
### 2026-04-20
- Updated modal component in `pages/dashboard/maintenance/components/page-modals/maintenance-create-service-ticket-modal.js`:
  - Added asset-hint id and hidden input (`#createServiceTicketAssetLockedValue`).
  - Added `setAssetLockState(locked, lockedAssetKey)`.
  - `open(...)` now resolves valid `defaultAssetKey` and applies lock state when opened from a row context.
  - Locked mode:
    - disables asset select,
    - mirrors asset key through hidden input named `asset_key`,
    - updates hint text.
  - Unlocked mode:
    - enables asset select,
    - clears hidden mirror input,
    - restores default hint text.
- Updated validation in `testing/ui-validation/maintenance-remaining-sections/validate-maintenance-remaining-sections.spec.js`:
  - Added row-trigger lock check (`Create Ticket` from overdue asset row -> asset select disabled, expected value present).
  - Added header-trigger unlock check (`Create Service Ticket` button -> asset select enabled).
  - Fixed modal-close selector ambiguity in test by targeting header close button.
- Validation evidence:
  - `VAL_STAGE=after npx playwright test maintenance-remaining-sections/validate-maintenance-remaining-sections.spec.js --reporter=line` -> pass (2/2).
  - Diagnostics clean for touched files.
