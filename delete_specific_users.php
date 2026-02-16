<?php
/**
 * Delete specific users by employee_id
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();
    
    // Employee IDs to delete
    $employeeIds = [
        'LITRO-INVMGR-002',
        'LITRO-SUPERVISOR-002',
        'LITRO-DRIVER-002',
        'LITRO-MACHOPER-003',
        'LITRO-MACHOPER-001'
    ];
    
    // First, get the list of users to delete
    $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));
    $stmt = $db->prepare("SELECT id, full_name, employee_id, role FROM users WHERE employee_id IN ($placeholders)");
    $stmt->execute($employeeIds);
    $usersToDelete = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($usersToDelete) === 0) {
        echo "No users found with the specified employee IDs.\n";
        exit(0);
    }
    
    echo "Found " . count($usersToDelete) . " users to delete:\n\n";
    foreach ($usersToDelete as $user) {
        echo sprintf("  - ID: %d | Name: %-30s | EmpID: %-25s | Role: %s\n", 
            $user['id'], $user['full_name'], $user['employee_id'], $user['role']);
    }
    echo "\n";
    
    // Delete the users
    $deleteStmt = $db->prepare("DELETE FROM users WHERE employee_id IN ($placeholders)");
    $deleteStmt->execute($employeeIds);
    $deletedCount = $deleteStmt->rowCount();
    
    $db->commit();
    
    echo "✓ Successfully deleted $deletedCount users\n";
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
