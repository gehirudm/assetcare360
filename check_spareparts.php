<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();
$stmt = $db->query("SELECT sparepart_id, name, category FROM spareparts WHERE is_active = 1 ORDER BY sparepart_id");
$spareparts = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Active Spareparts in Catalog:\n";
echo "=============================\n";
foreach ($spareparts as $part) {
    echo sprintf("%-10s | %-40s | %s\n", $part['sparepart_id'], $part['name'], $part['category']);
}
echo "\nTotal: " . count($spareparts) . " spareparts\n";
