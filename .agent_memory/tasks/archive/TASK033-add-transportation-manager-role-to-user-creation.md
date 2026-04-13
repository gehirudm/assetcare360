# TASK033 - Add Transportation Manager Role to User Creation

**Status:** Completed  
**Added:** April 12, 2026  
**Updated:** April 12, 2026

## Original Request
"Currently there is no way to create a new Transportation Manager"

## Thought Process
Upon high-level exploration of the codebase:
1. Setting up the "Transportation Manager" role on the backend was partially completed in migration `045_create_fuel_logs_and_sync_users_role.php` where it was added to the ENUM for `users.role`. It's properly handled by backend controllers (e.g., `UserController`, `AuthController`).
2. However, the system administration UI that allows creating/editing users does not include "Transportation Manager" as a selectable option. 
3. Furthermore, the filter tabs on the user accounts page inside the system administration dashboard lack a tab to quickly view users with this role.
4. We need to add the missing HTML `<option>` options and filter UI tabs in the `sysadministration` dashboard. The `createUserModal` and `editUserModal` configurations exist in standard files, although we must ensure it's added everywhere necessary in the `sysadministration` layout (both legacy HTML and components).

## Implementation Plan
- [x] Add `Transportation Manager` role option to the create-user role select in the current modal component implementation.
- [x] Add `Transportation Manager` role option to the edit-user role select in the current modal component implementation.
- [x] Add `Transportation Manager` role filter button in the user accounts filter tabs.
- [x] Validate create/edit/filter interaction paths with before/after Playwright evidence.
- [x] Align backend role validation and docs so the role is accepted end-to-end.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 33.1 | Add role option to create-user role select | Complete | April 12, 2026 | Implemented in `sa-create-user-modal` component |
| 33.2 | Add role option to edit-user role select | Complete | April 12, 2026 | Implemented in `sa-edit-user-modal` component |
| 33.3 | Add filter tab to `sa-user-accounts.js` | Complete | April 12, 2026 | Added `data-role-filter="Transportation Manager"` button |
| 33.4 | Align backend role validation for create/update | Complete | April 12, 2026 | Updated `UserService` valid roles + `RoleMiddleware` + `User` schema enum |
| 33.5 | Validate before/after UI behavior and capture artifacts | Complete | April 12, 2026 | `VAL_STAGE=before` and `VAL_STAGE=after` both passed (desktop + mobile) |
| 33.6 | Update OpenAPI role enums/documentation | Complete | April 12, 2026 | Added Transportation Manager across Users role enums and authorization role list |

## Progress Log
### April 12, 2026
- Task created based on user request to support the creation of Transportation Managers. Identified missing frontend UI options mapping to the backend role.

### April 12, 2026 (Completion)
- Added Transportation Manager option in SysAdmin create/edit user modal component role selects:
	- `pages/dashboard/sysadministration/components/page-modals/sa-create-user-modal.js`
	- `pages/dashboard/sysadministration/components/page-modals/sa-edit-user-modal.js`
- Added Transportation Manager role filter tab in `pages/dashboard/sysadministration/components/sa-user-accounts.js`.
- Fixed end-to-end acceptance by updating backend role handling:
	- `app/services/UserService.php` role validation list now includes Transportation Manager.
	- `app/middleware/RoleMiddleware.php` role hierarchy now includes Transportation Manager.
	- `app/models/User.php` schema enum now includes Transportation Manager for model/schema alignment.
- Updated API documentation in `testing/openapi.yaml` to include Transportation Manager in Users role enums and authorization role list.
- Added dedicated validation script `testing/ui-validation/sysadmin-transportation-manager-role/validate-sysadmin-transportation-manager-role.spec.js`.
- Validation evidence:
	- `VAL_STAGE=before`: passed (2/2 desktop + mobile)
	- `VAL_STAGE=after`: passed (2/2 desktop + mobile)
	- Console warnings/errors: none
	- Failed network requests: none