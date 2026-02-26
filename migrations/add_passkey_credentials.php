<?php

/**
 * Migration: Add passkey_credentials table
 * For WebAuthn passkey authentication
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();

    echo "Creating passkey_credentials table...\n";

    $sql = "CREATE TABLE IF NOT EXISTS passkey_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        credential_id VARCHAR(512) NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        name VARCHAR(100) DEFAULT 'My Passkey',
        sign_count INT UNSIGNED DEFAULT 0,
        transports TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_passkey_user_id (user_id),
        INDEX idx_credential_id (credential_id(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $db->exec($sql);

    echo "✓ passkey_credentials table created successfully!\n";

} catch (PDOException $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
