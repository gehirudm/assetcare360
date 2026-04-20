# [TASK120] - TM Cargo List Deactivate Action Relocation

**Status:** Completed  
**Added:** 2026-04-21  
**Updated:** 2026-04-21

## Original Request
- Transportation Manager Cargo Management: remove Deactivate button from cargo item list.
- Move deactivate action to cargo item details view.
- Remove cargo item status badge from cargo items list.

## Thought Process
- Current cargo list rendered both action and status badges, while cargo details already represented full cargo profile context.
- Action placement belongs in details view to reduce accidental state changes from catalog scan rows.
- Any activation-state change in details must refresh list and analytics sections to keep dashboard data consistent.

## Implementation Plan
- Remove list-row deactivate/reactivate actions and status badge rendering from TM cargo management component.
- Add activate/deactivate action controls inside TM cargo details profile card.
- Emit cargo-details active-state update event and refresh cargo management + cargo analytics in TM shell.
- Add focused UI validation spec for list-vs-details action placement and run before/after checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Remove deactivate/status UI from cargo list | Complete | 2026-04-21 | `tm-cargo-management` now keeps only View Details action and non-badge cargo type text. |
| 1.2 | Add state-toggle action inside cargo details | Complete | 2026-04-21 | `tm-cargo-details` now provides deactivate/reactivate button in Cargo Profile card and handles API calls. |
| 1.3 | Wire shell refresh after details state updates | Complete | 2026-04-21 | `tm-cargo-details:active-state-updated` now triggers cargo management + analytics refresh in TM script. |
| 1.4 | Run UI validation with evidence | Complete | 2026-04-21 | New Playwright spec added and passed for `VAL_STAGE=before` and `VAL_STAGE=after`. |

## Progress Log
### 2026-04-21
- Updated `pages/dashboard/transportation-manager/components/cargo-management/script.js` to remove row-level deactivate/reactivate controls and remove cargo status badge rendering from catalog rows.
- Updated `pages/dashboard/transportation-manager/components/cargo-details/script.js` to add details-level deactivate/reactivate control and API mutation flow with confirmation + toast feedback.
- Updated `pages/dashboard/transportation-manager/script.js` to refresh cargo list and analytics when cargo active state changes from details view.
- Added validation spec `testing/ui-validation/transportation-cargo-lifecycle/validate-transportation-cargo-list-detail-actions.spec.js`.
- Validation evidence:
  - `node --check` passed for all touched scripts/spec.
  - diagnostics clean for touched files.
  - `VAL_STAGE=before` spec run passed.
  - `VAL_STAGE=after` spec run passed.
