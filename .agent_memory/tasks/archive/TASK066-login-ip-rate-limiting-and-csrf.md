# [TASK066] - Login IP Rate Limiting and CSRF

**Status:** Completed  
**Added:** 2026-04-19  
**Updated:** 2026-04-19

## Original Request
- Implement IP-based rate limiting on the login endpoint, as well as CSRF protection.

## Thought Process
- Keep the security changes focused on authentication entry points to avoid breaking unrelated workflow requests.
- Implement rate limiting at login-controller boundary so invalid attempts are throttled before credential verification.
- Implement CSRF using a double-submit cookie pattern with a token endpoint that frontend can request before login.
- Ensure cross-origin local dev remains functional by allowing `X-CSRF-Token` in CORS headers.

## Implementation Plan
- Add CSRF helper and token issuance endpoint.
- Add IP-based login rate limiter helper with persistent local state.
- Enforce CSRF + rate limiting in login endpoint.
- Update frontend auth flow to fetch/send CSRF token.
- Update OpenAPI docs and run validation smoke checks.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Add backend CSRF primitives | Complete | 2026-04-19 | Added helper and token endpoint (`GET /auth/csrf`). |
| 1.2 | Add login IP throttle logic | Complete | 2026-04-19 | Added file-backed limiter and integrated into login flow. |
| 1.3 | Wire frontend login CSRF token flow | Complete | 2026-04-19 | `Auth.login` now fetches/sends CSRF token header. |
| 1.4 | Update API docs and validate | Complete | 2026-04-19 | OpenAPI updated; syntax checks and curl smoke tests passed. |

## Progress Log
### 2026-04-19
- Added backend helpers:
  - `app/helpers/CsrfHelper.php`
  - `app/helpers/LoginRateLimiter.php`
- Added config constants in `config/config.php` for CSRF and login rate limits.
- Added route registration `GET /auth/csrf` and CORS allowance for `X-CSRF-Token` in `public/index.php`.
- Updated `AuthController`:
  - new `csrfToken()` endpoint
  - login now enforces:
    - IP rate-limit check (429 + `Retry-After`)
    - CSRF header-cookie validation (403)
    - failure/success bookkeeping for rate limiter
- Updated frontend auth flow:
  - `pages/js/api.js` -> `getCsrfToken(forceRefresh)`
  - `pages/js/auth.js` -> fetch CSRF token and include `X-CSRF-Token` on login request.
- Updated endpoint metadata:
  - `app/config/EndpointRegistry.php` includes `GET:/api/auth/csrf`.
- Updated API contract docs in `testing/openapi.yaml`:
  - documented `GET /auth/csrf`
  - documented `X-CSRF-Token` header requirement for `POST /auth/login`
  - documented login `403` and `429` responses.
- Validation evidence:
  - PHP lint passed for all touched backend files.
  - editor diagnostics clean for touched backend/frontend/OpenAPI files.
  - curl smoke test results:
    - CSRF token issued (`length=64`)
    - login without CSRF header -> `403`
    - login with CSRF header + invalid credentials -> `401`
    - repeated invalid logins on synthetic IP -> `401 401 401 401 401 429`
