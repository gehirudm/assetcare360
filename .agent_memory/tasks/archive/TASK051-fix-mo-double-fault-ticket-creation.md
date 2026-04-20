# [TASK051] - Fix Machinery Operator Double Fault Ticket Creation

**Status:** Completed  
**Added:** 2026-04-18  
**Updated:** 2026-04-18

## Original Request
- In the Machinery Operator dashboard, creating a fault report was creating 2 fault tickets.
- Check the code responsible and correlate with recent memory/task changes.

## Thought Process
- Memory review showed TASK047 introduced backend auto-linking that now creates fault tickets during machine breakdown creation.
- If the MO modal still manually calls `/fault-tickets` after posting `/machine-breakdowns`, one submit will create duplicates.
- Preserve existing photo-upload behavior without reintroducing manual ticket creation.

## Implementation Plan
- Inspect MO submit modal and confirm duplicate request sequence.
- Remove manual `/fault-tickets` creation call from MO report flow.
- Keep image upload by attaching photos to the already linked auto-created ticket via update endpoint.
- Validate no duplicate create call remains and syntax/diagnostics stay clean.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Correlate likely regression with memory/task history | Complete | 2026-04-18 | TASK047 backend auto-create behavior identified as trigger when combined with legacy MO modal flow. |
| 1.2 | Trace MO fault-report submit code path | Complete | 2026-04-18 | Confirmed sequential calls: `POST /machine-breakdowns` then `POST /fault-tickets` in `mo-report-fault-modal.js`. |
| 1.3 | Patch MO flow to prevent duplicate ticket creation | Complete | 2026-04-18 | Removed manual ticket create call; now uploads photos to linked auto-created ticket using ticket update endpoint. |
| 1.4 | Validate targeted change | Complete | 2026-04-18 | Editor diagnostics clean; grep confirms no MO manual fault-ticket create call remains. |

## Progress Log
### 2026-04-18
- Read memory core and task history first, especially TASK047 and TASK050.
- Confirmed root cause in frontend modal:
  - `pages/dashboard/machinery-operator/components/page-modals/mo-report-fault-modal.js`
  - Old flow: create breakdown (`/machine-breakdowns`) then create ticket (`/fault-tickets`) -> duplicates after backend auto-link rollout.
- Implemented fix in `mo-report-fault-modal.js`:
  - Removed manual `API.postFormData('/fault-tickets', ...)` call.
  - Added `findLinkedTicketId(breakdownId)` helper (short retry lookup via `/machine-breakdowns`).
  - Added `uploadPhotosToLinkedTicket(breakdownId)` helper that uses `API.putFormData('/fault-tickets/{id}', formData)` for photos.
  - Updated submit success/warning messaging accordingly.
- Validation evidence:
  - `get_errors` on touched modal file: no errors.
  - grep check confirms no remaining MO modal manual fault-ticket create call.
