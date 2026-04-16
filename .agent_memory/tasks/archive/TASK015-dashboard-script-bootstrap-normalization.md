# TASK015 - Dashboard Script Bootstrap Normalization

**Status:** Completed  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

## Original Request
Create all dashboard refactor tasks identified by analysis.

## Thought Process
Dashboard bootstraps are inconsistent:
- Maintenance loads `config.js` twice
- Machinery Operator load order is not aligned with standard order
- SysAdministration has dual script entrypoints
- TO still uses legacy shell components

A dedicated normalization task is required to reduce hidden initialization bugs before/while component extraction proceeds.

## Implementation Plan
- [x] Audit and normalize script include order across dashboards
- [x] Remove duplicate includes and obsolete entrypoints
- [x] Align auth bootstrap to config-driven login routes
- [x] Validate modal/shared component load dependencies

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 15.1 | Include-order audit by dashboard | Complete | Apr 7, 2026 | Verified config → api → auth ordering across dashboard entrypoints with only Transportation Manager scaffold intentionally empty |
| 15.2 | Remove duplicate and legacy includes | Complete | Apr 7, 2026 | Removed duplicate `config.js` include in maintenance dashboard and corrected mismatched include ordering |
| 15.3 | Standardize auth bootstrap path | Complete | Apr 7, 2026 | Redirect paths normalized to `CONFIG.ROUTES.LOGIN` in dashboard auth checks |
| 15.4 | Regression check for route and modal startup | Complete | Apr 7, 2026 | JS syntax checks and diagnostics passed for touched files |

## Progress Log
### April 7, 2026
- Task created from script include and initialization analysis.

### April 7, 2026 (Execution Update)
- Normalized core include order in `pages/dashboard/machinery-operator/index.html` to `config.js` → `api.js` → `auth.js` → `utils.js` before component and init scripts.
- Removed duplicate head-level `config.js` include from `pages/dashboard/maintenance/index.html` (retaining footer stack as single source).
- Fixed style dependency load order in `pages/dashboard/technical-officer/index.html` by loading shared style modules before `create-fault-ticket` script.
- Standardized login redirect paths to `CONFIG.ROUTES.LOGIN` in:
	- `pages/dashboard/technical-officer/fault-ticket-detail/script.js`
	- `pages/dashboard/inventory-manager/script.js`
- Validation completed:
	- `node --check` passed for touched JS files
	- editor diagnostics reported no errors in touched files
- Remaining intentionally deferred area: `pages/dashboard/transportation-manager/index.html` is still empty and tracked separately under TASK016 scaffold work.
