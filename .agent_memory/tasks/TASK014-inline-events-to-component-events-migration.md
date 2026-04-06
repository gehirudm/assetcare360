# TASK014 - Inline Events To Component Events Migration

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

## Original Request
Create comprehensive refactor tasks from all dashboard analysis.

## Thought Process
All active dashboards still have significant inline handlers (`onclick`, `onchange`, `oninput`) in HTML. This creates tight coupling and makes section extraction brittle. A cross-cutting task is needed to enforce event ownership inside components with custom-event communication.

## Implementation Plan
- [ ] Audit inline handlers by dashboard and section
- [ ] Move handlers into component class listeners
- [ ] Emit custom events for parent orchestration needs
- [ ] Remove global function dependencies from markup

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 14.1 | Inline handler inventory | Not Started | Apr 7, 2026 | Track by dashboard + section |
| 14.2 | Convert handlers in extracted components | Not Started | Apr 7, 2026 | No functionality regression |
| 14.3 | Introduce custom-event contracts | Not Started | Apr 7, 2026 | Parent orchestration only |
| 14.4 | Remove obsolete global handlers | Not Started | Apr 7, 2026 | Final cleanup pass |

## Progress Log
### April 7, 2026
- Task created from cross-dashboard inline-event density findings.
