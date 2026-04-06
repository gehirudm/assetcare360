# TASK004 - Dashboard Web-Components Refactor Program

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

## Original Request
Analyze all dashboards and create complete refactoring tasks in both agent memory and Beads for the modular Web Components migration.

## Thought Process
The dashboard layer has nine role folders with uneven maturity:
- Seven dashboards are on `<ac-layout>` but still have large monolithic scripts and many inline events.
- Technical Officer still uses `to-shell-header`/`to-shell-sidebar` and custom navigation logic.
- Transportation Manager is currently empty.
- Script sizes (up to ~4k lines) indicate high-value incremental extraction into section components.

A program-level task is needed to coordinate per-dashboard extraction order, shared standards, and rollout checkpoints.

## Implementation Plan
- [ ] Finalize role-by-role extraction order and milestones
- [ ] Define component acceptance criteria (state ownership, events, API boundaries)
- [ ] Track cross-dashboard constraints (auth init, script load order, shell parity)
- [ ] Coordinate completion criteria and handoff for each dashboard

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 4.1 | Finalize refactor sequence | Not Started | Apr 7, 2026 | Prioritize highest script complexity first |
| 4.2 | Define done criteria per section | Not Started | Apr 7, 2026 | Component owns state/events/API |
| 4.3 | Establish cross-dashboard checkpoints | Not Started | Apr 7, 2026 | Shell, auth, events, style isolation |
| 4.4 | Maintain progress synchronization with Beads | Not Started | Apr 7, 2026 | Task IDs mapped to issue IDs |

## Progress Log
### April 7, 2026
- Task created from full dashboard analysis and refactor planning request.
