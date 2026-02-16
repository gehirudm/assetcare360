/**
 * API Helper Functions for AssetCare360
 * Handles all HTTP requests to the backend API
 */

const API = {
    /**
     * Make an authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        // Get token from localStorage (fallback for header auth)
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        
        // Set default headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Add authorization header if token exists
        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include' // Include cookies
            });
            
            // Check if response has content before parsing JSON
            const text = await response.text();
            if (!text) {
                throw new Error('Empty response from server');
            }
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse JSON response:', text);
                throw new Error('Server returned invalid JSON response');
            }
            
            // Handle 401 Unauthorized (except for /auth/me which returns success: false)
            if (response.status === 401) {
                // Only redirect if we're not already on the login page and not checking auth status
                if (!options.skipAuthRedirect && !window.location.pathname.includes('login') && !endpoint.includes('/auth/me')) {
                    this.handleUnauthorized();
                }
                throw new Error(data.message || 'Unauthorized');
            }
            
            // For validation errors (422) or other errors, return the data object
            // which includes status, message, and errors fields
            if (!response.ok) {
                // Return the error response data instead of throwing
                // This allows us to access validation errors
                return data;
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    },
    
    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * PATCH request
     */
    async patch(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    },
    
    /**
     * POST request with FormData (for file uploads)
     */
    async postFormData(endpoint, formData, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        // Get token from localStorage
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        
        // Set headers (don't set Content-Type, let browser set it with boundary for multipart/form-data)
        const headers = {};
        
        // Add authorization header if token exists
        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });
            
            const data = await response.json();
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                if (!options.skipAuthRedirect && !window.location.pathname.includes('login')) {
                    this.handleUnauthorized();
                }
                throw new Error(data.message || 'Unauthorized');
            }
            
            // Return the data object (includes status, message, errors)
            if (!response.ok) {
                return data;
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    /**
     * PUT request with FormData (multipart)
     */
    async putFormData(endpoint, formData, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        
        // Set headers (don't set Content-Type for FormData)
        const headers = {
            ...options.headers
        };
        
        // Add authorization header if token exists
        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers,
                body: formData,
                credentials: 'include'
            });
            
            const data = await response.json();
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                if (!options.skipAuthRedirect && !window.location.pathname.includes('login')) {
                    this.handleUnauthorized();
                }
                throw new Error(data.message || 'Unauthorized');
            }
            
            // Return the data object (includes status, message, errors)
            if (!response.ok) {
                return data;
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    /**
     * Handle unauthorized access
     */
    handleUnauthorized() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        window.location.href = CONFIG.ROUTES.LOGIN;
    }
};
