<?php

/**
 * Migration Script: Add password reset columns to users table
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "=== Adding Password Reset Columns to Users Table ===\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if columns already exist
    $checkSql = "SHOW COLUMNS FROM users LIKE 'password_reset_token'";
    $stmt = $db->query($checkSql);
    
    if ($stmt->rowCount() > 0) {
        echo "✓ Columns already exist. No migration needed.\n";
        exit(0);
    }
    
    // Add the columns
    $sql = "ALTER TABLE users 
            ADD COLUMN password_reset_token VARCHAR(255) NULL AFTER force_password_change,
            ADD COLUMN password_reset_expires TIMESTAMP NULL AFTER password_reset_token";
    
    $db->exec($sql);
    
    echo "✓ Successfully added password_reset_token column\n";
    echo "✓ Successfully added password_reset_expires column\n";
    echo "\n=== Migration completed successfully! ===\n";
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
