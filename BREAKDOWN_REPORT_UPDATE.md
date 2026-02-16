# Breakdown Report System - Database Update

## Overview
The breakdown report system has been successfully updated with renamed database tables and enhanced schema to match form requirements.

## Database Changes

### Tables Renamed
- `breakdown_reports` → **`vehicle_breakdown`**
- `route_breakdowns` → **`vehicle_breakdown_inroute`**

### Migration Files
1. **`migrations/rename_breakdown_tables.php`** - Drops old tables and creates new ones
2. **`migrations/seed_renamed_breakdown_tables.php`** - Seeds sample data

## Updated Schema

### vehicle_breakdown Table (23 columns)
```sql
CREATE TABLE vehicle_breakdown (
    id INT AUTO_INCREMENT PRIMARY KEY,
    breakdown_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id INT NOT NULL,
    driver_id INT NOT NULL,
    breakdown_date DATE NOT NULL,
    breakdown_time TIME,
    location TEXT NOT NULL,
    breakdown_type ENUM('Engine Failure', 'Transmission', 'Electrical', 'Brake System', 
                        'Tire/Wheel', 'Fuel System', 'Cooling System', 'Suspension', 
                        'Steering', 'Other') NOT NULL,
    severity ENUM('Critical', 'Major', 'Minor') NOT NULL,
    description TEXT NOT NULL,
    immediate_action_taken TEXT,
    reported_by INT NOT NULL,
    assigned_technician INT,
    status ENUM('Reported', 'Under Repair', 'Repaired', 'Cannot Repair') DEFAULT 'Reported',
    repair_start_datetime DATETIME,
    repair_end_datetime DATETIME,
    downtime_hours DECIMAL(10,2) DEFAULT 0.00,
    repair_cost DECIMAL(10,2) DEFAULT 0.00,
    spare_parts_used TEXT,
    service_provider VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (reported_by) REFERENCES users(id),
    FOREIGN KEY (assigned_technician) REFERENCES users(id)
);
```

### vehicle_breakdown_inroute Table (29 columns)
```sql
CREATE TABLE vehicle_breakdown_inroute (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_breakdown_id VARCHAR(50) UNIQUE NOT NULL,
    breakdown_id INT,
    vehicle_id INT NOT NULL,
    trip_id INT,
    driver_id INT NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    start_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    breakdown_location TEXT NOT NULL,
    breakdown_datetime DATETIME NOT NULL,
    current_mileage INT,
    passengers_onboard INT DEFAULT 0,
    cargo_type VARCHAR(255),
    cargo_weight DECIMAL(10,2),
    weather_condition VARCHAR(100),
    road_condition VARCHAR(100),
    traffic_condition VARCHAR(100),
    breakdown_cause TEXT,
    emergency_contact_made BOOLEAN DEFAULT FALSE,
    emergency_service_type VARCHAR(255),
    towing_required BOOLEAN DEFAULT FALSE,
    towing_company VARCHAR(255),
    estimated_repair_time VARCHAR(100),
    alternative_arrangement TEXT,
    delay_duration VARCHAR(100),
    impact_on_schedule TEXT,
    recovery_status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
    recovery_action TEXT,
    recovery_datetime DATETIME,
    additional_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (breakdown_id) REFERENCES vehicle_breakdown(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
);
```

## Controller Updates

### BreakdownReportController.php
**Updated references:**
- Table: `breakdown_reports` → `vehicle_breakdown`
- ID field: `report_id` → `breakdown_id`
- Fields updated: `vehicle_id`, `driver_id`, `breakdown_time` added
- Status values: `Pending/Completed` → `Reported/Under Repair/Repaired/Cannot Repair`

**Methods:**
- `index()` - Get all breakdowns with vehicle info
- `show()` - Get single breakdown by ID
- `create()` - Create new breakdown report
- `update()` - Update existing breakdown
- `stats()` - Get breakdown statistics

### RouteBreakdownController.php
**Updated references:**
- Table: `route_breakdowns` → `vehicle_breakdown_inroute`
- ID field: `route_id` → `route_breakdown_id`
- FK field: `breakdown_report_id` → `breakdown_id`
- Time field: `breakdown_time` → `breakdown_datetime`
- Fields updated to match new schema

**Methods:**
- `index()` - Get all route breakdowns
- `show()` - Get single route breakdown by ID
- `create()` - Create new route breakdown
- `update()` - Update existing route breakdown
- `stats()` - Get route breakdown statistics

## API Endpoints (Unchanged)

