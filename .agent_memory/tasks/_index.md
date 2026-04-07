# Tasks Index

## In Progress
- [TASK006] Technical Officer section componentization — Notifications, inventory, and feedback extracted (`to-notifications`, `to-inventory`, `to-feedback`); tickets, spare-parts, and service-warranty pending

## Pending
- [TASK004] Dashboard web-components refactor program — Coordinate scope, sequencing, and completion criteria across all dashboards
- [TASK005] Technical Officer shell and navigation migration — Move TO to ac-layout and remove legacy shell/navigation stack
- [TASK007] Supervisor dashboard componentization — Split all supervisor sections out of monolithic script
- [TASK009] Driver dashboard componentization — Decompose high-complexity script and modal-heavy sections
- [TASK010] Machinery Operator dashboard componentization — Extract section components and badge/event flows
- [TASK011] Maintenance dashboard componentization — Componentize sections and clean include-order issues
- [TASK012] SysAdministration dashboard componentization — Consolidate dual entrypoints and extract section components
- [TASK013] Auction dashboard componentization — Extract auction sections into dashboard-scoped components
- [TASK014] Inline events to component events migration — Remove inline handlers and adopt custom-event contracts
- [TASK016] Transportation Manager dashboard bootstrap — Define and scaffold empty dashboard before componentization
- [TASK003] Run migration 047 and update OpenAPI spec — migration not confirmed run; openapi.yaml needs update for budget/work-update changes
- [TASK018] RabbitMQ event architecture program — Coordinate implementation slices for backend publisher, consumers, scheduler, API, frontend, and reliability
- [TASK019] Define event envelope and domain catalog — Standardize versioned event payload contract and domain event constants
- [TASK020] Integrate RabbitMQ publisher into backend — Add php-amqplib-based EventPublisher and durable exchange configuration
- [TASK021] Emit business events after successful state changes — Instrument initial workflows to publish domain events post-success
- [TASK022] Build audit consumer service and storage — Persist full event payloads for traceability in audit logs
- [TASK023] Build notification consumer and notifications store — Consume selected events into user-facing notification records
- [TASK024] Implement service-due cron event producer — Publish scheduled service-due reminder events from cron
- [TASK025] Add notifications API endpoints — Expose notification list/read APIs and document in OpenAPI
- [TASK026] Frontend notifications API integration — Connect dashboard notification UI to backend endpoints with robust error handling
- [TASK027] Event pipeline reliability hardening — Add idempotency, manual ack discipline, and retry/DLQ operational safeguards

## Completed
- [TASK008] Inventory Manager dashboard componentization — All 8 sections extracted to dashboard-scoped components; monolith reduced from 3580 to 2672 lines — Completed April 7, 2026
- [TASK017] Completed-dashboard refactor quality cleanup — removed `-model` naming, componentized Inventory Manager popups, and migrated section modal/CRUD logic from monolith script — Completed April 7, 2026
- [TASK015] Dashboard script bootstrap normalization — Core include order normalized, duplicate config include removed, and auth redirect paths standardized — Completed April 7, 2026
- [TASK001] Technical Officer fault-ticket-detail page — Full dashboard shell, step flow, breadcrumb nav, style fixes — Completed April 6, 2026
- [TASK002] Budget step correctness — Zero-amount rejection, pending-budget gate, UI dash display — Completed April 6, 2026

## Abandoned
_(none)_
