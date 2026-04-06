# TASK005 - Technical Officer Shell And Navigation Migration

**Status:** Pending  
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
- [ ] Replace TO shell markup with `<ac-layout>` + nav config
- [ ] Migrate TO user header population to `<ac-header>` via `DashboardInit`
- [ ] Remove TO custom nav boilerplate and use `section-change` handling
- [ ] Keep existing section behavior and deep-link compatibility

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 5.1 | Replace `to-shell-*` with `ac-layout` | Not Started | Apr 7, 2026 | Preserve section IDs |
| 5.2 | Align auth init to `DashboardInit` | Not Started | Apr 7, 2026 | Remove direct `Auth.requireRole` bootstrap |
| 5.3 | Remove legacy TO nav handlers | Not Started | Apr 7, 2026 | Keep URL state behavior |
| 5.4 | Validate script include order | Not Started | Apr 7, 2026 | config/api/auth/components/init/script |

## Progress Log
### April 7, 2026
- Task created after identifying TO as shell/navigation outlier in dashboard fleet.
