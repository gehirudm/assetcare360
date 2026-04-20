# TASK067 - Inventory Vehicle Insurance Real-Data Mapping Fix

**Status:** Completed  
**Added:** April 19, 2026  
**Updated:** April 19, 2026

## Original Request
fill out insurence management part in the vehicle management in the inventory management...with the real data

## Thought Process
The backend vehicle contract uses `number_plate` and `current_mileage`, but parts of the Inventory vehicle UI still referenced legacy keys (`registration_number`, `mileage`). That mismatch caused vehicle cards and insurance-related context to show blanks or default values instead of real API data.

The safest fix was to:
- normalize vehicle records centrally for modal/detail fetch paths,
- update vehicle list/search rendering to prefer backend keys with legacy fallbacks,
- keep insurance management mapping tolerant of legacy number-plate key names.

## Implementation Plan
- [x] Trace Inventory vehicle + insurance data flow from frontend components to backend responses.
- [x] Add vehicle record normalization where edit/view modal workflows fetch records.
- [x] Fix vehicle list rendering/search to use backend field names and preserve fallbacks.
- [x] Patch insurance management vehicle identifier mapping fallback.
- [x] Run syntax checks and focused UI validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 67.1 | Diagnose vehicle/insurance mapping mismatch | Complete | April 19, 2026 | Confirmed UI used legacy `registration_number` and `mileage` keys while backend provides `number_plate` and `current_mileage`. |
| 67.2 | Normalize fetched vehicle records for modal flows | Complete | April 19, 2026 | Added `normalizeVehicleRecord(...)` in shared page-modal script and applied in `fetchVehicleRecord(...)`. |
| 67.3 | Fix vehicle list/search field mapping | Complete | April 19, 2026 | Vehicle list now displays number plate/current mileage from backend fields and includes insurance metadata on cards. |
| 67.4 | Align insurance management identifier fallback | Complete | April 19, 2026 | Vehicle display identifier now falls back to `registration_number` when needed. |
| 67.5 | Validate frontend updates | Complete | April 19, 2026 | Node syntax checks and focused inventory insurance Playwright suite passed. |

## Progress Log
### April 19, 2026
- Updated `pages/dashboard/inventory-manager/components/page-modals/script.js`:
  - Added `normalizeVehicleRecord(...)`.
  - `fetchVehicleRecord(...)` now normalizes local-cache, single-record API, and list-fallback responses.
- Updated `pages/dashboard/inventory-manager/components/vehicles/script.js`:
  - Replaced legacy search/display usage with backend-first field mapping:
    - `number_plate` with fallback to `registration_number`
    - `current_mileage` with fallback to `mileage`
  - Added insurance type/provider rendering to vehicle cards so insurance details use live backend values.
- Updated `pages/dashboard/inventory-manager/components/insurance-management/script.js`:
  - Vehicle `display_identifier` now uses `number_plate` with fallback to `registration_number`.
- Validation evidence:
  - `node --check pages/dashboard/inventory-manager/components/page-modals/script.js` passed.
  - `node --check pages/dashboard/inventory-manager/components/vehicles/script.js` passed.
  - `node --check pages/dashboard/inventory-manager/components/insurance-management/script.js` passed.
  - Diagnostics check reported no errors for all touched files.
  - `VAL_STAGE=after npx playwright test inventory-insurance-management/validate-inventory-insurance-management.spec.js --reporter=line` passed (`2/2`).
