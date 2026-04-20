# Tasks Index

## In Progress
- [TASK063] Service Ticket Requirement Compliance Audit - Evidence audit complete; remediation now includes TO detail-page start/end operations with component-level completion comments, TO service-ticket unified filter/search/sort toolbar with Created Date/Priority sorting, TO list action removal in favor of detail-only service actions, TO completion form next-service-date removal, TO service-ticket detail-view visual flow parity, MM Service Report section-based detail navigation with return-context handling, MM report detail component-comment rendering, predefined service-type dropdown in MM create-service-ticket modal, `Expected Completion Date` modal field labeling mapped to backend scheduling field, required technician selection (no `Leave Unassigned` option) in MM create-service-ticket modal, hardened MM create-ticket UI validation (including no past expected-completion date), pending-assignment flow-state normalization in MM service-ticket detail view, completed-only `Service Report Details` visibility in MM detail view, pending-only delete action in MM service-ticket detail view, and service-ticket API schema updates; maintenance remaining-sections and maintenance service-reports suites are aligned/passing; remaining gap is service-interval editing controls
- [TASK003] Run Migration 047 and Update OpenAPI Spec
- [TASK037] Supervisor Script Monolith Final Decomposition - Ticket-detail flow uses actor-specific components; breakdown actions follow unified ticket-flow create-or-open behavior; Technician Assignment section removed and active fault-ticket-tracking now owns source filtering + newest-first ordering + route status formatting; list map actions removed and route map context embedded in detail view; latest supervisor detail-page garage-approval modal centering/map-selection regression fixed, and missing driver vehicle breakdown feed restored in active list with desktop/mobile validation pass (broader decomposition pending)
- [TASK038] Technical Officer Script Monolith Final Decomposition - TO ticket detail flow now uses actor-specific component and direct view-ticket navigation; shared view-ticket Request Spare Parts and Finish Work modal/logic now aligned to TO list flow with focused before/after desktop/mobile validation suites passing; TO Asset Feedback section removed from nav/shell and legacy feedback links normalize to dashboard; broader decomposition pending

## Pending
- _(none)_

