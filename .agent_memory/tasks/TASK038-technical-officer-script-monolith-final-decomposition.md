# TASK038 - Technical Officer Script Monolith Final Decomposition

**Status:** In Progress  
**Added:** April 14, 2026  
**Updated:** April 20, 2026

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

**Overall Status:** In Progress - 60%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 38.1 | TO ownership audit and decomposition map | Not Started | April 14, 2026 | Identify all remaining parent-owned section/modal logic |
| 38.2 | Legacy TO modal extraction to page-modals | Not Started | April 14, 2026 | Remove page-level modal markup and inline handlers |
| 38.3 | Ticket workflow migration to components | In Progress | April 20, 2026 | TO ticket detail flow now uses actor-specific `to-ticket-detail-view` component that opens standalone view-ticket page directly (no iframe) with role override + return path, preserving existing view-ticket UI. Shared `pages/view-ticket` Request Spare Parts modal + submit flow and Finish Work modal + resolve workflow are now aligned with TO dashboard list modal semantics and payload contract. Hotfix updates now include shared detail inline-handler export correction and template hydration correction so TO component mode mounts required shared modal nodes (`budgetModal`, `partsModal`, `completeModal`, `assignModal`, `garageApprovalModal`) instead of only `body > .container`; shared runtime toast behavior is dashboard-compatible without duplicating template toast nodes. Follow-up April 20 fix corrected malformed shared `partsModal` HTML structure (missing inner `.modal` card wrapper) which previously showed only backdrop without modal card. |
| 38.4 | Parent script cleanup and bootstrap consolidation | Not Started | April 14, 2026 | Keep only orchestration responsibilities |
| 38.5 | Validation and regression guard | In Progress | April 20, 2026 | Updated TO routing assertions for direct detail-page navigation/back-return flow and revalidated desktop/mobile after removing shared iframe host files. Added focused TO request-spare-parts and finish-work validation suites with before/after desktop/mobile passes (`2/2` each stage per suite). Shared runtime hotfix was verified with `node --check pages/view-ticket/script.js` and supervisor detail regression suite rerun pass (`2/2`) as a direct guard for the shared page bootstrap path. Modal-hydration fixes continue to pass `to-ticket-routing` (`2/2`) and syntax checks. New April 20 regression verification passed `to-request-spare-parts-modal` (`2/2`) after correcting shared modal HTML structure. |

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
- Fixed TO detail-page spare-parts regression by replacing simplified Request Spare Parts modal in `pages/view-ticket/index.html` with TO dashboard list parity markup and field IDs.
- Reworked `pages/view-ticket/script.js` spare-parts flow to mirror TO list behavior: prefill ticket context, load products from `/products`, perform availability checks via `/spare-part-requests/check-availability`, submit TO-aligned payload to `/spare-part-requests`, and support no-spare-parts status advance (`PUT /fault-tickets/{id}` -> `In Progress`).
- Added focused validation spec `testing/ui-validation/to-request-spare-parts-modal/validate-to-request-spare-parts-modal.spec.js` and executed both `VAL_STAGE=before` and `VAL_STAGE=after` runs with desktop/mobile pass (`2/2` each), zero console warnings/errors, and zero failed requests.
- Replaced shared `pages/view-ticket` complete modal with TO fault-ticket list Finish Work modal structure (ticket ID, parts-used checklist, time spent, machine update description).
- Updated shared `submitComplete` workflow in `pages/view-ticket/script.js` to mirror TO list behavior by creating a ticket work update (`POST /ticket-work-updates`) and then resolving the ticket (`PUT /fault-tickets/{id}` with `status: Resolved` and `resolution_notes`).
- Added focused validation spec `testing/ui-validation/to-finish-work-modal/validate-to-finish-work-modal.spec.js` and executed both `VAL_STAGE=before` and `VAL_STAGE=after` runs with desktop/mobile pass (`2/2` each), zero console warnings/errors, and zero failed requests.

### April 19, 2026
- Fixed shared `pages/view-ticket/script.js` inline-handler export regression that broke detail-page bootstrap with `ReferenceError: addPartRow is not defined`.
- Updated handler exposure to export implemented functions used by `pages/view-ticket/index.html` (`addPartField`, `toggleSparePartsSection`, `submitInsuranceClaim`).
- Verified syntax with `node --check pages/view-ticket/script.js` and executed `VAL_STAGE=after` supervisor shared-page regression suite (`2/2` passed).

### April 19, 2026 (Cross-Role Modal Hydration + Budget Guard Hotfix)
- Root cause for TO budget modal crash was confirmed as component hydration mismatch: `to-ticket-detail-view` mounted only `body > .container` from shared template while budget/spare/complete/assign/garage modals are outside that node.
- Updated dashboard ticket-detail component template mounting in:
	- `pages/dashboard/technical-officer/components/ticket-details/script.js`
	- `pages/dashboard/supervisor/components/ticket-details/script.js`
	- `pages/dashboard/machinery-operator/components/ticket-details/script.js`
	to append shared template modal nodes `#budgetModal`, `#partsModal`, `#completeModal`, `#assignModal`, and `#garageApprovalModal`.
- Hardened budget flow runtime in `pages/view-ticket/script.js` with guarded modal element resolution (`getBudgetModalElements`, `ensureBudgetModalElements`) and null-safe open/close/hint/submit paths so missing DOM no longer throws runtime errors; updated `showToast(...)` fallback so dashboards without `#toastMessage` can still display messages.
- Validation evidence:
	- `node --check` passed for all touched scripts.
	- `VAL_STAGE=after npx playwright test to-ticket-routing/validate-to-ticket-routing.spec.js --reporter=line` passed (`2/2`).
	- Supervisor and MO suite reruns currently fail for environment/expectation reasons unrelated to budget modal line-level crash (`supervisor-fault-ticket-tracking` locator mismatch to rendered legacy section; MO suite redirects to `/auth/login.html` during sort assertions).

### April 20, 2026 (Shared Spare-Parts Modal Card Visibility Fix)
- Investigated user-reported state where view-ticket modal backdrop appeared but modal card did not.
- Root cause: malformed HTML structure in `pages/view-ticket/index.html` for `#partsModal`:
	- missing inner `<div class="modal">` wrapper expected by scoped modal styles (`#partsModal > .modal`),
	- stray `<div class="overview-actions" ...>` line left in modal block.
- Fixed markup by restoring valid modal nesting and removing the stray `overview-actions` node from the shared modal section.
- Validation evidence:
	- diagnostics clean for `pages/view-ticket/index.html`.
	- `VAL_STAGE=after npx playwright test to-request-spare-parts-modal/validate-to-request-spare-parts-modal.spec.js --reporter=line` passed (`2/2`).
