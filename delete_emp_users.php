<?php
/**
 * Delete all users with employee_id starting with "EMP"
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();
    
    // First, get the list of users to delete
    $stmt = $db->prepare('SELECT id, full_name, employee_id, role FROM users WHERE employee_id LIKE ?');
    $stmt->execute(['EMP%']);
    $usersToDelete = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($usersToDelete) === 0) {
        echo "No users found with employee_id starting with 'EMP'.\n";
        exit(0);
    }
    
    echo "Found " . count($usersToDelete) . " users to delete:\n\n";
    foreach ($usersToDelete as $user) {
        echo sprintf("  - ID: %d | Name: %s | EmpID: %s | Role: %s\n", 
            $user['id'], $user['full_name'], $user['employee_id'], $user['role']);
    }
    echo "\n";
    
    // Delete the users
    $deleteStmt = $db->prepare('DELETE FROM users WHERE employee_id LIKE ?');
    $deleteStmt->execute(['EMP%']);
    $deletedCount = $deleteStmt->rowCount();
    
    $db->commit();
    
    echo "✓ Successfully deleted $deletedCount users with employee_id starting with 'EMP'\n";
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
