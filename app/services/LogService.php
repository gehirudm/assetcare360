<?php

require_once __DIR__ . '/../config/EndpointRegistry.php';

/**
 * Log Service
 * Handles system log queries and analytics
 */
class LogService {
    private $db;
    private $table = 'api_request_logs';
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    /**
     * Get logs with advanced filtering
     */
    public function getLogs($filters = [], $page = 1, $limit = 50) {
        $offset = ($page - 1) * $limit;
        
        // Base query
        $sql = "SELECT l.*, u.full_name as user_name, u.role as user_role 
                FROM `{$this->table}` l 
                LEFT JOIN users u ON l.user_id = u.id 
                WHERE 1=1";
        
        $params = [];
        
        // Apply filters
        if (!empty($filters['category'])) {
            $sql .= " AND l.category = ?";
            $params[] = $filters['category'];
        }
        
        if (!empty($filters['action'])) {
            $sql .= " AND l.action LIKE ?";
            $params[] = '%' . $filters['action'] . '%';
        }
        
        if (!empty($filters['user_id'])) {
            $sql .= " AND l.user_id = ?";
            $params[] = $filters['user_id'];
        }
        
        if (!empty($filters['employee_id'])) {
            $sql .= " AND l.employee_id = ?";
            $params[] = $filters['employee_id'];
        }
        
        if (!empty($filters['method'])) {
            $sql .= " AND l.method = ?";
            $params[] = strtoupper($filters['method']);
        }
        
        if (!empty($filters['response_code'])) {
            $sql .= " AND l.response_code = ?";
            $params[] = $filters['response_code'];
        }
        
        // Keyword search across multiple fields
        if (!empty($filters['keyword'])) {
            $sql .= " AND (l.action LIKE ? OR l.endpoint LIKE ? OR l.employee_id LIKE ? OR u.full_name LIKE ?)";
            $keyword = '%' . $filters['keyword'] . '%';
            $params[] = $keyword;
            $params[] = $keyword;
            $params[] = $keyword;
            $params[] = $keyword;
        }
        
        // Time period filtering
        if (!empty($filters['period'])) {
            $timeCondition = $this->getTimePeriodCondition($filters['period'], 'l.created_at');
            if ($timeCondition) {
                $sql .= " AND " . $timeCondition;
            }
        }
        
        // Custom date range
        if (!empty($filters['date_from'])) {
            $sql .= " AND l.created_at >= ?";
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $sql .= " AND l.created_at <= ?";
            $params[] = $filters['date_to'];
        }
        
        // Get total count for pagination
        $countSql = "SELECT COUNT(*) as total FROM ({$sql}) as subquery";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $totalRecords = $countStmt->fetch()['total'];
        
        // Add ordering and pagination
        $sql .= " ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();
        
        // Calculate pagination info
        $totalPages = ceil($totalRecords / $limit);
        
        return [
            'logs' => $logs,
            'pagination' => [
                'current_page' => (int)$page,
                'per_page' => (int)$limit,
                'total_items' => (int)$totalRecords,
                'total_pages' => (int)$totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ]
        ];
    }
    
    /**
     * Get logs grouped by user
     */
    public function getLogsByUser($userId, $filters = [], $page = 1, $limit = 50) {
        $filters['user_id'] = $userId;
        return $this->getLogs($filters, $page, $limit);
    }
    
    /**
     * Get user activity summary
     */
    public function getUserActivitySummary($userId, $period = 'all') {
        $sql = "SELECT 
                    COUNT(*) as total_requests,
                    COUNT(DISTINCT DATE(created_at)) as active_days,
                    category,
                    action,
                    COUNT(*) as action_count
                FROM `{$this->table}`
                WHERE user_id = ?";
        
        $params = [$userId];
        
        // Add time period filter
        if ($period !== 'all') {
            $timeCondition = $this->getTimePeriodCondition($period);
            if ($timeCondition) {
                $sql .= " AND " . $timeCondition;
            }
        }
        
        $sql .= " GROUP BY category, action ORDER BY action_count DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $activities = $stmt->fetchAll();
        
        // Get total stats
        $totalSql = "SELECT 
                        COUNT(*) as total_requests,
                        COUNT(DISTINCT DATE(created_at)) as active_days,
                        MIN(created_at) as first_activity,
                        MAX(created_at) as last_activity
                     FROM `{$this->table}`
                     WHERE user_id = ?";
        
        $totalParams = [$userId];
        
        if ($period !== 'all') {
            $timeCondition = $this->getTimePeriodCondition($period);
            if ($timeCondition) {
                $totalSql .= " AND " . $timeCondition;
            }
        }
        
        $totalStmt = $this->db->prepare($totalSql);
        $totalStmt->execute($totalParams);
        $totals = $totalStmt->fetch();
        
        return [
            'summary' => $totals,
            'activities' => $activities
        ];
    }
    
