<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

$db = Database::getInstance()->getConnection();

// 1. Check existing users
echo "=== Users ===" . PHP_EOL;
$stmt = $db->query("SELECT id, full_name, role FROM users ORDER BY id");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($users as $u) {
    echo "  {$u['id']} | {$u['full_name']} | {$u['role']}" . PHP_EOL;
}

// Find technical officer
$techOfficer = null;
foreach ($users as $u) {
    if (stripos($u['role'], 'tech') !== false) {
        $techOfficer = $u;
        break;
    }
}
// Fallback: if no tech officer role, check by name
if (!$techOfficer) {
    foreach ($users as $u) {
        if (stripos($u['full_name'], 'tech') !== false) {
            $techOfficer = $u;
            break;
        }
    }
}
// Last fallback: use first user
if (!$techOfficer) {
    $techOfficer = $users[0] ?? null;
}

if (!$techOfficer) {
    echo "ERROR: No users found!" . PHP_EOL;
    exit(1);
}
echo PHP_EOL . "Using Technical Officer: {$techOfficer['id']} - {$techOfficer['full_name']} ({$techOfficer['role']})" . PHP_EOL;

// 2. Check existing spare_part_requests
echo PHP_EOL . "=== Existing spare_part_requests ===" . PHP_EOL;
$stmt = $db->query("SELECT id, request_id, status FROM spare_part_requests ORDER BY id");
$existing = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($existing as $e) {
    echo "  {$e['id']} | {$e['request_id']} | {$e['status']}" . PHP_EOL;
}

// 3. Check fault tickets
echo PHP_EOL . "=== Fault Tickets ===" . PHP_EOL;
$stmt = $db->query("SELECT id, ticket_id, description, status, priority FROM fault_tickets ORDER BY id LIMIT 20");
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($tickets as $t) {
    echo "  {$t['id']} | {$t['ticket_id']} | {$t['status']} | {$t['priority']}" . PHP_EOL;
}

// 4. Check table structure
echo PHP_EOL . "=== spare_part_requests columns ===" . PHP_EOL;
$cols = $db->query("SHOW COLUMNS FROM spare_part_requests")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) {
    echo "  {$c['Field']} ({$c['Type']})" . PHP_EOL;
}

echo PHP_EOL . "=== spare_part_request_items columns ===" . PHP_EOL;
$cols = $db->query("SHOW COLUMNS FROM spare_part_request_items")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) {
    echo "  {$c['Field']} ({$c['Type']})" . PHP_EOL;
}

// 5. Get the max request_id number to continue from
$stmt = $db->query("SELECT MAX(CAST(SUBSTRING(request_id, 5) AS UNSIGNED)) as max_num FROM spare_part_requests");
$maxNum = $stmt->fetch(PDO::FETCH_ASSOC)['max_num'] ?? 0;
echo PHP_EOL . "Max existing SPR number: SPR-" . str_pad($maxNum, 3, '0', STR_PAD_LEFT) . PHP_EOL;

// Find tickets NOT already linked to spare part requests
$stmt = $db->query("SELECT ft.id, ft.ticket_id FROM fault_tickets ft LEFT JOIN spare_part_requests spr ON ft.id = spr.fault_ticket_id WHERE spr.id IS NULL ORDER BY ft.id LIMIT 10");
$availableTickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo PHP_EOL . "Available tickets (not yet linked): " . count($availableTickets) . PHP_EOL;
foreach ($availableTickets as $at) {
    echo "  {$at['id']} | {$at['ticket_id']}" . PHP_EOL;
}

// 6. Clear existing data and re-seed everything fresh
echo PHP_EOL . "=== Clearing existing data ===" . PHP_EOL;
$db->exec("DELETE FROM spare_part_request_items");
$db->exec("DELETE FROM spare_part_requests");
$db->exec("ALTER TABLE spare_part_requests AUTO_INCREMENT = 1");
$db->exec("ALTER TABLE spare_part_request_items AUTO_INCREMENT = 1");
echo "Cleared all existing data." . PHP_EOL;

