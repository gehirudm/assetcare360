# TASK024 - Implement Service-Due Cron Event Producer

**Status:** Completed  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

**Linked Beads Issue:** assetcare-backend-new-1cp

## Original Request
Add scheduler (cron) flow that checks assets approaching service due dates and emits events.

## Thought Process
Scheduled event production enables proactive reminders without adding latency to user-facing APIs.

## Implementation Plan
- [x] Implement `scripts/check_service_due.php`
- [x] Query assets near due threshold
- [x] Publish `ASSET_SERVICE_DUE_SOON` events per eligible asset
- [x] Add run logging and failure reporting
- [x] Document cron schedule and deployment notes

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 24.1 | Service-due query logic implemented | Complete | Apr 7, 2026 | Threshold-based |
| 24.2 | Event publication integrated | Complete | Apr 7, 2026 | Uses EventPublisher |
| 24.3 | Cron execution documented | Complete | Apr 7, 2026 | `*/10 * * * *` baseline |
| 24.4 | Duplicate-flood prevention added | Complete | Apr 7, 2026 | Windowed dedup |

## Progress Log
### April 7, 2026
- Task created and linked to Beads issue `assetcare-backend-new-1cp`.
- Positioned as producer for reminder notifications.

### April 7, 2026
- Added check_service_due cron producer with threshold queries, dedup locks, and ASSET_SERVICE_DUE_SOON event emission.
