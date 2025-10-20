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
