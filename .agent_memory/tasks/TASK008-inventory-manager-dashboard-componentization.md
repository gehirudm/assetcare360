# TASK008 - Inventory Manager Dashboard Componentization

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

## Original Request
Create complete refactor task coverage for all dashboards.

## Thought Process
Inventory Manager has one of the largest scripts and broadest section set:
- `dashboard`
- `machines`
- `vehicles`
- `catalog`
- `orders-approvals`
- `sparepart-addition`
- `usage-tracking`
- `notifications`

Refactor must split each model boundary into dedicated components and reduce monolithic state handling.

## Implementation Plan
- [ ] Extract machines and vehicles management sections into independent components
- [ ] Extract catalog and sparepart-addition flows
- [ ] Extract orders/approvals and usage-tracking modules
- [ ] Extract notifications section and badge contract
- [ ] Keep API response handling aligned with backend model fields

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 8.1 | Extract asset management components | Not Started | Apr 7, 2026 | `machines` + `vehicles` |
| 8.2 | Extract spare-part catalog/addition components | Not Started | Apr 7, 2026 | Preserve validation behavior |
| 8.3 | Extract approvals/usage components | Not Started | Apr 7, 2026 | Keep status and count calculations |
| 8.4 | Extract notifications component | Not Started | Apr 7, 2026 | Badge updates via events |

## Progress Log
### April 7, 2026
- Task created from section map and script complexity profile.
