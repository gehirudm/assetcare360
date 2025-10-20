# AssetCare360 Backend - Changelog

## Latest Updates (October 21, 2025)

### ✨ New Features

#### 1. Vehicle & Machine Auction System
- Added new status: **"For Auction"** for both vehicles and machines
- Vehicles and machines can be marked for auction
- Items can be removed from auction and returned to "Active" status
- **Database Update Required**: 
  ```sql
  -- Run these SQL commands to update your database:
  ALTER TABLE vehicles MODIFY COLUMN status ENUM('Active', 'Inactive', 'Under Maintenance', 'Decommissioned', 'For Auction') DEFAULT 'Active';
  ALTER TABLE machines MODIFY COLUMN status ENUM('Active', 'Inactive', 'Under Maintenance', 'Decommissioned', 'For Auction') DEFAULT 'Active';
  ```

#### 2. Improved UI/UX
- **Dropdown Menu System**: Replaced multiple action buttons with a compact 3-dot dropdown menu
  - Update Mileage (vehicles only)
  - Mark for Auction / Remove from Auction
  - Delete
- **Confirmation Dialogs**: Professional confirmation dialogs for critical actions
  - Delete confirmation (danger style)
  - Mark for Auction confirmation (warning style)
  - Remove from Auction confirmation (primary style)

#### 3. Vehicle Components
- Added components field to vehicles (similar to machines)
- 15 predefined vehicle components available:
  - Engine, Transmission, Braking System, Suspension System, Steering System
  - Cooling System, Exhaust System, Electrical System, Fuel System
  - Tires & Wheels, Battery, Alternator, Starter Motor
  - Air Conditioning, Lights & Signals
- Components displayed in vehicle details and list views

#### 4. Vehicle Mileage Update Modal
- Professional modal interface for updating vehicle mileage
- Displays current vehicle information
- Validates that new mileage >= current mileage
- Prevents invalid mileage updates

### 🔧 Backend Improvements

#### 1. Validation Enhancements
- **Last Service Mileage**: Must be <= current mileage
- **Last Service Date**: Cannot be in the future
- Validation applies to both create and update operations

#### 2. API Enhancements
- Added PATCH method support in Router
- Added PATCH to CORS allowed methods
- Mileage update endpoint now uses PATCH `/api/vehicles/:id/mileage`

#### 3. Controller Updates
- Fixed parameter reading in VehicleController:
  - `show()`, `update()`, `delete()`, `updateMileage()` now read from `$_GET['id']`
- Fixed parameter reading in MachineController:
  - `show()`, `update()`, `delete()` now read from `$_GET['id']`
- Proper user tracking with `RoleMiddleware::getCurrentUser()`

### 🐛 Bug Fixes

#### 1. Frontend Fixes
- Fixed response handling to check `response.status === 'success'` instead of `response.success`
- Added proper error display for validation errors in forms
- Fixed dropdown menu z-index issues
- Prevented dropdown menu from appearing under adjacent items
- Added closeAllDropdowns() when clicking outside

#### 2. Backend Fixes
- Fixed "Too few arguments" error in controllers
- Updated vehicle types to match database ENUM:
  - Truck, Van, Car, Bus, Bike, Three-Wheeler, Lorry, Tanker, Other
- Updated fuel types to match database ENUM:
  - Petrol, Diesel, Electric, Hybrid, LPG, CNG

### 📋 Updated Files

#### Backend Files
1. `app/models/Vehicle.php`
   - Added `components` field
   - Updated status ENUM to include 'For Auction'
   - Added JSON encoding/decoding for components

2. `app/models/Machine.php`
   - Updated status ENUM to include 'For Auction'

3. `app/services/VehicleService.php`
   - Added validation for last_service_mileage
   - Added validation for last_service_date

4. `app/controllers/VehicleController.php`
   - Fixed parameter reading from `$_GET['id']`
   - Fixed user tracking

5. `app/controllers/MachineController.php`
   - Fixed parameter reading from `$_GET['id']`
   - Fixed user tracking

6. `app/Router.php`
   - Added PATCH method support

7. `public/index.php`
   - Added PATCH to CORS allowed methods
   - Updated mileage route to use PATCH

#### Frontend Files
1. `pages/js/api.js`
   - Added `patch()` method

2. `pages/js/config.js`
   - Updated VEHICLE_TYPES to match database
   - Updated FUEL_TYPES to match database
   - Added VEHICLE_COMPONENTS array

3. `pages/dashboard/inventory-manager/script.js`
   - Updated vehicle and machine list rendering with dropdown menus
   - Added dropdown menu functions
   - Added confirmation dialog system
   - Added auction functionality
   - Updated status handling
   - Improved error handling in forms

4. `pages/dashboard/inventory-manager/style.css`
   - Added dropdown menu styles
   - Added confirmation dialog styles
   - Added status-auction badge style
   - Fixed z-index issues for dropdowns
   - Added vehicle info card styles

5. `testing/openapi.yaml`
   - Updated all status ENUMs to include 'For Auction'
   - Added components field documentation
   - Updated mileage endpoint to PATCH
   - Added validation descriptions

### 🚀 How to Deploy

1. **Database Migration** (REQUIRED):
   ```sql
   ALTER TABLE vehicles MODIFY COLUMN status ENUM('Active', 'Inactive', 'Under Maintenance', 'Decommissioned', 'For Auction') DEFAULT 'Active';
   ALTER TABLE machines MODIFY COLUMN status ENUM('Active', 'Inactive', 'Under Maintenance', 'Decommissioned', 'For Auction') DEFAULT 'Active';
   ```

2. **Server Restart**:
   - Stop and restart PHP servers:
     ```bash
     # Stop existing servers (Ctrl+C)
     # Restart backend
     php -S localhost:8000 -t public
     # Restart frontend (in new terminal)
     php -S localhost:3000 -t pages
     ```

3. **Clear Browser Cache**:
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Or clear browser cache

### 📝 Notes

- The auction feature is visual only - auction workflow integration would be a future enhancement
- All validation messages are displayed in toast notifications and form error fields
- Dropdown menus automatically close when clicking outside
- Confirmation dialogs prevent accidental deletions

### 🔜 Future Enhancements

- Auction workflow and bidding system
- Email notifications for service reminders
- Advanced reporting and analytics
- Bulk operations for vehicles and machines
- Export to PDF/Excel
