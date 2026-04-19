-- ============================================================
-- AssetCare360 — Fix Seeded ID Format Inconsistencies
-- ============================================================
-- This script normalizes all entity IDs that were seeded with
-- incorrect prefixes or formats to match the patterns expected
-- by the application codebase.
--
-- Expected ID formats (from model ID generators):
--   machines.machine_id     → MCH-NNN       (e.g. MCH-001)
--   vehicles.vehicle_id     → VEH-NNN       (e.g. VEH-001)
--   fault_tickets.ticket_id → MBD-NNN / VBD-NNN / RBD-NNN
--   spareparts.sparepart_id → SPR-NNN       (already correct)
--   vehicle_checks.check_id → VCHK-NNN      (already correct)
--   machine_weekly_checks   → MCHK-NNN      (already correct)
--   users.employee_id       → LITRO-{ROLE}-NNN (standardize prefixes)
-- ============================================================

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. FIX MACHINES: MAC-LIT-2XX → MCH-0XX
-- ============================================================
-- Seeded records id 9-18 used "MAC-LIT-201" through "MAC-LIT-210"
-- Expected format: MCH-007 through MCH-016

UPDATE machines SET machine_id = 'MCH-007' WHERE machine_id = 'MAC-LIT-201';
UPDATE machines SET machine_id = 'MCH-008' WHERE machine_id = 'MAC-LIT-202';
UPDATE machines SET machine_id = 'MCH-009' WHERE machine_id = 'MAC-LIT-203';
UPDATE machines SET machine_id = 'MCH-010' WHERE machine_id = 'MAC-LIT-204';
UPDATE machines SET machine_id = 'MCH-011' WHERE machine_id = 'MAC-LIT-205';
UPDATE machines SET machine_id = 'MCH-012' WHERE machine_id = 'MAC-LIT-206';
UPDATE machines SET machine_id = 'MCH-013' WHERE machine_id = 'MAC-LIT-207';
UPDATE machines SET machine_id = 'MCH-014' WHERE machine_id = 'MAC-LIT-208';
UPDATE machines SET machine_id = 'MCH-015' WHERE machine_id = 'MAC-LIT-209';
UPDATE machines SET machine_id = 'MCH-016' WHERE machine_id = 'MAC-LIT-210';

-- ============================================================
-- 2. FIX VEHICLES: VEH-LIT-1XX → VEH-0XX
-- ============================================================
-- Seeded records id 4-15 used "VEH-LIT-101" through "VEH-LIT-112"
-- Expected format: VEH-004 through VEH-015

UPDATE vehicles SET vehicle_id = 'VEH-004' WHERE vehicle_id = 'VEH-LIT-101';
UPDATE vehicles SET vehicle_id = 'VEH-005' WHERE vehicle_id = 'VEH-LIT-102';
UPDATE vehicles SET vehicle_id = 'VEH-006' WHERE vehicle_id = 'VEH-LIT-103';
UPDATE vehicles SET vehicle_id = 'VEH-007' WHERE vehicle_id = 'VEH-LIT-104';
UPDATE vehicles SET vehicle_id = 'VEH-008' WHERE vehicle_id = 'VEH-LIT-105';
UPDATE vehicles SET vehicle_id = 'VEH-009' WHERE vehicle_id = 'VEH-LIT-106';
UPDATE vehicles SET vehicle_id = 'VEH-010' WHERE vehicle_id = 'VEH-LIT-107';
UPDATE vehicles SET vehicle_id = 'VEH-011' WHERE vehicle_id = 'VEH-LIT-108';
UPDATE vehicles SET vehicle_id = 'VEH-012' WHERE vehicle_id = 'VEH-LIT-109';
UPDATE vehicles SET vehicle_id = 'VEH-013' WHERE vehicle_id = 'VEH-LIT-110';
UPDATE vehicles SET vehicle_id = 'VEH-014' WHERE vehicle_id = 'VEH-LIT-111';
UPDATE vehicles SET vehicle_id = 'VEH-015' WHERE vehicle_id = 'VEH-LIT-112';

