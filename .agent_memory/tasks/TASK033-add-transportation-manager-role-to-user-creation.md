# TASK033 - Add Transportation Manager Role to User Creation

**Status:** Pending  
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
- [ ] Add `<option value="Transportation Manager">Transportation Manager</option>` to the role `<select>` inside the `createUserModal` form located in `pages/dashboard/sysadministration/index.html`.
- [ ] Add the same `<option>` to the role `<select>` inside the `editUserModal` form generated in `pages/dashboard/sysadministration/script.js`.
- [ ] Add a filter button `<button class="filter-btn" onclick="filterUsersByRole('Transportation Manager')">Transportation Manager</button>` into the `userFilterTabs` div located in the web component `pages/dashboard/sysadministration/components/sa-user-accounts.js`.
- [ ] Validate locally that creating the user, editing the user, and filtering works correctly without throwing UI errors.

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 33.1 | Add role option to `createUserModal` in `index.html` | Not Started | - | |
| 33.2 | Add role option to `editUserModal` in `script.js` | Not Started | - | |
| 33.3 | Add filter tab to `sa-user-accounts.js` | Not Started | - | |

## Progress Log
### April 12, 2026
- Task created based on user request to support the creation of Transportation Managers. Identified missing frontend UI options mapping to the backend role.