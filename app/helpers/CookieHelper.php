<?php

/**
 * Cookie Helper Class
 * Handles secure cookie operations for JWT tokens
 */
class CookieHelper {
    
    /**
     * Set authentication cookie
     */
    public static function setAuthCookie($token) {
        $options = [
            'expires' => time() + JWT_EXPIRATION,
            'path' => COOKIE_PATH,
            'domain' => COOKIE_DOMAIN,
            'secure' => COOKIE_SECURE,
            'httponly' => COOKIE_HTTPONLY,
            'samesite' => COOKIE_SAMESITE
        ];
        
        setcookie(COOKIE_NAME, $token, $options);
    }
    
    /**
     * Get authentication cookie
     */
    public static function getAuthCookie() {
        return $_COOKIE[COOKIE_NAME] ?? null;
    }
    
    /**
     * Delete authentication cookie
     */
    public static function deleteAuthCookie() {
        $options = [
            'expires' => time() - 3600, // Set to past time
            'path' => COOKIE_PATH,
            'domain' => COOKIE_DOMAIN,
            'secure' => COOKIE_SECURE,
            'httponly' => COOKIE_HTTPONLY,
            'samesite' => COOKIE_SAMESITE
        ];
        
        setcookie(COOKIE_NAME, '', $options);
        
        // Also unset from $_COOKIE superglobal
        if (isset($_COOKIE[COOKIE_NAME])) {
            unset($_COOKIE[COOKIE_NAME]);
        }
    }
    
    /**
     * Check if auth cookie exists
     */
    public static function hasAuthCookie() {
        return isset($_COOKIE[COOKIE_NAME]) && !empty($_COOKIE[COOKIE_NAME]);
    }
}
