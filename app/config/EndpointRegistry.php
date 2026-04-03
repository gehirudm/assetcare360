<?php

/**
 * Endpoint Registry
 * Maps endpoints to actions and categories for better log organization
 */
class EndpointRegistry {
    
    /**
     * Registry of all endpoints with their metadata
     * Format: [pattern => [action, category, description]]
     */
    private static $registry = [
        // Authentication Endpoints
        'POST:/api/auth/login' => [
            'action' => 'User Login',
            'category' => 'Authentication',
            'description' => 'User authentication and session creation'
        ],
        'POST:/api/auth/logout' => [
            'action' => 'User Logout',
            'category' => 'Authentication',
            'description' => 'User session termination'
        ],
        'GET:/api/auth/me' => [
            'action' => 'Get Current User',
            'category' => 'Authentication',
            'description' => 'Retrieve current authenticated user information'
        ],
        'POST:/api/auth/change-password' => [
            'action' => 'Change Password',
            'category' => 'Authentication',
            'description' => 'User password modification'
        ],
        'GET:/api/auth/validate' => [
            'action' => 'Validate Token',
            'category' => 'Authentication',
            'description' => 'JWT token validation'
        ],
        
        // User Management Endpoints
        'GET:/api/users' => [
            'action' => 'List Users',
            'category' => 'User Management',
            'description' => 'Retrieve paginated list of users with filters'
        ],
        'POST:/api/users' => [
            'action' => 'Create User',
            'category' => 'User Management',
            'description' => 'Create new user account'
        ],
        'GET:/api/users/:id' => [
            'action' => 'Get User',
            'category' => 'User Management',
            'description' => 'Retrieve specific user details'
        ],
        'PUT:/api/users/:id' => [
            'action' => 'Update User',
            'category' => 'User Management',
            'description' => 'Update user information'
        ],
        'DELETE:/api/users/:id' => [
            'action' => 'Delete User',
            'category' => 'User Management',
            'description' => 'Soft delete user account'
        ],
        'PUT:/api/users/:id/activate' => [
            'action' => 'Activate User',
            'category' => 'User Management',
            'description' => 'Reactivate user account'
        ],
        'PUT:/api/users/:id/deactivate' => [
            'action' => 'Deactivate User',
            'category' => 'User Management',
            'description' => 'Deactivate user account'
        ],
        'PUT:/api/users/:id/reset-password' => [
            'action' => 'Reset User Password',
            'category' => 'User Management',
            'description' => 'Generate new password for user'
        ],
        'GET:/api/users/stats' => [
            'action' => 'Get User Statistics',
            'category' => 'User Management',
            'description' => 'Retrieve user statistics and aggregations'
        ],
        'GET:/api/technicians' => [
            'action' => 'List Technicians',
            'category' => 'User Management',
            'description' => 'Retrieve active technical officers with workload information'
        ],
        
        // System Logs Endpoints
        'GET:/api/logs' => [
            'action' => 'View System Logs',
            'category' => 'System Administration',
            'description' => 'Access system request logs with filters'
        ],
        'GET:/api/logs/categories' => [
            'action' => 'Get Log Categories',
            'category' => 'System Administration',
            'description' => 'Retrieve available log categories'
        ],
        'GET:/api/logs/stats' => [
            'action' => 'Get Log Statistics',
            'category' => 'System Administration',
            'description' => 'Retrieve log statistics and metrics'
        ],
        'GET:/api/logs/user/:id' => [
            'action' => 'Get User Activity Logs',
            'category' => 'System Administration',
            'description' => 'Retrieve all logs for specific user'
        ],
        
        // Product/Inventory Endpoints (placeholders for future)
        'GET:/api/products' => [
            'action' => 'List Products',
            'category' => 'Inventory Management',
            'description' => 'Retrieve product inventory list'
        ],
        'POST:/api/products' => [
            'action' => 'Create Product',
            'category' => 'Inventory Management',
            'description' => 'Add new product to inventory'
        ],
        'GET:/api/products/:id' => [
            'action' => 'Get Product',
            'category' => 'Inventory Management',
            'description' => 'Retrieve specific product details'
        ],
        'PUT:/api/products/:id' => [
            'action' => 'Update Product',
            'category' => 'Inventory Management',
            'description' => 'Update product information'
        ],
        'DELETE:/api/products/:id' => [
            'action' => 'Delete Product',
            'category' => 'Inventory Management',
            'description' => 'Remove product from inventory'
        ],
        
        // Sparepart Usage Tracking Endpoints
        'GET:/api/usage' => [
            'action' => 'List Usage Records',
            'category' => 'Usage Tracking',
            'description' => 'Retrieve sparepart usage history'
        ],
        'POST:/api/usage' => [
            'action' => 'Create Usage Record',
            'category' => 'Usage Tracking',
            'description' => 'Record sparepart issuance'
        ],
        'GET:/api/usage/sparepart/:id' => [
            'action' => 'Get Usage History',
            'category' => 'Usage Tracking',
            'description' => 'Get usage history for specific sparepart'
        ],
        'GET:/api/usage/stats/:id' => [
            'action' => 'Get Usage Stats',
            'category' => 'Usage Tracking',
            'description' => 'Get usage statistics for sparepart'
        ],
        
        // Sparepart Addition Tracking Endpoints
        'GET:/api/additions' => [
            'action' => 'List Addition Records',
            'category' => 'Stock Management',
            'description' => 'Retrieve sparepart stock additions history'
        ],
        'POST:/api/additions' => [
            'action' => 'Create Addition Record',
            'category' => 'Stock Management',
            'description' => 'Record sparepart stock addition'
        ],
        'GET:/api/additions/sparepart/:id' => [
            'action' => 'Get Addition History',
            'category' => 'Stock Management',
            'description' => 'Get addition history for specific sparepart'
        ],
        'PUT:/api/additions/:id' => [
            'action' => 'Update Addition Record',
            'category' => 'Stock Management',
            'description' => 'Update a sparepart stock addition record'
        ],
        'DELETE:/api/additions/:id' => [
            'action' => 'Delete Addition Record',
            'category' => 'Stock Management',
            'description' => 'Delete a sparepart stock addition record'
        ],
        
        // Machine Weekly Check Endpoints
        'GET:/api/machine-weekly-checks' => [
            'action' => 'List Machine Weekly Checks',
            'category' => 'Weekly Check Reports',
            'description' => 'Retrieve machine weekly check reports'
        ],
        'POST:/api/machine-weekly-checks' => [
            'action' => 'Create Machine Weekly Check',
            'category' => 'Weekly Check Reports',
            'description' => 'Submit a new machine weekly check report'
        ],
        'GET:/api/machine-weekly-checks/:id' => [
            'action' => 'Get Machine Weekly Check',
            'category' => 'Weekly Check Reports',
            'description' => 'Retrieve specific machine weekly check details'
        ],
        'PUT:/api/machine-weekly-checks/:id' => [
            'action' => 'Update Machine Weekly Check',
            'category' => 'Weekly Check Reports',
            'description' => 'Update machine weekly check report'
        ],
        'DELETE:/api/machine-weekly-checks/:id' => [
            'action' => 'Delete Machine Weekly Check',
            'category' => 'Weekly Check Reports',
            'description' => 'Delete machine weekly check report'
        ],
        'POST:/api/machine-weekly-checks/:id/approve' => [
            'action' => 'Approve Machine Weekly Check',
            'category' => 'Weekly Check Reports',
            'description' => 'Approve machine weekly check report'
        ],
        'POST:/api/machine-weekly-checks/:id/reject' => [
            'action' => 'Reject Machine Weekly Check',
            'category' => 'Weekly Check Reports',
            'description' => 'Reject machine weekly check report'
        ],
        'GET:/api/machine-weekly-checks/summary' => [
            'action' => 'Get Machine Weekly Check Summary',
            'category' => 'Weekly Check Reports',
            'description' => 'Get summary statistics for machine weekly checks'
        ],
        
        // Breakdown Report Endpoints
        'GET:/api/breakdown-reports' => [
            'action' => 'List Breakdown Reports',
            'category' => 'Breakdown Reports',
            'description' => 'Retrieve vehicle breakdown reports'
        ],
        'POST:/api/breakdown-reports' => [
            'action' => 'Create Breakdown Report',
            'category' => 'Breakdown Reports',
            'description' => 'Submit a new vehicle breakdown report'
        ],
        'GET:/api/breakdown-reports/:id' => [
            'action' => 'Get Breakdown Report',
            'category' => 'Breakdown Reports',
            'description' => 'Retrieve specific breakdown report details'
        ],
        'PUT:/api/breakdown-reports/:id' => [
            'action' => 'Update Breakdown Report',
            'category' => 'Breakdown Reports',
            'description' => 'Update breakdown report'
        ],
        'DELETE:/api/breakdown-reports/:id' => [
            'action' => 'Delete Breakdown Report',
            'category' => 'Breakdown Reports',
            'description' => 'Delete breakdown report'
        ],
        'GET:/api/breakdown-reports/stats' => [
            'action' => 'Get Breakdown Report Stats',
            'category' => 'Breakdown Reports',
            'description' => 'Get breakdown report statistics'
        ],
        
        // Route Breakdown Endpoints
        'GET:/api/route-breakdowns' => [
            'action' => 'List Route Breakdowns',
            'category' => 'Breakdown Reports',
            'description' => 'Retrieve route breakdown reports'
        ],
        'POST:/api/route-breakdowns' => [
            'action' => 'Create Route Breakdown',
            'category' => 'Breakdown Reports',
            'description' => 'Submit a new route breakdown report'
        ],
        'GET:/api/route-breakdowns/:id' => [
            'action' => 'Get Route Breakdown',
            'category' => 'Breakdown Reports',
            'description' => 'Retrieve specific route breakdown details'
        ],
        'PUT:/api/route-breakdowns/:id' => [
            'action' => 'Update Route Breakdown',
            'category' => 'Breakdown Reports',
            'description' => 'Update route breakdown report'
        ],
        'DELETE:/api/route-breakdowns/:id' => [
            'action' => 'Delete Route Breakdown',
            'category' => 'Breakdown Reports',
            'description' => 'Delete route breakdown report'
        ],
        'GET:/api/route-breakdowns/stats' => [
            'action' => 'Get Route Breakdown Stats',
            'category' => 'Breakdown Reports',
            'description' => 'Get route breakdown statistics'
        ],
    ];
    
