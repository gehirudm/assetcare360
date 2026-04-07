# TASK024 - Implement Service-Due Cron Event Producer

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

**Linked Beads Issue:** assetcare-backend-new-1cp

## Original Request
Add scheduler (cron) flow that checks assets approaching service due dates and emits events.

## Thought Process
Scheduled event production enables proactive reminders without adding latency to user-facing APIs.

## Implementation Plan
- [ ] Implement `scripts/check_service_due.php`
- [ ] Query assets near due threshold
- [ ] Publish `ASSET_SERVICE_DUE_SOON` events per eligible asset
- [ ] Add run logging and failure reporting
- [ ] Document cron schedule and deployment notes

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 24.1 | Service-due query logic implemented | Not Started | Apr 7, 2026 | Threshold-based |
| 24.2 | Event publication integrated | Not Started | Apr 7, 2026 | Uses EventPublisher |
| 24.3 | Cron execution documented | Not Started | Apr 7, 2026 | `*/10 * * * *` baseline |
| 24.4 | Duplicate-flood prevention added | Not Started | Apr 7, 2026 | Windowed dedup |

## Progress Log
### April 7, 2026
- Task created and linked to Beads issue `assetcare-backend-new-1cp`.
- Positioned as producer for reminder notifications.
