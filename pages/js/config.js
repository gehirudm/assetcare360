/**
 * Global Configuration for AssetCare360 Frontend
 * This file should only contain configuration values
 * Helper functions are in separate files: api.js, auth.js, utils.js
 */

const CONFIG = {
    // Version for cache busting
    VERSION: '1.0.1',
    
    // API Base URL - Update this based on your environment
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8080/api'
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
            ADMIN: '/dashboard/sysadministration/index.html',
            MAINTENANCE_MANAGER: '/dashboard/maintenance.html',
            INVENTORY_MANAGER: '/dashboard/inventory-manager/index.html',
            TECHNICAL_OFFICER: '/dashboard/technical-officer/index.html',
            SUPERVISOR: '/dashboard/supervisor/index.html',
            DRIVER: '/dashboard/driver.html',
            MACHINARY_OPERATOR: '/dashboard/machinery-operator/index.html'  // Matches DB typo: 'Machinary Operator'
            // MACHINARY_OPERATOR: '/dashboard/machop.html'  // Matches DB typo: 'Machinary Operator'
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
    
    // Vehicle Types (must match database ENUM)
    VEHICLE_TYPES: [
        'Truck',
        'Van',
        'Car',
        'Bus',
        'Bike',
        'Three-Wheeler',
        'Lorry',
        'Tanker',
        'Other'
    ],
    
    // Fuel Types (must match database ENUM)
    FUEL_TYPES: [
        'Petrol',
        'Diesel',
        'Electric',
        'Hybrid',
        'LPG',
        'CNG'
    ],
    
    // Vehicle Components
    VEHICLE_COMPONENTS: [
        'Engine',
        'Transmission',
        'Braking System',
        'Suspension System',
        'Steering System',
        'Cooling System',
        'Exhaust System',
        'Electrical System',
        'Fuel System',
        'Tires & Wheels',
        'Battery',
        'Alternator',
        'Starter Motor',
        'Air Conditioning',
        'Lights & Signals'
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
