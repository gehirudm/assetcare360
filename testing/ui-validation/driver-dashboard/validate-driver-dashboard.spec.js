const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    return {
        user: {
            id: 701,
            full_name: 'Driver One',
            role: 'Driver',
            employee_id: 'LITRO-DRIVER-001',
        },
        trips: [
            {
                id: 1,
                trip_id: 'TRP-001',
                origin: 'Colombo',
                destination: 'Kandy',
                vehicle_registration: 'LKA-1234',
                starting_odometer: 45100,
                final_odometer: 45220,
                cargo_description: 'Spare parts crates',
                status: 'Completed',
                created_at: '2026-04-10T08:00:00Z',
            },
            {
                id: 2,
                trip_id: 'TRP-002',
                origin: 'Kandy',
                destination: 'Galle',
                vehicle_registration: 'LKA-1234',
                starting_odometer: 45220,
                final_odometer: 45310,
                cargo_description: 'Machinery components',
                status: 'Completed',
                created_at: '2026-04-11T09:10:00Z',
            },
        ],
        checks: [
            {
                id: 1,
                check_id: 'CHK-001',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                odometer_reading: 45220,
                week_start_date: '2026-04-07',
                week_end_date: '2026-04-13',
                status: 'approved',
                notes: 'All checks passed',
            },
            {
                id: 2,
                check_id: 'CHK-002',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                odometer_reading: 45260,
                week_start_date: '2026-04-14',
                week_end_date: '2026-04-20',
                status: 'pending',
                notes: 'Awaiting supervisor review',
            },
        ],
        reports: [
            {
                id: 11,
                breakdown_id: 'BR-001',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                severity: 'high',
                breakdown_type: 'engine',
                description: 'Engine overheating on Matara Road',
                breakdown_date: '2026-04-12',
                status: 'Assigned',
                ticket_status: 'Assigned',
                fault_ticket_id: 901,
                fault_ticket_number: 'VBD-901',
            },
            {
                id: 12,
                breakdown_id: 'BR-002',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                severity: 'low',
                breakdown_type: 'electrical',
                description: 'Dashboard indicator intermittently failing',
                breakdown_date: '2026-04-13',
                status: 'Pending',
                ticket_status: 'Open',
                fault_ticket_id: 902,
                fault_ticket_number: 'VBD-902',
            },
        ],
        routeBreakdowns: [
            {
                id: 21,
                route_breakdown_id: 'RBR-001',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                severity: 'medium',
                breakdown_type: 'tires',
                breakdown_location: 'Galle Highway Exit 12',
                breakdown_datetime: '2026-04-11T14:20:00Z',
                description: 'Front tire puncture',
                status: 'Resolved',
                ticket_status: 'Resolved',
                fault_ticket_id: 903,
                fault_ticket_number: 'RBD-903',
                garage_workflow_status: 'garage_approved',
                approved_garage_name: 'Southern Fleet Garage',
                garage_workflow: {
                    status: 'garage_approved',
                    approved_at: '2026-04-11T15:00:00Z',
                    approved_by: 'Supervisor One',
                    approval_notes: 'Nearest garage selected for quick response.',
                    approved_garage: {
                        id: 41,
                        name: 'Southern Fleet Garage',
                        address: '12 Galle Road, Exit 12',
                    },
                },
            },
            {
                id: 23,
                route_breakdown_id: 'RBR-003',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                severity: 'high',
                breakdown_type: 'engine',
                breakdown_location: 'Southern Expressway KM 40',
                breakdown_datetime: '2026-04-09T12:15:00Z',
                description: 'Engine belt alignment in progress at approved garage',
                status: 'In Progress',
                ticket_status: 'In Progress',
                fault_ticket_id: 905,
                fault_ticket_number: 'RBD-905',
                garage_workflow_status: 'repair_in_progress',
                approved_garage_name: 'Highway Service Hub',
                garage_workflow: {
                    status: 'repair_in_progress',
                    approved_at: '2026-04-09T13:00:00Z',
                    approved_by: 'Supervisor One',
                    approval_notes: 'Proceed with repairs and provide updates.',
                    approved_garage: {
                        id: 42,
                        name: 'Highway Service Hub',
                        address: '40 KM Post, Southern Expressway',
                    },
                },
            },
            {
                id: 22,
                route_breakdown_id: 'RBR-002',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                severity: 'critical',
                breakdown_type: 'brakes',
                breakdown_location: 'Southern Expressway KM 22',
                breakdown_datetime: '2026-04-10T10:00:00Z',
                description: 'Brake pressure dropped suddenly',
                status: 'In Progress',
                ticket_status: 'Insurance Claimed',
                fault_ticket_id: 904,
                fault_ticket_number: 'RBD-904',
            },
        ],
        garages: [
            {
                id: 101,
                name: 'Colombo Central Garage',
                address: '45 Main Street, Colombo 01',
                city: 'Colombo',
                phone: '+94 11 222 3344',
            },
            {
                id: 102,
                name: 'Southern Fleet Garage',
                address: '12 Galle Road, Exit 12',
                city: 'Galle',
                phone: '+94 91 555 6677',
            },
        ],
        ticketsById: {
            901: {
                id: 901,
                ticket_id: 'VBD-901',
                status: 'Assigned',
                priority: 'High',
                created_at: '2026-04-12T08:30:00Z',
                assignments: [
                    {
                        technician_name: 'Technician One',
                        assigned_at: '2026-04-12T09:00:00Z',
                    },
                ],
                work_updates: [],
            },
            902: {
                id: 902,
                ticket_id: 'VBD-902',
                status: 'Open',
                priority: 'Low',
                created_at: '2026-04-13T08:00:00Z',
                assignments: [],
                work_updates: [],
            },
            903: {
                id: 903,
                ticket_id: 'RBD-903',
                breakdown_type: 'route_breakdown',
                breakdown_report_id: 'RBR-001',
                status: 'Resolved',
                priority: 'Medium',
                description: 'Front tire puncture',
                location: 'Galle Highway Exit 12',
                number_plate: 'LKA-1234',
                reporter_full_name: 'Driver One',
                reported_by_name: 'Driver One',
                created_at: '2026-04-11T14:30:00Z',
                route_breakdown_numeric_id: 21,
                route_garage_workflow_status: 'garage_approved',
                route_approved_garage_id: 41,
                route_approved_garage_name: 'Southern Fleet Garage',
                breakdown_context: {
                    route_breakdown_numeric_id: 21,
                    route_breakdown_id: 'RBR-001',
                    number_plate: 'LKA-1234',
                    location: 'Galle Highway Exit 12',
                    description: 'Front tire puncture',
                    reporter_name: 'Driver One',
                },
                assignments: [
                    {
                        technician_name: 'Technician Two',
                        assigned_at: '2026-04-11T15:30:00Z',
                    },
                ],
                work_updates: [
                    {
                        technician_name: 'Technician Two',
                        machine_description: 'Tire replaced and pressure tested.',
                        parts_used: 'Front tire set',
                        time_spent: 1.5,
                        created_at: '2026-04-11T17:00:00Z',
                    },
                ],
            },
            904: {
                id: 904,
                ticket_id: 'RBD-904',
                status: 'Insurance Claimed',
                priority: 'Critical',
                created_at: '2026-04-10T10:30:00Z',
                assignments: [],
                work_updates: [],
            },
            905: {
                id: 905,
                ticket_id: 'RBD-905',
                breakdown_type: 'route_breakdown',
                breakdown_report_id: 'RBR-003',
                status: 'In Progress',
                priority: 'High',
                description: 'Engine belt alignment in progress at approved garage',
                location: 'Southern Expressway KM 40',
                number_plate: 'LKA-1234',
                reporter_full_name: 'Driver One',
                reported_by_name: 'Driver One',
                created_at: '2026-04-09T12:30:00Z',
                route_breakdown_numeric_id: 23,
                route_garage_workflow_status: 'repair_in_progress',
                route_approved_garage_id: 42,
                route_approved_garage_name: 'Highway Service Hub',
                breakdown_context: {
                    route_breakdown_numeric_id: 23,
                    route_breakdown_id: 'RBR-003',
                    number_plate: 'LKA-1234',
                    location: 'Southern Expressway KM 40',
                    description: 'Engine belt alignment in progress at approved garage',
                    reporter_name: 'Driver One',
                },
                assignments: [
                    {
                        technician_name: 'Technician Three',
                        assigned_at: '2026-04-09T13:30:00Z',
                    },
                ],
                work_updates: [
                    {
                        technician_name: 'Technician Three',
                        machine_description: 'Initial diagnostics completed, belt adjustment ongoing.',
                        parts_used: 'Belt tensioner kit',
                        time_spent: 1.0,
                        created_at: '2026-04-09T15:00:00Z',
                    },
                ],
            },
        },
    };
}

