# TASK023 - Build Notification Consumer and Notifications Store

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

**Linked Beads Issue:** assetcare-backend-new-7i9

## Original Request
Create a notification worker that consumes selected events and persists user-facing notifications.

## Thought Process
Notifications should be generated asynchronously from domain events, not synchronous request paths. This keeps backend endpoints fast and decoupled.

## Implementation Plan
- [ ] Create notifications persistence schema/model (migration if needed)
- [ ] Implement durable notification queue binding
- [ ] Map event types to notification messages
- [ ] Persist notifications with read status default unread
- [ ] Add manual ack and error handling behavior

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 23.1 | Notifications schema/model ready | Not Started | Apr 7, 2026 | `notifications` table |
| 23.2 | Notification worker implemented | Not Started | Apr 7, 2026 | Queue + consume loop |
| 23.3 | Event-to-message mapping implemented | Not Started | Apr 7, 2026 | Initial event set |
| 23.4 | Manual ack behavior verified | Not Started | Apr 7, 2026 | Retry on failures |

## Progress Log
### April 7, 2026
- Task created and linked to Beads issue `assetcare-backend-new-7i9`.
- Sequenced after RabbitMQ publisher integration.
