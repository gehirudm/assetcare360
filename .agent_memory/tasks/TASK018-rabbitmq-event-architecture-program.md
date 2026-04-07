# TASK018 - RabbitMQ Event Architecture Program

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

**Linked Beads Issue:** assetcare-backend-new-lm7

## Original Request
Create actionable implementation tasks for a practical PHP + RabbitMQ event-driven architecture, including backend event publishing, audit and notification consumers, scheduler events, API access, frontend integration, and production reliability controls.

## Thought Process
This is a cross-cutting architecture change touching backend, data model, worker processes, scheduling, and frontend consumption. To keep implementation practical and low-risk, work is decomposed into independently deliverable slices with clear dependencies and acceptance criteria.

## Implementation Plan
- [ ] Establish event contract and event catalog
- [ ] Integrate RabbitMQ publisher in backend
- [ ] Emit core business events after successful writes
- [ ] Build audit consumer and persistence
- [ ] Build notification consumer and notifications persistence
- [ ] Add scheduler-based service-due event producer
- [ ] Expose notifications via backend APIs
- [ ] Integrate frontend notifications UI with APIs
- [ ] Harden pipeline for idempotency, acks, retries, and durability

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 18.1 | Program setup and dependency mapping | Not Started | Apr 7, 2026 | Parent orchestration task |
| 18.2 | Backend event production pipeline | Not Started | Apr 7, 2026 | Event contract + publisher + emitters |
| 18.3 | Consumer services implementation | Not Started | Apr 7, 2026 | Audit + notification workers |
| 18.4 | Notification delivery path | Not Started | Apr 7, 2026 | API + frontend integration |
| 18.5 | Reliability and production hardening | Not Started | Apr 7, 2026 | Idempotency, ack, retry, durability |

## Progress Log
### April 7, 2026
- Program task created from architecture implementation request.
- Linked to Beads epic `assetcare-backend-new-lm7`.
- Child implementation tasks created in memory bank and Beads.
