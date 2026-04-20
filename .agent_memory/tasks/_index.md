# Tasks Index

## In Progress
- [TASK003] Run Migration 047 and Update OpenAPI Spec
- [TASK037] Supervisor Script Monolith Final Decomposition - Ticket-detail flow uses actor-specific components; breakdown actions follow unified ticket-flow create-or-open behavior; active fault-ticket-tracking owns source filtering + newest-first ordering + route status formatting; shared modal hydration/budget guard hotfixes landed; shared `partsModal` card-visibility structure fix plus Supervisor ticket-detail fallback/style-cleanup fix are applied to keep View flow reliable and prevent post-detail button enlargement; embedded detail Assign Technician now reuses `supervisor-assign-ticket-modal` from list flow and assign-modal geometry parity is restored across list/detail triggers; latest follow-up normalizes route issue/location mapping so detail-triggered garage approval metadata matches list flow (broader decomposition pending)
- [TASK038] Technical Officer Script Monolith Final Decomposition - TO ticket detail flow uses actor-specific component + direct view-ticket navigation; shared view-ticket Request Spare Parts and Finish Work parity work is complete; latest hotfixes include modal-node hydration, budget DOM hardening, dashboard toast fallback, and shared `partsModal` structure repair verified by focused Playwright pass (broader decomposition pending)
- [TASK081] Driver Breakdown Detail Form Clarity - Refactor Driver ticket-tracking breakdown details modal (RBD/VBD) into clearer machinery-style form sections/rows; preserve workflow + garage data and validate desktop/mobile behavior

## Pending
- _(none)_

## Completed
- [TASK080] Reset Route Breakdown Sequence and Unify Supervisor View-Ticket Garage Approval Form - Completed on 2026-04-20
- [TASK079] Fix Route Breakdown ID Reuse and Purge RBD Data - Completed on 2026-04-20
- [TASK078] Prune In-Route Breakdown Reports Data to One Resolved Record - Completed on 2026-04-20
- [TASK077] Fix Route Breakdown Create 500 on Linked Ticket Validation - Completed on 2026-04-20 (follow-up schema-safe hardening completed same day)
- [TASK076] Restore Route Breakdown Garage Workflow Continuity - Completed on 2026-04-20
- [TASK075] Fix Ticket-Detail Return Button Size Bleed Across Dashboards - Completed on 2026-04-20
- [TASK074] Fix Supervisor Nearby Garage Modal In Ticket Detail - Completed on 2026-04-20
- [TASK073] Fix Supervisor View-Ticket Vehicle Details Rendering - Completed on 2026-04-20
- [TASK072] Prevent Duplicate Active Route Breakdown Tickets Per Vehicle - Completed on 2026-04-20
- [TASK071] Fix Driver In-Route Breakdown False Success Toast and Transaction Error - Completed on 2026-04-20
- [TASK070] Enable workflow recovery after spare-part rejection - Completed on 2026-04-20
- [TASK069] Fix Maintenance Manager budget approval internal server error - Completed on 2026-04-20
- [TASK068] Fix Inventory spare-part reject status and remove view-modal actions - Completed on 2026-04-20
- [TASK067] Inventory Vehicle Insurance Real-Data Mapping Fix - Completed on 2026-04-19
- [TASK066] Spare Part Approval Insufficient Stock Blocking - Completed on 2026-04-19
- [TASK065] Inventory Orders Approvals Modal Form Rendering Fix - Completed on 2026-04-19 (follow-up view-form alignment + light-blue background cleanup + approve-form parity for spare-parts request view completed on 2026-04-20)
- [TASK064] SysAdmin User Accounts List and Filter Fix - Completed on 2026-04-19
- [TASK063] Optional Insurance and Remove Last Service Date in Asset Add - Completed on 2026-04-19
- [TASK062] Driver Insurance-Claim Status and Supervisor Assignment Option - Completed on 2026-04-19
- [TASK054] Resolve Rebase Conflicts for Ticket-Detail Dashboard Stack - Completed on 2026-04-19
- [TASK061] Add Machinery Operator Single-Page Analytics Hub Charts - Completed on 2026-04-19
- [TASK060] Add Inventory Manager Single-Page Analytics Hub Charts - Completed on 2026-04-19
- [TASK059] Add Technical Officer Single-Page Analytics Hub Charts - Completed on 2026-04-19
- [TASK058] Add Supervisor Single-Page Analytics Hub Charts - Completed on 2026-04-19
- [TASK057] Add Transportation Manager Analytics Report Generation and Download - Completed on 2026-04-19
- [TASK056] Consolidate Transportation Manager Analytics Into Single Page - Completed on 2026-04-19
- [TASK055] Implement Transportation Manager Separate Analytics Pages - Completed on 2026-04-19
- [TASK054] Dashboard Chart Recommendation Roadmap - Completed on 2026-04-19
- [TASK053] Cross-dashboard fault-ticket sorting and filter-toolbar alignment - Completed on 2026-04-19
- [TASK052] Ensure New Tickets Render First - Completed on 2026-04-18
- [TASK051] Fix Machinery Operator Double Fault Ticket Creation - Completed on 2026-04-18
- [TASK050] Fix Driver And Machinery Operator Fault Reporting 500 - Completed on 2026-04-18
- [TASK049] Supervisor Insurance Claim Fault Ticket Flow - Completed on 2026-04-18
- [TASK048] Inventory Insurance Flow - Completed on 2026-04-18
- [TASK047] Unify Breakdown View and Auto-Create Fault Tickets - Completed on 2026-04-18
- [TASK046] Enforce Dangerous In-Route Priority Lock and Supervisor Visibility - Completed on 2026-04-17
- [TASK045] Refine Transportation Manager Cargo Catalogue and Add Details View - Completed on 2026-04-17
- [TASK044] Move Transportation Manager Cargo Management to Separate Sidebar Section - Completed on 2026-04-17
- [TASK043] Transportation Cargo Lifecycle and Dangerous Route Breakdown Escalation - Completed on 2026-04-17
- [TASK042] Route Breakdown Driver Location Capture and Map-Based Garage Approval - Completed on 2026-04-17
- [TASK041] Vehicle Government Fuel QR Image Flow - Completed on 2026-04-16
- [TASK040] Fuel Logging and TM Fleet Detail Enhancements - Completed on 2026-04-16
- [TASK039] Route Breakdown Garage Workflow Alignment - Completed on 2026-04-16

