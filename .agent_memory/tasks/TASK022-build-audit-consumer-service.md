# TASK022 - Build Audit Consumer Service and Storage

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

**Linked Beads Issue:** assetcare-backend-new-2jm

## Original Request
Create an audit consumer that reads events from RabbitMQ and stores full payloads for traceability.

## Thought Process
Audit logging is the easiest high-value consumer and validates end-to-end event flow before building notification UX.

## Implementation Plan
- [ ] Create `audit_logs` persistence schema (migration if needed)
- [ ] Implement durable queue binding (`audit_queue` → `events` exchange)
- [ ] Consume and persist full event payload JSON
- [ ] Use manual ack and failure-safe handling
- [ ] Add duplicate handling strategy for idempotency

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 22.1 | Audit storage ready | Not Started | Apr 7, 2026 | `audit_logs` schema |
| 22.2 | Audit worker implemented | Not Started | Apr 7, 2026 | Queue + bind + consume |
| 22.3 | Manual ack and retry-safe behavior added | Not Started | Apr 7, 2026 | No message loss on failure |
| 22.4 | Traceability verification complete | Not Started | Apr 7, 2026 | Full payload retained |

## Progress Log
### April 7, 2026
- Task created and linked to Beads issue `assetcare-backend-new-2jm`.
- Positioned as first consumer implementation slice.