    /**
     * Get action metadata for an endpoint
     */
    public static function getEndpointMetadata($method, $endpoint) {
        // Normalize endpoint
        $normalizedEndpoint = self::normalizeEndpoint($endpoint);
        $key = strtoupper($method) . ':' . $normalizedEndpoint;
        
        // Try exact match first
        if (isset(self::$registry[$key])) {
            return self::$registry[$key];
        }
        
        // Try pattern matching for dynamic routes
        foreach (self::$registry as $pattern => $metadata) {
            if (self::matchesPattern($method, $endpoint, $pattern)) {
                return $metadata;
            }
        }
        
        // Return default metadata if not found
        return [
            'action' => 'Unknown Action',
            'category' => 'Other',
            'description' => 'Endpoint not registered'
        ];
    }
    
    /**
     * Normalize endpoint path
     */
    private static function normalizeEndpoint($endpoint) {
        // Remove query parameters
        $endpoint = parse_url($endpoint, PHP_URL_PATH);
        
        // Replace numeric IDs with :id placeholder
        $endpoint = preg_replace('/\/\d+/', '/:id', $endpoint);
        
        return $endpoint;
    }
    
    /**
     * Check if endpoint matches a pattern
     */
    private static function matchesPattern($method, $endpoint, $pattern) {
        list($patternMethod, $patternPath) = explode(':', $pattern, 2);
        
        if (strtoupper($method) !== $patternMethod) {
            return false;
        }
        
        $normalizedEndpoint = self::normalizeEndpoint($endpoint);
        return $normalizedEndpoint === $patternPath;
    }
    
