# TASK005 - Technical Officer Shell And Navigation Migration

**Status:** Completed  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

## Original Request
Create dashboard refactor tasks after analyzing all dashboards.

## Thought Process
Technical Officer is the only active dashboard not yet on `<ac-layout>`. It still uses:
- `to-shell-header` and `to-shell-sidebar`
- custom `navigateTo()` / query-param navigation in page script
- script-local auth bootstrap instead of `DashboardInit.init` pattern

Before deeper section extraction, TO should align with the same shell/navigation architecture as other dashboards.

## Implementation Plan
- [x] Replace TO shell markup with `<ac-layout>` + nav config
- [x] Migrate TO user header population to `<ac-header>` via `DashboardInit`
- [x] Remove TO custom nav boilerplate and use `section-change` handling
- [x] Keep existing section behavior and deep-link compatibility

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 5.1 | Replace `to-shell-*` with `ac-layout` | Completed | Apr 7, 2026 | TO shell now uses `<ac-layout>` with shared nav config and section IDs preserved |
| 5.2 | Align auth init to `DashboardInit` | Completed | Apr 7, 2026 | TO bootstrap now uses `DashboardInit.init('Technical Officer')` and shared `<ac-header>` user rendering |
| 5.3 | Remove legacy TO nav handlers | Completed | Apr 7, 2026 | Legacy manual nav toggling replaced with `<ac-layout>` `section-change` bridge + refresh hooks |
| 5.4 | Validate script include order | Completed | Apr 7, 2026 | Updated to `config/api/auth` -> shared shell components -> section components -> `dashboard-init` -> local script |

## Progress Log
### April 7, 2026
- Task created after identifying TO as shell/navigation outlier in dashboard fleet.

### April 7, 2026 (Execution Update)
- Replaced legacy TO shell wrapper (`to-shell-header`, `to-shell-sidebar`, manual container/main-wrapper markup) with shared `<ac-layout>` and centralized nav configuration in `pages/dashboard/technical-officer/index.html`.
- Switched TO page script includes from legacy shell components to shared `ac-header`, `ac-sidebar`, and `ac-layout` components.
- Migrated TO navigation handling in `pages/dashboard/technical-officer/script.js` from manual `.nav-item` toggling to `<ac-layout>` `section-change` events with URL query-param sync and browser back/forward deep-link support.
- Aligned auth/bootstrap to shared `DashboardInit` by replacing direct `Auth.requireRole`/manual header population with `DashboardInit.init('Technical Officer', { updateUserDisplay: true })`.
- Updated notifications badge bridge in `components/notifications/script.js` to target `ac-layout ac-sidebar` with fallback to legacy TO sidebar.
- Validation: `node --check` and diagnostics passed for touched TO files.
