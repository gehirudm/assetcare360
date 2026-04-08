<?php

require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

class NotificationController {
    private Notification $notificationModel;

    public function __construct() {
        $this->notificationModel = new Notification();
    }

    public function index() {
        try {
            $user = RoleMiddleware::getCurrentUser();
            if (!$user) {
                Response::unauthorized('Unauthorized');
                return;
            }

            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
            $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
            $unreadOnly = isset($_GET['unread_only']) && filter_var($_GET['unread_only'], FILTER_VALIDATE_BOOLEAN);
            $offset = max(0, ($page - 1) * max(1, $limit));

            $notifications = $this->notificationModel->listForUser((int)$user['id'], (string)$user['role'], $limit, $offset, $unreadOnly);
            $total = $this->notificationModel->countForUser((int)$user['id'], (string)$user['role'], $unreadOnly);
            $unreadCount = $this->notificationModel->countForUser((int)$user['id'], (string)$user['role'], true);

            Response::success([
                'notifications' => $notifications,
                'pagination' => [
                    'page' => max(1, $page),
                    'limit' => max(1, min(100, $limit)),
                    'total' => $total,
                    'total_pages' => (int) max(1, ceil($total / max(1, min(100, $limit)))),
                ],
                'unread_count' => $unreadCount,
            ]);
        } catch (Throwable $e) {
            error_log('NotificationController::index error: ' . $e->getMessage());
            Response::serverError('Failed to fetch notifications');
        }
    }

    public function markRead() {
        try {
            $user = RoleMiddleware::getCurrentUser();
            if (!$user) {
                Response::unauthorized('Unauthorized');
                return;
            }

            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $markAll = isset($payload['mark_all']) && filter_var($payload['mark_all'], FILTER_VALIDATE_BOOLEAN);

            if ($markAll) {
                $this->notificationModel->markAllAsRead((int)$user['id'], (string)$user['role']);
            } else {
                $notificationId = trim((string)($payload['notification_id'] ?? ''));
                if ($notificationId === '') {
                    Response::error('notification_id is required when mark_all is false', 400);
                    return;
                }
                $this->notificationModel->markAsRead($notificationId, (int)$user['id'], (string)$user['role']);
            }

            $unreadCount = $this->notificationModel->countForUser((int)$user['id'], (string)$user['role'], true);

            Response::success([
                'unread_count' => $unreadCount,
            ], 'Notification read state updated');
        } catch (Throwable $e) {
            error_log('NotificationController::markRead error: ' . $e->getMessage());
            Response::serverError('Failed to update notifications');
        }
    }
}
