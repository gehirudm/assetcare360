<?php

require_once __DIR__ . '/../services/LogService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/EndpointRegistry.php';

/**
 * Log Controller
 * Handles system log viewing and analytics endpoints (Admin only)
 */
class LogController {
    private $logService;
    
    public function __construct() {
        $this->logService = new LogService();
    }
    
    /**
     * Get logs with filtering
     * GET /api/logs
     */
    public function index() {
        // Require Admin role
        RoleMiddleware::requireRole('Admin');
        
        // Get query parameters
        $category = $_GET['category'] ?? null;
        $action = $_GET['action'] ?? null;
        $keyword = $_GET['keyword'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        $employeeId = $_GET['employee_id'] ?? null;
        $method = $_GET['method'] ?? null;
        $responseCode = $_GET['response_code'] ?? null;
        $period = $_GET['period'] ?? 'all'; // today, week, month, year, all
        $dateFrom = $this->normalizeDateFilter($_GET['date_from'] ?? null, 'date_from');
        $dateTo = $this->normalizeDateFilter($_GET['date_to'] ?? null, 'date_to');
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

        $this->ensureDateRange($dateFrom, $dateTo);
        
        // Validate limit
        if ($limit < 1 || $limit > 200) {
            $limit = 50;
        }
        
        // Build filters
        $filters = array_filter([
            'category' => $category,
            'action' => $action,
            'keyword' => $keyword,
            'user_id' => $userId,
            'employee_id' => $employeeId,
            'method' => $method,
            'response_code' => $responseCode,
            'period' => $period,
            'date_from' => $dateFrom,
            'date_to' => $dateTo
        ], function($value) {
            return $value !== null && $value !== '';
        });
        
        $result = $this->logService->getLogs($filters, $page, $limit);
        
        Response::success([
            'logs' => $result['logs'],
            'pagination' => $result['pagination'],
            'filters_applied' => $filters
        ]);
    }

    private function normalizeDateFilter($value, string $field): ?string {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            return null;
        }

        $date = DateTime::createFromFormat('Y-m-d', $raw);
        if (!$date || $date->format('Y-m-d') !== $raw) {
            Response::error($field . ' must be in YYYY-MM-DD format', 400);
        }

        return $date->format('Y-m-d');
    }

    private function ensureDateRange(?string $dateFrom, ?string $dateTo): void {
        if (!$dateFrom || !$dateTo) {
            return;
        }

        $from = DateTime::createFromFormat('Y-m-d', $dateFrom);
        $to = DateTime::createFromFormat('Y-m-d', $dateTo);
        if (!$from || !$to || $from > $to) {
            Response::error('date_from must be earlier than or equal to date_to', 400);
        }
    }
    
    /**
     * Get logs for specific user
     * GET /api/logs/user/:id
     */
    public function getUserLogs() {
        // Require Admin role
        RoleMiddleware::requireRole('Admin');
        
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            Response::error('User ID is required', 400);
        }
        
        // Get filters
        $period = $_GET['period'] ?? 'all';
        $category = $_GET['category'] ?? null;
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        
        $filters = array_filter([
            'category' => $category,
            'period' => $period
        ]);
        
        $result = $this->logService->getLogsByUser($userId, $filters, $page, $limit);
        
        Response::success([
            'user_id' => (int)$userId,
            'logs' => $result['logs'],
            'pagination' => $result['pagination']
        ]);
    }
    
    /**
     * Get user activity summary
     * GET /api/logs/user/:id/summary
     */
    public function getUserActivitySummary() {
        // Require Admin role
        RoleMiddleware::requireRole('Admin');
        
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            Response::error('User ID is required', 400);
        }
        
        $period = $_GET['period'] ?? 'all';
        
        $result = $this->logService->getUserActivitySummary($userId, $period);
        
        Response::success([
            'user_id' => (int)$userId,
            'period' => $period,
            'summary' => $result['summary'],
            'activities' => $result['activities']
        ]);
    }
    
    /**
     * Get log statistics
     * GET /api/logs/stats
     */
    public function stats() {
        // Require Admin role
        RoleMiddleware::requireRole('Admin');
        
        $period = $_GET['period'] ?? 'all';
        
        $stats = $this->logService->getLogStatistics($period);
        
        Response::success([
            'period' => $period,
            'statistics' => $stats
        ]);
    }
    
    /**
     * Get available categories
     * GET /api/logs/categories
     */
    public function categories() {
        // Require Admin role
        RoleMiddleware::requireRole('Admin');
        
        $categories = $this->logService->getCategories();
        
        Response::success($categories);
    }
    
    /**
     * Get endpoint registry
     * GET /api/logs/registry
     */
    public function registry() {
        // Require Admin role
        RoleMiddleware::requireRole('Admin');
        
        $search = $_GET['search'] ?? null;
        $category = $_GET['category'] ?? null;
        
        if ($search) {
            $endpoints = EndpointRegistry::searchEndpoints($search);
        } elseif ($category) {
            $endpoints = EndpointRegistry::getEndpointsByCategory($category);
        } else {
            $endpoints = EndpointRegistry::getAllEndpoints();
        }
        
        Response::success([
            'endpoints' => $endpoints,
            'total' => count($endpoints)
        ]);
    }
    
    /**
     * Get activity timeline
     * GET /api/logs/timeline
     */
    public function timeline() {
        // Require Admin role
        RoleMiddleware::requireRole('Admin');
        
        $period = $_GET['period'] ?? 'today';
        $userId = $_GET['user_id'] ?? null;
        
        $timeline = $this->logService->getActivityTimeline($period, $userId);
        
        Response::success([
            'period' => $period,
            'user_id' => $userId,
            'timeline' => $timeline
        ]);
    }
    
    /**
     * Export logs (CSV format)
     * GET /api/logs/export
     */
    public function export() {
        // Require Admin role
        RoleMiddleware::requireRole('Admin');
        
        // Get filters (same as index)
        $category = $_GET['category'] ?? null;
        $period = $_GET['period'] ?? 'all';
        $userId = $_GET['user_id'] ?? null;
        
        $filters = array_filter([
            'category' => $category,
            'period' => $period,
            'user_id' => $userId
        ]);
        
        // Get logs without pagination (limit to 1000 for safety)
        $result = $this->logService->getLogs($filters, 1, 1000);
        
        // Set headers for CSV download
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="system_logs_' . date('Y-m-d_His') . '.csv"');
        
        // Open output stream
        $output = fopen('php://output', 'w');
        
        // Write CSV header
        fputcsv($output, [
            'ID',
            'Timestamp',
            'User ID',
            'Employee ID',
            'User Name',
            'Role',
            'Method',
            'Endpoint',
            'Action',
            'Category',
            'Response Code',
            'IP Address'
        ]);
        
        // Write data rows
        foreach ($result['logs'] as $log) {
            fputcsv($output, [
                $log['id'],
                $log['created_at'],
                $log['user_id'],
                $log['employee_id'],
                $log['user_name'] ?? 'N/A',
                $log['user_role'] ?? 'N/A',
                $log['method'],
                $log['endpoint'],
                $log['action'],
                $log['category'],
                $log['response_code'],
                $log['ip_address']
            ]);
        }
        
        fclose($output);
        exit;
    }
}
