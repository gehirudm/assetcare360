<?php

/**
 * Role-Based Access Control Middleware
 * Restricts API access based on user roles
 */
class RoleMiddleware {
    
    // Define role hierarchy (higher number = more permissions)
    const ROLE_HIERARCHY = [
        'Admin' => 8,
        'Maintenance Manager' => 7,
        'Inventory Manager' => 6,
        'Technical Officer' => 5,
        'Supervisor' => 4,
        'Auction Officer' => 3,
        'Driver' => 2,
        'Machinary Operator' => 1
    ];
    
    /**
     * Check if user has required role
     */
    public static function requireRole($allowedRoles) {
        $user = self::getCurrentUser();
        
        if (!$user) {
            Response::unauthorized('Authentication required');
            exit;
        }
        
        $userRole = $user['role'];
        
        // If allowedRoles is a string, convert to array
        if (is_string($allowedRoles)) {
            $allowedRoles = [$allowedRoles];
        }
        
        // Check if user's role is in allowed roles
        if (!in_array($userRole, $allowedRoles)) {
            Response::forbidden('You do not have permission to access this resource');
            exit;
        }
        
        return true;
    }
    
    /**
     * Check if user has minimum role level
     */
    public static function requireMinRole($minRole) {
        $user = self::getCurrentUser();
        
        if (!$user) {
            Response::unauthorized('Authentication required');
            exit;
        }
        
        $userRoleLevel = self::ROLE_HIERARCHY[$user['role']] ?? 0;
        $minRoleLevel = self::ROLE_HIERARCHY[$minRole] ?? 0;
        
        if ($userRoleLevel < $minRoleLevel) {
            Response::forbidden('You do not have sufficient permissions');
            exit;
        }
        
        return true;
    }
    
    /**
     * Get current authenticated user from JWT token
     * Checks cookie first, then Authorization header
     */
    public static function getCurrentUser() {
        $token = null;
        
        // First, try to get token from cookie
        if (CookieHelper::hasAuthCookie()) {
            $token = CookieHelper::getAuthCookie();
        }
        
        // If no cookie, fall back to Authorization header
        if (!$token) {
            // Try getallheaders() first
            $authHeader = null;
            if (function_exists('getallheaders')) {
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
            }
            
            // Fallback to $_SERVER superglobal
            if (!$authHeader) {
                $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
            }
            
            if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }
        
        // If we have a token, decode it
        if ($token) {
            return JWTHelper::decode($token);
        }
        
        return null;
    }
    
    /**
     * Authenticate request (just checks if user is logged in)
     */
    public static function authenticate() {
        $user = self::getCurrentUser();
        
        if (!$user) {
            Response::unauthorized('Authentication required');
            exit;
        }
        
        return $user;
    }
}
