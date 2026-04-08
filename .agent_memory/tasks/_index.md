# Tasks Index

## In Progress
- [TASK007] Supervisor dashboard componentization — dashboard-overview, fault-tickets, asset-status, repair-management, technicians, and budget extracted; daily-check-reports still pending
- [TASK003] Run migration 047 and update OpenAPI spec — OpenAPI updates completed; migration confirmation blocked by DB connection refusal in sandbox

## Pending
- [TASK009] Driver dashboard componentization — Decompose high-complexity script and modal-heavy sections
- [TASK010] Machinery Operator dashboard componentization — Extract section components and badge/event flows
- [TASK011] Maintenance dashboard componentization — Componentize sections and clean include-order issues
- [TASK012] SysAdministration dashboard componentization — In progress: entrypoint consolidated, overview/user-accounts/service-config extracted; remaining sections pending
- [TASK013] Auction dashboard componentization — Extract auction sections into dashboard-scoped components
- [TASK014] Inline events to component events migration — Remove inline handlers and adopt custom-event contracts
- [TASK016] Transportation Manager dashboard bootstrap — Define and scaffold empty dashboard before componentization
- [TASK003] Run migration 047 and update OpenAPI spec — migration not confirmed run; openapi.yaml needs update for budget/work-update changes

## Completed
- [TASK005] Technical Officer shell and navigation migration — TO dashboard moved to `<ac-layout>` and shared DashboardInit/bootstrap/navigation contracts — Completed April 7, 2026
- [TASK006] Technical Officer section componentization — All major TO sections fully componentized; ticket list/filter/action UI moved to `<to-tickets>` with parent event bridges — Completed April 7, 2026
- [TASK008] Inventory Manager dashboard componentization — All 8 sections extracted to dashboard-scoped components; monolith reduced from 3580 to 2672 lines — Completed April 7, 2026
- [TASK017] Completed-dashboard refactor quality cleanup — removed `-model` naming, componentized Inventory Manager popups, and migrated section modal/CRUD logic from monolith script — Completed April 7, 2026
- [TASK015] Dashboard script bootstrap normalization — Core include order normalized, duplicate config include removed, and auth redirect paths standardized — Completed April 7, 2026
- [TASK018] RabbitMQ event architecture program — Event contract, publisher, emitters, consumers, service-due producer, notifications API/UI, and reliability controls delivered — Completed April 7, 2026
- [TASK019] Define event envelope and domain catalog — DomainEvents catalog and EventEnvelope validation implemented — Completed April 7, 2026
- [TASK020] Integrate RabbitMQ publisher into backend — php-amqplib dependency + durable topic exchange publisher added — Completed April 7, 2026
- [TASK021] Emit business events after successful state changes — Event emission added to assets, fault tickets, budget, and spare-part workflows — Completed April 7, 2026
- [TASK022] Build audit consumer service and storage — audit consumer + event_audit_logs persistence implemented — Completed April 7, 2026
- [TASK023] Build notification consumer and notifications store — notification consumer + notifications persistence implemented — Completed April 7, 2026
- [TASK024] Implement service-due cron event producer — scheduled producer script with dedup locks implemented — Completed April 7, 2026
- [TASK025] Add notifications API endpoints — `/notifications` and `/notifications/read` endpoints added and documented — Completed April 7, 2026
- [TASK026] Frontend notifications API integration — Technical Officer notifications now API-driven with read-state updates — Completed April 7, 2026
- [TASK027] Event pipeline reliability hardening — processed-event idempotency, manual ack/nack, and DLQ wiring implemented — Completed April 7, 2026
- [TASK016] Transportation Manager dashboard bootstrap — Implemented baseline `<ac-layout>` shell, auth/bootstrap routing, and initial dashboard overview component scaffold — Completed April 7, 2026
- [TASK004] Dashboard web-components refactor program — Program sequencing, standards, and Beads synchronization finalized across child dashboard tasks — Completed April 7, 2026
- [TASK018] RabbitMQ event architecture program — Program decomposition and dependency mapping completed; execution delegated to TASK019–TASK027 — Completed April 7, 2026
- [TASK001] Technical Officer fault-ticket-detail page — Full dashboard shell, step flow, breadcrumb nav, style fixes — Completed April 6, 2026
- [TASK002] Budget step correctness — Zero-amount rejection, pending-budget gate, UI dash display — Completed April 6, 2026

## Abandoned
_(none)_
