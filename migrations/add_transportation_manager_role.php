<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();

    echo "Updating users.role ENUM to include Transportation Manager...\n";

    $sql = "ALTER TABLE users
            MODIFY COLUMN role ENUM(
                'Admin',
                'Maintenance Manager',
                'Inventory Manager',
                'Transportation Manager',
                'Technical Officer',
                'Supervisor',
                'Machinary Operator',
                'Driver',
                'Auction Officer'
            ) NOT NULL";

    $db->exec($sql);

    echo "✓ users.role updated successfully\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
