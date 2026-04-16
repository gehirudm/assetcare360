# [TASK041] - Vehicle Government Fuel QR Image Flow

**Status:** Completed  
**Added:** 2026-04-16  
**Updated:** 2026-04-16

## Original Request
In Sri Lanka, fueling at external stations requires a government-issued QR code. Transportation Manager should be able to upload that QR image for a vehicle, and Driver should be able to view that QR image from the driver dashboard.

## Thought Process
- The QR image should be stored as vehicle-level metadata, not fuel-log-level data.
- Upload must support image file handling and persistence path storage in `vehicles`.
- Driver view should use existing assigned-vehicle API (`/vehicles/my-vehicle`) so no extra fetch model is required.
- TM upload should be available in current fleet-detail workflow to avoid introducing parallel vehicle edit UX.

## Implementation Plan
- Add migration to store vehicle QR image path.
- Extend `Vehicle` model/service/controller with dedicated upload flow.
- Add route for QR upload endpoint.
- Update TM fleet details UI to upload/preview QR image.
- Update Driver dashboard overview to display assigned vehicle QR image.
- Update OpenAPI and run diagnostics validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Create task record and implementation scope | Complete | 2026-04-16 | TASK041 created and indexed. |
| 1.2 | Backend schema and API implementation | Complete | 2026-04-16 | Added model field, service upload logic, controller endpoint, and route. |
| 1.3 | TM fleet detail upload UI | Complete | 2026-04-16 | Added QR preview and upload workflow in TM fleet details section. |
| 1.4 | Driver dashboard QR display | Complete | 2026-04-16 | Added assigned-vehicle QR preview and full-image open action. |
| 1.5 | OpenAPI + diagnostics validation | Complete | 2026-04-16 | OpenAPI updated; diagnostics, syntax checks, and migration run completed. |

## Progress Log
### 2026-04-16
- Created TASK041 from user request and captured implementation plan.
- Completed code archaeology for vehicle model/service/controller and TM/Driver dashboard touchpoints.

### 2026-04-16 (implementation + validation)
- Added migration `054_add_government_fuel_qr_image_to_vehicles.php` and executed migrations successfully (`054` applied).
- Extended vehicle backend for QR image upload flow:
	- `app/models/Vehicle.php` includes `government_fuel_qr_image` schema field.
	- `app/services/VehicleService.php` now validates image uploads (type/size), stores files under `uploads/vehicle-fuel-qr/`, updates vehicle records, and cleans up old QR files.
	- `app/controllers/VehicleController.php` now exposes `uploadFuelQrImage()`.
	- `public/index.php` now registers `POST /vehicles/:id/fuel-qr`.
- Updated Transportation Manager fleet details UI:
	- `pages/dashboard/transportation-manager/components/fleet-details/script.js`
	- `pages/dashboard/transportation-manager/components/fleet-details/style.css`
	- Added QR preview/open button and upload/replace form integrated with new backend endpoint.
- Updated Driver dashboard overview UI:
	- `pages/dashboard/driver/components/driver-dashboard-overview.js`
	- `pages/dashboard/driver/style.css`
	- Added assigned-vehicle QR preview and open-full-image action.
- Updated `testing/openapi.yaml` to document new vehicle QR upload endpoint and vehicle schema fields.
- Validation:
	- Editor diagnostics: no errors in touched files.
	- PHP lint: all touched PHP files passed.
	- JS syntax checks (`node --check`): passed for touched TM/Driver component scripts.
	- Migration status confirmed `054` applied; no pending migrations.

### 2026-04-16 (follow-up UX adjustment)
- Reordered TM fleet-details layout so the Government Fuel QR section appears immediately above Recent Fuel Records, as requested.
- Validation: `node --check` passed for `tm-fleet-details` script and diagnostics show no new errors.

### 2026-04-16 (rendering 404 fix)
- Investigated repeated QR image render 404s (`/uploads/vehicle-fuel-qr/...`) and confirmed files were being saved under repository-root `uploads/` while backend static serving runs from `public/`.
- Updated `VehicleService::updateFuelQrImage()` to store new QR images under `public/uploads/vehicle-fuel-qr/` while preserving DB path format (`uploads/vehicle-fuel-qr/<file>`).
- Added compatibility handling in `VehicleService` to auto-copy legacy root-stored QR files into `public/uploads/...` when vehicles are fetched, so existing records recover without manual DB edits.
- Updated QR cleanup logic to delete replaced files from both public and legacy upload locations.
- Updated TM/Driver QR URL resolution to prefer API origin for `uploads/` paths and keep fallback behavior only when required.
- Validation:
	- `php -l` passed for `app/services/VehicleService.php`.
	- `node --check` passed for touched TM/Driver scripts.
	- Diagnostics clean for touched files.
	- Authenticated API/UI verification confirms vehicle QR file now resolves via `http://localhost:8000/uploads/vehicle-fuel-qr/...` with no upload-path 404s.