-- ============================================================
-- 3. FIX FAULT TICKETS: FT-26-XXXX → correct prefix-NNN
-- ============================================================
-- Seeded records id 21-56 used "FT-26-NNNN" regardless of breakdown type.
-- Expected: MBD-NNN for machine, VBD-NNN for vehicle, RBD-NNN for route
-- 
-- Current max correct IDs: MBD-006, VBD-006, RBD-006
-- New IDs will continue from 007 onward per prefix.

-- MBD (machine_breakdown) — FT-26 tickets with machine type
-- IDs: 22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56
UPDATE fault_tickets SET ticket_id = 'MBD-007' WHERE id = 22 AND ticket_id = 'FT-26-0002';
UPDATE fault_tickets SET ticket_id = 'MBD-008' WHERE id = 24 AND ticket_id = 'FT-26-0004';
UPDATE fault_tickets SET ticket_id = 'MBD-009' WHERE id = 26 AND ticket_id = 'FT-26-0006';
UPDATE fault_tickets SET ticket_id = 'MBD-010' WHERE id = 28 AND ticket_id = 'FT-26-0008';
UPDATE fault_tickets SET ticket_id = 'MBD-011' WHERE id = 30 AND ticket_id = 'FT-26-0010';
UPDATE fault_tickets SET ticket_id = 'MBD-012' WHERE id = 32 AND ticket_id = 'FT-26-0012';
UPDATE fault_tickets SET ticket_id = 'MBD-013' WHERE id = 34 AND ticket_id = 'FT-26-0014';
UPDATE fault_tickets SET ticket_id = 'MBD-014' WHERE id = 36 AND ticket_id = 'FT-26-0016';
UPDATE fault_tickets SET ticket_id = 'MBD-015' WHERE id = 38 AND ticket_id = 'FT-26-0018';
UPDATE fault_tickets SET ticket_id = 'MBD-016' WHERE id = 40 AND ticket_id = 'FT-26-0020';
UPDATE fault_tickets SET ticket_id = 'MBD-017' WHERE id = 42 AND ticket_id = 'FT-26-0022';
UPDATE fault_tickets SET ticket_id = 'MBD-018' WHERE id = 44 AND ticket_id = 'FT-26-0024';
UPDATE fault_tickets SET ticket_id = 'MBD-019' WHERE id = 46 AND ticket_id = 'FT-26-0026';
UPDATE fault_tickets SET ticket_id = 'MBD-020' WHERE id = 48 AND ticket_id = 'FT-26-0028';
UPDATE fault_tickets SET ticket_id = 'MBD-021' WHERE id = 50 AND ticket_id = 'FT-26-0030';
UPDATE fault_tickets SET ticket_id = 'MBD-022' WHERE id = 52 AND ticket_id = 'FT-26-0032';
UPDATE fault_tickets SET ticket_id = 'MBD-023' WHERE id = 54 AND ticket_id = 'FT-26-0034';
UPDATE fault_tickets SET ticket_id = 'MBD-024' WHERE id = 56 AND ticket_id = 'FT-26-0036';

