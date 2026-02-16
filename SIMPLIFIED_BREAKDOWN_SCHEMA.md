# Breakdown Report System - Simplified Schema

## Overview
Database tables have been simplified to include **only the fields present in the forms**.

## Database Schema

### vehicle_breakdown Table (11 fields)
Matches the "Report Vehicle Breakdown" form fields.

```sql
CREATE TABLE vehicle_breakdown (
    id INT AUTO_INCREMENT PRIMARY KEY,
    breakdown_id VARCHAR(50) UNIQUE NOT NULL,          -- Auto-generated (VBD-YYYY-###)
    vehicle_id INT NOT NULL,                           -- ✅ Vehicle Registration (from form)
    driver_id INT NOT NULL,                            -- ✅ Current logged-in driver
    breakdown_date DATE NOT NULL,                      -- ✅ Date of breakdown
    breakdown_type VARCHAR(100) NOT NULL,              -- ✅ Problem Category (from form)
    severity VARCHAR(50) NOT NULL,                     -- ✅ Urgency Level (from form)
    description TEXT NOT NULL,                         -- ✅ Problem Description (from form)
    status VARCHAR(50) DEFAULT 'Pending',              -- Status tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Auto-generated
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Form Fields Mapping:**
- Vehicle Registration → `vehicle_id`
- Urgency Level → `severity` (low/medium/high/critical)
- Problem Category → `breakdown_type` (engine/transmission/brakes/electrical/cooling/tires/other)
- Problem Description → `description`
- Photo Documentation → Not stored in database (file upload)

### vehicle_breakdown_inroute Table (13 fields)
Matches the "Report Breakdown in Route" form fields.

```sql
CREATE TABLE vehicle_breakdown_inroute (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_breakdown_id VARCHAR(50) UNIQUE NOT NULL,    -- Auto-generated (RBD-YYYY-###)
    breakdown_id INT,                                  -- FK to vehicle_breakdown (optional)
    vehicle_id INT NOT NULL,                           -- ✅ Vehicle Registration (from form)
    driver_id INT NOT NULL,                            -- ✅ Current logged-in driver
    breakdown_location TEXT NOT NULL,                  -- ✅ Current Location (from form)
    breakdown_datetime DATETIME NOT NULL,              -- ✅ Incident Time (from form)
    breakdown_type VARCHAR(100) NOT NULL,              -- ✅ Problem Category (from form)
    severity VARCHAR(50) NOT NULL,                     -- ✅ Urgency Level (from form)
    description TEXT NOT NULL,                         -- ✅ Problem Description (from form)
    status VARCHAR(50) DEFAULT 'Pending',              -- Status tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Auto-generated
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Form Fields Mapping:**
- Vehicle Registration → `vehicle_id`
- Current Location → `breakdown_location`
- Incident Time → `breakdown_datetime`
- Urgency Level → `severity` (low/medium/high/critical)
- Problem Category → `breakdown_type` (engine/transmission/brakes/electrical/cooling/tires/other)
- Problem Description → `description`
- Photo Documentation → Not stored in database (file upload)

## API Endpoints

### Vehicle Breakdown Reports
- `GET /api/breakdown-reports` - List all breakdowns
- `GET /api/breakdown-reports/:id` - Get single breakdown
- `GET /api/breakdown-reports/stats` - Get statistics (by status, severity, type)
- `POST /api/breakdown-reports` - Create new breakdown
- `PUT /api/breakdown-reports/:id` - Update breakdown

### Route Breakdowns
- `GET /api/route-breakdowns` - List all route breakdowns
- `GET /api/route-breakdowns/:id` - Get single route breakdown
- `GET /api/route-breakdowns/stats` - Get statistics (by status, severity, type)
- `POST /api/route-breakdowns` - Create new route breakdown
- `PUT /api/route-breakdowns/:id` - Update route breakdown

## Sample Data

### Vehicle Breakdowns (5 records)
1. **VBD-2026-001** - Engine (Critical) - Pending
2. **VBD-2026-002** - Electrical (High) - Pending
3. **VBD-2026-003** - Tires (Low) - Resolved
4. **VBD-2026-004** - Transmission (Critical) - Pending
5. **VBD-2026-005** - Brakes (High) - Pending

### Route Breakdowns (3 records)
1. **RBD-2026-001** - Engine breakdown on Colombo-Kandy road (Critical) - Pending
2. **RBD-2026-002** - Flat tire on Ratnapura route (Low) - Resolved
3. **RBD-2026-003** - Transmission failure on expressway (Critical) - Pending

## Testing Results ✅

### Breakdown Reports API
```json
{
  "total": 5,
  "by_status": [
    {"status": "Pending", "count": 4},
    {"status": "Resolved", "count": 1}
  ],
  "by_severity": [
    {"severity": "critical", "count": 2},
    {"severity": "high", "count": 2},
    {"severity": "low", "count": 1}
  ],
  "by_type": [
    {"breakdown_type": "engine", "count": 1},
    {"breakdown_type": "tires", "count": 1},
    {"breakdown_type": "brakes", "count": 1},
    {"breakdown_type": "electrical", "count": 1},
    {"breakdown_type": "transmission", "count": 1}
  ]
}
```

### Route Breakdowns API
All 3 route breakdowns returned with complete details including:
- Vehicle number plate
- Driver name
- Breakdown location
- Breakdown datetime
- Type, severity, description
- Status

## Files Created/Modified

### Migrations
- ✅ `/migrations/simplify_breakdown_tables.php` - Drops old tables and creates simplified versions
- ✅ `/migrations/seed_simplified_breakdown_tables.php` - Seeds sample data

### Controllers (Recreated)
- ✅ `/app/controllers/BreakdownReportController.php` - Simplified to match schema
- ✅ `/app/controllers/RouteBreakdownController.php` - Simplified to match schema

### Database
- ✅ `vehicle_breakdown` table: 11 fields (8 core + 3 system)
- ✅ `vehicle_breakdown_inroute` table: 13 fields (9 core + 4 system)

## Key Simplifications

### Removed Fields (not in forms)
From **vehicle_breakdown**:
- ~~breakdown_time~~ (only date used)
- ~~location~~ (not in regular breakdown form)
- ~~immediate_action_taken~~
- ~~reported_by~~ (using driver_id instead)
- ~~assigned_technician~~
- ~~repair_start_datetime~~
- ~~repair_end_datetime~~
- ~~downtime_hours~~
- ~~repair_cost~~
- ~~spare_parts_used~~
- ~~service_provider~~
- ~~remarks~~

From **vehicle_breakdown_inroute**:
- ~~trip_id~~
- ~~route_name~~
- ~~start_location~~
- ~~destination~~
- ~~current_mileage~~
- ~~passengers_onboard~~
- ~~cargo_type~~
- ~~cargo_weight~~
- ~~weather_condition~~
- ~~road_condition~~
- ~~traffic_condition~~
- ~~breakdown_cause~~
- ~~emergency_contact_made~~
- ~~emergency_service_type~~
- ~~towing_required~~
- ~~towing_company~~
- ~~estimated_repair_time~~
- ~~alternative_arrangement~~
- ~~delay_duration~~
- ~~impact_on_schedule~~
- ~~recovery_status~~
- ~~recovery_action~~
- ~~recovery_datetime~~
- ~~additional_notes~~

### Kept Fields (present in forms)
✅ Vehicle ID (registration)  
✅ Driver ID (logged-in user)  
✅ Breakdown date/datetime  
✅ Breakdown location (for in-route only)  
✅ Breakdown type (problem category)  
✅ Severity (urgency level)  
✅ Description (problem description)  
✅ Status (for tracking)  

## Benefits of Simplification

1. **Matches Forms Exactly** - Database only contains what drivers can input
2. **Simpler Data Entry** - Fewer fields to validate and manage
3. **Faster Performance** - Smaller table size, faster queries
4. **Easier Maintenance** - Less complexity in controllers and queries
5. **Clear Purpose** - Each field has a direct mapping to form input

---
**Updated:** February 8, 2026  
**Status:** ✅ Simplified and Tested  
**Tables:** vehicle_breakdown (11 fields), vehicle_breakdown_inroute (13 fields)  
**Sample Data:** 5 breakdowns, 3 route breakdowns  
**API Status:** All endpoints working ✅