// 7. Define seed data - realistic spare part requests from Technical Officer
$techId = $techOfficer['id'];

$seedRequests = [
    [
        'request_id' => 'SPR-001',
        'fault_ticket_id' => null, // Will be set from available tickets
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'Excavator CAT 320',
        'location' => 'Site A - Colombo',
        'priority' => 'High',
        'additional_notes' => 'Hydraulic system showing signs of failure. Urgent replacement needed before next shift.',
        'status' => 'Pending',
        'items' => [
            ['part_code' => 'HYD-250', 'part_name' => 'Hydraulic Pump Assembly', 'quantity' => 1],
            ['part_code' => 'HSL-110', 'part_name' => 'Hydraulic Seal Kit', 'quantity' => 2],
            ['part_code' => 'HYD-FLT', 'part_name' => 'Hydraulic Oil Filter', 'quantity' => 3],
        ]
    ],
    [
        'request_id' => 'SPR-002',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'LPG Distribution Truck LK-5678',
        'location' => 'Depot B - Gampaha',
        'priority' => 'Critical',
        'additional_notes' => 'Brake system failure detected during pre-trip inspection. Vehicle cannot be dispatched until repaired.',
        'status' => 'Pending',
        'items' => [
            ['part_code' => 'BP-001', 'part_name' => 'Brake Pads (Front Set)', 'quantity' => 2],
            ['part_code' => 'BD-015', 'part_name' => 'Brake Disc Rotor', 'quantity' => 2],
            ['part_code' => 'BF-200', 'part_name' => 'Brake Fluid DOT 4', 'quantity' => 4],
            ['part_code' => 'BC-050', 'part_name' => 'Brake Caliper Assembly', 'quantity' => 1],
        ]
    ],
    [
        'request_id' => 'SPR-003',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'Gas Compressor Unit GC-102',
        'location' => 'Plant C - Kelaniya',
        'priority' => 'High',
        'additional_notes' => 'Compressor overheating due to worn bearings and faulty pressure valve. Needs immediate attention.',
        'status' => 'Pending',
        'items' => [
            ['part_code' => 'BRG-440', 'part_name' => 'Compressor Bearing Set', 'quantity' => 2],
            ['part_code' => 'VAL-350', 'part_name' => 'Pressure Relief Valve', 'quantity' => 1],
            ['part_code' => 'GSK-120', 'part_name' => 'Compressor Head Gasket', 'quantity' => 1],
        ]
    ],
    [
        'request_id' => 'SPR-004',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'Forklift Toyota 8FGU25',
        'location' => 'Warehouse D - Kaduwela',
        'priority' => 'Medium',
        'additional_notes' => 'Scheduled maintenance - replacing worn parts to prevent future breakdowns.',
        'status' => 'Approved',
        'items' => [
            ['part_code' => 'OF-205', 'part_name' => 'Engine Oil Filter', 'quantity' => 2],
            ['part_code' => 'AF-310', 'part_name' => 'Air Filter Element', 'quantity' => 1],
            ['part_code' => 'SB-400', 'part_name' => 'Drive Belt (V-Belt)', 'quantity' => 2],
            ['part_code' => 'SP-100', 'part_name' => 'Spark Plug Set (4pc)', 'quantity' => 1],
        ]
    ],
    [
        'request_id' => 'SPR-005',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'LPG Tanker Truck LK-3456',
        'location' => 'Route E - Kandy',
        'priority' => 'High',
        'additional_notes' => 'Transmission making grinding noise. Clutch plate worn out. Vehicle pulled off route.',
        'status' => 'Pending',
        'items' => [
            ['part_code' => 'CLT-600', 'part_name' => 'Clutch Plate Assembly', 'quantity' => 1],
            ['part_code' => 'CLT-610', 'part_name' => 'Clutch Bearing (Release)', 'quantity' => 1],
            ['part_code' => 'TF-220', 'part_name' => 'Transmission Fluid ATF', 'quantity' => 6],
        ]
    ],
    [
        'request_id' => 'SPR-006',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'Welding Machine Lincoln 256',
        'location' => 'Workshop F - Colombo',
        'priority' => 'Low',
        'additional_notes' => 'Routine consumable restock for welding operations.',
        'status' => 'Rejected',
        'items' => [
            ['part_code' => 'WW-050', 'part_name' => 'Welding Wire Spool 1.2mm', 'quantity' => 5],
            ['part_code' => 'WN-030', 'part_name' => 'Contact Nozzle Tip', 'quantity' => 10],
        ]
    ],
    [
        'request_id' => 'SPR-007',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'Bulldozer Komatsu D65',
        'location' => 'Site G - Matara',
        'priority' => 'Critical',
        'additional_notes' => 'Track chain snapped during operation. Machine immobilized. Crew idle until fixed.',
        'status' => 'Pending',
        'items' => [
            ['part_code' => 'TC-800', 'part_name' => 'Track Chain Assembly', 'quantity' => 1],
            ['part_code' => 'TP-810', 'part_name' => 'Track Pin Set', 'quantity' => 4],
            ['part_code' => 'TBS-820', 'part_name' => 'Track Bolt Set', 'quantity' => 2],
            ['part_code' => 'IDL-830', 'part_name' => 'Idler Wheel', 'quantity' => 1],
        ]
    ],
    [
        'request_id' => 'SPR-008',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'Generator Set Cummins 500KVA',
        'location' => 'Plant C - Kelaniya',
        'priority' => 'Medium',
        'additional_notes' => 'Generator showing reduced output. Fuel injectors and filters need replacement.',
        'status' => 'Approved',
        'items' => [
            ['part_code' => 'FI-500', 'part_name' => 'Fuel Injector Nozzle', 'quantity' => 6],
            ['part_code' => 'FF-510', 'part_name' => 'Fuel Filter Primary', 'quantity' => 2],
            ['part_code' => 'FF-520', 'part_name' => 'Fuel Filter Secondary', 'quantity' => 2],
        ]
    ],
    [
        'request_id' => 'SPR-009',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'LPG Delivery Truck LK-7890',
        'location' => 'Depot B - Gampaha',
        'priority' => 'High',
        'additional_notes' => 'Cooling system leak detected. Radiator cracked and thermostat stuck.',
        'status' => 'Pending',
        'items' => [
            ['part_code' => 'RAD-700', 'part_name' => 'Radiator Assembly', 'quantity' => 1],
            ['part_code' => 'THS-710', 'part_name' => 'Thermostat Valve', 'quantity' => 1],
            ['part_code' => 'RH-720', 'part_name' => 'Radiator Hose Set (Upper+Lower)', 'quantity' => 1],
            ['part_code' => 'CL-730', 'part_name' => 'Coolant 5L', 'quantity' => 2],
        ]
    ],
    [
        'request_id' => 'SPR-010',
        'fault_ticket_id' => null,
        'ticket_id_formatted' => null,
        'requested_by' => $techId,
        'equipment_name' => 'Crane Liebherr LTM 1060',
        'location' => 'Site A - Colombo',
        'priority' => 'Medium',
        'additional_notes' => 'Annual service due. Replacing wear items as per maintenance schedule.',
        'status' => 'Pending',
        'items' => [
            ['part_code' => 'WR-900', 'part_name' => 'Wire Rope 16mm (50m)', 'quantity' => 1],
            ['part_code' => 'SHK-910', 'part_name' => 'Sheave/Pulley Block', 'quantity' => 2],
            ['part_code' => 'GRS-920', 'part_name' => 'Grease Cartridge (Box/12)', 'quantity' => 1],
        ]
    ],
];

