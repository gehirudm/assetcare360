/**
 * Dashboard Initialization Script
 * Handles authentication, authorization, and common dashboard setup
 * This should be included in all dashboard pages
 */

const DashboardInit = {
    /**
     * Initialize dashboard with role-based access control
     * @param {string|string[]} allowedRoles - Role(s) that can access this dashboard
     * @param {Object} options - Additional options
     */
    async init(allowedRoles, options = {}) {
        const {
            updateUserDisplay = true,
            onSuccess = null,
            onError = null
        } = options;

        try {
            const user = await Auth.requireRole(allowedRoles);

            if (!user) {
                // Auth.requireRole will handle redirect
                return null;
            }

            // Update user display in header if enabled
            if (updateUserDisplay) {
                this.updateUserInfo(user);
            }

            // Call success callback if provided
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(user);
            }

            return user;
        } catch (error) {
            console.error('Dashboard initialization failed:', error);

            // Call error callback if provided
            if (onError && typeof onError === 'function') {
                onError(error);
            } else {
                // Default error handling: redirect to login
                window.location.href = CONFIG.ROUTES.LOGIN;
            }

            return null;
        }
    },

    /**
     * Update user information in the dashboard header.
     * Delegates to whichever header component is present on the page,
     * checked in priority order:
     *   1. <ac-header>      — unified shared header (all dashboards)
     *   2. <to-shell-header> — legacy TO-specific header
     *   3. Direct DOM queries — fallback for any remaining legacy HTML
     */
    updateUserInfo(user) {
        // 1. Unified shared header
        const acHeader = document.querySelector('ac-header');
        if (acHeader && typeof acHeader.updateUser === 'function') {
            acHeader.updateUser(user);
            return;
        }

        // 2. TO-specific header (still in use for TO dashboard)
        const shellHeader = document.querySelector('to-shell-header');
        if (shellHeader && typeof shellHeader.updateUser === 'function') {
            shellHeader.updateUser(user);
            return;
        }

        // Legacy fallback: direct DOM queries for dashboards not yet using the component
        const userNameElement = document.getElementById('userName');
        const userEmployeeIdElement = document.getElementById('userEmployeeId');
        const userRoleElement = document.getElementById('userRole');
        const userAvatarElement = document.getElementById('userAvatar');

        if (userNameElement) {
            userNameElement.textContent = user.full_name || user.role || 'User';
        }

        if (userEmployeeIdElement) {
            userEmployeeIdElement.textContent = user.employee_id || '';
        }

        if (userRoleElement) {
            userRoleElement.textContent = user.role || '';
        }

        if (userAvatarElement) {
            const initials = this.getInitials(user.full_name || user.role);
            userAvatarElement.textContent = initials;

            // Sync the larger avatar inside the profile dropdown panel
            const menuAvatarElement = document.getElementById('profileMenuAvatar');
            if (menuAvatarElement) menuAvatarElement.textContent = initials;
        }

        // Fallback: Old header structure (legacy dashboards)
        const legacyUserInfoElement = document.querySelector('.user-info span:not(.separator)');
        if (legacyUserInfoElement && !userNameElement) {
            legacyUserInfoElement.textContent = user.full_name || user.role || 'User';
        }

        // Update legacy user avatar if new one doesn't exist
        const legacyUserAvatarElement = document.querySelector('.user-avatar:not([id])');
        if (legacyUserAvatarElement && !userAvatarElement) {
            const initials = this.getInitials(user.full_name || user.role);
            legacyUserAvatarElement.textContent = initials;
        }

        // Update role display if exists
        const roleElement = document.querySelector('.user-role');
        if (roleElement) {
            roleElement.textContent = user.role;
        }
    },

    /**
     * Get initials from a name
     */
    getInitials(name) {
        if (!name) return 'U';

        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    /**
     * Setup logout functionality
     * Uses the styled confirmation dialog instead of native confirm()
     */
    logout() {
        createConfirmationDialog(
            'Confirm Logout',
            'Are you sure you want to logout? Any unsaved changes will be lost.',
            () => {
                Auth.logout();
            },
            'warning'
        );
    }
};

// ==================== CONFIRMATION DIALOG FUNCTIONS ====================

/**
 * Returns the <confirm-dialog> element, auto-creating it if absent.
 * Dashboards that include confirm-dialog.js and declare <confirm-dialog>
 * in their HTML will get the real element; others get a lazily-created one.
 */
function _getConfirmDialog() {
    let el = document.querySelector('confirm-dialog');
    if (!el) {
        el = document.createElement('confirm-dialog');
        document.body.appendChild(el);
    }
    return el;
}

/**
 * Open the confirmation dialog.
 * Kept as a global function so all existing call-sites continue to work
 * without modification.
 *
 * @param {string}   title
 * @param {string}   message    — supports HTML
 * @param {Function} onConfirm
 * @param {string}   [type]     — 'danger' | 'warning' | 'primary' | 'info'
 */
function createConfirmationDialog(title, message, onConfirm, type = 'danger') {
    _getConfirmDialog().show({ title, message, type, onConfirm });
}

/**
 * Close the confirmation dialog (kept for any external callers).
 */
function closeConfirmation() {
    _getConfirmDialog().close();
}

/**
 * @deprecated — the component handles confirm clicks internally.
 * Kept only for backward compatibility with any existing onclick handlers.
 */
async function confirmAction() {
    // No-op: <confirm-dialog> handles the Confirm button internally.
}

/**
 * Global logout function for onclick handlers
 * This allows using onclick="logout()" in HTML
 */
function logout() {
    DashboardInit.logout();
}
