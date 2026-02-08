# Sparepart Issuance System - Feature Documentation

## Overview
The inventory manager can now issue spareparts to machines and vehicles with proper tracking. When a sparepart is issued, the system automatically:
- Updates the inventory quantity
- Records the last issue date
- Tracks which machine/vehicle received the part
- Displays usage history

## How It Works

### 1. **Issue Sparepart Modal**
When you click "Add Entry" in the Usage Tracking section, you'll see a new "Issue Sparepart" form with:

#### Machine/Vehicle Information
- Select the machine or vehicle that needs the sparepart

#### Sparepart Information
- **Select Sparepart**: Dropdown showing all available spareparts with format:
  - `SPR-XXX - Name (XX available)`
  - Example: `SPR-005 - Brake Pads (25 available)`
- **Available Quantity**: Auto-populated (read-only) showing current stock
- **Quantity Issued**: Enter how many units to issue
  - System validates you don't exceed available stock
- **Issue Date**: Defaults to today, can be changed

#### Additional Details
- **Usage Frequency**: Select how often this part is used
  - High (12x/year)
  - Medium (6x/year)
  - Low (3x/year)
- **Notes**: Optional field for additional information

### 2. **Validation**
The system performs these checks before issuing:
- ✓ Machine/vehicle selected
- ✓ Sparepart selected
- ✓ Quantity is at least 1
- ✓ Quantity doesn't exceed available stock

### 3. **Automatic Updates**
When you issue a sparepart:

**Inventory Update**
- Reduces the sparepart quantity in the catalog
- Updates the last issue date for the sparepart

**Usage Tracking**
- Adds a new row to the usage tracking table showing:
  - Machine/Vehicle ID
  - Sparepart ID
  - Sparepart Name
  - Quantity Used
  - Usage Frequency
  - Actions (View button)

### 4. **Usage Tracking Table**
The table displays all issued spareparts with columns:
- **Machine ID**: ID of machine/vehicle (e.g., MCH-001, VEH-002)
- **Sparepart ID**: ID of issued sparepart (e.g., SPR-005)
- **Sparepart Name**: Name of the part (e.g., Brake Pads)
- **Quantity Used**: Number of units issued
- **Usage Frequency**: How often used (color-coded badges)
- **Actions**: View details button

### 5. **Filtering**
Use the filter buttons to view:
- **All**: Show all issued spareparts
- **Machines Only**: Show only spareparts issued to machines
- **Vehicles Only**: Show only spareparts issued to vehicles

## Database Changes

### New Column: `last_issue_date`
Added to the `spareparts` table:
- **Type**: DATE
- **Purpose**: Tracks when a sparepart was last issued
- **Updates**: Automatically set when issuing a sparepart

## Technical Details

### Frontend Updates
**File**: `/pages/dashboard/inventory-manager/index.html`
- Redesigned "Add Usage Entry" modal to "Issue Sparepart"
- Added sparepart selection dropdown
- Added available quantity display
- Added quantity issued input with validation
- Removed cost field (no longer needed)
- Changed repair date to issue date

**File**: `/pages/dashboard/inventory-manager/script.js`
- `loadSparepartsForIssuance()`: Loads available spareparts into dropdown
- `updateSparepartDetails()`: Updates available quantity when sparepart selected
- `addMachineUsage()`: Enhanced to load both machines/vehicles and spareparts
- Updated form submission handler to process issuance and update inventory

### Backend Support
**File**: `/app/models/Product.php`
- Added `last_issue_date` to schema

**Migration**: `/migrations/add_last_issue_date.php`
- Adds `last_issue_date` column to database

### API Integration
Uses existing API endpoints:
- `GET /api/products` - Fetch available spareparts
- `PUT /api/products/{id}` - Update quantity and last_issue_date

## Usage Example

### Scenario: Issuing Brake Pads to a Machine
1. Click "Add Entry" button in Usage Tracking section
2. Select "MCH-001 - Hydraulic Excavator" from machine dropdown
3. Select "SPR-005 - Brake Pads (25 available)" from sparepart dropdown
4. System shows "Available Quantity: 25"
5. Enter "2" in "Quantity Issued"
6. Issue Date auto-fills to today
7. Select "Medium (6x/year)" for usage frequency
8. Add note: "Routine maintenance"
9. Click "Issue Sparepart"

### Result:
- ✓ SPR-005 quantity reduced from 25 to 23
- ✓ Last issue date updated to today
- ✓ New row added to usage tracking table
- ✓ Catalog automatically refreshed to show new quantity
- ✓ Success message displayed

## Benefits
1. **Accurate Inventory**: Automatic quantity updates prevent stock discrepancies
2. **Full Traceability**: Track which parts went to which machines
3. **Usage Patterns**: Identify high-usage parts for better procurement
4. **Last Issue Tracking**: Know when parts were last used
5. **Validation**: Prevents over-issuing beyond available stock
6. **Simplified Workflow**: One-click issuance with automatic updates

## Version
- Frontend: v1.2.3
- Feature Added: 2025
- Status: ✓ Active and Tested
