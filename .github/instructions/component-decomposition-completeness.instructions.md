---
description: "Use when refactoring dashboard pages into components. Enforces complete section extraction, one-modal-per-component decomposition, shared-first reuse checks, and strict component placement rules."
applyTo:
  - "pages/dashboard/**"
  - "pages/components/shared/**"
  - "pages/components/styles/**"
---
# Component Decomposition Completeness

## Rule 1 - Extract every dashboard section with its logic
When refactoring a dashboard page, all content sections must be extracted into section components.

For every extracted section, move both UI and section-specific JavaScript from the dashboard main script into the component.

This includes:
- Section templates/markup
- Section event listeners and handlers
- Section-specific state, validation, and rendering logic
- Section-specific API calls and response mapping
- Section-specific business/workflow logic

Leaving section logic in the main dashboard script is not allowed.

## Rule 2 - Extract modals one modal per component with logic co-location
Every dashboard modal must be extracted as one modal per component.

Any modal-related logic must live in that modal component, including:
- Open/close flows
- Submit/update/delete handlers
- Modal-specific validation
- Modal-specific API interactions
- Modal-local helper behavior

Do not keep modal logic in the dashboard main script after extraction.

## Rule 3 - Main script must be cleared after extraction
After section and modal extraction, the dashboard main script must be reduced to orchestration-only code. Keep only:
- Auth/bootstrap
- Layout/section navigation wiring
- Cross-component coordination
- Shared utilities used by multiple components

If logic is used by only one extracted component, it must be moved into that component. Remove migrated selectors, handlers, and feature state from the main script.

## Rule 4 - Shared-first component decision is mandatory
Before creating dashboard-specific components, always check whether the content/logic can be shared.

- If reusable across dashboards, create or use a shared component under `pages/components/shared`.
- If reusable shared styles are needed, place them under `pages/components/styles`.
- Only keep a component dashboard-specific if it is truly actor/dashboard-specific.

## Rule 5 - Required file placement rules
Use this structure strictly:

- Shared Components: `pages/components/shared`
- Shared Styling: `pages/components/styles`
- Dashboard-Specific Components: `pages/dashboard/[actor]/components`
- Dashboard-Specific Modals: `pages/dashboard/[actor]/components/page-modals`

## Rule 6 - Required completion checks for every dashboard refactor
Before marking a refactor complete, verify:
- Every dashboard section has been extracted to components
- Every dashboard modal has been extracted one-modal-per-component
- Main script no longer contains section-specific or modal-specific logic
- Parent/main script has no selectors/handlers for removed child markup
- No inline handlers remain for migrated interactions
- Extracted components expose explicit events or methods for parent integration
- Parent uses component events/methods instead of feature-internal DOM wiring
- Shared reuse checks were done; reusable content moved to shared component/style locations
- Syntax and diagnostics pass for all touched files
