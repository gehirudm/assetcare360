# TASK027 - Event Pipeline Reliability Hardening

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

**Linked Beads Issue:** assetcare-backend-new-81v

## Original Request
Harden RabbitMQ event flow for duplicates, reliability, acknowledgements, and retry behavior.

## Thought Process
At-least-once delivery means duplicates are expected. Idempotency and ack discipline are mandatory for production safety.

## Implementation Plan
- [ ] Add event UUID idempotency tracking strategy
- [ ] Ensure durable exchange/queues are consistently configured
- [ ] Switch consumers to manual ack success path
- [ ] Add failure path behavior (nack/retry policy)
- [ ] Document retry/dead-letter handling and operational checklist

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 27.1 | Idempotency strategy implemented | Not Started | Apr 7, 2026 | Processed-event tracking |
| 27.2 | Durability settings validated | Not Started | Apr 7, 2026 | Exchange/queue persistence |
| 27.3 | Manual ack flow completed | Not Started | Apr 7, 2026 | Ack only on success |
| 27.4 | Retry and DLQ policy documented | Not Started | Apr 7, 2026 | Production operations |

## Progress Log
### April 7, 2026
- Task created and linked to Beads issue `assetcare-backend-new-81v`.
- Sequenced after consumer and scheduler slices.
