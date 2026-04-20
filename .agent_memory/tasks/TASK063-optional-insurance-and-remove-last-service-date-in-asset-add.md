# TASK063 - Optional Insurance and Remove Last Service Date in Asset Add

**Status:** Completed  
**Added:** April 19, 2026  
**Updated:** April 19, 2026

## Original Request
insurence details and warrenty details that taken when the addition of vehicles and machines should be optional....last service date also removed

## Thought Process
Create-time insurance validation was still strict in backend services and add/edit modals still marked insurance fields as required. Last service date was still present in machine/vehicle form payloads.

To satisfy the request safely:
- make insurance optional at create time in backend,
- keep strict completeness only when any insurance field is provided,
- remove last service date from machine/vehicle modal payload collection,
- update OpenAPI input schemas accordingly.

## Implementation Plan
- [x] Update MachineService create validation for optional insurance.
- [x] Update VehicleService create validation for optional insurance.
- [x] Update machine modal UI to remove last service date field and required insurance flags.
- [x] Update vehicle modal UI to remove last service date field and required insurance flags.
- [x] Update OpenAPI MachineInput/VehicleInput required fields and removed last_service_date input property.
- [x] Validate syntax and run focused inventory insurance UI suite.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 63.1 | Backend machine create optional insurance | Complete | April 19, 2026 | Added insurance-input presence detection and conditional strict validation. |
| 63.2 | Backend vehicle create optional insurance | Complete | April 19, 2026 | Added insurance-input presence detection and conditional strict validation. |
| 63.3 | Machine form optional insurance and no last service date | Complete | April 19, 2026 | Removed required markers/attributes and removed last service date field from payload collection. |
| 63.4 | Vehicle form optional insurance and no last service date | Complete | April 19, 2026 | Removed required markers/attributes and removed last service date field from payload collection. |
| 63.5 | OpenAPI schema update | Complete | April 19, 2026 | Removed insurance fields from required arrays and removed last_service_date from MachineInput/VehicleInput. |
| 63.6 | Validation run | Complete | April 19, 2026 | PHP + JS syntax checks passed; inventory insurance UI suite passed (2/2). |

## Progress Log
### April 19, 2026
- Updated `app/services/MachineService.php` create flow:
  - insurance fields are optional by default,
  - if any insurance field is provided, full insurance validation is enforced.
- Updated `app/services/VehicleService.php` create flow with same optional+conditional pattern.
- Updated `pages/dashboard/inventory-manager/components/page-modals/machine-form-modal/script.js`:
  - removed `Last Service Date` field from modal,
  - removed required insurance flags,
  - stopped sending `last_service_date` in create/update payload,
  - made insurance renew interval payload nullable.
- Updated `pages/dashboard/inventory-manager/components/page-modals/vehicle-form-modal/script.js`:
  - removed `Last Service Date` field from modal,
  - removed required insurance flags,
  - stopped sending `last_service_date` in create/update payload,
  - made insurance renew interval payload nullable.
- Updated `testing/openapi.yaml`:
  - `MachineInput.required` and `VehicleInput.required` no longer force insurance fields,
  - removed `last_service_date` from `MachineInput` and `VehicleInput` properties.
- Validation evidence:
  - `php -l app/services/MachineService.php` passed,
  - `php -l app/services/VehicleService.php` passed,
  - `node --check` passed for touched modal scripts,
  - `VAL_STAGE=after npx playwright test inventory-insurance-management/validate-inventory-insurance-management.spec.js --reporter=line` passed (2/2).
