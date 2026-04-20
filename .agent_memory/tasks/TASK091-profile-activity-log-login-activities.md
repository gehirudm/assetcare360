# [TASK091] - Profile Activity Log Login Activities

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Activity Log section should show user login activities.

## Thought Process
- The profile Activity tab was placeholder-only and needed real backend data.
- Existing request logging (`api_request_logs`) already captures login endpoint calls with timestamp, IP, user agent, and response code.
- The safest implementation is an authenticated projection endpoint for current user login history, then lazy-load/render in the Activity tab.

## Implementation Plan
- Add authenticated API endpoint to return current user login activities from `api_request_logs`.
- Replace profile Activity placeholder UI with dynamic loading/error/empty/list rendering.
- Update OpenAPI and Postman collection for the new endpoint.
- Extend profile UI validation spec to assert activity rendering.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add backend login-activities endpoint | Complete | 2026-04-20 | Added service query logic, controller action, route, and endpoint registry metadata. |
| 1.2 | Implement profile Activity tab rendering | Complete | 2026-04-20 | Added activity-state management, fetch pipeline, and loading/error/empty/data UI in profile page. |
| 1.3 | Sync API docs and tests | Complete | 2026-04-20 | Updated OpenAPI/Postman and extended profile Playwright validation with login-activity assertions. |

## Progress Log
### 2026-04-20
- Updated backend:
  - `app/services/AuthService.php`: added `getLoginActivities($userId, $limit)` querying successful login events from `api_request_logs` with current-user matching.
  - `app/controllers/AuthController.php`: added `getLoginActivities()` with auth + limit handling.
  - `public/index.php`: added `GET /auth/login-activities` route.
  - `app/config/EndpointRegistry.php`: added `GET:/api/auth/login-activities` metadata.
- Updated frontend profile page:
  - `pages/profile/index.html`: replaced Activity placeholder with `Recent Login Activity` section + refresh control.
  - `pages/profile/script.js`: added activity load/render pipeline (`loadLoginActivities`, `refreshActivityLog`, loading/error/empty states, relative time and device summaries).
  - `pages/profile/style.css`: added activity list/item/meta responsive styles.
- Updated contracts and validation:
  - `testing/openapi.yaml`: documented `/auth/login-activities` endpoint, query params, and response schema.
  - `testing/postman/postman_collection.json`: added `Get Login Activities` request.
  - `testing/ui-validation/profile-page/validate-profile-page.spec.js`: mocked login-activities API and added assertions for rendered activity items.
- Validation evidence:
  - diagnostics clean for touched files.
  - `cd testing/ui-validation && VAL_STAGE=before npx playwright test profile-page/validate-profile-page.spec.js --reporter=line` passed (desktop/mobile, 2/2).
  - `cd testing/ui-validation && VAL_STAGE=after npx playwright test profile-page/validate-profile-page.spec.js --reporter=line` passed (desktop/mobile, 2/2).
  - `php -l app/services/AuthService.php app/controllers/AuthController.php app/config/EndpointRegistry.php public/index.php` passed.
