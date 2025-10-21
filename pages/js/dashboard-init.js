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
     * Update user information in the dashboard header
     * Supports both old and new header structures
     */
    updateUserInfo(user) {
        // New header structure (Supervisor/Admin style)
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
     * Can be called directly or used as onclick handler
     */
    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            Utils.showToast('Logging out...', 'info');
            await Auth.logout();
        }
    }
};

/**
 * Global logout function for onclick handlers
 * This allows using onclick="logout()" in HTML
 */
async function logout() {
    await DashboardInit.logout();
}
