<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();
$result = $db->query("DESCRIBE sparepart_usage");
echo "sparepart_usage table structure:\n";
while($row = $result->fetch(PDO::FETCH_ASSOC)) {
    echo "{$row['Field']} - {$row['Type']}\n";
}
