---
description: "Use when creating or modifying database schema, adding tables, columns, indexes, foreign keys, or seeding data. Covers migration file conventions, numbering, safety patterns, and the tableExists helper."
---
# Migration Guidelines

## When to Create a Migration

Create a new migration file for **any** of the following:
- Creating or dropping a table
- Adding, removing, or renaming a column
- Changing a column type or constraints
- Adding or removing indexes or foreign keys
- Seeding required reference/lookup data
- Any other structural change to the database

**Never** modify an existing migration file or apply `ALTER TABLE` / `CREATE TABLE` statements directly.

## File Naming

```
migrations/<NNN>_<short_snake_case_description>.php
```

- `NNN` is a zero-padded 3-digit number that is one higher than the current highest migration (e.g. if `044_…` exists, use `045`).
- Use lowercase snake_case for the description part.
- Examples: `045_add_status_to_vehicles.php`, `046_create_audit_log_table.php`

## File Template

```php
<?php
/**
 * Migration <NNN>: <Human-readable description>
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

try {
    $db = Database::getInstance()->getConnection();

    echo "Starting migration <NNN>: <description>\n";
    echo str_repeat('=', 50) . "\n";

    // --- your schema changes here ---

    echo "\nMigration <NNN> completed successfully.\n";
} catch (Exception $e) {
    echo "\nMigration <NNN> failed: " . $e->getMessage() . "\n";
    exit(1);
}
```

## Safety Patterns

### Checking table existence
Use `information_schema` — **not** `SHOW TABLES LIKE ?` (PDO placeholder not supported in MariaDB):

```php
function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}
```

### Checking column existence
```php
function columnExists(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}
```

### Idempotent table creation
```php
if (!tableExists($db, 'my_table')) {
    $db->exec("CREATE TABLE my_table ( ... ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "- my_table: created\n";
} else {
    echo "- my_table: already exists, skipped\n";
}
```

### Idempotent column addition
```php
if (!columnExists($db, 'my_table', 'new_column')) {
    $db->exec("ALTER TABLE my_table ADD COLUMN new_column VARCHAR(100) NULL");
    echo "- new_column added\n";
} else {
    echo "- new_column: already exists, skipped\n";
}
```

### Preserve existing data
- When adding a NOT NULL column to a populated table, provide a DEFAULT or back-fill in the same migration.
- When dropping a column, verify no application code references it first.
- Use transactions for multi-step data transformations.

## Running Migrations

```bash
php scripts/migrate.php migrate       # apply all pending
php scripts/migrate.php status        # check what is applied
php scripts/migrate.php rollback --steps=1   # undo last batch (removes tracking record only)
```

After writing a migration file, **always run it** with `php scripts/migrate.php migrate` to confirm it succeeds.
