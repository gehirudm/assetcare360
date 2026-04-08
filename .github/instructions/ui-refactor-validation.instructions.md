---
description: "Use when refactoring frontend UI pages or components. Requires before-and-after UI validation using available testing skills/tools to catch regressions, runtime errors, and visual issues."
applyTo: "pages/**"
---
# UI Refactor Validation

## Rule 1 - Capture baseline before UI refactor

Before changing UI structure, styling, or interaction logic in frontend files, capture the current behavior of the target UI area.

- Open the target page and reach the exact section/state that will be refactored.
- Record baseline evidence using available tools (for example webapp-testing and browser automation tools):
  - Accessibility snapshot of the relevant area
  - Console errors and warnings
  - Failed network requests
  - Core interactive states used by the feature (tabs, filters, modals, forms, section navigation)

## Rule 2 - Re-run the same checks after refactor

After refactor changes are complete, run the same checks against the same UI area and interaction path.

- Compare post-change behavior with baseline.
- Treat newly introduced console errors, warnings, failed requests, broken interactions, missing content, and layout regressions as blockers.

## Rule 3 - Do not close refactor work with unresolved UI regressions

If the refactor introduces UI issues, fix them before considering the task complete.

- Resolve regressions in the same change where possible.
- If a blocker cannot be resolved immediately, explicitly report it with evidence and impact.

## Rule 4 - Include UI validation evidence in the completion summary

When reporting completed UI refactors, include a concise verification summary.

- Which page/section was validated
- Which interactions were tested
- Console/network status after refactor
- Final result (no regressions, or remaining known issue with clear reason)

## Rule 5 - Validate desktop and mobile behavior when layout is affected

If the refactor touches layout, spacing, navigation, or responsive behavior, validate the updated area at desktop and mobile viewport sizes.
