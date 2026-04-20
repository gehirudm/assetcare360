<?php

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../services/PasskeyService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/CookieHelper.php';
require_once __DIR__ . '/../helpers/CsrfHelper.php';
require_once __DIR__ . '/../helpers/LoginRateLimiter.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

/**
 * Authentication Controller
 * Handles authentication endpoints
 */
class AuthController
{
    private $authService;
    private $passkeyService;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->passkeyService = new PasskeyService();
    }

    /**
     * Issue CSRF token
     * GET /api/auth/csrf
     */
    public function csrfToken()
    {
        $token = CsrfHelper::issueToken(true);
        Response::success([
            'csrf_token' => $token,
        ], 'CSRF token generated');
    }

    /**
     * Login endpoint
     * POST /api/auth/login
     */
    public function login()
    {
        $clientIp = $this->getClientIp();

        $rateLimit = LoginRateLimiter::check($clientIp);
        if (!$rateLimit['allowed']) {
            header('Retry-After: ' . (string) $rateLimit['retry_after']);
            Response::error('Too many login attempts. Please try again later.', 429, [
                'retry_after_seconds' => $rateLimit['retry_after'],
            ]);
        }

        if (!CsrfHelper::validateRequest()) {
            Response::forbidden('CSRF token validation failed');
        }

        // Get request body
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            LoginRateLimiter::recordFailure($clientIp);
            Response::error('Invalid JSON data', 400);
        }

        $employeeId = $input['employee_id'] ?? null;
        $password = $input['password'] ?? null;

        // Attempt login
        $result = $this->authService->login($employeeId, $password);

        if ($result['success']) {
            LoginRateLimiter::recordSuccess($clientIp);

            // Set auth token in HTTP-only cookie
            CookieHelper::setAuthCookie($result['data']['token']);

            // Still return token in response for API clients that prefer header auth
            Response::success($result['data'], $result['message']);
        } else {
            LoginRateLimiter::recordFailure($clientIp);
            Response::error($result['message'], 401);
        }
    }

    private function getClientIp()
    {
        $forwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if (is_string($forwardedFor) && $forwardedFor !== '') {
            $forwardedIps = explode(',', $forwardedFor);
            foreach ($forwardedIps as $forwardedIp) {
                $candidate = trim($forwardedIp);
                if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                    return $candidate;
                }
            }
        }

        $realIp = $_SERVER['HTTP_X_REAL_IP'] ?? null;
        if (is_string($realIp) && filter_var($realIp, FILTER_VALIDATE_IP)) {
            return $realIp;
        }

        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        if (is_string($remoteAddr) && filter_var($remoteAddr, FILTER_VALIDATE_IP)) {
            return $remoteAddr;
        }

        return '0.0.0.0';
    }

    /**
     * Get current user
     * GET /api/auth/me
     * Returns user info if authenticated, or null if not (doesn't throw 401)
     */
    public function me()
    {
        $user = RoleMiddleware::getCurrentUser();

        if ($user) {
            Response::success($user, 'User authenticated');
        } else {
            Response::success(null, 'No user authenticated');
        }
    }

    /**
     * Get complete user profile
     * GET /api/auth/profile
     * Returns full user details from database
     */
    public function getProfile()
    {
        $user = RoleMiddleware::authenticate();

        $result = $this->authService->getUserProfile($user['id']);

        if ($result['success']) {
            Response::success($result['data'], 'Profile retrieved successfully');
        } else {
            Response::error($result['message'], 404);
        }
    }

    /**
     * Get current user's recent login activities
     * GET /api/auth/login-activities
     */
    public function getLoginActivities()
    {
        $user = RoleMiddleware::authenticate();

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        if ($limit < 1 || $limit > 100) {
            $limit = 20;
        }

        $result = $this->authService->getLoginActivities($user['id'], $limit);

        if ($result['success']) {
            Response::success($result['data'], $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }

    /**
     * Logout endpoint (clears auth cookie)
     * POST /api/auth/logout
     */
    public function logout()
    {
        RoleMiddleware::authenticate();

        // Clear auth cookie
        CookieHelper::deleteAuthCookie();

        Response::success(null, 'Logged out successfully');
    }

    /**
     * Change password
     * POST /api/auth/change-password
     */
    public function changePassword()
    {
        $user = RoleMiddleware::authenticate();

        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }

        $currentPassword = $input['current_password'] ?? null;
        $newPassword = $input['new_password'] ?? null;

        if (!$currentPassword || !$newPassword) {
            Response::error('Current password and new password are required', 400);
        }

        $result = $this->authService->changePassword($user['id'], $currentPassword, $newPassword);

        if ($result['success']) {
            Response::success(null, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }

    /**
     * Update user profile
     * PUT /api/auth/profile
     */
    public function updateProfile()
    {
        $user = RoleMiddleware::authenticate();

        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }

        $fullName = $input['full_name'] ?? null;
        $phone = $input['phone'] ?? null;

        if (!$fullName) {
            Response::error('Full name is required', 400);
        }

        $result = $this->authService->updateProfile($user['id'], $fullName, $phone);

        if ($result['success']) {
            Response::success($result['data'], $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }

    /**
     * Validate token
     * GET /api/auth/validate
     */
    public function validateToken()
    {
        $token = null;

        // Check cookie first
        if (CookieHelper::hasAuthCookie()) {
            $token = CookieHelper::getAuthCookie();
        }

        // Fall back to Authorization header
        if (!$token) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

            if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }

        if (!$token) {
            Response::unauthorized('Token not provided');
        }

        $result = $this->authService->validateToken($token);

        if ($result['success']) {
            Response::success($result['data'], 'Token is valid');
        } else {
            Response::unauthorized($result['message']);
        }
    }

    /**
     * Forgot password
     * POST /api/auth/forgot-password
     */
    public function forgotPassword()
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }

        $employeeId = $input['employee_id'] ?? null;
        $email = $input['email'] ?? null;

        if (!$employeeId || !$email) {
            Response::error('Employee ID and email are required', 400);
        }

        $result = $this->authService->forgotPassword($employeeId, $email);

        if ($result['success']) {
            Response::success($result, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }

    /**
     * Reset password
     * POST /api/auth/reset-password
     */
    public function resetPassword()
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }

        $token = $input['token'] ?? null;
        $newPassword = $input['new_password'] ?? null;

        if (!$token || !$newPassword) {
            Response::error('Token and new password are required', 400);
        }

        $result = $this->authService->resetPassword($token, $newPassword);

        if ($result['success']) {
            Response::success(null, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }

    // =========================================
    // Passkey Authentication Methods
    // =========================================

    /**
     * Get passkey registration options
     * GET /api/auth/passkey/register-options
     */
    public function passkeyRegisterOptions()
    {
        $user = RoleMiddleware::authenticate();

        $result = $this->passkeyService->getRegistrationOptions($user);

        if ($result['success']) {
            Response::success($result['data'], 'Registration options generated');
        } else {
            Response::error($result['message'], 400);
        }
    }

    /**
     * Complete passkey registration
     * POST /api/auth/passkey/register
     */
    public function passkeyRegister()
    {
        $user = RoleMiddleware::authenticate();

        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }

        $response = $input['response'] ?? null;
        $name = $input['name'] ?? 'My Passkey';

        if (!$response) {
            Response::error('Credential response is required', 400);
        }

        $result = $this->passkeyService->verifyRegistration($user, $response, $name);

        if ($result['success']) {
            Response::success($result['data'], $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }

    /**
     * Get passkey authentication options
     * POST /api/auth/passkey/authenticate-options
     */
    public function passkeyAuthenticateOptions()
    {
        $input = json_decode(file_get_contents('php://input'), true);

        $employeeId = $input['employee_id'] ?? null;

        if (!$employeeId) {
            Response::error('Employee ID is required', 400);
        }

        $result = $this->passkeyService->getAuthenticationOptions($employeeId);

        if ($result['success']) {
            Response::success($result['data'], 'Authentication options generated');
        } else {
            Response::error($result['message'], 400);
        }
    }

    /**
     * Complete passkey authentication
     * POST /api/auth/passkey/authenticate
     */
    public function passkeyAuthenticate()
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            Response::error('Invalid JSON data', 400);
        }

        $response = $input['response'] ?? null;

        if (!$response) {
            Response::error('Credential response is required', 400);
        }

        $result = $this->passkeyService->verifyAuthentication($response);

        if ($result['success']) {
            // Set auth token in HTTP-only cookie
            CookieHelper::setAuthCookie($result['data']['token']);

            Response::success($result['data'], $result['message']);
        } else {
            Response::error($result['message'], 401);
        }
    }

    /**
     * List user's passkeys
     * GET /api/auth/passkey
     */
    public function listPasskeys()
    {
        $user = RoleMiddleware::authenticate();

        $result = $this->passkeyService->listPasskeys($user['id']);

        Response::success($result['data'], 'Passkeys retrieved');
    }

    /**
     * Delete a passkey
     * DELETE /api/auth/passkey/:id
     */
    public function deletePasskey()
    {
        $user = RoleMiddleware::authenticate();

        $id = $_GET['id'] ?? null;

        if (!$id) {
            Response::error('Passkey ID is required', 400);
        }

        $result = $this->passkeyService->deletePasskey($id, $user['id']);

        if ($result['success']) {
            Response::success(null, $result['message']);
        } else {
            Response::error($result['message'], 400);
        }
    }
}
