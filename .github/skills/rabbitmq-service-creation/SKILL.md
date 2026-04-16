---
name: rabbitmq-service-creation
description: 'Create or extend RabbitMQ-based services in AssetCare360 using the existing EventEnvelope, DomainEvents, EventPublisher/EventEmitter, bootstrap_events, DLQ, and idempotency patterns. Use when: adding a new event-driven backend service, creating a new consumer, introducing a scheduled event producer, wiring new routing keys, or integrating queue-based notifications/audit flows. Triggers: "create rabbitmq service", "add rabbitmq consumer", "add event producer", "new queue service", "event-driven service", "queue worker".'
argument-hint: 'Service objective, producer/consumer type, event names, routing targets, and expected persistence/API impact'
---

# RabbitMQ Service Creation (AssetCare360)

## Outcome

This skill produces a complete, project-compliant RabbitMQ service implementation that includes:
- Event contract updates (when needed)
- Producer or consumer code aligned to current architecture
- Queue/exchange/DLQ wiring and idempotency handling
- Required schema migration(s) for new persistence
- Operational wiring for local start/stop scripts
- Validation and completion evidence

## When To Use

Use this skill when you need to:
- Add a new backend service that consumes RabbitMQ events
- Add a new event producer (controller flow or scheduled producer)
- Extend routing keys and queue bindings for new domain behavior
- Add persistence for event processing outcomes
- Build event-driven features similar to audit and notifications pipelines

## Current System Anchors

Use these files as canonical references before implementation:
- Event catalog: [app/events/DomainEvents.php](../../../app/events/DomainEvents.php)
- Envelope rules: [app/events/EventEnvelope.php](../../../app/events/EventEnvelope.php)
- Publisher: [app/services/EventPublisher.php](../../../app/services/EventPublisher.php)
- Safe emitter wrapper: [app/services/EventEmitter.php](../../../app/services/EventEmitter.php)
- Consumer bootstrap helpers: [services/bootstrap_events.php](../../../services/bootstrap_events.php)
- Notification consumer pattern: [services/consume_notification_events.php](../../../services/consume_notification_events.php)
- Audit consumer pattern: [services/consume_audit_events.php](../../../services/consume_audit_events.php)
- Scheduled producer pattern: [services/check_service_due.php](../../../services/check_service_due.php)
- Event pipeline schema baseline: [migrations/048_create_event_pipeline_tables.php](../../../migrations/048_create_event_pipeline_tables.php)
- Event config constants: [config/config.php](../../../config/config.php)
- Service orchestration scripts: [start.sh](../../../start.sh), [stop.sh](../../../stop.sh)

## Decision Flow

1. Decide service type first:
- Emitter in request flow: emit event after successful domain write in controller/service.
- Long-running consumer: subscribe to queue and process event side-effects.
- Scheduled producer: poll DB/time windows and publish events periodically.

2. Decide event scope:
- Existing event matches use-case: reuse the existing `DomainEvents` constant.
- New event needed: add new constant in `DomainEvents` and include it in `all()`.

3. Decide persistence impact:
- No new storage required: reuse existing tables.
- New storage/indexes required: create new numbered migration file and run migrations.

4. Decide operational wiring:
- One-off script only: run manually.
- Managed service: add service entries in `start.sh` and `stop.sh`.

5. Decide API documentation impact:
- If endpoints or payload contracts changed: update [testing/openapi.yaml](../../../testing/openapi.yaml).

## Procedure

### 1) Define the event contract

1. Identify event name and payload fields.
2. If new event is required:
- Add constant to `DomainEvents` (uppercase snake case).
- Add it to `DomainEvents::all()` so `EventEnvelope::validate()` accepts it.
3. Keep payload stable and explicit (IDs, actor, timestamps, status values).

### 2) Implement producer side correctly

1. For request-driven domain actions:
- Use `EventEmitter` in controller/service.
- Emit only after primary state change is successful.
- Include useful `meta` (for example `source` or actor context).
2. For scheduled producer:
- Follow `check_service_due.php` pattern.
- Use lock/de-dup table strategy when emitting periodic reminders.

### 3) Implement consumer service

1. Create script under `services/` (for example `consume_<domain>_events.php`).
2. Start with:
- `#!/usr/bin/env php`
- `require_once __DIR__ . '/bootstrap_events.php';`
- `EVENTS_ENABLED` guard.
3. Rabbit wiring:
- Declare main exchange using configured constants.
- Call `declareDlx($channel)`.
- Declare queue with `queueArguments()`.
- Bind queue to required routing keys.
4. Throughput controls:
- Set `basic_qos` (current pattern uses 20).
5. Callback behavior:
- Parse JSON payload.
- Validate with `EventEnvelope::validate()`.
- Check idempotency with `processed_events` by `(consumer_name, event_uuid)`.
- Execute domain side-effects.
- Insert processed marker.
- `ack` on success and duplicates.
- `nack(false, true)` on recoverable failures with error logging.

### 4) Add persistence and migration (if needed)

1. Create new migration file with next number under `migrations/`.
2. Use safety checks (`tableExists`, `columnExists`) and idempotent DDL.
3. Preserve existing data when altering populated structures.
4. Run:
- `php scripts/migrate.php status`
- `php scripts/migrate.php migrate`

### 5) Wire service lifecycle scripts

If the consumer should be managed via helper scripts:
1. Add service name to `SERVICES` in [start.sh](../../../start.sh) and [stop.sh](../../../stop.sh).
2. Add runtime command mapping in `command_for_service()` in [start.sh](../../../start.sh).
3. Ensure logs and PID behavior align with current conventions.

### 6) Update API docs when applicable

If the RabbitMQ service introduces or changes API endpoints, request/response contracts, or auth behavior:
1. Update [testing/openapi.yaml](../../../testing/openapi.yaml).
2. Keep examples/errors aligned with backend behavior.

## Implementation Guardrails

- Do not bypass `EventEnvelope`; all published messages should conform to it.
- Do not hardcode broker topology outside config constants.
- Do not skip idempotency checks in consumers.
- Do not fail primary user workflows because event publishing failed (use emitter fail-safe behavior).
- Do not modify old migration files; always create a new numbered migration.

## Completion Checks

A RabbitMQ service task is complete only if all applicable checks pass:
- Event constant exists and validates (for new event names).
- Producer emits with expected routing key format (`lowercase.with.dots`).
- Queue/exchange/DLQ declarations succeed.
- Consumer handles duplicate events safely via `processed_events`.
- Side-effects persist correctly and are queryable.
- New schema changes are migrated successfully.
- Managed service start/stop wiring works when required.
- [testing/openapi.yaml](../../../testing/openapi.yaml) is updated when API contracts changed.
- No relevant syntax/lint/runtime errors in touched files.

## Quick Verification Commands

```bash
php scripts/migrate.php status
php scripts/migrate.php migrate

./start.sh audit-consumer
./start.sh notification-consumer
./start.sh service-due-producer

./stop.sh audit-consumer
./stop.sh notification-consumer
./stop.sh service-due-producer
```

## Example Prompts

- "Use rabbitmq-service-creation to add a consumer that reacts to FAULT_TICKET_CREATED and writes SLA tracking records."
- "Use rabbitmq-service-creation to add a scheduled producer that publishes overdue-maintenance events daily."
- "Use rabbitmq-service-creation to extend notifications for a new budget escalation event and wire start/stop scripts."
