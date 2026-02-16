<?php
/**
 * Fix spare part requests data to match fault ticket assignments
 * 
 * Tech Officer One (uid=5) has these tickets:
 *   "Waiting for Spare Parts": MBD-003(3), MBD-005(5), MBD-007(7), VBD-001(22), VBD-002(23) → 5 tickets
 *   "Parts Approved":          MBD-004(4), MBD-008(21), VBD-003(24)                         → 3 tickets
 *
 * So: 5 PENDING spare part requests + 3 APPROVED = 8 total
 * Inventory manager should see 5 pending (matching the 5 tech officer "Awaiting Approval")
 *
 * Also fix: MBD-001, MBD-002, MBD-006 → these are assigned to OTHER tech officers
 *   and have NO spare part requests, so they should NOT be "Waiting for Spare Parts"
 */

require __DIR__ . '/../config/config.php';
require __DIR__ . '/../config/Database.php';

$db = Database::getInstance()->getConnection();
$techOfficerId = 5; // Technical Officer One
$inventoryManagerId = 3; // Inventory Manager One (for approved reviews)

echo "=== Clearing existing spare part data ===" . PHP_EOL;
$db->exec("DELETE FROM spare_part_request_items");
$db->exec("DELETE FROM spare_part_requests");
$db->exec("ALTER TABLE spare_part_requests AUTO_INCREMENT = 1");
$db->exec("ALTER TABLE spare_part_request_items AUTO_INCREMENT = 1");
echo "  Cleared all spare_part_requests and items." . PHP_EOL;

// Fix fault ticket statuses for tickets that DON'T have spare part requests
echo PHP_EOL . "=== Fixing fault ticket statuses ===" . PHP_EOL;

// MBD-001 (id=1) - assigned to user 17, no spare part request → "Assigned"
$db->exec("UPDATE fault_tickets SET status = 'Assigned' WHERE id = 1");
echo "  MBD-001 (id=1): 'Waiting for Spare Parts' → 'Assigned'" . PHP_EOL;

// MBD-002 (id=2) - assigned to user 17, no spare part request → "Assigned"
$db->exec("UPDATE fault_tickets SET status = 'Assigned' WHERE id = 2");
echo "  MBD-002 (id=2): 'Waiting for Spare Parts' → 'Assigned'" . PHP_EOL;

// MBD-006 (id=6) - assigned to users 17/18/25, no spare part request → "Assigned"
$db->exec("UPDATE fault_tickets SET status = 'Assigned' WHERE id = 6");
echo "  MBD-006 (id=6): 'Waiting for Spare Parts' → 'Assigned'" . PHP_EOL;

