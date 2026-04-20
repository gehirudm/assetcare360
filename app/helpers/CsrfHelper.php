<?php

/**
 * CSRF Helper
 * Implements double-submit-cookie CSRF protection.
 */
class CsrfHelper {

    /**
     * Issue or rotate CSRF token and set cookie.
     */
    public static function issueToken($forceRotate = false) {
        $existing = self::sanitizeToken($_COOKIE[CSRF_COOKIE_NAME] ?? null);

        if (!$forceRotate && $existing !== null) {
            self::setCsrfCookie($existing);
            return $existing;
        }

        $token = bin2hex(random_bytes(32));
        self::setCsrfCookie($token);
        $_COOKIE[CSRF_COOKIE_NAME] = $token;

        return $token;
    }

    /**
     * Validate incoming CSRF token from header against cookie.
     */
    public static function validateRequest() {
        $cookieToken = self::sanitizeToken($_COOKIE[CSRF_COOKIE_NAME] ?? null);
        $headerToken = self::sanitizeToken(self::getHeaderToken());

        if ($cookieToken === null || $headerToken === null) {
            return false;
        }

        return hash_equals($cookieToken, $headerToken);
    }

    private static function getHeaderToken() {
        $headerToken = null;

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $name => $value) {
                    if (strcasecmp((string) $name, 'X-CSRF-Token') === 0) {
                        $headerToken = $value;
                        break;
                    }
                }
            }
        }

        if ($headerToken === null) {
            $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        }

        return is_string($headerToken) ? trim($headerToken) : null;
    }

    private static function sanitizeToken($token) {
        if (!is_string($token)) {
            return null;
        }

        $value = trim($token);
        if (!preg_match('/^[a-f0-9]{64}$/', $value)) {
            return null;
        }

        return $value;
    }

    private static function setCsrfCookie($token) {
        $options = [
            'expires' => time() + CSRF_TOKEN_EXPIRATION,
            'path' => COOKIE_PATH,
            'domain' => COOKIE_DOMAIN,
            'secure' => COOKIE_SECURE,
            'httponly' => CSRF_COOKIE_HTTPONLY,
            'samesite' => COOKIE_SAMESITE,
        ];

        setcookie(CSRF_COOKIE_NAME, $token, $options);
    }
}
