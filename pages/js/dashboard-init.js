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
     * Expects elements with classes: .user-info span, .user-avatar
     */
    updateUserInfo(user) {
        // Update user name
        const userInfoElement = document.querySelector('.user-info span');
        if (userInfoElement) {
            userInfoElement.textContent = user.full_name || user.role || 'User';
        }
        
        // Update user avatar with initials
        const userAvatarElement = document.querySelector('.user-avatar');
        if (userAvatarElement) {
            const initials = this.getInitials(user.full_name || user.role);
            userAvatarElement.textContent = initials;
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
