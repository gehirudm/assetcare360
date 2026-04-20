# [TASK119] - SysAdmin Reset Password Email and Session Stability

**Status:** In Progress  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Admin dashboard Reset Password does not work.
- It logs out the admin user.
- It does not send reset-password email with temporary password to the target user.

## Thought Process
- Backend `POST /users/:id/reset-password` generated and stored a temporary password but never sent email.
- Frontend reset action used global API unauthorized redirect behavior, which could force a logout on auth-edge responses.
- The existing reset flow should use email service delivery and preserve admin dashboard state for recoverable auth errors.

## Implementation Plan
- Add a dedicated backend reset-password service method that resets password, enforces `force_password_change`, and sends temporary-password email via `MailhogEmailService`.
- Refactor `UserController::resetPassword()` to use service-layer logic, support optional `send_email_notification`, and block self-reset from the admin panel.
- Update SysAdmin frontend reset action to pass `send_email_notification`, avoid forced auth redirect side-effects for this call, and improve user feedback.
- Update OpenAPI for `/users/{id}/reset-password` request/response contract.
- Run syntax + diagnostics checks.

## Progress Tracking

**Overall Status:** In Progress - 90%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Implement backend reset-password email flow | Complete | 2026-04-20 | Added `UserService::resetUserPassword(...)` + `sendTemporaryPasswordEmail(...)` using `MailhogEmailService`. |
| 1.2 | Refactor reset controller behavior | Complete | 2026-04-20 | `UserController::resetPassword()` now delegates to service, supports `send_email_notification`, and blocks self-reset. |
| 1.3 | Update SysAdmin reset frontend handling | Complete | 2026-04-20 | Sends `send_email_notification: true`, uses `skipAuthRedirect: true`, and shows clearer success/error toasts. |
| 1.4 | Update API contract and run checks | In Progress | 2026-04-20 | OpenAPI updated; `php -l`, `node --check`, and diagnostics clean. Runtime browser/API smoke remains pending. |

## Progress Log
### 2026-04-20
- Created TASK119 for SysAdmin reset-password reliability + email-delivery issue.
- Confirmed primary backend gap: reset endpoint did not send email.
- Confirmed frontend risk: global unauthorized redirect could force logout during reset auth-edge failures.

### 2026-04-20
- Implemented backend reset-password service flow in `app/services/UserService.php`:
  - password reset + `force_password_change` persistence.
  - temporary-password email via `MailhogEmailService`.
  - response metadata: `temporary_password`, `email_sent`, `email_skipped_reason`.
- Refactored controller in `app/controllers/UserController.php`:
  - delegates to service flow.
  - optional request body support for `send_email_notification`.
  - self-reset block with explicit guidance to use Change Password flow.
- Updated frontend in `pages/dashboard/sysadministration/components/sa-user-accounts.js`:
  - reset call now includes `send_email_notification: true`.
  - `skipAuthRedirect: true` used to avoid forced logout side-effect for this action.
  - enhanced success/fallback/auth-error toast messages.
- Updated `testing/openapi.yaml` for `/users/{id}/reset-password` (`post`, request body, response fields).
- Validation run:
  - `php -l app/services/UserService.php` passed.
  - `php -l app/controllers/UserController.php` passed.
  - `node --check pages/dashboard/sysadministration/components/sa-user-accounts.js` passed.
  - diagnostics clean for touched files.
