# TASK038 - Technical Officer Script Monolith Final Decomposition

**Status:** In Progress  
**Added:** April 14, 2026  
**Updated:** April 18, 2026

## Original Request
Supervisor and technical officer JS scripts are still monolithic. Analyze them and figure out why, and create tasks to address those issues via proper refactoring.

## Thought Process
High-level audit shows `pages/dashboard/technical-officer/script.js` is still large (1398 lines). The root causes are:
- Parent script still owns ticket lifecycle workflows and API actions (`loadTickets`, `startTicketWork`, `updateWork`, `initializeForms`, spare-part request submit flow).
- Parent script still includes fallback rendering templates with inline handlers (`onclick`) and action wiring when component methods are unavailable.
- TO dashboard HTML still includes multiple legacy page-level modals and inline handlers (`process`, `update work`, `request parts`, `view details`), forcing parent-level DOM and form management.
- Duplicate/overlapping lifecycle setup exists (`initializeDashboard` IIFE plus `DOMContentLoaded` bindings), increasing coupling and risk of double-binding.
- Legacy sample-data detail renderers remain in parent script (e.g., spare-part request details), which should be component-owned.

## Implementation Plan
- [ ] Create a precise ownership map for Technical Officer features and separate orchestration responsibilities from section/modal responsibilities.
- [ ] Extract remaining legacy modals into one-modal-per-component files under `pages/dashboard/technical-officer/components/page-modals/` and remove page-level modal blocks from HTML.
- [ ] Move ticket action workflows (start work, update work, complete/resolve, spare-part request submit) into ticket/modal components with component-local API handling.
- [ ] Remove fallback parent template renderers with inline handlers and ensure component APIs/events are the single interaction contract.
- [ ] Consolidate bootstrap/lifecycle initialization to one deterministic initialization path and eliminate duplicate binding risks.
- [ ] Re-run before/after UI validation for TO dashboard (desktop + mobile) covering tickets, spare-parts request flow, work updates, and notifications.

## Acceptance Criteria
- `pages/dashboard/technical-officer/script.js` is orchestration-only and does not own section/modal business logic.
- Legacy page-level modals and inline handlers in TO dashboard HTML are removed or replaced by component hosts.
- Ticket lifecycle actions are fully component-owned with parent script consuming explicit events only.
- Duplicate init/binding pathways are removed; no double-event behavior.
- Before/after validation evidence exists with no console/network regressions.

## Progress Tracking

**Overall Status:** In Progress - 25%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 38.1 | TO ownership audit and decomposition map | Not Started | April 14, 2026 | Identify all remaining parent-owned section/modal logic |
| 38.2 | Legacy TO modal extraction to page-modals | Not Started | April 14, 2026 | Remove page-level modal markup and inline handlers |
| 38.3 | Ticket workflow migration to components | In Progress | April 18, 2026 | TO ticket detail flow now uses actor-specific `to-ticket-detail-view` component that opens standalone view-ticket page directly (no iframe) with role override + return path, preserving existing view-ticket UI. |
| 38.4 | Parent script cleanup and bootstrap consolidation | Not Started | April 14, 2026 | Keep only orchestration responsibilities |
| 38.5 | Validation and regression guard | In Progress | April 18, 2026 | Updated TO routing assertions for direct detail-page navigation/back-return flow and revalidated desktop/mobile after removing shared iframe host files. |

## Progress Log
### April 14, 2026
- Task created from script decomposition analysis request.
- Confirmed TO parent script remains monolithic due legacy modal ownership, fallback inline template rendering, and parent-owned ticket lifecycle workflows.

### April 17, 2026
- Completed TO ticket-details route migration to dashboard section/component behavior using shared `ac-ticket-detail-view`.
- TO ticket-routing validation spec now asserts section activation + embedded frame behavior rather than full-page URL redirect.
- Executed `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js` (desktop + mobile passed).
- Re-executed TO routing validation after shared ticket-detail component UX updates (desktop + mobile passed).

### April 18, 2026
- Fixed shared ticket-detail dual-scroll behavior affecting TO ticket details by adding parent dashboard scroll lock to `ac-ticket-detail-view` while `ticket-details` is active.
- Added section-aware lock/unlock handling so normal dashboard scrolling resumes outside the ticket-details section.
- Re-executed `VAL_STAGE=after` `testing/ui-validation/to-ticket-routing/validate-to-ticket-routing.spec.js` (desktop + mobile passed).
- Re-executed `VAL_STAGE=after` `testing/ui-validation/supervisor-ticket-modals/validate-supervisor-ticket-modals.spec.js` as shared-component regression guard (desktop + mobile passed).
- Replaced Technical Officer dashboard ticket-detail section host with actor-specific `to-ticket-detail-view` component under `pages/dashboard/technical-officer/components/ticket-details/`.
- Updated TO orchestration to open `pages/view-ticket/index.html` directly (no iframe) with `TECHNICAL_OFFICER` role override and section return path.
- Updated TO routing validation suite assertions to verify direct detail-page navigation and back-return to dashboard section; after-stage desktop/mobile reruns passed.
