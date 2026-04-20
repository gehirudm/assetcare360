# [TASK094] - Inventory Vehicle Modal vehicle_type Enum Normalization

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Inventory Manager dashboard Add Vehicle modal fails on create/edit with:
  - `SQLSTATE[01000]: Warning: 1265 Data truncated for column 'vehicle_type' at row ...`
- Fix backend/frontend so vehicle create and update succeed.

## Thought Process
- Root cause is a contract mismatch:
  - Frontend modal posts Litro-specific labels (for example, `LPG Distribution Truck`, `Staff Car`) as `vehicle_type`.
  - Database `vehicles.vehicle_type` is ENUM-limited to canonical values (`Truck`, `Van`, `Car`, `Bus`, `Bike`, `Three-Wheeler`, `Lorry`, `Tanker`, `Other`).
- Invalid ENUM writes trigger truncation warning/error during insert/update.
- Correct fix is two-layered:
  - Frontend maps selected business labels to DB enum values before API submission.
  - Backend normalizes/validates `vehicle_type` to prevent SQL-level failures from any client.

## Implementation Plan
- Add frontend mapping helper in vehicle modal form script and send mapped enum `vehicle_type`.
- Add backend normalization for `vehicle_type` in `VehicleService` create/update paths.
- Validate touched files with diagnostics and PHP lint.
- Sync memory task/context/progress records.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Trace vehicle_type mismatch across UI/API/schema | Complete | 2026-04-20 | Confirmed modal submits non-enum vehicle_type values from business labels. |
| 1.2 | Patch frontend vehicle_type mapping | Complete | 2026-04-20 | Added mapping and canonicalization before POST/PUT submission. |
| 1.3 | Harden backend vehicle_type normalization | Complete | 2026-04-20 | Added service-level normalization/alias handling + validation error for invalid values. |
| 1.4 | Validate changes | Complete | 2026-04-20 | `php -l` and diagnostics passed for touched files. |

## Progress Log
### 2026-04-20
- Updated frontend modal payload mapping:
  - `pages/dashboard/inventory-manager/components/page-modals/vehicle-form-modal/script.js`
  - Added `VEHICLE_NAME_TO_DB_TYPE` + `mapVehicleNameToDbType(...)`.
  - `getVehicleFormData()` now submits mapped canonical `vehicle_type` while preserving selected business label in `vehicle_name`.
- Updated backend service normalization:
  - `app/services/VehicleService.php`
  - `createVehicle(...)` and `updateVehicle(...)` now call `normalizeVehicleTypePayload(...)`.
  - Added `normalizeVehicleTypeValue(...)` with canonical matching, alias mapping for modal labels, keyword fallback, and explicit validation error when invalid.
- Validation:
  - `php -l app/services/VehicleService.php` passed.
  - diagnostics clean for touched files.
- API contract note:
  - No endpoint or response shape changes; OpenAPI update not required.