    /**
     * Get log statistics
     */
    public function getLogStatistics($period = 'all') {
        $timeCondition = '';
        if ($period !== 'all') {
            $condition = $this->getTimePeriodCondition($period);
            if ($condition) {
                $timeCondition = " WHERE " . $condition;
            }
        }
        
        // Total requests
        $totalSql = "SELECT COUNT(*) as total FROM `{$this->table}`" . $timeCondition;
        $totalStmt = $this->db->query($totalSql);
        $total = $totalStmt->fetch()['total'];
        
        // Requests by category
        $categorySql = "SELECT category, COUNT(*) as count 
                        FROM `{$this->table}`" . $timeCondition . "
                        GROUP BY category 
                        ORDER BY count DESC";
        $categoryStmt = $this->db->query($categorySql);
        $byCategory = $categoryStmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // Requests by method
        $methodSql = "SELECT method, COUNT(*) as count 
                      FROM `{$this->table}`" . $timeCondition . "
                      GROUP BY method 
                      ORDER BY count DESC";
        $methodStmt = $this->db->query($methodSql);
        $byMethod = $methodStmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // Requests by response code
        $codeSql = "SELECT response_code, COUNT(*) as count 
                    FROM `{$this->table}`" . $timeCondition . "
                    GROUP BY response_code 
                    ORDER BY count DESC";
        $codeStmt = $this->db->query($codeSql);
        $byResponseCode = $codeStmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // Top users by activity
        $userWhereClauses = ['user_id IS NOT NULL'];
        if (!empty($condition)) {
            $userWhereClauses[] = $condition;
        }
        $userWhereSql = ' WHERE ' . implode(' AND ', $userWhereClauses);

        $userSql = "SELECT user_id, employee_id, COUNT(*) as request_count 
                    FROM `{$this->table}`" . $userWhereSql . "
                    GROUP BY user_id, employee_id 
                    ORDER BY request_count DESC 
                    LIMIT 10";
        $userStmt = $this->db->query($userSql);
        $topUsers = $userStmt->fetchAll();
        
        // Most common actions
        $actionSql = "SELECT action, COUNT(*) as count 
                      FROM `{$this->table}`" . $timeCondition . "
                      GROUP BY action 
                      ORDER BY count DESC 
                      LIMIT 10";
        $actionStmt = $this->db->query($actionSql);
        $topActions = $actionStmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // Error rate
        $errorSql = "SELECT 
                        COUNT(CASE WHEN response_code >= 400 THEN 1 END) as error_count,
                        COUNT(*) as total_count
                     FROM `{$this->table}`" . $timeCondition;
        $errorStmt = $this->db->query($errorSql);
        $errorData = $errorStmt->fetch();
        $errorRate = $errorData['total_count'] > 0 
            ? round(($errorData['error_count'] / $errorData['total_count']) * 100, 2) 
            : 0;
        
        return [
            'total_requests' => (int)$total,
            'by_category' => $byCategory,
            'by_method' => $byMethod,
            'by_response_code' => $byResponseCode,
            'top_users' => $topUsers,
            'top_actions' => $topActions,
            'error_rate' => $errorRate,
            'error_count' => (int)$errorData['error_count']
        ];
    }
    
    /**
     * Get available categories from registry
     */
    public function getCategories() {
        $registryCategories = EndpointRegistry::getCategories();
        
        // Also get categories from actual logs
        $sql = "SELECT DISTINCT category, COUNT(*) as log_count 
                FROM `{$this->table}` 
                WHERE category IS NOT NULL 
                GROUP BY category 
                ORDER BY log_count DESC";
        
        $stmt = $this->db->query($sql);
        $logCategories = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        return [
            'registered_categories' => $registryCategories,
            'categories_with_logs' => $logCategories
        ];
    }
    
    /**
     * Get time period SQL condition
     */
    private function getTimePeriodCondition($period, $timestampColumn = 'created_at') {
        $column = trim((string)$timestampColumn);
        if ($column === '') {
            $column = 'created_at';
        }

        switch ($period) {
            case 'today':
                return "DATE({$column}) = CURDATE()";
            
            case 'week':
                return "{$column} >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            
            case 'month':
                return "{$column} >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            
            case 'year':
                return "{$column} >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            
            case 'all':
            default:
                return '';
        }
    }
    
    /**
     * Get activity timeline (hourly breakdown)
     */
    public function getActivityTimeline($period = 'today', $userId = null) {
        $timeCondition = $this->getTimePeriodCondition($period);
        
        $sql = "SELECT 
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
                    COUNT(*) as request_count,
                    COUNT(DISTINCT user_id) as unique_users
                FROM `{$this->table}`";
        
        $params = [];
        $whereClauses = [];
        
        if ($timeCondition) {
            $whereClauses[] = $timeCondition;
        }
        
        if ($userId) {
            $whereClauses[] = "user_id = ?";
            $params[] = $userId;
        }
        
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $sql .= " GROUP BY hour ORDER BY hour ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }
}