// 8. Link to actual fault tickets where available
$ticketIndex = 0;
for ($i = 0; $i < count($seedRequests); $i++) {
    if (isset($availableTickets[$ticketIndex])) {
        $seedRequests[$i]['fault_ticket_id'] = $availableTickets[$ticketIndex]['id'];
        $seedRequests[$i]['ticket_id_formatted'] = $availableTickets[$ticketIndex]['ticket_id'];
        $ticketIndex++;
    } else if (isset($tickets[$i])) {
        // fallback: use any ticket
        $seedRequests[$i]['fault_ticket_id'] = $tickets[$i]['id'];
        $seedRequests[$i]['ticket_id_formatted'] = $tickets[$i]['ticket_id'];
    }
}

// 9. Insert data
echo PHP_EOL . "=== Inserting seed data ===" . PHP_EOL;

$insertReq = $db->prepare("INSERT INTO spare_part_requests 
    (request_id, fault_ticket_id, ticket_id_formatted, requested_by, equipment_name, location, priority, additional_notes, status, reviewed_by, review_notes, reviewed_at, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

$insertItem = $db->prepare("INSERT INTO spare_part_request_items 
    (request_id, part_code, part_name, quantity, created_at) 
    VALUES (?, ?, ?, ?, ?)");

$now = date('Y-m-d H:i:s');

foreach ($seedRequests as $idx => $req) {
    $reviewedBy = null;
    $reviewNotes = null;
    $reviewedAt = null;
    $createdAt = date('Y-m-d H:i:s', strtotime("-" . (count($seedRequests) - $idx) . " days"));
    
    if ($req['status'] === 'Approved') {
        $reviewedBy = $techId; // or admin
        $reviewNotes = 'Parts available in stock. Approved for issuance.';
        $reviewedAt = date('Y-m-d H:i:s', strtotime($createdAt . ' +4 hours'));
    } else if ($req['status'] === 'Rejected') {
        $reviewedBy = $techId;
        $reviewNotes = 'Budget Constraints: These are consumables - please use existing stock from workshop inventory first.';
        $reviewedAt = date('Y-m-d H:i:s', strtotime($createdAt . ' +2 hours'));
    }
    
    $insertReq->execute([
        $req['request_id'],
        $req['fault_ticket_id'],
        $req['ticket_id_formatted'],
        $req['requested_by'],
        $req['equipment_name'],
        $req['location'],
        $req['priority'],
        $req['additional_notes'],
        $req['status'],
        $reviewedBy,
        $reviewNotes,
        $reviewedAt,
        $createdAt,
        $createdAt
    ]);
    
    $requestDbId = $db->lastInsertId();
    
    // Also update the fault ticket status
    if ($req['fault_ticket_id']) {
        if ($req['status'] === 'Approved') {
            $db->prepare("UPDATE fault_tickets SET status = 'Parts Approved' WHERE id = ?")->execute([$req['fault_ticket_id']]);
        } else if ($req['status'] === 'Pending') {
            $db->prepare("UPDATE fault_tickets SET status = 'Waiting for Spare Parts' WHERE id = ?")->execute([$req['fault_ticket_id']]);
        }
    }
    
    foreach ($req['items'] as $item) {
        $insertItem->execute([
            $requestDbId,
            $item['part_code'],
            $item['part_name'],
            $item['quantity'],
            $createdAt
        ]);
    }
    
    $itemCount = count($req['items']);
    echo "  ✅ {$req['request_id']} | {$req['ticket_id_formatted']} | {$req['status']} | {$req['priority']} | {$req['equipment_name']} | {$itemCount} items" . PHP_EOL;
}

echo PHP_EOL . "=== Done! Inserted " . count($seedRequests) . " requests ===" . PHP_EOL;

// 10. Verify
echo PHP_EOL . "=== Verification ===" . PHP_EOL;
$stmt = $db->query("SELECT status, COUNT(*) as cnt FROM spare_part_requests GROUP BY status");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  {$r['status']}: {$r['cnt']}" . PHP_EOL;
}
$stmt = $db->query("SELECT COUNT(*) as cnt FROM spare_part_request_items");
echo "  Total items: " . $stmt->fetch(PDO::FETCH_ASSOC)['cnt'] . PHP_EOL;
