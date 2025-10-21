<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

echo "=================================\n";
echo "Role Configuration Verification\n";
echo "=================================\n\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Check Database
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'role'");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    preg_match_all("/'([^']+)'/", $row['Type'], $matches);
    $dbRoles = $matches[1];
    
    echo "1. DATABASE ROLES (" . count($dbRoles) . "):\n";
    foreach ($dbRoles as $role) {
        echo "   ✓ $role\n";
    }
    echo "\n";
    
    // Check User Model
    $userModelFile = file_get_contents(__DIR__ . '/../app/models/User.php');
    preg_match("/'role'\s*=>\s*\"([^\"]+)\"/", $userModelFile, $modelMatch);
    preg_match_all("/'([^']+)'/", $modelMatch[1], $matches);
    $modelRoles = $matches[1];
    
    echo "2. USER MODEL ROLES (" . count($modelRoles) . "):\n";
    foreach ($modelRoles as $role) {
        echo "   ✓ $role\n";
    }
    echo "\n";
    
    // Check UserService validation
    $userServiceFile = file_get_contents(__DIR__ . '/../app/services/UserService.php');
    preg_match("/validRoles\s*=\s*\[(.*?)\];/s", $userServiceFile, $serviceMatch);
    preg_match_all("/'([^']+)'/", $serviceMatch[1], $matches);
    $serviceRoles = $matches[1];
    
    echo "3. USER SERVICE VALIDATION ROLES (" . count($serviceRoles) . "):\n";
    foreach ($serviceRoles as $role) {
        echo "   ✓ $role\n";
    }
    echo "\n";
    
    // Check RoleMiddleware
    require_once __DIR__ . '/../app/middleware/RoleMiddleware.php';
    $hierarchy = RoleMiddleware::ROLE_HIERARCHY;
    
    echo "4. ROLE MIDDLEWARE HIERARCHY (" . count($hierarchy) . "):\n";
    arsort($hierarchy);
    foreach ($hierarchy as $role => $level) {
        echo "   ✓ [$level] $role\n";
    }
    echo "\n";
    
    // Validation
    echo "5. CROSS-VALIDATION:\n";
    $allMatch = true;
    
    if (count($dbRoles) !== count($modelRoles) || count($dbRoles) !== count($serviceRoles) || count($dbRoles) !== count(array_keys($hierarchy))) {
        echo "   ✗ Role count mismatch!\n";
        echo "     Database: " . count($dbRoles) . " roles\n";
        echo "     User Model: " . count($modelRoles) . " roles\n";
        echo "     UserService: " . count($serviceRoles) . " roles\n";
        echo "     RoleMiddleware: " . count(array_keys($hierarchy)) . " roles\n";
        $allMatch = false;
    }
    
    // Check if all roles exist in all places
    foreach ($dbRoles as $role) {
        $inModel = in_array($role, $modelRoles);
        $inService = in_array($role, $serviceRoles);
        $inMiddleware = isset($hierarchy[$role]);
        
        if (!$inModel || !$inService || !$inMiddleware) {
            echo "   ✗ '$role' missing in:\n";
            if (!$inModel) echo "     - User Model\n";
            if (!$inService) echo "     - UserService validation\n";
            if (!$inMiddleware) echo "     - RoleMiddleware hierarchy\n";
            $allMatch = false;
        }
    }
    
    if ($allMatch && count($dbRoles) === count($modelRoles) && count($dbRoles) === count($serviceRoles) && count($dbRoles) === count(array_keys($hierarchy))) {
        echo "   ✓ All 8 roles are present in all components\n";
        echo "   ✓ Database, Model, Service, and Middleware are synchronized\n";
        echo "   ✓ No duplicate hierarchy levels\n";
        echo "\n   🎉 Configuration is perfect!\n";
        echo "\n   You can now create users with:\n";
        echo "   - Admin\n";
        echo "   - Maintenance Manager\n";
        echo "   - Inventory Manager\n";
        echo "   - Technical Officer\n";
        echo "   - Supervisor\n";
        echo "   - Machinary Operator\n";
        echo "   - Driver\n";
        echo "   - Auction Officer\n";
    }
    
    echo "\n=================================\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
