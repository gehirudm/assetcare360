/**
 * Global Configuration for AssetCare360 Frontend
 * This file should only contain configuration values
 * Helper functions are in separate files: api.js, auth.js, utils.js
 */

const CONFIG = {
    // API Base URL - Update this based on your environment
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000/api'
        : 'https://api.assetcare360.com/api',
    
    // Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'auth_token',
        USER_DATA: 'user_data'
    },
    
    // Routes
    ROUTES: {
        LOGIN: '/auth/login.html',
        FORGOT_PASSWORD: '/auth/forgot-password.html',
        DASHBOARD: {
            ADMIN: '/dashboard/sysadministration.html',
            MAINTENANCE_MANAGER: '/dashboard/maintenance.html',
            INVENTORY_MANAGER: '/dashboard/inventory-manager/index.html',
            TECHNICAL_OFFICER: '/dashboard/technical-officer/index.html',
            SUPERVISOR: '/dashboard/supervisor.html',
            DRIVER: '/dashboard/driver.html',
            MACHINARY_OPERATOR: '/dashboard/machop.html'
        }
    },
    
    // Machine Components
    MACHINE_COMPONENTS: [
        'Engine',
        'Motor',
        'Hydraulic System',
        'Electrical System',
        'Control Panel',
        'Cooling System',
        'Lubrication System',
        'Safety Guards',
        'Sensors',
        'Bearings',
        'Belts',
        'Chains',
        'Gears'
    ],
    
    // Vehicle Types
    VEHICLE_TYPES: [
        'Asset Transportation',
        'General Use'
    ],
    
    // Fuel Types
    FUEL_TYPES: [
        'Petrol',
        'Diesel',
        'Electric',
        'Hybrid'
    ],
    
    // Application Settings
    APP_NAME: 'AssetCare360',
    APP_VERSION: '1.0.0',
    
    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    
    // Date Format
    DATE_FORMAT: 'en-US',
    
    // Toast Duration (ms)
    TOAST_DURATION: 3000
};