async function mockApi(page, fixtures) {
    await page.route('**/js/dashboard-init.js', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `
                const DashboardInit = {
                    async init(_allowedRoles, options = {}) {
                        const user = ${JSON.stringify(fixtures.user)};
                        if (typeof options.onSuccess === 'function') {
                            await options.onSuccess(user);
                        }
                        return user;
                    },
                    updateUserInfo() {},
                    logout() {},
                };

                function createConfirmationDialog() {}
                function closeConfirmation() {}
                async function confirmAction() {}
                function logout() {}
            `,
        });
    });

    const handleApiRoute = async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;
        const normalizedPath = pathname.startsWith('/api/') ? pathname.slice(4) : pathname;

        const json = (body, status = 200) => route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });

        if (normalizedPath === '/auth/me' && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: fixtures.user,
            });
        }

        if (normalizedPath === '/trips' && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: { trips: fixtures.trips },
            });
        }

        if (normalizedPath === '/trips' && method === 'POST') {
            return json({
                status: 'success',
                success: true,
                data: {
                    trip: {
                        id: 3,
                        trip_id: 'TRP-003',
                        origin: 'Colombo',
                        destination: 'Matara',
                        vehicle_registration: 'LKA-1234',
                        starting_odometer: 45300,
                        status: 'Pending',
                        created_at: '2026-04-12T10:00:00Z',
                    },
                },
            });
        }

        if (normalizedPath.match(/\/trips\/[^/]+$/) && method === 'PUT') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (normalizedPath.match(/\/trips\/[^/]+\/(start|end|cancel)$/) && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (normalizedPath === '/vehicle-checks' && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: fixtures.checks,
            });
        }

        if (normalizedPath === '/vehicle-checks' && method === 'POST') {
            return json({
                status: 'success',
                success: true,
                data: {
                    check: {
                        check_id: 'CHK-003',
                    },
                },
            });
        }

        if (normalizedPath === '/breakdown-reports' && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: { reports: fixtures.reports },
            });
        }

        if (normalizedPath === '/route-breakdowns' && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: { breakdowns: fixtures.routeBreakdowns },
            });
        }

        if (normalizedPath === '/garages' && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: { garages: fixtures.garages },
            });
        }

        if (normalizedPath.match(/^\/route-breakdowns\/\d+$/) && method === 'GET') {
            const id = Number.parseInt(normalizedPath.split('/').pop(), 10);
            const breakdown = fixtures.routeBreakdowns.find((item) => Number(item.id) === id) || null;
            return json({
                status: breakdown ? 'success' : 'error',
                success: Boolean(breakdown),
                data: { breakdown },
            }, breakdown ? 200 : 404);
        }

        if (normalizedPath.match(/^\/breakdown-reports\/\d+$/) && method === 'GET') {
            const id = Number.parseInt(normalizedPath.split('/').pop(), 10);
            const report = fixtures.reports.find((item) => Number(item.id) === id) || null;
            return json({
                status: report ? 'success' : 'error',
                success: Boolean(report),
                data: { report },
            }, report ? 200 : 404);
        }

        if (normalizedPath.match(/^\/fault-tickets\/\d+$/) && method === 'GET') {
            const id = Number.parseInt(normalizedPath.split('/').pop(), 10);
            const ticket = fixtures.ticketsById[id] || null;
            return json({
                status: ticket ? 'success' : 'error',
                success: Boolean(ticket),
                data: ticket,
            }, ticket ? 200 : 404);
        }

        if (normalizedPath.match(/^\/budget-reports\/ticket\/\d+$/) && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: { reports: [] },
            });
        }

        if (normalizedPath.match(/^\/spare-part-requests\/ticket\/\d+$/) && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: [],
            });
        }

        if (normalizedPath === '/breakdown-reports' && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (normalizedPath === '/route-breakdowns' && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (normalizedPath.match(/^\/route-breakdowns\/\d+\/garage-complete$/) && method === 'POST') {
            const routeBreakdownId = Number.parseInt(normalizedPath.split('/')[2], 10);
            const routeBreakdown = fixtures.routeBreakdowns.find((item) => Number(item.id) === routeBreakdownId) || null;

            if (routeBreakdown) {
                routeBreakdown.status = 'Resolved';
                routeBreakdown.ticket_status = 'Resolved';
                routeBreakdown.garage_workflow_status = 'completed';
                routeBreakdown.completed_at = '2026-04-09T16:45:00Z';
                routeBreakdown.garage_workflow = {
                    ...(routeBreakdown.garage_workflow || {}),
                    status: 'completed',
                    completed_at: '2026-04-09T16:45:00Z',
                };

                const linkedTicketId = Number(routeBreakdown.fault_ticket_id || 0);
                const linkedTicket = linkedTicketId > 0 ? fixtures.ticketsById[linkedTicketId] : null;
                if (linkedTicket) {
                    linkedTicket.status = 'Resolved';
                    linkedTicket.route_garage_workflow_status = 'completed';
                }
            }

            return json({
                status: 'success',
                success: true,
                message: 'Breakdown marked as completed.',
                data: {
                    route_breakdown_id: routeBreakdownId,
                },
            });
        }

        if (normalizedPath.match(/\/(breakdown-reports|route-breakdowns)\/[^/]+$/) && (method === 'PUT' || method === 'DELETE')) {
            return json({ status: 'success', success: true, data: {} });
        }

        return json({ status: 'success', success: true, data: {} });
    };

    await page.route('**://localhost:8000/**', handleApiRoute);
    await page.route('**/api/**', handleApiRoute);
}

