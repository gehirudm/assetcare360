# TASK020 - Integrate RabbitMQ Publisher into Backend

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

**Linked Beads Issue:** assetcare-backend-new-506

## Original Request
Add RabbitMQ publishing capability in PHP backend using `php-amqplib/php-amqplib` and a reusable service.

## Thought Process
Event emission must be centralized so controllers do not duplicate broker details. Publisher behavior should be configurable, durable, and fail-safe.

## Implementation Plan
- [ ] Install php-amqplib dependency
- [ ] Add backend RabbitMQ configuration (host, port, credentials, exchange)
- [ ] Implement `EventPublisher` service with durable exchange declaration
- [ ] Implement standardized publish method using event contract
- [ ] Add safe error handling/logging strategy

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 20.1 | Dependency installed | Not Started | Apr 7, 2026 | Composer package |
| 20.2 | RabbitMQ config introduced | Not Started | Apr 7, 2026 | Environment-driven |
| 20.3 | EventPublisher class implemented | Not Started | Apr 7, 2026 | Durable exchange |
| 20.4 | Publish error handling strategy applied | Not Started | Apr 7, 2026 | Non-corrupting failures |

## Progress Log
### April 7, 2026
- Task created and linked to Beads issue `assetcare-backend-new-506`.
- Sequenced after event contract definition.
