# [TASK129] - Normalize Trip IDs to TRP-Dash Format

**Status:** Completed  
**Added:** 2026-04-21  
**Updated:** 2026-04-21

## Original Request
- In the database `trips` table, update record IDs to properly follow the `TRP-007` style format.

## Thought Process
- The `trips.trip_id` values were mixed between normalized (`TRP-001`) and legacy (`TRP260001`) formats.
- Existing trip creation logic already produced dash-format IDs but depended on fragile sequence inference by latest `created_at`; that could create duplicate IDs after normalization.
- Safe fix required:
  - migration-based data normalization (legacy -> `TRP-###`)
  - service-level sequence generation hardening to avoid duplicate future IDs.

## Implementation Plan
- Add migration `064` to normalize legacy trip IDs into `TRP-###` format without collisions.
- Update any linked `vehicle_breakdown_inroute.dangerous_cargo_trip_id` references during the same migration.
- Harden `TripService` ID generation by deriving next number from max numeric part of normalized `TRP-###` IDs.
- Run migration and verify resulting DB state.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Inspect mixed trip_id formats and dependencies | Complete | 2026-04-21 | Confirmed `46` legacy `TRP260...` IDs and `14` already normalized IDs. |
| 1.2 | Add normalization migration | Complete | 2026-04-21 | Added `064_normalize_trip_ids_to_trp_dash_sequence.php`. |
| 1.3 | Fix post-normalization sequence generation | Complete | 2026-04-21 | Updated `TripService::getNextTripSequence()` strategy. |
| 1.4 | Execute migration and verify DB | Complete | 2026-04-21 | Migration applied and verified all `trips.trip_id` values now match `TRP-###`. |

## Progress Log
### 2026-04-21
- Added migration `migrations/064_normalize_trip_ids_to_trp_dash_sequence.php`.
  - Preserves existing `TRP-###` IDs.
  - Converts legacy non-dash IDs to next available `TRP-###` sequence.
  - Updates `vehicle_breakdown_inroute.dangerous_cargo_trip_id` references where applicable.
  - Uses transaction and temporary IDs to avoid unique-index collisions.
- Updated `app/services/TripService.php`:
  - replaced latest-created-record ID derivation with `getNextTripSequence()` based on `MAX` normalized `TRP-###` numeric suffix.
- Ran validation commands:
  - `php -l migrations/064_normalize_trip_ids_to_trp_dash_sequence.php` -> pass
  - `php -l app/services/TripService.php` -> pass
  - `php scripts/migrate.php migrate` -> applied migration 064 successfully
- Post-migration verification:
  - `TOTAL=60`
  - `LEGACY_NO_DASH=0`
  - `DASH_FORMAT=60`
  - `MAX_NUMERIC=60`
  - Migration status confirms `064 ... APPLIED`.
