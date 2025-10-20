/**
 * Authentication Helper Functions for AssetCare360
 * Handles user authentication, role checking, and session management
 */

const Auth = {
    /**
     * Check if user is authenticated
     * Returns user object if authenticated, null otherwise
     * This will not throw errors or redirect
     */
    async checkAuth() {
        try {
            const response = await API.get('/auth/me');
            // Backend returns {status: 'success', message: '...', data: {...}}
            if (response.status === 'success' && response.data) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(response.data));
                return response.data;
            }
            // User is not authenticated, but this is not an error
            return null;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return null;
        }
    },
    
    /**
     * Check if user has required role
     */
    async requireRole(allowedRoles) {
        const user = await this.checkAuth();
        
        if (!user) {
            window.location.href = CONFIG.ROUTES.LOGIN;
            return false;
        }
        
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        if (!roles.includes(user.role)) {
            // Redirect to their appropriate dashboard
            const userDashboard = CONFIG.ROUTES.DASHBOARD[user.role.toUpperCase().replace(/ /g, '_')];
            if (userDashboard) {
                window.location.href = userDashboard;
            } else {
                window.location.href = CONFIG.ROUTES.LOGIN;
            }
            return false;
        }
        
        return user;
    },
    
    /**
     * Login user
     */
    async login(employeeId, password) {
        try {
            const response = await API.post('/auth/login', {
                employee_id: employeeId,
                password: password
            }, { skipAuth: true });
            
            // Backend returns {status: 'success', message: '...', data: {...}}
            if (response.status === 'success' && response.data) {
                // Store token and user data
                localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, response.data.token);
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
                
                return {
                    success: true,
                    user: response.data.user,
                    forcePasswordChange: response.data.force_password_change || false,
                    message: response.message
                };
            }
            
            return {
                success: false,
                message: response.message || 'Login failed'
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.message || 'Login failed. Please try again.'
            };
        }
    },
    
    /**
     * Logout user
     */
    async logout() {
        try {
            await API.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
            window.location.href = CONFIG.ROUTES.LOGIN;
        }
    },
    
    /**
     * Get current user from storage
     */
    getCurrentUser() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    },
    
    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await API.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            
            return {
                success: response.status === 'success',
                message: response.message || 'Password changed successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to change password'
            };
        }
    },
    
    /**
     * Request password reset
     */
    async requestPasswordReset(employeeId, email) {
        try {
            const response = await API.post('/auth/forgot-password', {
                employee_id: employeeId,
                email: email
            }, { skipAuth: true });
            
            return {
                success: response.status === 'success',
                message: response.message || 'Password reset email sent'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to send reset email'
            };
        }
    },
    
    /**
     * Redirect to appropriate dashboard based on user role
     */
    redirectToDashboard(user) {
        if (!user || !user.role) {
            console.error('Invalid user object:', user);
            window.location.href = CONFIG.ROUTES.LOGIN;
            return;
        }
        
        const role = user.role.toUpperCase().replace(/ /g, '_');
        const dashboard = CONFIG.ROUTES.DASHBOARD[role];
        
        console.log('Redirecting user:', user);
        console.log('Role:', user.role, '-> Normalized:', role);
        console.log('Dashboard URL:', dashboard);
        
        if (dashboard) {
            window.location.href = dashboard;
        } else {
            console.error('No dashboard found for role:', user.role);
            console.error('Available dashboards:', Object.keys(CONFIG.ROUTES.DASHBOARD));
            // Fallback to a default page or login
            alert(`Dashboard not configured for role: ${user.role}`);
            window.location.href = '/';
        }
    }
};
