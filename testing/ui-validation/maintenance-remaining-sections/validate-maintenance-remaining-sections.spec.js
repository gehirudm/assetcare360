const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const OUT_DIR = __dirname;
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';

function dateOffset(days) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function buildMaintenanceFixtures() {
    return {
        user: {
            id: 501,
            employee_id: 'LITRO-MAINT-001',
            full_name: 'Maintenance Manager One',
            role: 'Maintenance Manager',
        },
        machineBreakdowns: [
            {
                id: 2001,
                breakdown_id: 'MB-2001',
                machine_id: 701,
                machine_name: 'Excavator 701',
                operator_name: 'Operator Silva',
                description: 'Hydraulic pressure drop during operation',
                breakdown_type: 'Hydraulic',
                severity: 'High',
                created_at: '2026-04-12T08:10:00Z',
                status: 'Pending',
                ticket_status: 'Pending',
                assignments: [],
            },
        ],
        routeBreakdowns: [
            {
                id: 3001,
                route_breakdown_id: 'RB-3001',
                vehicle_id: 901,
                number_plate: 'ABC-901',
                driver_name: 'Driver Perera',
                description: 'Engine vibration under load',
                breakdown_type: 'Engine',
                severity: 'Medium',
                breakdown_datetime: '2026-04-13T09:00:00Z',
                status: 'Assigned',
                ticket_status: 'Assigned',
                assigned_technicians: [
                    { technician_name: 'Tech One' },
                ],
            },
        ],
        vehicles: [
            {
                id: 901,
                vehicle_id: 'VH901',
                vehicle_name: 'Crew Transport Bus',
                number_plate: 'ABC-901',
                model_number: 'ISUZU-NQR',
                warranty_expiry: dateOffset(75),
                next_service_date: dateOffset(5),
                last_service_date: dateOffset(-20),
                service_interval_type: 'Preventive Maintenance',
                service_interval_days: 30,
                service_interval_km: 5000,
                current_mileage: 45200,
                next_service_mileage: 45600,
                warranty_provider: 'Allied Insurance',
                warranty_status: 'Active',
                components: ['Engine', 'Brake System', 'Hydraulic Line', 'Cooling Unit'],
                notes: 'Assigned to delivery fleet',
            },
            {
                id: 902,
                vehicle_id: 'VH902',
                vehicle_name: 'Light Duty Van',
                number_plate: 'BCD-902',
                model_number: 'TOYOTA-HIACE',
                warranty_expiry: dateOffset(-10),
                next_service_date: dateOffset(40),
                last_service_date: dateOffset(-10),
                service_interval_type: 'Routine Check',
                service_interval_days: 45,
                service_interval_km: 7000,
                current_mileage: 28900,
                next_service_mileage: 34000,
                warranty_provider: 'General Warranty Ltd',
                warranty_status: 'Expired',
                components: ['Transmission', 'Wheel Assembly'],
                notes: 'No active alerts',
            },
        ],
        machines: [
            {
                id: 701,
                machine_id: 'MC701',
                machine_name: 'Excavator 701',
                location: 'Yard A',
                model_number: 'CAT-320D',
                warranty_expiry: dateOffset(10),
                next_service_date: dateOffset(18),
                last_service_date: dateOffset(-12),
                service_interval_days: 30,
                service_interval_hours: 120,
                current_operating_hours: 945,
                next_service_hours: 1000,
                warranty_provider: 'Heavy Machinery Cover',
                warranty_status: 'Active',
                components: ['Hydraulic Pump', 'Main Arm', 'Control Valve'],
                notes: 'Monitor hydraulic behavior',
            },
            {
                id: 702,
                machine_id: 'MC702',
                machine_name: 'Dozer 702',
                location: 'Yard B',
                model_number: 'CAT-D6R',
                warranty_expiry: dateOffset(-7),
                next_service_date: dateOffset(-2),
                last_service_date: dateOffset(-60),
                service_interval_days: 45,
                service_interval_hours: 150,
                current_operating_hours: 1255,
                next_service_hours: 1240,
                warranty_provider: 'Heavy Machinery Cover',
                warranty_status: 'Voided',
                warranty_void_reason: 'Over-limit operating pattern',
                components: ['Blade Unit', 'Track Assembly'],
                notes: 'Warranty voided by QA team',
            },
        ],
        technicians: [
            {
                id: 7011,
                full_name: 'Tech One',
                role: 'Technical Officer',
                is_active: 1,
                active_ticket_count: 2,
                technical_expertise: 'Hydraulics',
            },
            {
                id: 7012,
                full_name: 'Tech Two',
                role: 'Technical Officer',
                is_active: 1,
                active_ticket_count: 1,
                technical_expertise: 'Engine Diagnostics',
            },
        ],
        serviceTickets: [
            {
                id: 8801,
                service_ticket_id: 'SVT-001',
                asset_type: 'vehicle',
                asset_id: 901,
                asset_code: 'VH901',
                asset_name: 'Crew Transport Bus',
                title: 'Engine and braking service',
                description: 'Perform full preventive engine and brake inspection.',
                service_type: 'Preventive Maintenance',
                priority: 'High',
                status: 'Pending Assignment',
                scheduled_date: dateOffset(4),
                reported_by: 501,
                reported_by_name: 'Maintenance Manager One',
                assigned_to: null,
                assigned_to_name: null,
                maintenance_notes: 'Coordinate with transport operations team',
                created_at: '2026-04-14T09:00:00Z',
            },
            {
                id: 8802,
                service_ticket_id: 'SVT-002',
                asset_type: 'machine',
                asset_id: 701,
                asset_code: 'MC701',
                asset_name: 'Excavator 701',
                title: 'Hydraulic pressure recalibration',
                description: 'Stabilize hydraulic pressure and replace worn line.',
                service_type: 'Repair',
                priority: 'Critical',
                status: 'Assigned',
                scheduled_date: dateOffset(1),
                reported_by: 501,
                reported_by_name: 'Maintenance Manager One',
                assigned_to: 7011,
                assigned_to_name: 'Tech One',
                maintenance_notes: 'Follow safety checklist',
                created_at: '2026-04-13T10:00:00Z',
            },
            {
                id: 8804,
                service_ticket_id: 'SVT-004',
                asset_type: 'vehicle',
                asset_id: 901,
                asset_code: 'VH901',
                asset_name: 'Crew Transport Bus',
                asset_reference: 'ABC-901',
                asset_model: 'ISUZU-NQR',
                asset_warranty_status: 'Active',
                asset_warranty_provider: 'Allied Insurance',
                asset_warranty_expiry: dateOffset(75),
                asset_components: ['Engine', 'Brake System', 'Hydraulic Line', 'Cooling Unit'],
                title: 'Monthly preventive service completion',
                description: 'Completed scheduled preventive service and quality checks.',
                service_type: 'Preventive Maintenance',
                priority: 'Medium',
                status: 'Completed',
                scheduled_date: dateOffset(-1),
                reported_by: 501,
                reported_by_name: 'Maintenance Manager One',
                assigned_to: 7012,
                assigned_to_name: 'Tech Two',
                maintenance_notes: 'Capture completed service report for review.',
                completion_notes: 'Replaced brake fluid and completed diagnostics.',
                estimated_cost: 15000,
                actual_cost: 14250,
                next_service_date: dateOffset(35),
                service_meter_reading: 45510,
                warranty_action: 'covered',
                completed_at: '2026-04-15T16:30:00Z',
                created_at: '2026-04-10T08:15:00Z',
                updated_at: '2026-04-15T16:30:00Z',
            },
        ],
    };
}

