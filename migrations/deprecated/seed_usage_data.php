<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    echo "Checking sparepart_usage table...\n";
    
    // Check current records
    $stmt = $db->query("SELECT COUNT(*) as cnt FROM sparepart_usage");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    echo "Current records: $count\n";
    
    // Get some spareparts to create usage records for
    $stmt = $db->query("SELECT sparepart_id, name as sparepart_name, quantity FROM spareparts LIMIT 5");
    $spareparts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($spareparts)) {
        echo "No spareparts found in database. Please add spareparts first.\n";
        exit(1);
    }
    
    echo "\nAdding sample usage records...\n";
    
    // Add sample usage records
    $sampleUsages = [
        [
            'quantity_issued' => 2,
            'issue_date' => '2026-02-05',
            'issued_by' => 1,
            'notes' => 'Issued for maintenance work'
        ],
        [
            'quantity_issued' => 1,
            'issue_date' => '2026-02-06',
            'issued_by' => 1,
            'notes' => 'Emergency repair'
        ],
        [
            'quantity_issued' => 3,
            'issue_date' => '2026-02-07',
            'issued_by' => 1,
            'notes' => 'Regular maintenance'
        ]
    ];
    
    $inserted = 0;
    foreach ($spareparts as $index => $sparepart) {
        if ($index >= count($sampleUsages)) break;
        
        $usage = $sampleUsages[$index];
        
        $sql = "INSERT INTO sparepart_usage 
                (sparepart_id, sparepart_name, quantity_issued, issue_date, issued_by, notes) 
                VALUES 
                (?, ?, ?, ?, ?, ?)";
        
        $stmt = $db->prepare($sql);
        $success = $stmt->execute([
            $sparepart['sparepart_id'],
            $sparepart['sparepart_name'],
            $usage['quantity_issued'],
            $usage['issue_date'],
            $usage['issued_by'],
            $usage['notes']
        ]);
        
        if ($success) {
            echo "✓ Added usage record for {$sparepart['sparepart_id']} - {$sparepart['sparepart_name']}\n";
            $inserted++;
        } else {
            echo "✗ Failed to add usage record for {$sparepart['sparepart_id']}\n";
            print_r($stmt->errorInfo());
        }
    }
    
    // Verify records were added
    $stmt = $db->query("SELECT COUNT(*) as cnt FROM sparepart_usage");
    $newCount = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    
    echo "\n✓ Successfully added $inserted usage records!\n";
    echo "Total records in sparepart_usage table: $newCount\n";
    
    // Show sample of records
    echo "\nSample records:\n";
    $stmt = $db->query("SELECT sparepart_id, sparepart_name, quantity_issued, issue_date, issued_by 
                        FROM sparepart_usage 
                        ORDER BY created_at DESC 
                        LIMIT 5");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['sparepart_id']}: {$row['sparepart_name']} | Qty: {$row['quantity_issued']} | Date: {$row['issue_date']} | By: {$row['issued_by']}\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