## Archived
- [TASK001] Technical Officer Fault Ticket Detail Page
- [TASK002] Budget Step Correctness
- [TASK004] Dashboard Web-Components Refactor Program
- [TASK005] Technical Officer Shell And Navigation Migration
- [TASK006] Technical Officer Section Componentization
- [TASK007] Supervisor Dashboard Componentization
- [TASK008] Inventory Manager Dashboard Componentization
- [TASK009] Driver Dashboard Componentization
- [TASK010] Machinery Operator Dashboard Componentization
- [TASK011] Maintenance Dashboard Componentization
- [TASK012] SysAdministration Dashboard Componentization
- [TASK013] Auction Dashboard Componentization
- [TASK014] Inline Events To Component Events Migration
- [TASK015] Dashboard Script Bootstrap Normalization
- [TASK016] Transportation Manager Dashboard Bootstrap
- [TASK017] Completed Dashboard Refactor Quality Cleanup
- [TASK018] RabbitMQ Event Architecture Program
- [TASK019] Define Event Envelope and Domain Catalog
- [TASK020] Integrate RabbitMQ Publisher into Backend
- [TASK021] Emit Business Events After Successful State Changes
- [TASK022] Build Audit Consumer Service and Storage
- [TASK023] Build Notification Consumer and Notifications Store
- [TASK024] Implement Service-Due Cron Event Producer
- [TASK025] Add Notifications API Endpoints
- [TASK026] Frontend Notifications API Integration
- [TASK027] Event Pipeline Reliability Hardening
- [TASK028] Fault Ticket Budget + Spare Workflow Correctness
- [TASK029] Supervisor + Maintenance Budget Approval Integration
- [TASK030] Currency Normalization to LKR Across Dashboards
- [TASK031] Shared Fault Ticket Detail Template/Component
- [TASK032] Budget Flow Notification Routing Scope
- [TASK033] Add Transportation Manager Role to User Creation
- [TASK034] Shared Fault Ticket Detail Page Refactor
- [TASK035] Technical Officer Fault Ticket Detail Migration And Page Removal
- [TASK036] Supervisor Residual Modal And Monolith Cleanup

## Abandoned
_(none)_
