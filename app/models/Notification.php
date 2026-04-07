<?php

require_once __DIR__ . '/BaseModel.php';

class Notification extends BaseModel {
    protected $table = 'notifications';

    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'notification_id' => 'VARCHAR(36) NOT NULL UNIQUE',
            'user_id' => 'INT NULL',
            'target_role' => 'VARCHAR(50) NULL',
            'title' => 'VARCHAR(255) NOT NULL',
            'message' => 'TEXT NOT NULL',
            'type' => "ENUM('info','success','warning','error') NOT NULL DEFAULT 'info'",
            'source_event' => 'VARCHAR(120) NOT NULL',
            'source_event_id' => 'VARCHAR(64) NULL',
            'is_read' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'read_at' => 'DATETIME NULL',
            'payload_json' => 'LONGTEXT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        ];
    }

    protected function getIndexes() {
        return [
            'idx_notifications_user' => 'user_id',
            'idx_notifications_role' => 'target_role',
            'idx_notifications_read' => 'is_read',
            'idx_notifications_created' => 'created_at',
        ];
    }

    protected function getForeignKeys() {
        return [
            'fk_notifications_user' => 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
        ];
    }

    public function listForUser(int $userId, string $role, int $limit = 20, int $offset = 0, bool $unreadOnly = false): array {
        $limit = max(1, min(100, $limit));
        $offset = max(0, $offset);

        $sql = "SELECT * FROM {$this->table}
                WHERE (user_id = :user_id OR target_role = :target_role OR (user_id IS NULL AND target_role IS NULL))";

        if ($unreadOnly) {
            $sql .= ' AND is_read = 0';
        }

        $sql .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':target_role', $role, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function countForUser(int $userId, string $role, bool $unreadOnly = false): int {
        $sql = "SELECT COUNT(*) FROM {$this->table}
                WHERE (user_id = :user_id OR target_role = :target_role OR (user_id IS NULL AND target_role IS NULL))";

        if ($unreadOnly) {
            $sql .= ' AND is_read = 0';
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':target_role' => $role,
        ]);

        return (int) $stmt->fetchColumn();
    }

    public function markAsRead(string $notificationId, int $userId, string $role): bool {
        $stmt = $this->db->prepare(
            "UPDATE {$this->table}
             SET is_read = 1, read_at = NOW()
             WHERE notification_id = :notification_id
               AND is_read = 0
               AND (user_id = :user_id OR target_role = :target_role OR (user_id IS NULL AND target_role IS NULL))"
        );

        return $stmt->execute([
            ':notification_id' => $notificationId,
            ':user_id' => $userId,
            ':target_role' => $role,
        ]);
    }

    public function markAllAsRead(int $userId, string $role): bool {
        $stmt = $this->db->prepare(
            "UPDATE {$this->table}
             SET is_read = 1, read_at = NOW()
             WHERE is_read = 0
               AND (user_id = :user_id OR target_role = :target_role OR (user_id IS NULL AND target_role IS NULL))"
        );

        return $stmt->execute([
            ':user_id' => $userId,
            ':target_role' => $role,
        ]);
    }
}