## Completed
- [TASK091] Profile Activity Log Login Activities - Added authenticated login-activity API and dynamic profile Activity tab rendering with OpenAPI/Postman/test updates
- [TASK090] Profile Page Breadcrumbs - Added profile content-subheader breadcrumb trail with role-aware dashboard link and validation coverage
- [TASK089] Profile Header Styling and Back Button Relocation - Styled profile top header to match dashboard patterns and moved back navigation into content subheader with validation coverage
- [TASK088] Inventory Insurance Renewal Modal Asset Details Polish - Replaced plain modal subtitle with structured asset-details card and validated desktop/mobile rendering
- [TASK087] Inventory Insurance Scheduled Filter and Sorting - Added Scheduled filter and sort controls in Insurance Management, with updated desktop/mobile UI validation coverage
- [TASK086] Inventory Insurance Summary Section Removal - Removed the Insurance Management summary block from Inventory Manager dashboard and aligned UI validation to assert summary absence while keeping renewal flow coverage
- [TASK085] Auction Assets From Inventory-Marked Status - Wired Auction Assets section to live machine/vehicle API data filtered by `For Auction` status so Inventory Manager marked assets appear automatically
- [TASK084] Auction Overview Actions-Only Simplification - Replaced Auction overview content with exactly 4 section-action buttons and removed all other overview blocks; added regression validation for 4-button-only state
- [TASK083] Auction Dashboard Header Style Alignment - Aligned Auction Officer header styling with shared dashboard header pattern and added Auction UI regression checks for header layout structure
- [TASK082] Maintenance Analytics Remove Service Activity Distribution - Removed Service Activity Distribution chart from Service & Warranty analytics panel, removed related chart render path, and aligned maintenance analytics validation to 2 service charts
- [TASK081] Maintenance Analytics Remove Notification Analytics - Removed Notification Analytics tab/panel/report paths from maintenance analytics hub and aligned maintenance analytics validation to the new 4-view model
- [TASK070] TO Service Ticket Spare Part Request Flow - Completed backend dual-context spare-part request support (fault/service), TO detail-page request modal integration, migration 063 execution, OpenAPI updates, and TO routing validation (desktop/mobile)
- [TASK071] Service Start Expected Completion Date Capture - Added TO start-time expected completion date capture/validation (detail + no-spare modal paths), persisted to service tickets, surfaced in MM detail view, and updated OpenAPI/start-endpoint docs
- [TASK072] TO Service Detail End-Operation Button Lock - Fixed post-start disabled end-operation button in TO detail view by correcting busy-state re-render timing and added regression coverage for immediate clickability without refresh
- [TASK073] Notification Workflow Memory-First Agent - Added `.github/agents/notification-workflow-memory-first.agent.md` specialized for end-to-end action->event->RabbitMQ->consumer->dashboard notification delivery with strict memory-first discipline
- [TASK074] TO Service Detail Action Button Copy and Width - Removed `(Optional)` from Request Spare Parts label and enforced equal-width Request Spare Parts/Start Service buttons with responsive mobile fallback
- [TASK075] TO Start Service Proper Modal - Replaced browser prompt-based Start Service flow with in-component modal (expected completion date capture), updated event handlers/state flow, and refreshed TO routing Playwright validation to modal submission interactions
- [TASK076] Hide Empty Service Report Details in TO View - Made TO Service Report Details conditional on actual report data, refined detection logic to avoid false positives, and added regression assertions in TO routing validation
- [TASK077] Maintenance Service Management Overdue Sorting - Added Service Management asset sorting options (including most-overdue), implemented sort-state comparators, and validated with maintenance remaining-sections desktop/mobile suite
- [TASK078] TO Start Service Modal Center Alignment Fix - Fixed right-edge modal alignment by moving Start Service modal to a body-level overlay portal, preserved behavior with portal handlers, and added center-alignment regression assertion in TO routing validation
- [TASK079] TO Service Ticket Expected Cost Visibility - Added Expected Cost to always-visible TO detail overview, aligned cost label terminology, and validated via TO routing desktop/mobile suite
- [TASK080] Maintenance Overview Actions-Only Dashboard - Reduced maintenance dashboard overview to 4 section-navigation action cards, removed all other overview blocks, added API-backed live counts, and validated with maintenance remaining-sections desktop/mobile suite

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
- [TASK039] Route Breakdown Garage Workflow Alignment
- [TASK040] Fuel Logging and TM Fleet Detail Enhancements
- [TASK041] Vehicle Government Fuel QR Image Flow
- [TASK042] Route Breakdown Driver Location Capture and Map-Based Garage Approval
- [TASK043] Transportation Cargo Lifecycle and Dangerous Route Breakdown Escalation
- [TASK044] Move Transportation Manager Cargo Management to Separate Sidebar Section
- [TASK045] Refine Transportation Manager Cargo Catalogue and Add Details View
- [TASK046] Enforce Dangerous In-Route Priority Lock and Supervisor Visibility
- [TASK047] Unify Breakdown View and Auto-Create Fault Tickets
- [TASK048] Inventory Insurance Flow
- [TASK049] Supervisor Insurance Claim Fault Ticket Flow
- [TASK050] Fix Driver And Machinery Operator Fault Reporting 500
- [TASK051] Fix Machinery Operator Double Fault Ticket Creation
- [TASK052] Ensure New Tickets Render First
- [TASK053] Cross-dashboard fault-ticket sorting and filter-toolbar alignment
- [TASK054] Dashboard Chart Recommendation Roadmap
- [TASK054] Resolve Rebase Conflicts for Ticket-Detail Dashboard Stack
- [TASK055] Implement Transportation Manager Separate Analytics Pages
- [TASK056] Consolidate Transportation Manager Analytics Into Single Page
- [TASK057] Add Transportation Manager Analytics Report Generation and Download
- [TASK057] Fix TM Assign-Driver Availability Labeling
- [TASK058] Add Supervisor Single-Page Analytics Hub Charts
- [TASK058] Block Driver Unassign When Active Trip Exists
- [TASK059] Add Technical Officer Single-Page Analytics Hub Charts
- [TASK060] Add Inventory Manager Single-Page Analytics Hub Charts
- [TASK061] Add Machinery Operator Single-Page Analytics Hub Charts
- [TASK062] Implement Service Ticket Management Workflow
- [TASK064] Remove Maintenance Section Shell Wrapper Shadow
- [TASK065] Remove Maintenance Refresh Buttons
- [TASK066] Login IP Rate Limiting and CSRF
- [TASK067] Maintenance Service Ticket Asset-Level View Flow
- [TASK068] Lock Asset on List-Triggered Service Ticket Modal
- [TASK069] Maintenance Service Ticket Details Component Flow

## Abandoned
_(none)_