function attachMonitors(page, state) {
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'warning' || type === 'error') {
            state.console.push({ type, text: msg.text() });
        }
    });

    page.on('response', (response) => {
        const status = response.status();
        if (status >= 400) {
            state.failedRequests.push({
                url: response.url(),
                method: response.request().method(),
                status,
            });
        }
    });
}

async function ensureMaintenanceSession(page) {
    const fixtures = buildMaintenanceFixtures();

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        const json = (body, status = 200) => route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json({ status: 'success', data: fixtures.user });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json({ status: 'success', tickets: [] });
        }

        if (pathname.endsWith('/api/machine-breakdowns') && method === 'GET') {
            return json({
                status: 'success',
                data: { reports: fixtures.machineBreakdowns },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json({
                status: 'success',
                data: { breakdowns: fixtures.routeBreakdowns },
            });
        }

        if (pathname.endsWith('/api/budget-reports/pending') && method === 'GET') {
            return json({
                status: 'success',
                reports: [],
                data: { reports: [] },
            });
        }

        if (pathname.match(/\/api\/budget-reports\/[^/]+\/review$/) && (method === 'POST' || method === 'PUT')) {
            return json({ status: 'success', data: {} });
        }

        if (pathname.endsWith('/api/service-tickets') && method === 'GET') {
            const requestedStatus = (url.searchParams.get('status') || '').trim().toLowerCase();
            const tickets = requestedStatus
                ? fixtures.serviceTickets.filter((ticket) => String(ticket.status || '').toLowerCase() === requestedStatus)
                : fixtures.serviceTickets;

            return json({
                status: 'success',
                data: {
                    tickets,
                    counts: {
                        total: tickets.length,
                        pending_assignment: tickets.filter((ticket) => ticket.status === 'Pending Assignment').length,
                        assigned: tickets.filter((ticket) => ticket.status === 'Assigned').length,
                        in_progress: tickets.filter((ticket) => ticket.status === 'In Progress').length,
                        completed: tickets.filter((ticket) => ticket.status === 'Completed').length,
                        cancelled: tickets.filter((ticket) => ticket.status === 'Cancelled').length,
                    },
                },
            });
        }

        if (
            pathname.match(/\/api\/service-tickets\/[^/]+$/)
            && method === 'GET'
            && !pathname.endsWith('/technicians')
            && !pathname.endsWith('/stats')
        ) {
            const id = pathname.split('/').pop();
            const ticket = fixtures.serviceTickets.find((row) => String(row.id) === String(id) || row.service_ticket_id === id);
            if (!ticket) {
                return json({ status: 'error', message: 'Service ticket not found' }, 404);
            }

            return json({ status: 'success', data: ticket });
        }

        if (pathname.match(/\/api\/service-tickets\/[^/]+$/) && method === 'DELETE') {
            const id = pathname.split('/').pop();
            const beforeCount = fixtures.serviceTickets.length;
            fixtures.serviceTickets = fixtures.serviceTickets.filter((row) => String(row.id) !== String(id) && String(row.service_ticket_id) !== String(id));
            if (fixtures.serviceTickets.length === beforeCount) {
                return json({ status: 'error', message: 'Service ticket not found' }, 404);
            }

            return json({ status: 'success', message: 'Service ticket deleted successfully' });
        }

        if (pathname.endsWith('/api/service-tickets') && method === 'POST') {
            const payload = JSON.parse(request.postData() || '{}');
            const [assetType, assetId] = [payload.asset_type, Number(payload.asset_id)];
            const assetSource = assetType === 'vehicle' ? fixtures.vehicles : fixtures.machines;
            const asset = assetSource.find((row) => Number(row.id) === assetId) || {};

            const created = {
                id: 8803,
                service_ticket_id: 'SVT-003',
                asset_type: assetType,
                asset_id: assetId,
                asset_code: assetType === 'vehicle' ? asset.vehicle_id : asset.machine_id,
                asset_name: assetType === 'vehicle' ? asset.vehicle_name : asset.machine_name,
                title: payload.title || `${assetType} service task`,
                description: payload.description,
                service_type: payload.service_type,
                priority: payload.priority || 'Medium',
                status: payload.assigned_to ? 'Assigned' : 'Pending Assignment',
                assigned_to: payload.assigned_to ? Number(payload.assigned_to) : null,
                assigned_to_name: payload.assigned_to ? fixtures.technicians.find((user) => Number(user.id) === Number(payload.assigned_to))?.full_name || null : null,
                scheduled_date: payload.scheduled_date,
                maintenance_notes: payload.maintenance_notes || null,
                created_at: new Date().toISOString(),
            };

            fixtures.serviceTickets.unshift(created);
            return json({ status: 'success', message: 'Service ticket created successfully', data: created }, 201);
        }

        if (pathname.match(/\/api\/service-tickets\/\d+$/) && method === 'PUT') {
            const id = Number(pathname.split('/').pop());
            const payload = JSON.parse(request.postData() || '{}');
            const ticket = fixtures.serviceTickets.find((row) => Number(row.id) === id);
            if (ticket) {
                Object.assign(ticket, payload);
                if (Object.prototype.hasOwnProperty.call(payload, 'assigned_to')) {
                    ticket.assigned_to_name = payload.assigned_to
                        ? fixtures.technicians.find((user) => Number(user.id) === Number(payload.assigned_to))?.full_name || null
                        : null;
                    if (payload.assigned_to && ticket.status === 'Pending Assignment') {
                        ticket.status = 'Assigned';
                    }
                    if (!payload.assigned_to && ticket.status === 'Assigned') {
                        ticket.status = 'Pending Assignment';
                    }
                }
            }

            return json({ status: 'success', data: ticket || {} });
        }

        if (pathname.endsWith('/api/service-tickets/technicians') && method === 'GET') {
            return json({ status: 'success', data: { users: fixtures.technicians } });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json({
                status: 'success',
                data: { vehicles: fixtures.vehicles },
            });
        }

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json({
                status: 'success',
                data: { machines: fixtures.machines },
            });
        }

        if (pathname.match(/\/api\/service-tickets\/warranty\/(vehicle|machine)\/\d+$/) && method === 'POST') {
            const parts = pathname.split('/');
            const assetType = parts[parts.length - 2];
            const assetId = Number(parts[parts.length - 1]);
            const payload = JSON.parse(request.postData() || '{}');
            const source = assetType === 'vehicle' ? fixtures.vehicles : fixtures.machines;
            const row = source.find((item) => Number(item.id) === assetId);
            if (row) {
                row.warranty_status = payload.status;
                row.warranty_void_reason = payload.status === 'Voided' ? payload.reason : null;
            }
            return json({ status: 'success', data: row || {} });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json({ status: 'success', data: { notifications: [], unread_count: 0 } });
        }

        if (pathname.match(/\/api\/notifications\/read$/) && method === 'POST') {
            return json({ status: 'success', data: {} });
        }

        return json({ status: 'success', data: {} });
    });

    await page.goto(`${BASE_URL}/dashboard/maintenance/index.html`, { waitUntil: 'domcontentloaded' });
}

