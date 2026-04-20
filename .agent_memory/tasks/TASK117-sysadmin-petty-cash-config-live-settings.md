# [TASK117] - SysAdmin Petty Cash Configuration Live Settings Wiring

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Admin dashboard petty cash configuration should show properly.

## Thought Process
- The SysAdmin petty cash section was rendering hardcoded demo values and did not read/write the real backend setting.
- Backend already exposes `GET /system-settings`, `GET /system-settings/{key}`, and `PUT /system-settings/{key}` with `petty_cash_limit`, so frontend needed to align with that contract.

## Implementation Plan
- Refactor petty-cash section to fetch and render live `petty_cash_limit` data.
- Refactor Set Limit modal to persist updates via system-settings API.
- Keep edit affordance and detail modal flow functional for dashboard UX compatibility.
- Update sysadmin dashboard Playwright validation mocks/assertions for system-settings traffic and live-value rendering.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Replace static petty-cash config with API-backed rendering | Complete | 2026-04-20 | `sa-petty-cash-config` now loads `/system-settings/petty_cash_limit` with fallback to `/system-settings`. |
| 1.2 | Implement persistent petty-cash limit updates from modal | Complete | 2026-04-20 | `sa-set-petty-cash-limit-modal` now calls `PUT /system-settings/petty_cash_limit` and emits refresh events. |
| 1.3 | Update and run UI validation for SysAdmin dashboard | Complete | 2026-04-20 | Added system-settings API mocks + live-value assertions; before/after desktop/mobile runs passed. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/sysadministration/components/sa-petty-cash-config.js`:
  - removed hardcoded allowance/usage placeholders.
  - added live fetch of `petty_cash_limit` and robust empty/error rendering.
  - added routing summary based on current limit.
  - wired edit flow in details modal to `PUT /system-settings/petty_cash_limit`.
- Updated `pages/dashboard/sysadministration/components/page-modals/sa-set-petty-cash-limit-modal.js`:
  - replaced static form fields with current/new global limit controls.
  - added API persistence, loading button state, validation, and success/error toasts.
  - dispatches `sa-petty-cash:updated` for section refresh without reload.
- Updated `testing/ui-validation/sysadmin-dashboard/validate-sysadmin-dashboard.spec.js`:
  - added route mocks for `GET /api/system-settings`, `GET/PUT /api/system-settings/petty_cash_limit`.
  - added assertions for displayed petty-cash value and approval-routing summary.
- Validation results:
  - `node --check` passed for all touched JS files.
  - diagnostics: no errors in touched files.
  - Playwright: `VAL_STAGE=before` and `VAL_STAGE=after` both passed (desktop + mobile, 2/2 each).