### Vehicle Breakdown Reports
- `GET /api/breakdown-reports` - List all breakdowns
- `GET /api/breakdown-reports/:id` - Get single breakdown
- `GET /api/breakdown-reports/stats` - Get statistics
- `POST /api/breakdown-reports` - Create new breakdown
- `PUT /api/breakdown-reports/:id` - Update breakdown

### Route Breakdowns
- `GET /api/route-breakdowns` - List all route breakdowns
- `GET /api/route-breakdowns/:id` - Get single route breakdown
- `GET /api/route-breakdowns/stats` - Get statistics
- `POST /api/route-breakdowns` - Create new route breakdown
- `PUT /api/route-breakdowns/:id` - Update route breakdown

## Sample Data

### Vehicle Breakdowns (5 records)
1. **VBD-2026-001** - Engine Failure (Critical) - Repaired
2. **VBD-2026-002** - Electrical (Major) - Under Repair
3. **VBD-2026-003** - Tire/Wheel (Minor) - Repaired
4. **VBD-2026-004** - Transmission (Critical) - Reported
5. **VBD-2026-005** - Brake System (Major) - Reported

### Route Breakdowns (3 records)
1. **RBD-2026-001** - Colombo to Kandy route - Completed
2. **RBD-2026-002** - Ratnapura Supply Run - Completed
3. **RBD-2026-003** - Airport Express Service - In Progress

## Testing Results

### API Tests (All Passing ✅)
```bash
# Get all breakdowns
GET /api/breakdown-reports
Response: 5 breakdowns with vehicle details

# Get breakdown statistics
GET /api/breakdown-reports/stats
Response:
- Total: 5
- By Status: Reported(2), Under Repair(1), Repaired(2)
- By Severity: Critical(2), Major(2), Minor(1)
- Average downtime: 2.75 hours
- Average cost: LKR 18,250
- Total cost: LKR 36,500

# Get all route breakdowns
GET /api/route-breakdowns
Response: 3 route breakdowns with full details

# Get route breakdown statistics
GET /api/route-breakdowns/stats
Response:
- Total: 3
- By Recovery Status: Pending(0), In Progress(1), Completed(2)
- Towing required: 1
- Emergency services: 3
- Average passengers: 1.00
```

## Database Verification
```sql
-- Tables exist
✅ vehicle_breakdown
✅ vehicle_breakdown_inroute

-- Record counts
✅ vehicle_breakdown: 5 records
✅ vehicle_breakdown_inroute: 3 records
```

## Key Improvements

### Schema Enhancements
1. **More breakdown types** - Expanded from 7 to 10 types
2. **Simplified severity** - Changed from 4 levels to 3 (Critical/Major/Minor)
3. **Better status tracking** - Repair workflow: Reported → Under Repair → Repaired/Cannot Repair
4. **Route breakdown details** - Added cargo weight, traffic conditions, emergency service types
5. **Recovery tracking** - Better recovery status and action tracking

### Field Additions
**vehicle_breakdown:**
- `breakdown_time` - Separate time field
- `immediate_action_taken` - Quick response documentation
- `service_provider` - Track who performed repairs

**vehicle_breakdown_inroute:**
- `cargo_weight` - Quantify cargo
- `traffic_condition` - Traffic context
- `emergency_service_type` - Type of emergency response
- `alternative_arrangement` - Backup plans documented
- `impact_on_schedule` - Track schedule disruption

## Authorization
All endpoints require authentication and minimum role of:
- **Supervisor** - View all breakdowns and statistics
- **Driver** - Create breakdown reports
- **Technical Officer** - Update breakdown status

## Next Steps (Frontend Integration)

1. **Create Breakdown Report Forms**
   - Form for reporting vehicle breakdowns
   - Form for reporting route breakdowns
   - Include all new fields from schema

2. **Dashboard Pages**
   - Breakdown reports list view
   - Route breakdowns list view
   - Statistics dashboard with charts

3. **Detail Views**
   - Individual breakdown detail page
   - Route breakdown detail page
   - Update/edit forms for authorized users

4. **Integration Points**
   - Link breakdowns to vehicle maintenance records
   - Connect with trip management system
   - Generate breakdown reports for analysis

## Files Modified
- ✅ `/migrations/rename_breakdown_tables.php` (created)
- ✅ `/migrations/seed_renamed_breakdown_tables.php` (created)
- ✅ `/app/controllers/BreakdownReportController.php` (updated)
- ✅ `/app/controllers/RouteBreakdownController.php` (updated)
- ✅ Database tables renamed and populated

---
**Updated:** February 8, 2026
**Status:** ✅ Complete and Tested
**Server:** PHP 8.4.12 on localhost:8000
**Database:** assetcare360 (MySQL via XAMPP)