// Confirm the 5 "Waiting for Spare Parts" tickets assigned to Tech Officer One
$stmt = $db->query("SELECT ft.id, ft.ticket_id, ft.status, ft.priority 
    FROM fault_tickets ft 
    JOIN fault_ticket_assignments fta ON ft.id = fta.fault_ticket_id 
    WHERE fta.assigned_to = $techOfficerId AND ft.status = 'Waiting for Spare Parts' 
    ORDER BY ft.id");
$waitingTickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo PHP_EOL . "Tech Officer One's 'Waiting for Spare Parts' tickets: " . count($waitingTickets) . PHP_EOL;
foreach ($waitingTickets as $t) {
    echo "  " . $t['ticket_id'] . " (id=" . $t['id'] . ") | " . $t['priority'] . PHP_EOL;
}

// Confirm the "Parts Approved" tickets assigned to Tech Officer One
$stmt = $db->query("SELECT ft.id, ft.ticket_id, ft.status, ft.priority 
    FROM fault_tickets ft 
    JOIN fault_ticket_assignments fta ON ft.id = fta.fault_ticket_id 
    WHERE fta.assigned_to = $techOfficerId AND ft.status = 'Parts Approved' 
    ORDER BY ft.id");
$approvedTickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo PHP_EOL . "Tech Officer One's 'Parts Approved' tickets: " . count($approvedTickets) . PHP_EOL;
foreach ($approvedTickets as $t) {
    echo "  " . $t['ticket_id'] . " (id=" . $t['id'] . ") | " . $t['priority'] . PHP_EOL;
}

// ===================== INSERT SPARE PART REQUESTS =====================

echo PHP_EOL . "=== Inserting spare part requests ===" . PHP_EOL;

$now = date('Y-m-d H:i:s');

// 5 PENDING requests → matching the 5 "Waiting for Spare Parts" tickets
$pendingRequests = [
    [
        'request_id' => 'SPR-001',
        'fault_ticket_id' => 3,
        'ticket_id_formatted' => 'MBD-003',
        'equipment_name' => 'Excavator CAT 320D',
        'location' => 'Site A - Colombo',
        'priority' => 'Critical',
        'additional_notes' => 'Transmission making unusual grinding noise. Needs immediate bearing and gear replacement to prevent further damage.',
        'status' => 'Pending',
        'created_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
        'items' => [
            ['part_code' => 'BRG-201', 'part_name' => 'Transmission Bearing Set', 'quantity' => 2],
            ['part_code' => 'GR-305', 'part_name' => 'Drive Gear Assembly', 'quantity' => 1],
            ['part_code' => 'GSK-110', 'part_name' => 'Transmission Gasket Kit', 'quantity' => 1],
        ]
    ],
    [
        'request_id' => 'SPR-002',
        'fault_ticket_id' => 5,
        'ticket_id_formatted' => 'MBD-005',
        'equipment_name' => 'Generator Cummins 500KVA',
        'location' => 'Plant B - Kelaniya',
        'priority' => 'Medium',
        'additional_notes' => 'Electrical panel showing error codes. Display intermittent. Need replacement control board and wiring harness.',
        'status' => 'Pending',
        'created_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
        'items' => [
            ['part_code' => 'PCB-400', 'part_name' => 'Control Board Module', 'quantity' => 1],
            ['part_code' => 'WH-412', 'part_name' => 'Wiring Harness Assembly', 'quantity' => 1],
            ['part_code' => 'FUS-420', 'part_name' => 'Fuse Pack (10A/20A)', 'quantity' => 2],
        ]
    ],
    [
        'request_id' => 'SPR-003',
        'fault_ticket_id' => 7,
        'ticket_id_formatted' => 'MBD-007',
        'equipment_name' => 'Bulldozer Komatsu D65',
        'location' => 'Site C - Homagama',
        'priority' => 'Medium',
        'additional_notes' => 'Left rear tire pressure warning. Tire shows sidewall damage. Replacing tire and valve assembly.',
        'status' => 'Pending',
        'created_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        'items' => [
            ['part_code' => 'TRK-500', 'part_name' => 'Track Chain Link Set', 'quantity' => 4],
            ['part_code' => 'PIN-510', 'part_name' => 'Track Pins & Bushings Kit', 'quantity' => 1],
            ['part_code' => 'IDL-520', 'part_name' => 'Front Idler Wheel', 'quantity' => 1],
        ]
    ],
    [
        'request_id' => 'SPR-004',
        'fault_ticket_id' => 22,
        'ticket_id_formatted' => 'VBD-001',
        'equipment_name' => 'LPG Delivery Truck LK-7890',
        'location' => 'Depot B - Gampaha',
        'priority' => 'Critical',
        'additional_notes' => 'Engine overheating and stalling. Coolant leak detected near radiator hose. Radiator cracked, thermostat stuck closed.',
        'status' => 'Pending',
        'created_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        'items' => [
            ['part_code' => 'RAD-600', 'part_name' => 'Radiator Assembly', 'quantity' => 1],
            ['part_code' => 'THS-610', 'part_name' => 'Thermostat Unit', 'quantity' => 1],
            ['part_code' => 'HSE-620', 'part_name' => 'Coolant Hose Set (Upper/Lower)', 'quantity' => 1],
            ['part_code' => 'CLT-630', 'part_name' => 'Coolant Fluid 5L', 'quantity' => 2],
        ]
    ],
    [
        'request_id' => 'SPR-005',
        'fault_ticket_id' => 23,
        'ticket_id_formatted' => 'VBD-002',
        'equipment_name' => 'LPG Distribution Truck LK-3456',
        'location' => 'Depot A - Colombo',
        'priority' => 'High',
        'additional_notes' => 'Brake system fault warning. Front brake pads worn beyond limit. Disc rotor scoring visible on inspection.',
        'status' => 'Pending',
        'created_at' => date('Y-m-d H:i:s', strtotime('-6 hours')),
        'items' => [
            ['part_code' => 'BPD-700', 'part_name' => 'Front Brake Pad Set', 'quantity' => 2],
            ['part_code' => 'DSC-710', 'part_name' => 'Brake Disc Rotor', 'quantity' => 2],
            ['part_code' => 'BFL-720', 'part_name' => 'DOT4 Brake Fluid 1L', 'quantity' => 2],
        ]
    ],
];

