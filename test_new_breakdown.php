<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/app/helpers/Response.php';
require_once __DIR__ . '/app/middleware/RoleMiddleware.php';
require_once __DIR__ . '/app/controllers/BreakdownReportController.php';

echo "=== Testing New Breakdown Creation with Same ID ===\n\n";

// Simulate a POST request
$_SERVER['REQUEST_METHOD'] = 'POST';
$testData = [
    'vehicle_id' => 1,
    'severity' => 'high',
    'breakdown_type' => 'transmission',
    'description' => 'Transmission slipping - needs immediate attention',
    'breakdown_date' => date('Y-m-d')
];

// Mock the current user
$mockUser = ['id' => 8, 'role' => 'Driver'];
$_SESSION['user'] = $mockUser;

// Capture the JSON input
$GLOBALS['test_input'] = json_encode($testData);
file_put_contents('php://input', $GLOBALS['test_input']);

try {
    // Call the controller
    ob_start();
    $controller = new BreakdownReportController();
    
    // Temporarily override file_get_contents to return our test data
    eval('
        function file_get_contents($filename) {
            if ($filename === "php://input") {
                return $GLOBALS["test_input"];
            }
            return \file_get_contents($filename);
        }
    ');
    
    $controller->create();
    $output = ob_get_clean();
    
    $result = json_decode($output, true);
    
    if ($result && $result['status'] === 'success') {
        echo "✅ Breakdown created successfully!\n";
        echo "  Breakdown ID: {$result['data']['breakdown_id']}\n";
        echo "  Ticket ID: {$result['data']['ticket_id']}\n";
        
        if ($result['data']['breakdown_id'] === $result['data']['ticket_id']) {
            echo "\n✅ SUCCESS: Ticket ID matches Breakdown ID!\n";
            echo "\nBoth driver and supervisor will see: {$result['data']['breakdown_id']}\n";
        } else {
            echo "\n❌ IDs don't match!\n";
        }
    } else {
        echo "❌ Failed to create breakdown\n";
        echo "Response: $output\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
