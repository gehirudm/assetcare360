#!/bin/bash

echo "=========================================="
echo "AssetCare360 Backend Setup Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PHP is installed
echo "Checking prerequisites..."
if ! command -v php &> /dev/null
then
    echo -e "${RED}❌ PHP is not installed. Please install PHP 7.4 or higher.${NC}"
    exit 1
else
    PHP_VERSION=$(php -v | head -n 1 | cut -d " " -f 2 | cut -d "." -f 1,2)
    echo -e "${GREEN}✅ PHP $PHP_VERSION is installed${NC}"
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null
then
    echo -e "${YELLOW}⚠️  MySQL client not found in PATH. Make sure MySQL is installed.${NC}"
else
    echo -e "${GREEN}✅ MySQL is installed${NC}"
fi

echo ""
echo "=========================================="
echo "Database Setup"
echo "=========================================="
echo ""

# Ask for database credentials
read -p "MySQL Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "MySQL User [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -sp "MySQL Password: " DB_PASS
echo ""

read -p "Database Name [assetcare360]: " DB_NAME
DB_NAME=${DB_NAME:-assetcare360}

# Try to create database
echo ""
echo "Creating database '$DB_NAME'..."

if [ -z "$DB_PASS" ]; then
    mysql -h "$DB_HOST" -u "$DB_USER" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null
else
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Could not create database automatically. Please create it manually:${NC}"
    echo "   CREATE DATABASE $DB_NAME;"
fi

# Update config file
echo ""
echo "Updating configuration file..."

CONFIG_FILE="config/config.php"

if [ -f "$CONFIG_FILE" ]; then
    # Create backup
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
    
    # Update config values
    sed -i.tmp "s/define('DB_HOST', '.*');/define('DB_HOST', '$DB_HOST');/" "$CONFIG_FILE"
    sed -i.tmp "s/define('DB_NAME', '.*');/define('DB_NAME', '$DB_NAME');/" "$CONFIG_FILE"
    sed -i.tmp "s/define('DB_USER', '.*');/define('DB_USER', '$DB_USER');/" "$CONFIG_FILE"
    sed -i.tmp "s/define('DB_PASS', '.*');/define('DB_PASS', '$DB_PASS');/" "$CONFIG_FILE"
    
    rm -f "$CONFIG_FILE.tmp"
    
    echo -e "${GREEN}✅ Configuration updated${NC}"
else
    echo -e "${RED}❌ Config file not found${NC}"
    exit 1
fi

# Run seeder
echo ""
echo "=========================================="
echo "Seeding Database"
echo "=========================================="
echo ""

php scripts/seed.php

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database seeded successfully${NC}"
else
    echo -e "${RED}❌ Failed to seed database${NC}"
    exit 1
fi

# Create logs directory
echo ""
echo "Creating logs directory..."
mkdir -p logs
chmod 755 logs
echo -e "${GREEN}✅ Logs directory created${NC}"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To start the development server, run:"
echo "  cd public"
echo "  php -S localhost:8000"
echo ""
echo "Then access the API at: http://localhost:8000/api"
echo ""
echo "Test credentials:"
echo "  Employee ID: LITRO-ADMIN-001"
echo "  Password: password123"
echo ""
echo "For more information, see README.md"
echo ""