    /**
     * Get all available categories
     */
    public static function getCategories() {
        $categories = [];
        foreach (self::$registry as $metadata) {
            $category = $metadata['category'];
            if (!isset($categories[$category])) {
                $categories[$category] = 0;
            }
            $categories[$category]++;
        }
        return $categories;
    }
    
    /**
     * Get all endpoints by category
     */
    public static function getEndpointsByCategory($category) {
        $endpoints = [];
        foreach (self::$registry as $pattern => $metadata) {
            if ($metadata['category'] === $category) {
                $endpoints[$pattern] = $metadata;
            }
        }
        return $endpoints;
    }
    
    /**
     * Search endpoints by keyword
     */
    public static function searchEndpoints($keyword) {
        $keyword = strtolower($keyword);
        $results = [];
        
        foreach (self::$registry as $pattern => $metadata) {
            $searchText = strtolower(
                $pattern . ' ' . 
                $metadata['action'] . ' ' . 
                $metadata['category'] . ' ' . 
                $metadata['description']
            );
            
            if (strpos($searchText, $keyword) !== false) {
                $results[$pattern] = $metadata;
            }
        }
        
        return $results;
    }
    
    /**
     * Get all registered endpoints
     */
    public static function getAllEndpoints() {
        return self::$registry;
    }
}
