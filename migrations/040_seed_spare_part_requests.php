<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

$db = Database::getInstance()->getConnection();

// Check current state
$stmt = $db->query("SELECT id, ticket_id, status FROM fault_tickets WHERE status IN ('Waiting for Spare Parts', 'Open', 'Assigned') LIMIT 5");
echo "=== Tickets available ===" . PHP_EOL;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['id'] . ' | ' . $row['ticket_id'] . ' | ' . $row['status'] . PHP_EOL;
}

$stmt = $db->query("SELECT id, full_name, role FROM users WHERE role = 'Technical Officer' OR role = 'Admin' LIMIT 5");
echo PHP_EOL . "=== Users ===" . PHP_EOL;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['id'] . ' | ' . $row['full_name'] . ' | ' . $row['role'] . PHP_EOL;
}

// Check existing
$stmt = $db->query("SELECT id, request_id, status FROM spare_part_requests");
echo PHP_EOL . "=== Existing requests ===" . PHP_EOL;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['id'] . ' | ' . $row['request_id'] . ' | ' . $row['status'] . PHP_EOL;
}

// Set VBD-002 to Waiting for Spare Parts
$db->exec("UPDATE fault_tickets SET status='Waiting for Spare Parts' WHERE id=23");
echo PHP_EOL . "Set VBD-002 (id=23) to 'Waiting for Spare Parts'" . PHP_EOL;

// Seed pending requests
$requests = [
    [
        'request_id' => 'SPR-002',
        'fault_ticket_id' => 23,
        'ticket_id_formatted' => 'VBD-002',
        'requested_by' => 1,
        'equipment_name' => 'LPG Distribution Truck LK-5678',
        'location' => 'LOCATION 2',
        'priority' => 'Critical',
        'additional_notes' => 'Brake system failure detected during pre-trip inspection. Vehicle cannot be dispatched.',
        'status' => 'Pending'
    ],
    [
        'request_id' => 'SPR-003',
        'fault_ticket_id' => 3,
        'ticket_id_formatted' => 'MBD-003',
        'requested_by' => 1,
        'equipment_name' => 'Gas Compressor Unit GC-102',
        'location' => 'LOCATION 1',
        'priority' => 'High',
        'additional_notes' => 'Hydraulic pump leaking. Need replacement pump and new seals.',
        'status' => 'Pending'
    ]
];

$items = [
    'SPR-002' => [
        ['part_code' => 'BP-001', 'part_name' => 'Brake Pads - BP-001', 'quantity' => 4],
        ['part_code' => 'HYD-250', 'part_name' => 'Hydraulic Pump - HYD-250', 'quantity' => 1]
    ],
    'SPR-003' => [
        ['part_code' => 'HYD-250', 'part_name' => 'Hydraulic Pump - HYD-250', 'quantity' => 1],
        ['part_code' => 'OF-205', 'part_name' => 'Oil Filter - OF-205', 'quantity' => 2],
        ['part_code' => 'VAL-350', 'part_name' => 'Pressure Valve - VAL-350', 'quantity' => 1]
    ]
];

foreach ($requests as $req) {
    // Check if already exists
    $check = $db->prepare("SELECT id FROM spare_part_requests WHERE request_id = ?");
    $check->execute([$req['request_id']]);
    if ($check->fetch()) {
        echo "Skipping {$req['request_id']} - already exists" . PHP_EOL;
        continue;
    }

    $stmt = $db->prepare("INSERT INTO spare_part_requests (request_id, fault_ticket_id, ticket_id_formatted, requested_by, equipment_name, location, priority, additional_notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $req['request_id'], $req['fault_ticket_id'], $req['ticket_id_formatted'],
        $req['requested_by'], $req['equipment_name'], $req['location'],
        $req['priority'], $req['additional_notes'], $req['status']
    ]);
    $insertId = $db->lastInsertId();
    echo "Inserted {$req['request_id']} (id={$insertId})" . PHP_EOL;

    // Insert items
    foreach ($items[$req['request_id']] as $item) {
        $stmt = $db->prepare("INSERT INTO spare_part_request_items (request_id, part_code, part_name, quantity) VALUES (?, ?, ?, ?)");
        $stmt->execute([$insertId, $item['part_code'], $item['part_name'], $item['quantity']]);
    }
    echo "  Inserted " . count($items[$req['request_id']]) . " items" . PHP_EOL;
}

// Also update fault ticket for MBD-003
$db->exec("UPDATE fault_tickets SET status='Waiting for Spare Parts' WHERE id=3");
echo "Set MBD-003 (id=3) to 'Waiting for Spare Parts'" . PHP_EOL;

echo PHP_EOL . "=== Final state ===" . PHP_EOL;
$stmt = $db->query("SELECT spr.request_id, spr.ticket_id_formatted, spr.status, spr.priority, spr.equipment_name, COUNT(i.id) as items FROM spare_part_requests spr LEFT JOIN spare_part_request_items i ON i.request_id = spr.id GROUP BY spr.id ORDER BY spr.id");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo implode(' | ', $row) . PHP_EOL;
}
