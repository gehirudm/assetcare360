# TASK015 - Dashboard Script Bootstrap Normalization

**Status:** Pending  
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
- [ ] Audit and normalize script include order across dashboards
- [ ] Remove duplicate includes and obsolete entrypoints
- [ ] Align auth bootstrap to `DashboardInit.init` where possible
- [ ] Validate modal/shared component load dependencies

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 15.1 | Include-order audit by dashboard | Not Started | Apr 7, 2026 | config/api/auth/components/init/script |
| 15.2 | Remove duplicate and legacy includes | Not Started | Apr 7, 2026 | Includes only |
| 15.3 | Standardize auth bootstrap path | Not Started | Apr 7, 2026 | Prefer DashboardInit |
| 15.4 | Regression check for route and modal startup | Not Started | Apr 7, 2026 | Confirm no startup breakage |

## Progress Log
### April 7, 2026
- Task created from script include and initialization analysis.