async function navigateSection(page, section) {
    const moved = await page.evaluate((targetSection) => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo(targetSection);
        return true;
    }, section);

    if (!moved) {
        const labels = {
            dashboard: 'Dashboard',
            'fault-tickets': 'Fault Tickets',
            'service-tickets': 'Service Management',
            'service-reports': 'Service Report Management',
            'warranty-management': 'Warranty Management',
            notifications: 'Notifications',
        };
        await page.getByRole('navigation').getByText(labels[section] || section).click();
    }
}

async function runFlow(page, viewportName) {
    const state = {
        console: [],
        failedRequests: [],
    };

    attachMonitors(page, state);
    await ensureMaintenanceSession(page);

    await expect(page.locator('ac-layout')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.locator('#dashboard maintenance-dashboard-overview [data-action="navigate-section"]')).toHaveCount(4);
    await expect(page.locator('#dashboard maintenance-dashboard-overview')).not.toContainText('Recent Activities');
    await expect(page.locator('#dashboard maintenance-dashboard-overview')).not.toContainText('Critical Notifications');

    await navigateSection(page, 'fault-tickets');
    await expect(page.getByRole('heading', { name: 'Fault Tickets' })).toBeVisible();

    const maintenanceSortSelect = page.locator('#fault-tickets #maintenanceFaultSort');
    await expect(maintenanceSortSelect).toBeVisible();
    await expect(page.locator('#breakdownReportsList .inventory-item').first()).toContainText('RB-3001');

    await maintenanceSortSelect.selectOption('priority');
    await expect(page.locator('#breakdownReportsList .inventory-item').first()).toContainText('MB-2001');

    await navigateSection(page, 'service-tickets');
    await expect(page.getByRole('heading', { name: 'Service Management' })).toBeVisible();
    await expect(page.locator('#maintenanceAssetStatusList .inventory-item').first()).toBeVisible();

    const maintenanceAssetSort = page.locator('#service-tickets #maintenanceAssetSort');
    await expect(maintenanceAssetSort).toBeVisible();
    await maintenanceAssetSort.selectOption('most-overdue');
    await expect(page.locator('#maintenanceAssetStatusList .inventory-item').first()).toContainText('MC702');
    await maintenanceAssetSort.selectOption('service-priority');

    await page.locator('#service-tickets [data-action="set-asset-filter"][data-filter="overdue"]').click();
    const overdueAssetRow = page.locator('#maintenanceAssetStatusList .inventory-item', { hasText: 'MC702' }).first();
    await expect(overdueAssetRow).toBeVisible();
    await expect(overdueAssetRow).toContainText('Create Ticket');

    await overdueAssetRow.getByRole('button', { name: 'Create Ticket' }).click();
    await expect(page.locator('#createServiceTicketModal')).toBeVisible();
    await expect(page.locator('#createServiceTicketAsset')).toBeDisabled();
    await expect(page.locator('#createServiceTicketAsset')).toHaveValue('machine:702');
    await page.locator('#createServiceTicketModal .modal-header [data-action="close-modal"]').click();
    await expect(page.locator('#createServiceTicketModal')).toBeHidden();

    await page.locator('#service-tickets [data-action="set-asset-filter"][data-filter="all"]').click();
    const vehicleWithTicketRow = page.locator('#maintenanceAssetStatusList .inventory-item', { hasText: 'VH901' }).first();
    await expect(vehicleWithTicketRow).toBeVisible();
    await expect(vehicleWithTicketRow).toContainText('Service In Progress');
    await expect(vehicleWithTicketRow.getByRole('button', { name: 'View Ticket' })).toBeVisible();
    await expect(vehicleWithTicketRow.getByRole('button', { name: 'Create Ticket' })).toHaveCount(0);

    await vehicleWithTicketRow.getByRole('button', { name: 'View Ticket' }).click();
    await expect(page.locator('#service-ticket-details')).toHaveClass(/active/);
    await expect(page.locator('#service-ticket-details .service-ticket-detail-title')).toContainText('Service Ticket Detail');
    await expect(page.locator('#service-ticket-details')).toContainText('SVT-001');
    await expect(page.locator('#service-ticket-details')).toContainText('Waiting for assignment');
    await expect(page.locator('#service-ticket-details .service-ticket-detail-flow-step.is-active .service-ticket-detail-flow-step-title').first()).toContainText('Reported');
    await expect(page.locator('#service-ticket-details [data-action="delete-ticket"]')).toBeVisible();
    await expect(page.locator('#service-ticket-details .service-ticket-detail-card-title', { hasText: 'Service Report Details' })).toHaveCount(0);

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#service-ticket-details [data-action="delete-ticket"]').click();
    await expect(page.locator('#service-tickets')).toHaveClass(/active/);
    await expect(vehicleWithTicketRow).toContainText('Create Ticket');
    await expect(vehicleWithTicketRow.getByRole('button', { name: 'View Ticket' })).toHaveCount(0);

    await page.locator('#maintenanceOpenCreateTicketModal').click();
    await expect(page.locator('#createServiceTicketModal')).toBeVisible();
    await expect(page.locator('#createServiceTicketAsset')).toBeEnabled();
    await expect(page.locator('#createServiceExpectedCompletionDate')).toHaveAttribute('min', /\d{4}-\d{2}-\d{2}/);
    await page.locator('#createServiceTicketAsset').selectOption('machine:702');
    await page.locator('#createServiceType').selectOption('Inspection');
    await page.locator('#createServiceDescription').fill('Validation-created service ticket.');
    await page.locator('#createServicePriority').selectOption('Medium');
    await page.locator('#createServiceTicketTechnicians input[name="assigned_to"][value="7011"]').check();

    await page.locator('#createServiceExpectedCompletionDate').fill(dateOffset(-1));
    await page.locator('#createServiceTicketForm button[type="submit"]').click();
    await expect(page.locator('#createServiceTicketModal')).toBeVisible();

    await page.locator('#createServiceExpectedCompletionDate').fill(dateOffset(3));
    await page.locator('#createServiceTicketForm button[type="submit"]').click();
    await expect(page.locator('#createServiceTicketModal')).toBeHidden();

    await page.locator('#service-tickets [data-action="set-asset-filter"][data-filter="all"]').click();
    const newlyTicketedAssetRow = page.locator('#maintenanceAssetStatusList .inventory-item', { hasText: 'MC702' }).first();
    await expect(newlyTicketedAssetRow).toBeVisible();
    await expect(newlyTicketedAssetRow).toContainText('Service In Progress');
    await expect(newlyTicketedAssetRow.getByRole('button', { name: 'View Ticket' })).toBeVisible();

    await newlyTicketedAssetRow.getByRole('button', { name: 'View Ticket' }).click();
    await expect(page.locator('#service-ticket-details')).toHaveClass(/active/);
    await expect(page.locator('#service-ticket-details')).toContainText('SVT-003');
    await expect(page.locator('#service-ticket-details')).toContainText('Asset Details');
    await expect(page.locator('#service-ticket-details [data-action="delete-ticket"]')).toHaveCount(0);
    await expect(page.locator('#service-ticket-details .service-ticket-detail-card-title', { hasText: 'Service Report Details' })).toHaveCount(0);
    await page.locator('#service-ticket-details [data-action="back"]').first().click();
    await expect(page.locator('#service-tickets')).toHaveClass(/active/);

    await navigateSection(page, 'service-reports');
    await expect(page.getByRole('heading', { name: 'Service Report Management' })).toBeVisible();
    await expect(page.locator('#maintenanceServiceReportList .inventory-item').first()).toContainText('SVT-004');
    await page.locator('#maintenanceServiceReportList [data-action="view-report"]').first().click();
    await expect(page.locator('#service-ticket-details')).toHaveClass(/active/);
    await expect(page.locator('#service-ticket-details .service-ticket-detail-title')).toContainText('Service Ticket Detail');
    await expect(page.locator('#service-ticket-details')).toContainText('SVT-004');
    await expect(page.locator('#service-ticket-details [data-action="delete-ticket"]')).toHaveCount(0);
    await expect(page.locator('#service-ticket-details .service-ticket-detail-card-title', { hasText: 'Service Report Details' })).toHaveCount(1);
    await expect(page.locator('#service-ticket-details')).toContainText('Individual Asset Components and Comments');
    await page.locator('#service-ticket-details [data-action="back"]').first().click();
    await expect(page.locator('#service-reports')).toHaveClass(/active/);

    await navigateSection(page, 'warranty-management');
    await expect(page.getByRole('heading', { name: 'Warranty Management' })).toBeVisible();
    await expect(page.locator('#warrantyAssetList .inventory-item').first()).toBeVisible();

    await page.getByRole('button', { name: 'Voided' }).click();
    await expect(page.locator('#warrantyAssetList .inventory-item').first()).toContainText('MC702');

    await page.locator('#warrantyAssetList [data-action="open-warranty-modal"]').first().click();
    await expect(page.locator('#warrantyDetailsModal')).toBeVisible();
    await page.locator('#warrantyStatusForm select[name="status"]').selectOption('Voided');
    await page.locator('#warrantyStatusForm textarea[name="reason"]').fill('Validation modal update reason');
    await page.locator('#warrantyStatusForm button[type="submit"]').click();

    await expect(page.locator('#warrantyDetailsModal')).toBeHidden();

    await navigateSection(page, 'notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await page.getByRole('button', { name: 'Cost Approvals' }).click();
    await page.getByRole('button', { name: 'Service' }).click();
    await page.getByRole('button', { name: 'All Notifications' }).click();

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const visibleBreakdowns = Array.from(document.querySelectorAll('#fault-tickets .inventory-item'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleAssetStatuses = Array.from(document.querySelectorAll('#maintenanceAssetStatusList .inventory-item'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleServiceReports = Array.from(document.querySelectorAll('#service-reports .inventory-item'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleWarrantyRows = Array.from(document.querySelectorAll('#warranty-management .inventory-item'))
            .filter((item) => item.style.display !== 'none').length;
        const hasServiceTicketList = Boolean(document.querySelector('#maintenanceServiceTicketList'));

        return {
            activeSection,
            visibleBreakdowns,
            visibleAssetStatuses,
            visibleServiceReports,
            visibleWarrantyRows,
            hasServiceTicketList,
            modalStates: {
                ticketDetailsOpen: document.getElementById('ticketDetailsModal')?.classList.contains('active') || false,
                reportDetailsOpen: document.getElementById('reportDetailsModal')?.classList.contains('active') || false,
                warrantyDetailsOpen: document.getElementById('warrantyDetailsModal')?.classList.contains('active') || false,
            },
        };
    });

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}.png`),
        fullPage: true,
    });

    const artifact = {
        stage: STAGE,
        viewport: viewportName,
        url: page.url(),
        title: await page.title(),
        accessibility: {
            ariaSnapshot,
            snapshotLength: ariaSnapshot.length,
        },
        console: state.console,
        failedRequests: state.failedRequests,
        interactionSummary,
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('maintenance remaining sections desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('maintenance remaining sections mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
