#!/usr/bin/env php
<?php

/**
 * Migration Manager
 *
 * Maintains migration history in schema_migrations and executes only pending migrations.
 *
 * Usage:
 *   php scripts/migrate.php status
 *   php scripts/migrate.php baseline --until=41
 *   php scripts/migrate.php migrate
 *   php scripts/migrate.php migrate --dry-run
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

class MigrationManager {
    private $db;
    private $migrationsDir;

    public function __construct($db, $migrationsDir) {
        $this->db = $db;
        $this->migrationsDir = $migrationsDir;
        $this->ensureTrackingTable();
    }

    public function status() {
        $migrations = $this->discoverMigrations();
        $applied = $this->getAppliedMigrations();

        echo "\nMigration Status\n";
        echo "================\n";

        if (empty($migrations)) {
            echo "No migration files found in {$this->migrationsDir}.\n";
            return;
        }

        $appliedCount = 0;
        foreach ($migrations as $migration) {
            $isApplied = isset($applied[$migration['key']]);
            if ($isApplied) {
                $appliedCount++;
            }

            $state = $isApplied ? 'APPLIED' : 'PENDING';
            $executedAt = $isApplied ? ($applied[$migration['key']]['executed_at'] ?? '-') : '-';

            echo str_pad($migration['number'], 5, ' ', STR_PAD_LEFT) . " | " .
                 str_pad($state, 7) . " | " .
                 str_pad($executedAt, 19) . " | " .
                 $migration['file'] . "\n";
        }

        echo "\nSummary: {$appliedCount}/" . count($migrations) . " applied, " . (count($migrations) - $appliedCount) . " pending.\n\n";
    }

    public function baseline($untilVersion) {
        if (!is_int($untilVersion) || $untilVersion < 1) {
            throw new InvalidArgumentException('Baseline requires a positive --until version number.');
        }

        $migrations = $this->discoverMigrations();
        $applied = $this->getAppliedMigrations();

        $toBaseline = array_filter($migrations, function($migration) use ($untilVersion, $applied) {
            return $migration['number'] <= $untilVersion && !isset($applied[$migration['key']]);
        });

        if (empty($toBaseline)) {
            echo "No migrations to baseline up to version {$untilVersion}.\n";
            return;
        }

        $this->db->beginTransaction();
        try {
            foreach ($toBaseline as $migration) {
                $this->recordMigration($migration, 0);
                echo "Baselined {$migration['file']}\n";
            }

            $this->db->commit();
            echo "\nBaseline completed for " . count($toBaseline) . " migration(s) up to version {$untilVersion}.\n";
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function migrate($dryRun = false) {
        $migrations = $this->discoverMigrations();
        $applied = $this->getAppliedMigrations();

        $pending = array_values(array_filter($migrations, function($migration) use ($applied) {
            return !isset($applied[$migration['key']]);
        }));

        if (empty($pending)) {
            echo "No pending migrations.\n";
            return;
        }

        if ($dryRun) {
            echo "Dry run: pending migrations\n";
            foreach ($pending as $migration) {
                echo "  - {$migration['file']}\n";
            }
            echo "\n";
            return;
        }

        $batch = $this->getNextBatchNumber();

        foreach ($pending as $migration) {
            echo "\nRunning migration {$migration['file']}\n";
            echo str_repeat('-', 60) . "\n";

            $exitCode = $this->runMigrationScript($migration['path']);
            if ($exitCode !== 0) {
                throw new RuntimeException("Migration failed: {$migration['file']} (exit code {$exitCode})");
            }

            $this->recordMigration($migration, $batch);
            echo "Recorded migration {$migration['file']} (batch {$batch})\n";
        }

        echo "\nMigration run completed. Applied " . count($pending) . " migration(s) in batch {$batch}.\n";
    }

    private function ensureTrackingTable() {
        $sql = "CREATE TABLE IF NOT EXISTS schema_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration_number INT NOT NULL,
            migration_key VARCHAR(255) NOT NULL UNIQUE,
            migration_file VARCHAR(255) NOT NULL,
            checksum VARCHAR(64) NULL,
            batch INT NOT NULL DEFAULT 1,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_migration_number (migration_number),
            INDEX idx_migration_batch (batch)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

        $this->db->exec($sql);
    }

    private function discoverMigrations() {
        $files = glob($this->migrationsDir . '/*.php') ?: [];
        $migrations = [];

        foreach ($files as $path) {
            $file = basename($path);
            if (!preg_match('/^(\d+)_.*\.php$/', $file, $matches)) {
                continue;
            }

            $migrations[] = [
                'number' => (int)$matches[1],
                'file' => $file,
                'path' => $path,
                'key' => $file,
                'checksum' => hash_file('sha256', $path)
            ];
        }

        usort($migrations, function($a, $b) {
            if ($a['number'] === $b['number']) {
                return strcmp($a['file'], $b['file']);
            }
            return $a['number'] <=> $b['number'];
        });

        return $migrations;
    }

    private function getAppliedMigrations() {
        $sql = "SELECT migration_key, migration_file, executed_at, batch FROM schema_migrations";
        $stmt = $this->db->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $applied = [];
        foreach ($rows as $row) {
            $applied[$row['migration_key']] = $row;
        }

        return $applied;
    }

    private function getNextBatchNumber() {
        $stmt = $this->db->query("SELECT COALESCE(MAX(batch), 0) + 1 AS next_batch FROM schema_migrations");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)$row['next_batch'];
    }

    private function runMigrationScript($path) {
        $command = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($path);
        passthru($command, $exitCode);
        return $exitCode;
    }

    private function recordMigration($migration, $batch) {
        $sql = "INSERT INTO schema_migrations (migration_number, migration_key, migration_file, checksum, batch)
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $migration['number'],
            $migration['key'],
            $migration['file'],
            $migration['checksum'],
            $batch
        ]);
    }
}

function printUsage() {
    echo "Usage:\n";
    echo "  php scripts/migrate.php status\n";
    echo "  php scripts/migrate.php baseline --until=<version>\n";
    echo "  php scripts/migrate.php migrate [--dry-run]\n";
    echo "\nExamples:\n";
    echo "  php scripts/migrate.php baseline --until=41\n";
    echo "  php scripts/migrate.php migrate\n";
}

function parseOptions($argv) {
    $command = $argv[1] ?? 'migrate';
    $options = [
        'until' => null,
        'dry_run' => false
    ];

    foreach (array_slice($argv, 2) as $arg) {
        if (strpos($arg, '--until=') === 0) {
            $options['until'] = (int)substr($arg, strlen('--until='));
        } elseif ($arg === '--dry-run') {
            $options['dry_run'] = true;
        }
    }

    return [$command, $options];
}

try {
    list($command, $options) = parseOptions($argv);

    if (in_array($command, ['-h', '--help', 'help'])) {
        printUsage();
        exit(0);
    }

    $db = Database::getInstance()->getConnection();
    $manager = new MigrationManager($db, __DIR__ . '/../migrations');

    switch ($command) {
        case 'status':
            $manager->status();
            break;

        case 'baseline':
            if (!$options['until']) {
                throw new InvalidArgumentException('Missing required option: --until=<version>');
            }
            $manager->baseline($options['until']);
            break;

        case 'migrate':
            $manager->migrate($options['dry_run']);
            break;

        default:
            throw new InvalidArgumentException("Unknown command: {$command}");
    }

    exit(0);
} catch (\Exception $e) {
    echo "\n❌ Migration manager error: " . $e->getMessage() . "\n";
    echo "Run 'php scripts/migrate.php --help' for usage.\n";
    exit(1);
}
