<?php

require_once __DIR__ . '/../models/SystemSetting.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

class SystemSettingController {
    private $settingModel;

    public function __construct() {
        $this->settingModel = new SystemSetting();
    }

    private function getAuthenticatedUser() {
        return RoleMiddleware::getCurrentUser();
    }

    /**
     * Get all system settings
     * GET /system-settings
     */
    public function index() {
        try {
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
                return;
            }

            // Only Admin can view all settings
            if ($user['role'] !== 'Admin') {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'Only administrators can manage system settings']);
                return;
            }

            $settings = $this->settingModel->getAllSettings();

            echo json_encode([
                'status' => 'success',
                'data' => ['settings' => $settings]
            ]);
        } catch (Exception $e) {
            error_log("Get system settings error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Internal server error']);
        }
    }

    /**
     * Get a single system setting by key
     * GET /system-settings/:key
     */
    public function show() {
        try {
            $key = $_GET['key'] ?? null;
            if (!$key) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Setting key is required']);
                return;
            }

            $user = $this->getAuthenticatedUser();
            if (!$user) {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
                return;
            }

            $setting = $this->settingModel->getSettingByKey($key);
            if (!$setting) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Setting not found']);
                return;
            }

            echo json_encode([
                'status' => 'success',
                'data' => ['setting' => $setting]
            ]);
        } catch (Exception $e) {
            error_log("Get system setting error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Internal server error']);
        }
    }

    /**
     * Update a system setting
     * PUT /system-settings/:key
     */
    public function update() {
        try {
            $key = $_GET['key'] ?? null;
            if (!$key) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Setting key is required']);
                return;
            }

            $user = $this->getAuthenticatedUser();
            if (!$user) {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
                return;
            }

            // Only Admin can update settings
            if ($user['role'] !== 'Admin') {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'Only administrators can update system settings']);
                return;
            }

            // Check setting exists
            $existing = $this->settingModel->getSettingByKey($key);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Setting not found']);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['value'])) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Value is required']);
                return;
            }

            // Validate value based on data type
            $value = $data['value'];
            switch ($existing['data_type']) {
                case 'integer':
                    if (!is_numeric($value) || (int) $value != $value) {
                        http_response_code(400);
                        echo json_encode(['status' => 'error', 'message' => 'Value must be an integer']);
                        return;
                    }
                    break;
                case 'decimal':
                    if (!is_numeric($value)) {
                        http_response_code(400);
                        echo json_encode(['status' => 'error', 'message' => 'Value must be a number']);
                        return;
                    }
                    if ((float) $value < 0) {
                        http_response_code(400);
                        echo json_encode(['status' => 'error', 'message' => 'Value must be non-negative']);
                        return;
                    }
                    break;
                case 'boolean':
                    if (!in_array($value, [true, false, 'true', 'false', 0, 1, '0', '1'], true)) {
                        http_response_code(400);
                        echo json_encode(['status' => 'error', 'message' => 'Value must be a boolean']);
                        return;
                    }
                    break;
                case 'json':
                    if (is_string($value)) {
                        $decoded = json_decode($value);
                        if (json_last_error() !== JSON_ERROR_NONE) {
                            http_response_code(400);
                            echo json_encode(['status' => 'error', 'message' => 'Value must be valid JSON']);
                            return;
                        }
                    }
                    break;
            }

            $success = $this->settingModel->setSetting($key, $value, $user['id']);

            if ($success) {
                $setting = $this->settingModel->getSettingByKey($key);
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Setting updated successfully',
                    'data' => ['setting' => $setting]
                ]);
            } else {
                throw new Exception('Failed to update setting');
            }
        } catch (Exception $e) {
            error_log("Update system setting error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Internal server error']);
        }
    }
}