-- VBD (vehicle_breakdown) — FT-26 tickets with vehicle type
-- IDs: 21,25,27,31,33,37,39,43,45,49,51,55
UPDATE fault_tickets SET ticket_id = 'VBD-007' WHERE id = 21 AND ticket_id = 'FT-26-0001';
UPDATE fault_tickets SET ticket_id = 'VBD-008' WHERE id = 25 AND ticket_id = 'FT-26-0005';
UPDATE fault_tickets SET ticket_id = 'VBD-009' WHERE id = 27 AND ticket_id = 'FT-26-0007';
UPDATE fault_tickets SET ticket_id = 'VBD-010' WHERE id = 31 AND ticket_id = 'FT-26-0011';
UPDATE fault_tickets SET ticket_id = 'VBD-011' WHERE id = 33 AND ticket_id = 'FT-26-0013';
UPDATE fault_tickets SET ticket_id = 'VBD-012' WHERE id = 37 AND ticket_id = 'FT-26-0017';
UPDATE fault_tickets SET ticket_id = 'VBD-013' WHERE id = 39 AND ticket_id = 'FT-26-0019';
UPDATE fault_tickets SET ticket_id = 'VBD-014' WHERE id = 43 AND ticket_id = 'FT-26-0023';
UPDATE fault_tickets SET ticket_id = 'VBD-015' WHERE id = 45 AND ticket_id = 'FT-26-0025';
UPDATE fault_tickets SET ticket_id = 'VBD-016' WHERE id = 49 AND ticket_id = 'FT-26-0029';
UPDATE fault_tickets SET ticket_id = 'VBD-017' WHERE id = 51 AND ticket_id = 'FT-26-0031';
UPDATE fault_tickets SET ticket_id = 'VBD-018' WHERE id = 55 AND ticket_id = 'FT-26-0035';

-- RBD (route_breakdown) — FT-26 tickets with route type
-- IDs: 23,29,35,41,47,53
UPDATE fault_tickets SET ticket_id = 'RBD-007' WHERE id = 23 AND ticket_id = 'FT-26-0003';
UPDATE fault_tickets SET ticket_id = 'RBD-008' WHERE id = 29 AND ticket_id = 'FT-26-0009';
UPDATE fault_tickets SET ticket_id = 'RBD-009' WHERE id = 35 AND ticket_id = 'FT-26-0015';
UPDATE fault_tickets SET ticket_id = 'RBD-010' WHERE id = 41 AND ticket_id = 'FT-26-0021';
UPDATE fault_tickets SET ticket_id = 'RBD-011' WHERE id = 47 AND ticket_id = 'FT-26-0027';
UPDATE fault_tickets SET ticket_id = 'RBD-012' WHERE id = 53 AND ticket_id = 'FT-26-0033';

-- ============================================================
-- 4. FIX USER EMPLOYEE IDs: Standardize prefix formats
-- ============================================================
-- The system uses LITRO-{ROLE_PREFIX}-NNN format.
-- Standardized role prefixes:
--   Admin                → ADMIN
--   Maintenance Manager  → MAINTMGR
--   Inventory Manager    → INVMGR
--   Transportation Mgr   → TRANSMGR
--   Technical Officer    → TECHOFFICER
--   Supervisor           → SUPERVISOR
--   Machinary Operator   → MACHOPER
--   Driver               → DRIVER
--   Auction Officer      → AUCTION
--
-- Fix inconsistent originals (ids 1–13):
--   LITRO-TECH-002       → LITRO-TECHOFFICER-002
--   LITRO-TRANSPORT-001  → LITRO-TRANSMGR-001
--   LITRO-MACHOPER-002   → LITRO-MACHOPER-001 (numbering)
--
-- Fix batch-2 seeder (ids 14–44) with short prefixes:
--   LITRO-ADM-9001       → LITRO-ADMIN-002
--   LITRO-MM-9001        → LITRO-MAINTMGR-002
--   etc.

-- Fix original seed inconsistencies
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-002' WHERE employee_id = 'LITRO-TECH-002';
UPDATE users SET employee_id = 'LITRO-TRANSMGR-001' WHERE employee_id = 'LITRO-TRANSPORT-001';
UPDATE users SET employee_id = 'LITRO-MACHOPER-001' WHERE employee_id = 'LITRO-MACHOPER-002';
UPDATE users SET employee_id = 'LITRO-AUCTION-001' WHERE employee_id = 'LITRO-AUCTION-001';  -- already correct

