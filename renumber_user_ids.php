<?php
/**
 * Renumber user IDs to be sequential from 1-7
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    // Disable foreign key checks temporarily
    $db->exec('SET FOREIGN_KEY_CHECKS = 0');
    
    // Note: We don't use transaction when foreign key checks are disabled
    // as it can cause issues with some MySQL versions
    
    // Get all users ordered by their current ID
    $stmt = $db->query('SELECT id, full_name, employee_id FROM users ORDER BY id');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Current users:\n";
    foreach ($users as $index => $user) {
        echo sprintf("  Current ID: %d -> Will become: %d | Name: %s | EmpID: %s\n", 
            $user['id'], $index + 1, $user['full_name'], $user['employee_id']);
    }
    echo "\n";
    
    // First, move all users to temporary high IDs to avoid conflicts
    echo "Step 1: Moving users to temporary IDs...\n";
    foreach ($users as $index => $user) {
        $tempId = 1000 + $index;
        $stmt = $db->prepare('UPDATE users SET id = ? WHERE id = ?');
        $stmt->execute([$tempId, $user['id']]);
    }
    
    // Then, move them to their final sequential IDs
    echo "Step 2: Assigning final sequential IDs (1-7)...\n";
    foreach ($users as $index => $user) {
        $tempId = 1000 + $index;
        $newId = $index + 1;
        $stmt = $db->prepare('UPDATE users SET id = ? WHERE id = ?');
        $stmt->execute([$newId, $tempId]);
    }
    
    // Reset auto-increment to 8 for next user
    $db->exec('ALTER TABLE users AUTO_INCREMENT = 8');
    
    // Re-enable foreign key checks
    $db->exec('SET FOREIGN_KEY_CHECKS = 1');
    
    echo "\n✓ Successfully renumbered user IDs from 1 to 7\n";
    echo "✓ Auto-increment set to 8 for next user\n\n";
    
    // Verify the changes
    $stmt = $db->query('SELECT id, full_name, employee_id FROM users ORDER BY id');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Final user IDs:\n";
    foreach ($users as $user) {
        echo sprintf("  ID: %d | Name: %-30s | EmpID: %s\n", 
            $user['id'], $user['full_name'], $user['employee_id']);
    }
    
} catch (Exception $e) {
    // Re-enable foreign key checks even on error
    try {
        $db->exec('SET FOREIGN_KEY_CHECKS = 1');
    } catch (Exception $ignored) {}
    
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
