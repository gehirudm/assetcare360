# Tasks Index

## In Progress
- [TASK003] Run migration 047 and update OpenAPI spec — OpenAPI updates completed; migration confirmation blocked by DB connection refusal in sandbox

## Pending
- [TASK036] Supervisor residual modal and monolith cleanup — Extract remaining create/assign/view ticket modals, move ticket rendering/actions into components, and reduce parent script to orchestration-only
- [TASK035] Technical Officer fault ticket detail migration and page removal — Remove dashboard-local TO detail page and repoint TO ticket links to canonical fault ticket detail page
- [TASK034] Shared fault ticket detail page refactor — Decompose `pages/view-ticket` monolith, remove inline handlers, and validate before/after desktop+mobile behavior
- [TASK033] Add Transportation Manager Role to User Creation — Add the missing role option to user creation/edit modals and filter tabs
- [TASK032] Budget-flow notification routing scope — Temporary broad notifications to all supervisors + maintenance managers; later narrow to controlling supervisor only

## Completed
- [TASK009] Driver dashboard componentization — all Driver sections extracted into dashboard-scoped components; one-modal-per-component decomposition completed; parent script reduced to orchestration-only; before/after Playwright validation passed on desktop + mobile — Completed April 12, 2026
- [TASK014] Inline events to component events migration — inline handlers removed across active dashboard scopes, including Driver closure with component-local handlers and custom-event orchestration contracts; before/after validation passed on desktop + mobile — Completed April 12, 2026
- [TASK010] Machinery Operator dashboard componentization — all sections and page modals extracted into dashboard-scoped components; parent script reduced to orchestration-only bridges; before/after Playwright validation passed on desktop + mobile — Completed April 12, 2026
- [TASK011] Maintenance dashboard componentization — all maintenance sections and page modals extracted into dashboard-scoped components with orchestration-only parent script; before/after Playwright validation passed for remaining scope plus cost/service regression reruns on desktop + mobile — Completed April 12, 2026
- [TASK012] SysAdministration dashboard componentization — all sections and page modals extracted into dashboard-scoped components; user-management API/edit flows migrated into `sa-user-accounts`; parent script reduced to orchestration-only bridges; before/after Playwright validation passed on desktop + mobile — Completed April 12, 2026
- [TASK013] Auction dashboard componentization — all auction sections extracted into dashboard-scoped components with one-modal-per-component modal decomposition and orchestration-only parent script; before/after Playwright validation passed on desktop + mobile — Completed April 12, 2026
- [TASK007] Supervisor dashboard componentization — all supervisor sections extracted to dashboard components with one-modal-per-component daily-check modals and orchestration-only parent bridges — Completed April 12, 2026
- [TASK005] Technical Officer shell and navigation migration — TO dashboard moved to `<ac-layout>` and shared DashboardInit/bootstrap/navigation contracts — Completed April 7, 2026
- [TASK006] Technical Officer section componentization — All major TO sections fully componentized; ticket list/filter/action UI moved to `<to-tickets>` with parent event bridges — Completed April 7, 2026
- [TASK008] Inventory Manager dashboard componentization — All 8 sections extracted to dashboard-scoped components; monolith reduced from 3580 to 2672 lines — Completed April 7, 2026
- [TASK017] Completed-dashboard refactor quality cleanup — removed `-model` naming, componentized Inventory Manager popups, migrated section modal/CRUD logic from monolith script, followed up with one-modal-per-component split plus modal-logic co-location, and extracted remaining machine/vehicle modal workflows into dedicated scripts — Completed April 7, 2026 (updated April 9, 2026)
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
- [TASK028] Fault-ticket budget + spare workflow correctness — Centralized status sync, concurrent optional request flow, approval-gated transitions, FK fix migration, and API E2E validation completed — Completed April 9, 2026
- [TASK029] Supervisor + Maintenance budget approval integration — Supervisor component and maintenance approvals wired to real budget APIs with review actions — Completed April 9, 2026
- [TASK030] Currency normalization to LKR across dashboards — Dashboard currency strings normalized from $, Rs., and ₹ to LKR formats — Completed April 9, 2026
- [TASK031] Shared fault-ticket detail template/component — Shared detail template helper added and integrated into TO detail + view-ticket entrypoint — Completed April 9, 2026

## Abandoned
_(none)_
