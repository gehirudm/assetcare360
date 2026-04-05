#!/usr/bin/env php
<?php

/**
 * AssetCare360 Backend Setup Script
 * Run this script to set up the database and seed initial data
 */

// Color codes for terminal output
define('GREEN', "\033[0;32m");
define('YELLOW', "\033[1;33m");
define('RED', "\033[0;31m");
define('BLUE', "\033[0;34m");
define('NC', "\033[0m"); // No Color

echo "==========================================\n";
echo "AssetCare360 Backend Setup Script\n";
echo "==========================================\n\n";

// Check if PHP version is sufficient
echo "Checking prerequisites...\n";
$phpVersion = phpversion();
$requiredVersion = '7.4.0';

if (version_compare($phpVersion, $requiredVersion, '<')) {
    echo RED . "❌ PHP version $phpVersion is too old. PHP $requiredVersion or higher is required." . NC . "\n";
    exit(1);
}
echo GREEN . "✅ PHP $phpVersion is installed" . NC . "\n";

// Check if PDO MySQL extension is loaded
if (!extension_loaded('pdo_mysql')) {
    echo RED . "❌ PDO MySQL extension is not loaded. Please install php-mysql." . NC . "\n";
    exit(1);
}
echo GREEN . "✅ PDO MySQL extension is loaded" . NC . "\n\n";

// Load configuration
echo "==========================================\n";
echo "Loading Configuration\n";
echo "==========================================\n\n";

$configFile = __DIR__ . '/config/config.php';
if (!file_exists($configFile)) {
    echo RED . "❌ Configuration file not found: $configFile" . NC . "\n";
    exit(1);
}

require_once $configFile;

echo BLUE . "Database Configuration:" . NC . "\n";
echo "  Host: " . DB_HOST . "\n";
echo "  Database: " . DB_NAME . "\n";
echo "  User: " . DB_USER . "\n";
echo "  Password: " . (empty(DB_PASS) ? "(empty)" : "***") . "\n\n";

// Create database if it doesn't exist
echo "==========================================\n";
echo "Database Setup\n";
echo "==========================================\n\n";

try {
    // Connect without database to create it
    // Support both "host:port" in DB_HOST (legacy) and separate DB_PORT constant
    $_setupHost = DB_HOST;
    $_setupPort = defined('DB_PORT') ? DB_PORT : '3306';
    if (strpos($_setupHost, ':') !== false) {
        [$_setupHost, $_setupPort] = explode(':', $_setupHost, 2);
    }
    $dsn = "mysql:host={$_setupHost};port={$_setupPort};charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "Creating database '" . DB_NAME . "' if not exists...\n";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci");
    echo GREEN . "✅ Database created/verified successfully" . NC . "\n\n";
    
    // Select the database
    $pdo->exec("USE `" . DB_NAME . "`");
    
} catch (PDOException $e) {
    echo RED . "❌ Database connection failed: " . $e->getMessage() . NC . "\n";
    echo YELLOW . "\nPlease verify your database credentials in config/config.php" . NC . "\n";
    exit(1);
}

// Create logs directory
echo "==========================================\n";
echo "Setting up directories\n";
echo "==========================================\n\n";

$logsDir = __DIR__ . '/logs';
if (!is_dir($logsDir)) {
    if (mkdir($logsDir, 0755, true)) {
        echo GREEN . "✅ Logs directory created: $logsDir" . NC . "\n";
    } else {
        echo YELLOW . "⚠️  Could not create logs directory. Please create it manually." . NC . "\n";
    }
} else {
    echo GREEN . "✅ Logs directory already exists" . NC . "\n";
}

// Make sure logs directory is writable
if (!is_writable($logsDir)) {
    echo YELLOW . "⚠️  Logs directory is not writable. Please run: chmod 755 logs/" . NC . "\n";
}

echo "\n";

// Initialize database tables (models will auto-create)
echo "==========================================\n";
echo "Initializing Database Tables\n";
echo "==========================================\n\n";

require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/app/models/User.php';
require_once __DIR__ . '/app/middleware/RequestLogger.php';

echo "Creating tables...\n";

try {
    // User table
    $userModel = new User();
    echo GREEN . "✅ Users table created/verified" . NC . "\n";
    
    // Request logs table
    $logger = new RequestLogger();
    echo GREEN . "✅ Request logs table created/verified" . NC . "\n";
    
} catch (Exception $e) {
    echo RED . "❌ Error creating tables: " . $e->getMessage() . NC . "\n";
    exit(1);
}

echo "\n";

// Seed database
echo "==========================================\n";
echo "Seeding Database\n";
echo "==========================================\n\n";

$seedFile = __DIR__ . '/scripts/seed.php';
if (file_exists($seedFile)) {
    echo "Running seed script...\n";
    require_once $seedFile;
    echo "\n";
} else {
    echo YELLOW . "⚠️  Seed file not found: $seedFile" . NC . "\n\n";
}

// Test database connection
echo "==========================================\n";
echo "Testing Database Connection\n";
echo "==========================================\n\n";

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    // Count users
    $stmt = $conn->query("SELECT COUNT(*) as count FROM users");
    $result = $stmt->fetch();
    $userCount = $result['count'];
    
    echo GREEN . "✅ Database connection successful" . NC . "\n";
    echo "   Total users in database: $userCount\n\n";
    
} catch (Exception $e) {
    echo RED . "❌ Database test failed: " . $e->getMessage() . NC . "\n\n";
}

// Setup complete
echo "==========================================\n";
echo "Setup Complete! 🎉\n";
echo "==========================================\n\n";

echo "To start the development server, run:\n";
echo BLUE . "  cd public\n";
echo "  php -S localhost:8000" . NC . "\n\n";

echo "Then access the API at: " . BLUE . "http://localhost:8000/api" . NC . "\n\n";

echo "Test credentials:\n";
echo "  Employee ID: " . GREEN . "LITRO-ADMIN-001" . NC . "\n";
echo "  Password: " . GREEN . "password123" . NC . "\n\n";

echo "API Documentation:\n";
echo "  View the OpenAPI specification at: testing/openapi.yaml\n";
echo "  Import it into Swagger Editor: https://editor.swagger.io/\n\n";

echo "For more information, see README.md\n\n";

exit(0);
