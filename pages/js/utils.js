/**
 * Utility Functions for AssetCare360
 * Common helper functions used across the application
 */

const Utils = {
    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.warn('Toast element not found');
            return;
        }
        
        toast.textContent = message;
        toast.style.display = 'block';
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#d93025',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        toast.style.background = colors[type] || colors.success;
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    },
    
    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    /**
     * Format datetime
     */
    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    /**
     * Validate password strength
     */
    validatePassword(password) {
        const minLength = 6;
        const errors = [];
        
        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },
    
    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Show loading state
     */
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    },
    
    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHtml(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    },
    
    /**
     * Get query parameter from URL
     */
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },
    
    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard', 'success');
            return true;
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showToast('Failed to copy', 'error');
            return false;
        }
    },
    
    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
};
