<?php
require_once 'config/config.php';
require_once 'config/Database.php';

// Simulate API call
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api/fault-tickets");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer test-token'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "=== API Response (HTTP $httpCode) ===\n";

if ($response) {
    $data = json_decode($response, true);
    
    if ($data && isset($data['data']['tickets'])) {
        $tickets = $data['data']['tickets'];
        echo "Total tickets: " . count($tickets) . "\n\n";
        
        // Find VBD-008 (the ticket for VBD-009 breakdown)
        foreach ($tickets as $ticket) {
            if ($ticket['ticket_id'] === 'VBD-008') {
                echo "Found VBD-008:\n";
                echo "  ticket_id: {$ticket['ticket_id']}\n";
                echo "  breakdown_report_id: {$ticket['breakdown_report_id']}\n";
                echo "  status: {$ticket['status']}\n";
                echo "  assignments: ";
                if (isset($ticket['assignments']) && is_array($ticket['assignments'])) {
                    echo count($ticket['assignments']) . " assignment(s)\n";
                    foreach ($ticket['assignments'] as $assignment) {
                        echo "    - assigned_to: {$assignment['assigned_to']}, ";
                        echo "technician_name: " . ($assignment['assigned_to_name'] ?? 'N/A') . ", ";
                        echo "status: {$assignment['status']}\n";
                    }
                } else {
                    echo "MISSING or NOT ARRAY\n";
                }
                break;
            }
        }
    } else {
        echo "Invalid response structure\n";
        print_r($data);
    }
} else {
    echo "No response from API\n";
}