function attachMonitors(page, state) {
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'warning' || type === 'error') {
            state.console.push({ type, text: msg.text() });
        }
    });

    page.on('response', (response) => {
        if (response.status() >= 400) {
            state.failedRequests.push({
                url: response.url(),
                method: response.request().method(),
                status: response.status(),
            });
        }
    });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
    };

    await mockApi(page, fixtures);
    attachMonitors(page, state);

    await page.goto(`${BASE_URL}/dashboard/driver/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible();

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('breakdown');
        }
    });

    await expect(page.locator('#breakdown')).toHaveClass(/active/);

    await expect(page.locator('#breakdown [data-action="set-status-filter"][data-filter="open"]')).toBeVisible();
    await expect(page.locator('#breakdown [data-action="set-status-filter"][data-filter="closed"]')).toBeVisible();

    await page.locator('#breakdown [data-action="set-status-filter"][data-filter="open"]').click();
    await expect(page.locator('#driverBreakdownList .inventory-item')).toHaveCount(1);
    await expect(page.locator('#driverBreakdownList .inventory-item').first()).toContainText('BR-002');

    await page.locator('#breakdown [data-action="set-status-filter"][data-filter="resolved"]').click();
    await expect(page.locator('#driverBreakdownList .inventory-item')).toHaveCount(1);
    await expect(page.locator('#driverBreakdownList .inventory-item').first()).toContainText('RBR-001');

    await page.locator('#breakdown [data-action="set-status-filter"][data-filter="closed"]').click();
    await expect(page.locator('#driverBreakdownList')).toContainText('No breakdown reports found for the selected filters.');

    await page.locator('#breakdown [data-action="set-status-filter"][data-filter="all"]').click();

    const breakdownRouteCard = page.locator('#driverBreakdownList .inventory-item').filter({ hasText: 'RBR-001' }).first();
    await expect(breakdownRouteCard).toBeVisible();

    await breakdownRouteCard.locator('[data-action="toggle-actions-menu"]').click();
    await breakdownRouteCard.locator('[data-action="view-garages"]').click();
    await expect(page.locator('#nearbyGaragesModal')).toHaveClass(/active/);
    await expect(page.locator('#nearbyGaragesTitle')).toContainText('Nearby Garages');
    await page.locator('#nearbyGaragesModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#nearbyGaragesModal')).not.toHaveClass(/active/);

    await breakdownRouteCard.locator('[data-action="toggle-actions-menu"]').click();
    await breakdownRouteCard.locator('[data-action="log-garage-entry"]').click();
    await expect(page.locator('#nearbyGaragesModal')).toHaveClass(/active/);
    await expect(page.locator('#nearbyGaragesTitle')).toContainText('Log Garage Entry');
    await page.locator('#nearbyGaragesModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#nearbyGaragesModal')).not.toHaveClass(/active/);

    await breakdownRouteCard.locator('button[data-action="view-breakdown"]').click();
    await expect(page.locator('#ticket-details')).toHaveClass(/active/, { timeout: 15000 });
    await expect(page.locator('#viewNearbyGaragesBtn')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#logGarageEntryBtn')).toBeVisible({ timeout: 15000 });

    await page.locator('#viewNearbyGaragesBtn').click();
    await expect(page.locator('#nearbyGaragesModal')).toHaveClass(/active/);
    const nearbyGaragesModalPaddingTop = await page.locator('#nearbyGaragesModal .modal-content').evaluate(
        (node) => window.getComputedStyle(node).paddingTop
    );
    expect(nearbyGaragesModalPaddingTop).toBe('0px');
    await page.locator('#nearbyGaragesModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#nearbyGaragesModal')).not.toHaveClass(/active/);

    await page.locator('#logGarageEntryBtn').click();
    await expect(page.locator('#nearbyGaragesModal')).toHaveClass(/active/);
    await expect(page.locator('#nearbyGaragesTitle')).toContainText('Log Garage Entry');
    await page.locator('#nearbyGaragesModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#nearbyGaragesModal')).not.toHaveClass(/active/);

    await page.locator('#ticket-details #backButton').click();
    await expect(page.locator('#breakdown')).toHaveClass(/active/, { timeout: 10000 });

    const repairRouteCard = page.locator('#driverBreakdownList .inventory-item').filter({ hasText: 'RBR-003' }).first();
    await expect(repairRouteCard).toBeVisible();
    await repairRouteCard.locator('button[data-action="view-breakdown"]').click();

    await expect(page.locator('#ticket-details')).toHaveClass(/active/, { timeout: 15000 });
    await expect(page.locator('#addGarageProgressBtn')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#completeGarageRepairBtn')).toBeVisible({ timeout: 15000 });

    await page.locator('#addGarageProgressBtn').click();
    await expect(page.locator('#garageProgressModal')).toHaveClass(/active/);
    await page.locator('#garageProgressModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#garageProgressModal')).not.toHaveClass(/active/);

    await page.locator('#completeGarageRepairBtn').click();
    await expect(page.locator('#completeBreakdownModal')).toHaveClass(/active/);

    await page.locator('#completeBillAmount').fill('24500');
    await page.locator('#completeRemarks').fill('Repair completed and vehicle is ready for dispatch.');
    await page.setInputFiles('#completeBillImage', {
        name: 'bill.png',
        mimeType: 'image/png',
        buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    });

    await page.locator('#completeBreakdownForm button[type="submit"]').click();
    await expect(page.locator('#completeBreakdownModal')).not.toHaveClass(/active/);

    await expect(page.locator('#ovStatus')).toContainText('Resolved', { timeout: 15000 });
    await expect(page.locator('#addGarageProgressBtn')).toBeHidden({ timeout: 15000 });
    await expect(page.locator('#completeGarageRepairBtn')).toBeHidden({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('ticket-tracking');
        }
    });

    await expect(page.locator('#ticket-tracking')).toBeVisible();
    const driverSortSelect = page.locator('#ticket-tracking #driverTicketSort');
    await expect(driverSortSelect).toBeVisible();
    await expect(page.locator('#driverTicketTrackingList .inventory-item').first()).toContainText('BR-002');

    await driverSortSelect.selectOption('priority');
    await expect(page.locator('#driverTicketTrackingList .inventory-item').first()).toContainText('RBR-002');

    await driverSortSelect.selectOption('created');
    await expect(page.locator('#driverTicketTrackingList .inventory-item').first()).toContainText('BR-002');

    const insuranceClaimedCard = page.locator('#driverTicketTrackingList .inventory-item').filter({ hasText: 'RBR-002' }).first();
    await expect(insuranceClaimedCard).toContainText('Insurance Claimed');

    await page.locator('#ticket-tracking .filter-btn', { hasText: 'In Progress' }).click();
    await expect(insuranceClaimedCard).toBeVisible();

    await page.locator('#ticket-tracking .filter-btn', { hasText: 'Pending' }).click();
    await page.locator('#ticket-tracking .filter-btn', { hasText: 'All Tickets' }).click();

    const approvedRouteCard = page.locator('#driverTicketTrackingList .inventory-item').filter({ hasText: 'RBR-001' }).first();
    await expect(approvedRouteCard).toBeVisible();
    await approvedRouteCard.locator('button[data-action="view-breakdown"]').click();

    await expect(page.locator('#breakdownDetailsModal')).toHaveClass(/active/);
    await expect(page.locator('#trackWorkflowButton')).toBeVisible();
    await expect(page.locator('#driverWorkflowSection')).toBeHidden();

    await page.locator('#trackWorkflowButton').click();
    await expect(page.locator('#driverWorkflowSection')).toBeVisible();
    await expect(page.locator('#driverWorkflowSection')).toContainText('Route Breakdown Ticket Workflow (RBD)');
    await expect(page.locator('#driverWorkflowSection')).toContainText('Supervisor Garage Approval');
    await expect(page.locator('#driverWorkflowSection')).toContainText('Approved Garage: Southern Fleet Garage');

    await page.locator('#breakdownDetailsModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#breakdownDetailsModal')).not.toHaveClass(/active/);

    const vehicleBreakdownCard = page.locator('#driverTicketTrackingList .inventory-item').filter({ hasText: 'BR-001' }).first();
    await expect(vehicleBreakdownCard).toBeVisible();
    await vehicleBreakdownCard.locator('button[data-action="view-breakdown"]').click();

    await expect(page.locator('#breakdownDetailsModal')).toHaveClass(/active/);
    await expect(page.locator('#driverWorkflowSection')).toBeHidden();

    await page.locator('#trackWorkflowButton').click();
    await expect(page.locator('#driverWorkflowSection')).toBeVisible();
    await expect(page.locator('#driverWorkflowSection')).toContainText('Vehicle Breakdown Ticket Workflow (VBD)');
    await expect(page.locator('#driverWorkflowSection')).toContainText('Budget Review');

    await page.locator('#breakdownDetailsModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#breakdownDetailsModal')).not.toHaveClass(/active/);

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('garages');
        }
    });

    await expect(page.locator('#garages')).toHaveClass(/active/);
    await expect(page.locator('#driverGaragesList')).toContainText('Colombo Central Garage');

    const refreshButton = page.locator('#garages [data-action="refresh"]');
    if (STAGE === 'before') {
        await expect(refreshButton).toHaveCount(1);
    } else {
        await expect(refreshButton).toHaveCount(0);
    }

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('ac-layout').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => ({
        activeSection: document.querySelector('.content-section.active')?.id || null,
        openModalCount: document.querySelectorAll('.modal.active').length,
        ticketTrackingRows: document.querySelectorAll('#driverTicketTrackingList .inventory-item').length,
    }));

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

test('driver dashboard desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('driver dashboard mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