-- Fix batch-2 seeder: single-per-role users (ids 14-22)
UPDATE users SET employee_id = 'LITRO-ADMIN-002' WHERE employee_id = 'LITRO-ADM-9001';
UPDATE users SET employee_id = 'LITRO-MAINTMGR-002' WHERE employee_id = 'LITRO-MM-9001';
UPDATE users SET employee_id = 'LITRO-INVMGR-002' WHERE employee_id = 'LITRO-IM-9001';
UPDATE users SET employee_id = 'LITRO-TRANSMGR-002' WHERE employee_id = 'LITRO-TM-9001';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-003' WHERE employee_id = 'LITRO-TO-9001';
UPDATE users SET employee_id = 'LITRO-SUPERVISOR-002' WHERE employee_id = 'LITRO-SUP-9001';
UPDATE users SET employee_id = 'LITRO-MACHOPER-002' WHERE employee_id = 'LITRO-MO-9001';
UPDATE users SET employee_id = 'LITRO-DRIVER-003' WHERE employee_id = 'LITRO-DRV-9001';
UPDATE users SET employee_id = 'LITRO-AUCTION-002' WHERE employee_id = 'LITRO-AUC-9001';

-- Fix batch-2 seeder: bulk Technical Officers (ids 23-32)
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-004' WHERE employee_id = 'LITRO-TO-9010';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-005' WHERE employee_id = 'LITRO-TO-9011';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-006' WHERE employee_id = 'LITRO-TO-9012';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-007' WHERE employee_id = 'LITRO-TO-9013';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-008' WHERE employee_id = 'LITRO-TO-9014';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-009' WHERE employee_id = 'LITRO-TO-9015';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-010' WHERE employee_id = 'LITRO-TO-9016';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-011' WHERE employee_id = 'LITRO-TO-9017';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-012' WHERE employee_id = 'LITRO-TO-9018';
UPDATE users SET employee_id = 'LITRO-TECHOFFICER-013' WHERE employee_id = 'LITRO-TO-9019';

-- Fix batch-2 seeder: bulk Drivers (ids 33-44)
UPDATE users SET employee_id = 'LITRO-DRIVER-004' WHERE employee_id = 'LITRO-DRV-9010';
UPDATE users SET employee_id = 'LITRO-DRIVER-005' WHERE employee_id = 'LITRO-DRV-9011';
UPDATE users SET employee_id = 'LITRO-DRIVER-006' WHERE employee_id = 'LITRO-DRV-9012';
UPDATE users SET employee_id = 'LITRO-DRIVER-007' WHERE employee_id = 'LITRO-DRV-9013';
UPDATE users SET employee_id = 'LITRO-DRIVER-008' WHERE employee_id = 'LITRO-DRV-9014';
UPDATE users SET employee_id = 'LITRO-DRIVER-009' WHERE employee_id = 'LITRO-DRV-9015';
UPDATE users SET employee_id = 'LITRO-DRIVER-010' WHERE employee_id = 'LITRO-DRV-9016';
UPDATE users SET employee_id = 'LITRO-DRIVER-011' WHERE employee_id = 'LITRO-DRV-9017';
UPDATE users SET employee_id = 'LITRO-DRIVER-012' WHERE employee_id = 'LITRO-DRV-9018';
UPDATE users SET employee_id = 'LITRO-DRIVER-013' WHERE employee_id = 'LITRO-DRV-9019';
UPDATE users SET employee_id = 'LITRO-DRIVER-014' WHERE employee_id = 'LITRO-DRV-9020';
UPDATE users SET employee_id = 'LITRO-DRIVER-015' WHERE employee_id = 'LITRO-DRV-9021';

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- Verification queries
SELECT '=== VERIFICATION ===' AS status;
SELECT 'machines' AS entity, machine_id AS id_value FROM machines ORDER BY id;
SELECT 'vehicles' AS entity, vehicle_id AS id_value FROM vehicles ORDER BY id;
SELECT 'fault_tickets' AS entity, ticket_id AS id_value, breakdown_type FROM fault_tickets ORDER BY id;
SELECT 'users' AS entity, employee_id AS id_value, role FROM users ORDER BY id;
