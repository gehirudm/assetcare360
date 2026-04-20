# [TASK073] - Notification Workflow Memory-First Agent

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Extend the memory-first coding agent instructions and create a new coding agent specialized for end-to-end notification workflows.
- Analyze how notifications are produced via RabbitMQ, consumed, persisted, and shown on dashboards.
- Ensure the new agent can efficiently implement new action-triggered notifications.

## Thought Process
- Build a dedicated custom agent under `.github/agents/` using the agent-customization template.
- Encode real repository notification pipeline behavior (EventEnvelope, DomainEvents, EventEmitter/EventPublisher, notification/email consumers, idempotency, API endpoints, dashboard surfaces).
- Preserve memory-first lifecycle discipline as non-negotiable behavior in the new agent.

## Implementation Plan
- Read create-agent and agent-customization references and templates.
- Inspect backend event/notification pipeline files and dashboard notification rendering paths.
- Draft a new `.agent.md`-style custom agent file under `.github/agents/` with memory-first + notification workflow constraints.
- Update `.agent_memory` task/context/progress records.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Load customization templates and memory context | Complete | 2026-04-20 | Loaded create-agent skill and agent-customization references; read memory core files. |
| 1.2 | Analyze current notification architecture | Complete | 2026-04-20 | Reviewed RabbitMQ producer/consumer, notification model/controller/routes, dashboard surfaces, and OpenAPI. |
| 1.3 | Create specialized agent instructions | Complete | 2026-04-20 | Added `.github/agents/notification-workflow-memory-first.agent.md` with end-to-end workflow procedure and guardrails. |
| 1.4 | Sync memory/task state | Complete | 2026-04-20 | Updated task index, active context, and progress records. |

## Progress Log
### 2026-04-20
- Verified agent-customization references and discovered template location under extension `.../agent-customization/references/agents.md`.
- Analyzed notification pipeline architecture:
  - event contract: `app/events/DomainEvents.php`, `app/events/EventEnvelope.php`
  - publisher/emitter: `app/services/EventPublisher.php`, `app/services/EventEmitter.php`
  - consumers/bootstrap: `services/bootstrap_events.php`, `services/consume_notification_events.php`, `services/consume_email_events.php`, `services/consume_audit_events.php`
  - producer loop: `services/check_service_due.php`
  - notification persistence/API: `app/models/Notification.php`, `app/controllers/NotificationController.php`, routes in `public/index.php`
  - docs/schema: `testing/openapi.yaml`, `migrations/048_create_event_pipeline_tables.php`
  - dashboard presentation patterns: TO/inventory components and role-specific notification surfaces.
- Created new custom agent:
  - `.github/agents/notification-workflow-memory-first.agent.md`
  - includes memory-first workflow, notification trigger-to-delivery procedure, idempotency and envelope guardrails, API/doc expectations, and validation/output requirements.
- Finalized default execution policies inside the agent to remove ambiguity when prompts omit details:
  - email parity ON by default for new business-critical events,
  - TO notifications default to `/notifications` as source of truth,
  - static/mock role notification panels are migrated to backend-backed rendering when real workflow notifications are requested,
  - recipient scope defaults to least broad audience.
