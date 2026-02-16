<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "Checking for SPR-001 and SPR-002...\n\n";

$stmt = $db->query("SELECT sparepart_id, name, quantity, is_active FROM spareparts WHERE sparepart_id IN ('SPR-001', 'SPR-002') ORDER BY sparepart_id");
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($results)) {
    echo "❌ SPR-001 and SPR-002 do NOT exist in the spareparts table!\n\n";
    
    // Check what IDs do exist
    $stmt = $db->query("SELECT sparepart_id, name FROM spareparts ORDER BY sparepart_id LIMIT 5");
    echo "First 5 spareparts in database:\n";
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['sparepart_id']}: {$row['name']}\n";
    }
} else {
    echo "✓ Found in spareparts table:\n";
    foreach($results as $row) {
        echo "  - {$row['sparepart_id']}: {$row['name']} (Qty: {$row['quantity']}, Active: {$row['is_active']})\n";
    }
}

echo "\n";

// Check usage records
$stmt = $db->query("SELECT * FROM sparepart_usage WHERE sparepart_id IN ('SPR-001', 'SPR-002') ORDER BY sparepart_id");
$usageResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($usageResults)) {
    echo "Usage records for SPR-001 and SPR-002:\n";
    foreach($usageResults as $row) {
        echo "  - {$row['sparepart_id']}: {$row['sparepart_name']} (Qty issued: {$row['quantity_issued']}, Date: {$row['issue_date']})\n";
    }
}