// 3 APPROVED requests → matching the 3 "Parts Approved" tickets
$approvedRequests = [
    [
        'request_id' => 'SPR-006',
        'fault_ticket_id' => 4,
        'ticket_id_formatted' => 'MBD-004',
        'equipment_name' => 'Forklift Toyota 8FGU25',
        'location' => 'Warehouse - Kelaniya',
        'priority' => 'Critical',
        'additional_notes' => 'Brake system malfunction. Brakes not engaging properly. Safety hazard - unit taken out of service.',
        'status' => 'Approved',
        'reviewed_by' => $inventoryManagerId,
        'review_notes' => 'Approved. Safety critical - prioritize immediate dispatch.',
        'reviewed_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
        'created_at' => date('Y-m-d H:i:s', strtotime('-5 days')),
        'items' => [
            ['part_code' => 'BPD-100', 'part_name' => 'Forklift Brake Pad Set', 'quantity' => 2],
            ['part_code' => 'BMS-110', 'part_name' => 'Brake Master Cylinder', 'quantity' => 1],
            ['part_code' => 'BFL-120', 'part_name' => 'Hydraulic Brake Fluid 1L', 'quantity' => 1],
        ]
    ],
    [
        'request_id' => 'SPR-007',
        'fault_ticket_id' => 21,
        'ticket_id_formatted' => 'MBD-008',
        'equipment_name' => 'Gas Compressor GC-200',
        'location' => 'Plant A - Colombo',
        'priority' => 'High',
        'additional_notes' => 'Compressor pressure fluctuating. Valve and seal replacement needed for normal operation.',
        'status' => 'Approved',
        'reviewed_by' => $inventoryManagerId,
        'review_notes' => 'Approved. Parts available in stock. Dispatch scheduled.',
        'reviewed_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        'created_at' => date('Y-m-d H:i:s', strtotime('-4 days')),
        'items' => [
            ['part_code' => 'PVL-300', 'part_name' => 'Pressure Relief Valve', 'quantity' => 1],
            ['part_code' => 'SEL-310', 'part_name' => 'Compressor Seal Kit', 'quantity' => 2],
            ['part_code' => 'FLT-320', 'part_name' => 'Inline Oil Filter', 'quantity' => 1],
        ]
    ],
    [
        'request_id' => 'SPR-008',
        'fault_ticket_id' => 24,
        'ticket_id_formatted' => 'VBD-003',
        'equipment_name' => 'LPG Tanker Truck LK-5678',
        'location' => 'Depot C - Homagama',
        'priority' => 'Critical',
        'additional_notes' => 'Clutch slipping under load. Clutch plate and pressure plate worn. Truck unable to handle full tanker loads.',
        'status' => 'Approved',
        'reviewed_by' => $inventoryManagerId,
        'review_notes' => 'Approved urgently. Vehicle critical for delivery route.',
        'reviewed_at' => date('Y-m-d H:i:s', strtotime('-12 hours')),
        'created_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
        'items' => [
            ['part_code' => 'CLP-800', 'part_name' => 'Clutch Plate Assembly', 'quantity' => 1],
            ['part_code' => 'PPL-810', 'part_name' => 'Pressure Plate', 'quantity' => 1],
            ['part_code' => 'CRB-820', 'part_name' => 'Release Bearing', 'quantity' => 1],
            ['part_code' => 'TFL-830', 'part_name' => 'Transmission Fluid 5L', 'quantity' => 1],
        ]
    ],
];

