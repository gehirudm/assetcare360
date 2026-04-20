# [TASK048] - Inventory Insurance Flow

**Status:** Completed  
**Added:** 2026-04-18  
**Updated:** 2026-04-18

## Original Request
- Add insurance details when creating machines and vehicles from Inventory Manager flows.
- Required insurance fields:
  - Insurance type (Full, Third-Party)
  - Insurance provider
  - Insurance provider details
  - Insurance renew interval details
  - Last insurance renew details
- Add a new Inventory Manager dashboard section to manage insurance details.
- Section must show upcoming insurance renewals and allow submitting insurance renewal details.

## Thought Process
- Insurance data belongs to machine/vehicle asset records, so schema updates should be on `machines` and `vehicles`.
- Renewal workflow can be implemented safely by updating existing machine/vehicle records via existing `PUT` endpoints, avoiding unnecessary new endpoints.
- Upcoming renewals should rely on a computed `next_insurance_renew_date` field derived from last renew date + interval.
- UI should remain componentized under Inventory Manager dashboard conventions.

## Implementation Plan
- Add a migration for insurance fields on `machines` and `vehicles`.
- Update machine/vehicle model schemas and service validation/mapping for new fields.
- Extend machine and vehicle create/edit form modals and detail views with insurance inputs/outputs.
- Add new Inventory Manager section/component for insurance management and renewal submission.
- Update OpenAPI schemas for machine/vehicle input/output field changes.
- Run migration and UI/API validations.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add DB migration for insurance schema fields | Complete | 2026-04-18 | Added and applied `058_add_insurance_fields_to_assets.php` with indexes and next-renewal backfill. |
| 1.2 | Update backend models/services for insurance field validation and derived next-renewal date | Complete | 2026-04-18 | Machine/Vehicle models + services now validate, normalize, and compute `next_insurance_renew_date`. |
| 1.3 | Extend machine/vehicle modal forms and detail views for insurance fields | Complete | 2026-04-18 | Inventory Manager machine/vehicle add-edit forms and details modals updated with insurance fields. |
| 1.4 | Add Inventory Manager insurance management section component | Complete | 2026-04-18 | Added insurance section with summary, filters, upcoming renewals list, and renewal submit modal. |
| 1.5 | Update OpenAPI and run validation/migration checks | Complete | 2026-04-18 | OpenAPI updated; lint/diagnostics clean; after-stage Playwright validation now passes desktop/mobile. |

## Progress Log
### 2026-04-18
- Loaded required memory and instruction files before implementation.
- Added stage-based UI validation spec:
  - `testing/ui-validation/inventory-insurance-management/validate-inventory-insurance-management.spec.js`
- Captured baseline with:
  - `VAL_STAGE=before npx playwright test inventory-insurance-management/validate-inventory-insurance-management.spec.js --reporter=line`
  - Result: passed (desktop + mobile).

### 2026-04-18
- Added migration `migrations/058_add_insurance_fields_to_assets.php` and applied migrations successfully (`58/58 applied, 0 pending`).
- Updated backend insurance validation and mapping in:
  - `app/models/Machine.php`, `app/models/Vehicle.php`
  - `app/services/MachineService.php`, `app/services/VehicleService.php`
- Added new Inventory Manager insurance management component and styles:
  - `pages/dashboard/inventory-manager/components/insurance-management/script.js`
  - `pages/dashboard/inventory-manager/components/insurance-management/style.css`
- Updated Inventory Manager section integration, machine/vehicle modals, and detail views to capture/display insurance fields.
- Updated API schema docs in `testing/openapi.yaml` for insurance fields in machine/vehicle input/output models.
- Fixed strict locator issues in insurance Playwright validation and aligned fixtures with upcoming-renewal filter behavior.
- Final validation evidence:
  - `VAL_STAGE=after npx playwright test inventory-insurance-management/validate-inventory-insurance-management.spec.js`
  - Result: passed (desktop + mobile, 2/2).
