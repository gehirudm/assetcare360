#!/usr/bin/env php
<?php

/**
 * Database Migration: Add New User Roles
 * This script updates the users table to include new roles:
 * - Maintenance Manager
 * - Technical Officer
 */

// Load configuration
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "==========================================\n";
echo "User Roles Migration\n";
echo "==========================================\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Updating users table to add new roles...\n";
    
    // Modify the role ENUM to include new roles
    $sql = "ALTER TABLE users 
            MODIFY COLUMN role ENUM(
                'Admin', 
                'Maintenance Manager', 
                'Inventory Manager', 
                'Technical Officer', 
                'Supervisor', 
                'Machinary Operator', 
                'Driver'
            ) NOT NULL";
    
    $db->exec($sql);
    
    echo "✅ Successfully added new roles:\n";
    echo "   - Maintenance Manager (hierarchy level 6)\n";
    echo "   - Technical Officer (hierarchy level 4)\n\n";
    
    echo "Updated role hierarchy:\n";
    echo "  1. Admin (level 7)\n";
    echo "  2. Maintenance Manager (level 6)\n";
    echo "  3. Inventory Manager (level 5)\n";
    echo "  4. Technical Officer (level 4)\n";
    echo "  5. Supervisor (level 3)\n";
    echo "  6. Driver (level 2)\n";
    echo "  7. Machinary Operator (level 1)\n\n";
    
    echo "==========================================\n";
    echo "Migration Complete! ✅\n";
    echo "==========================================\n\n";
    
    echo "You can now create users with the new roles:\n";
    echo "- Maintenance Manager\n";
    echo "- Technical Officer\n\n";
    
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