$allRequests = array_merge($pendingRequests, $approvedRequests);
$totalItems = 0;

foreach ($allRequests as $req) {
    $stmt = $db->prepare("INSERT INTO spare_part_requests 
        (request_id, fault_ticket_id, ticket_id_formatted, requested_by, equipment_name, location, priority, additional_notes, status, reviewed_by, review_notes, reviewed_at, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $req['request_id'],
        $req['fault_ticket_id'],
        $req['ticket_id_formatted'],
        $techOfficerId,
        $req['equipment_name'],
        $req['location'],
        $req['priority'],
        $req['additional_notes'],
        $req['status'],
        $req['reviewed_by'] ?? null,
        $req['review_notes'] ?? null,
        $req['reviewed_at'] ?? null,
        $req['created_at'],
        $now
    ]);
    
    $insertedId = $db->lastInsertId();
    
    // Insert items
    foreach ($req['items'] as $item) {
        $stmt2 = $db->prepare("INSERT INTO spare_part_request_items (request_id, part_code, part_name, quantity, created_at) VALUES (?, ?, ?, ?, ?)");
        $stmt2->execute([$insertedId, $item['part_code'], $item['part_name'], $item['quantity'], $req['created_at']]);
        $totalItems++;
    }
    
    $itemCount = count($req['items']);
    echo "  ✅ " . $req['request_id'] . " | " . $req['ticket_id_formatted'] . " | " . $req['status'] . " | " . $req['priority'] . " | " . $req['equipment_name'] . " | $itemCount items" . PHP_EOL;
}

echo PHP_EOL . "=== Done! Inserted " . count($allRequests) . " requests with $totalItems items ===" . PHP_EOL;

// Verify
echo PHP_EOL . "=== Verification ===" . PHP_EOL;
$stmt = $db->query("SELECT status, COUNT(*) as c FROM spare_part_requests GROUP BY status");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  " . $r['status'] . ": " . $r['c'] . PHP_EOL;
}
$stmt = $db->query("SELECT COUNT(*) as c FROM spare_part_request_items");
echo "  Total items: " . $stmt->fetch()['c'] . PHP_EOL;

// Cross-check: Tech Officer One's waiting tickets vs pending requests
echo PHP_EOL . "=== Cross-check ===" . PHP_EOL;
$stmt = $db->query("SELECT COUNT(*) as c FROM fault_tickets ft 
    JOIN fault_ticket_assignments fta ON ft.id = fta.fault_ticket_id 
    WHERE fta.assigned_to = $techOfficerId AND ft.status = 'Waiting for Spare Parts'");
$waitingCount = $stmt->fetch()['c'];

$stmt = $db->query("SELECT COUNT(*) as c FROM spare_part_requests WHERE status = 'Pending'");
$pendingCount = $stmt->fetch()['c'];

echo "  Tech Officer One 'Waiting for Spare Parts' tickets: $waitingCount" . PHP_EOL;
echo "  Inventory Manager pending spare part requests: $pendingCount" . PHP_EOL;

if ($waitingCount == $pendingCount) {
    echo "  ✅ MATCH! Both show $waitingCount" . PHP_EOL;
} else {
    echo "  ❌ MISMATCH! $waitingCount vs $pendingCount" . PHP_EOL;
}

// Clean up temp files
@unlink(__DIR__ . '/temp_check_data.php');
@unlink(__DIR__ . '/temp_check_assignments.php');
