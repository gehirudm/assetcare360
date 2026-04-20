# TASK073 - Fix Supervisor View-Ticket Vehicle Details Rendering

**Status:** Completed  
**Added:** April 20, 2026  
**Updated:** April 20, 2026

## Original Request
Supervisor fault ticket detail view does not show vehicle details properly when opening a vehicle ticket.

## Thought Process
Root cause was in shared detail rendering utilities, not Supervisor-only wiring:
- `pages/js/fault-ticket-detail-template.js` used machine-first formatting only (`machine_model_number` / `machine_name`) for all tickets.
- Vehicle tickets already carry vehicle context (`number_plate`, vehicle model/name through breakdown context), but formatter ignored that context.

Because Supervisor uses shared view-ticket runtime/template, the correct fix is to make shared equipment label formatting vehicle-aware and use the same logic in fallback paths.

## Implementation Plan
- [x] Make shared equipment formatter vehicle-aware.
- [x] Add explicit vehicle-ticket detection helper in shared template.
- [x] Update shared view-ticket fallback paths (`ovEquipment` and parts modal `equipmentInput`) to use the same formatter/fallback.
- [x] Validate syntax and run relevant UI validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 73.1 | Trace Supervisor view-ticket data/render path | Complete | April 20, 2026 | Confirmed shared template formatter was machine-only. |
| 73.2 | Implement shared vehicle-aware equipment label logic | Complete | April 20, 2026 | Added `isVehicleTicket(...)` and updated `formatEquipmentLabel(...)`. |
| 73.3 | Align view-ticket fallback render paths | Complete | April 20, 2026 | Added `getFallbackEquipmentLabel(...)` and reused in overview + parts modal. |
| 73.4 | Validate and document | Complete | April 20, 2026 | Syntax checks passed; TO shared-detail suite passed; Supervisor suite blocked by pre-existing stale selector host expectation. |

## Progress Log
### April 20, 2026
- Updated `pages/js/fault-ticket-detail-template.js`:
  - added `isVehicleTicket(ticket)` helper.
  - updated `formatEquipmentLabel(ticket)` to render vehicle-first labels (number plate + vehicle name/model fallback) for vehicle/route tickets.
- Updated `pages/view-ticket/script.js`:
  - added `getFallbackEquipmentLabel(ticket)`.
  - switched overview equipment rendering (`#ovEquipment`) to vehicle-aware fallback.
  - switched spare-parts modal equipment prefill (`#equipmentInput`) to vehicle-aware fallback.
- Validation evidence:
  - `node --check pages/js/fault-ticket-detail-template.js` passed.
  - `node --check pages/view-ticket/script.js` passed.
  - `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` passed (`2/2`).
  - `VAL_STAGE=after npx playwright test supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line` failed on pre-existing stale selector expectation for `supervisor-fault-ticket-tracking` host visibility (outside this formatter change).
