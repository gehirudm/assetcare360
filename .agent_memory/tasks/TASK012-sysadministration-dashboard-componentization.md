# TASK012 - SysAdministration Dashboard Componentization

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

## Original Request
Create dashboard-wide refactor tasks in memory and Beads.

## Thought Process
SysAdministration currently loads both `legacy-script.js` and `script.js`, which creates unclear ownership. Section map:
- `dashboard`
- `user-accounts`
- `service-config`
- `petty-cash-config`
- `notifications-config`
- `system-logs`
- `activity-tracking`

Refactor must consolidate entrypoint logic and componentize each model section.

## Implementation Plan
- [ ] Consolidate sysadmin script entrypoint (remove dual-script ambiguity)
- [ ] Extract user/service/settings sections into components
- [ ] Extract logs/activity sections into components
- [ ] Keep section routing and existing actions unchanged

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 12.1 | Consolidate script entrypoint | Not Started | Apr 7, 2026 | Decide canonical script file |
| 12.2 | Extract accounts/configuration components | Not Started | Apr 7, 2026 | Preserve current forms/validation |
| 12.3 | Extract logs/activity components | Not Started | Apr 7, 2026 | Keep filtering and pagination |
| 12.4 | Decompose root script logic | Not Started | Apr 7, 2026 | Root orchestrates only |

## Progress Log
### April 7, 2026
- Task created from dual-entrypoint and section-level analysis.
