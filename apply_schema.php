<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance()->getConnection();

echo "Disabling foreign key checks...\n";
$db->exec('SET FOREIGN_KEY_CHECKS = 0');

echo "Auto-creating base tables from models...\n";
foreach (glob(__DIR__ . '/app/models/*.php') as $filename) {
    if (basename($filename) === 'BaseModel.php')
        continue;
    require_once $filename;
    $class = basename($filename, '.php');
    if (class_exists($class)) {
        try {
            $model = new $class();
            echo "Instantiated $class - table checked/created\n";
        } catch (Throwable $e) {
            echo "Error instantiating $class: " . $e->getMessage() . "\n";
        }
    }
}

echo "Enabling foreign key checks...\n";
$db->exec('SET FOREIGN_KEY_CHECKS = 1');

// Then, loop through all migrations until they all pass (or deadlock)
$migrations = glob(__DIR__ . '/migrations/*.php');
sort($migrations); // Run in alphabetical order (using the new numerical prefixes)
$pending = $migrations;
$completed = [];

echo "\nStarting sequential migration run...\n";
foreach ($pending as $file) {
    $basename = basename($file);
    echo "Running $basename... ";

    $output = [];
    $return_var = 0;
    exec("php " . escapeshellarg($file) . " 2>&1", $output, $return_var);
    $outputStr = implode("\n", $output);

    if ($return_var === 0 && stripos($outputStr, 'Fatal error') === false && stripos($outputStr, 'PDOException') === false) {
        echo "SUCCESS\n";
        $completed[] = $file;
    } else {
        if (stripos($outputStr, 'Skipping') !== false && stripos($outputStr, 'PDOException') === false) {
            echo "SKIPPED (Success)\n";
            $completed[] = $file;
        } else {
            echo "FAILED\n";
            file_put_contents('/tmp/failed_ordered_migrations.log', "[$basename]\n" . $outputStr . "\n\n", FILE_APPEND);
        }
    }
}

echo "\n--- Summary ---\n";
echo "Completed: " . count($completed) . " / " . count($pending) . "\n";
