const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:4173/pages';
const OUT_DIR = __dirname;

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

function buildMockData() {
    const users = [
        { id: 11, full_name: 'Driver One', role: 'Driver', employee_id: 'DRV-001', is_active: 1 },
        { id: 91, full_name: 'Supervisor One', role: 'Supervisor', employee_id: 'SUP-001', is_active: 1 },
        { id: 101, full_name: 'TM User', role: 'Transportation Manager', employee_id: 'TM-001', is_active: 1 },
    ];

    const vehicles = [
        {
            id: 1,
            vehicle_id: 'VEH-001',
            vehicle_name: 'Cargo Lorry 01',
            vehicle_type: 'Lorry',
            number_plate: 'CAB-1001',
            fuel_type: 'Diesel',
            current_mileage: 125000,
            status: 'Active',
            assigned_driver_id: 11,
        },
        {
            id: 2,
            vehicle_id: 'VEH-002',
            vehicle_name: 'Cargo Lorry 02',
            vehicle_type: 'Lorry',
            number_plate: 'CAB-2002',
            fuel_type: 'Diesel',
            current_mileage: 98000,
            status: 'Active',
            assigned_driver_id: 11,
        },
    ];

    const cargoItems = [
        {
            id: 1,
            cargo_item_id: 'CGI-001',
            name: 'Industrial Solvent Drums',
            description: 'Flammable liquid transport drums',
            unit: 'drums',
            is_dangerous: 1,
            is_active: 1,
        },
        {
            id: 2,
            cargo_item_id: 'CGI-002',
            name: 'Steel Beams',
            description: 'Construction steel',
            unit: 'beams',
            is_dangerous: 0,
            is_active: 1,
        },
    ];

    const trips = [
        {
            id: 1,
            trip_id: 'TRP-001',
            origin: 'Colombo Yard',
            destination: 'Kandy Depot',
            vehicle_registration: 'CAB-1001',
            driver_id: 11,
            driver_name: 'Driver One',
            status: 'In Progress',
            cargo_description: 'Industrial Solvent Drums and Steel Beams',
            cargo_summary: 'Industrial Solvent Drums (8 drums) [Dangerous], Steel Beams (15 beams)',
            total_cargo_quantity: 23,
            dangerous_cargo_quantity: 8,
            has_dangerous_cargo: true,
            cargo_items: [
                {
                    cargo_item_db_id: 1,
                    cargo_item_id: 'CGI-001',
                    name: 'Industrial Solvent Drums',
                    unit: 'drums',
                    is_dangerous: 1,
                    quantity: 8,
                    notes: 'Handle with protective gear',
                },
                {
                    cargo_item_db_id: 2,
                    cargo_item_id: 'CGI-002',
                    name: 'Steel Beams',
                    unit: 'beams',
                    is_dangerous: 0,
                    quantity: 15,
                    notes: null,
                },
            ],
            created_at: '2026-04-17 08:00:00',
            start_time: '2026-04-17 08:30:00',
        },
        {
            id: 2,
            trip_id: 'TRP-002',
            origin: 'Kandy Depot',
            destination: 'Colombo Yard',
            vehicle_registration: 'CAB-2002',
            driver_id: 11,
            driver_name: 'Driver One',
            status: 'Completed',
            cargo_description: 'Steel Beams only',
            cargo_summary: 'Steel Beams (10 beams)',
            total_cargo_quantity: 10,
            dangerous_cargo_quantity: 0,
            has_dangerous_cargo: false,
            cargo_items: [
                {
                    cargo_item_db_id: 2,
                    cargo_item_id: 'CGI-002',
                    name: 'Steel Beams',
                    unit: 'beams',
                    is_dangerous: 0,
                    quantity: 10,
                    notes: null,
                },
            ],
            created_at: '2026-04-16 09:00:00',
            start_time: '2026-04-16 09:30:00',
            end_time: '2026-04-16 16:30:00',
        },
    ];

    const routeBreakdowns = [
        {
            id: 15,
            route_breakdown_id: 'RBD-015',
            vehicle_id: 1,
            number_plate: 'CAB-1001',
            driver_id: 11,
            driver_name: 'Driver One',
            description: 'Engine overheating during transport',
            severity: 'Critical',
            status: 'Pending',
            breakdown_type: 'In Route',
            breakdown_datetime: '2026-04-17 10:05:00',
            dangerous_cargo_present: 1,
            dangerous_cargo_summary: 'Industrial Solvent Drums (8 drums)',
            dangerous_cargo_trip_id: 'TRP-001',
            source: 'driver',
        },
    ];

    const faultTickets = [
        {
            id: 99,
            ticket_id: 'RBD-099',
            breakdown_report_id: 'RBD-015',
            breakdown_type: 'route_breakdown',
            reported_by: 11,
            reporter_full_name: 'Driver One',
            reporter_role: 'Driver',
            machine_id: null,
            machine_name: null,
            machine_model_number: null,
            description: 'Route breakdown with dangerous cargo on board.',
            priority: 'Critical',
            status: 'Open',
            assignments: [],
            created_at: '2026-04-17 10:10:00',
            updated_at: '2026-04-17 10:10:00',
        },
    ];

    return { users, vehicles, cargoItems, trips, routeBreakdowns, faultTickets };
}

function attachMonitors(page, state, scope) {
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'warning' || type === 'error') {
            state.console.push({ scope, type, text: msg.text() });
        }
    });

    page.on('response', (response) => {
        if (response.status() < 400) {
            return;
        }

        const url = response.url();
        if (!url.includes('/api/')) {
            return;
        }

        state.failedRequests.push({
            scope,
            method: response.request().method(),
            status: response.status(),
            url,
        });
    });
}

async function mockApi(page, role, state) {
    const data = buildMockData();

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            const identity = role === 'Driver'
                ? { id: 11, employee_id: 'DRV-001', full_name: 'Driver One', role: 'Driver' }
                : role === 'Supervisor'
                    ? { id: 91, employee_id: 'SUP-001', full_name: 'Supervisor One', role: 'Supervisor' }
                    : { id: 101, employee_id: 'TM-001', full_name: 'TM User', role: 'Transportation Manager' };

            return json(route, {
                status: 'success',
                message: 'User authenticated',
                data: identity,
            });
        }

        if (pathname.endsWith('/api/users') && method === 'GET') {
            return json(route, { status: 'success', data: { users: data.users } });
        }

        if (pathname.endsWith('/api/vehicles/my-vehicle') && method === 'GET') {
            return json(route, { status: 'success', data: data.vehicles[0] });
        }

        if (pathname.endsWith('/api/vehicles/with-drivers') && method === 'GET') {
            const rows = data.vehicles.map((vehicle) => {
                const driver = data.users.find((u) => u.id === vehicle.assigned_driver_id);
                return {
                    ...vehicle,
                    driver_name: driver ? driver.full_name : null,
                    driver_user_id: driver ? driver.id : null,
                    driver_employee_id: driver ? driver.employee_id : null,
                };
            });

            return json(route, { status: 'success', data: { vehicles: rows } });
        }

        if (/\/api\/vehicles\/.+\/with-driver$/.test(pathname) && method === 'GET') {
            const segments = pathname.split('/');
            const numberPlate = decodeURIComponent(segments[segments.length - 2]);
            const vehicle = data.vehicles.find((v) => v.number_plate === numberPlate) || data.vehicles[0];
            const driver = data.users.find((u) => u.id === vehicle.assigned_driver_id);

            return json(route, {
                status: 'success',
                data: {
                    vehicle: {
                        ...vehicle,
                        driver_name: driver ? driver.full_name : null,
                        driver_user_id: driver ? driver.id : null,
                        driver_employee_id: driver ? driver.employee_id : null,
                    },
                },
            });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json(route, { status: 'success', data: { vehicles: data.vehicles } });
        }

        if (pathname.endsWith('/api/trips') && method === 'GET') {
            return json(route, { success: true, data: { trips: data.trips }, count: data.trips.length });
        }

        if (/\/api\/trips\/.+\/(accept|reject|start|end|cancel)$/.test(pathname)) {
            const tripId = pathname.split('/')[3];
            const trip = data.trips.find((item) => item.trip_id === tripId) || data.trips[0];
            return json(route, { success: true, data: { trip }, message: 'OK' });
        }

        if (/\/api\/trips\/TRP-[^/]+$/.test(pathname) && method === 'GET') {
            const tripId = pathname.split('/').pop();
            const trip = data.trips.find((item) => item.trip_id === tripId) || data.trips[0];
            return json(route, { success: true, data: { trip } });
        }

        if (/\/api\/trips\/TRP-[^/]+$/.test(pathname) && method === 'PUT') {
            return json(route, { success: true, message: 'Trip updated', data: { trip: data.trips[0] } });
        }

        if (pathname.endsWith('/api/trips') && method === 'POST') {
            state.tm.assignTripCalls += 1;
            return json(route, { success: true, message: 'Trip created', data: { trip: data.trips[0] } }, 201);
        }

        if (pathname.endsWith('/api/trips/cargo-items') && method === 'GET') {
            return json(route, { success: true, data: { cargo_items: data.cargoItems }, count: data.cargoItems.length });
        }

        if (pathname.endsWith('/api/trips/cargo-items') && method === 'POST') {
            state.tm.cargoCreateCalls += 1;
            return json(route, {
                success: true,
                message: 'Cargo item created successfully',
                data: {
                    cargo_item: {
                        ...data.cargoItems[0],
                        id: 99,
                        cargo_item_id: 'CGI-099',
                        name: 'New Cargo',
                    },
                },
            }, 201);
        }

        if (/\/api\/trips\/cargo-items\/[0-9]+$/.test(pathname) && method === 'PUT') {
            return json(route, { success: true, message: 'Cargo item updated successfully', data: { cargo_item: data.cargoItems[0] } });
        }

        if (/\/api\/trips\/cargo-items\/[0-9]+$/.test(pathname) && method === 'DELETE') {
            return json(route, { success: true, message: 'Cargo item deactivated successfully' });
        }

        if (pathname.endsWith('/api/trips/cargo-analytics') && method === 'GET') {
            return json(route, {
                success: true,
                data: {
                    totals: {
                        total_quantity_transported: 120,
                        dangerous_quantity_transported: 35,
                        trips_with_cargo: 8,
                        dangerous_trips: 3,
                    },
                    by_item: [
                        {
                            id: 1,
                            cargo_item_id: 'CGI-001',
                            name: 'Industrial Solvent Drums',
                            unit: 'drums',
                            is_dangerous: 1,
                            total_quantity: 35,
                            trips_count: 3,
                            last_transported_at: '2026-04-17 10:00:00',
                        },
                        {
                            id: 2,
                            cargo_item_id: 'CGI-002',
                            name: 'Steel Beams',
                            unit: 'beams',
                            is_dangerous: 0,
                            total_quantity: 85,
                            trips_count: 5,
                            last_transported_at: '2026-04-16 15:00:00',
                        },
                    ],
                    monthly: [
                        { month: '2026-02', total_quantity: 26, dangerous_quantity: 8, trips_count: 2 },
                        { month: '2026-03', total_quantity: 41, dangerous_quantity: 12, trips_count: 3 },
                        { month: '2026-04', total_quantity: 53, dangerous_quantity: 15, trips_count: 3 },
                    ],
                },
            });
        }

        if (pathname.endsWith('/api/fuel-logs') && method === 'GET') {
            return json(route, { success: true, data: { fuel_logs: [] }, count: 0 });
        }

        if (pathname.endsWith('/api/vehicle-checks') && method === 'GET') {
            return json(route, { status: 'success', data: { checks: [] } });
        }

        if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
            return json(route, { status: 'success', data: { reports: [] } });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', data: { breakdowns: data.routeBreakdowns } });
        }

        if (pathname.endsWith('/api/machine-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', data: { reports: [] } });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json(route, { status: 'success', data: { tickets: data.faultTickets } });
        }

        if (/\/api\/fault-tickets\/[0-9]+$/.test(pathname) && method === 'GET') {
            const id = Number(pathname.split('/').pop());
            const ticket = data.faultTickets.find((item) => item.id === id) || data.faultTickets[0];
            return json(route, { status: 'success', data: ticket });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    notifications: [],
                    unread_count: 0,
                    pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
                },
            });
        }

        return json(route, { status: 'success', data: {} });
    });
}

async function runTMFlow(page, state) {
    attachMonitors(page, state, 'tm');
    await mockApi(page, 'Transportation Manager', state);

    await page.goto(`${BASE_URL}/dashboard/transportation-manager/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('tm-trips', { timeout: 20000, state: 'attached' });

    await page.click('.nav-item[data-section="trips"]');
    await page.waitForSelector('tm-trips #tripsContainer', { timeout: 15000 });

    state.tm.hasCargoAnalyticsRoot = false;
    state.tm.hasCargoCatalogRoot = (await page.locator('tm-trips [data-cargo-catalog-root], tm-cargo-management [data-cargo-catalog-root]').count()) > 0;
    state.tm.hasCargoDetailsViewAction = false;

    await page.click('tm-trips [data-action="assign-trip"]');
    await page.waitForSelector('#assignTripModal.active', { timeout: 10000 });

    state.tm.hasAssignCargoSection = (await page.locator('#assignTripModal #assignCargoItemsContainer').count()) > 0;
    state.tm.hasAssignCargoAddButton = (await page.locator('#assignTripModal [data-action="add-cargo-row"]').count()) > 0;

    await page.click('#assignTripModal [data-action="close"]');

    const hasCargoNav = (await page.locator('.nav-item[data-section="cargo-management"]').count()) > 0;
    if (hasCargoNav) {
        await page.evaluate(() => {
            const layout = document.querySelector('ac-layout');
            if (layout && typeof layout.navigateTo === 'function') {
                layout.navigateTo('cargo-management');
            }
        });

        await page.waitForSelector('#cargo-management.active', { timeout: 10000 });
        await page.waitForSelector('tm-cargo-management #cargoCatalogContainer', { timeout: 10000 });
        await page.waitForSelector('tm-cargo-management #cargoCatalogContainer .inventory-item, tm-cargo-management #cargoCatalogContainer .empty-state', { timeout: 15000 });
        state.tm.hasCargoCatalogRoot = (await page.locator('tm-cargo-management [data-cargo-catalog-root]').count()) > 0;
        state.tm.hasCargoDetailsViewAction = (await page.locator('tm-cargo-management [data-action="view-cargo-item"]').count()) > 0;

        if (state.tm.hasCargoDetailsViewAction) {
            const viewButton = page.locator('tm-cargo-management [data-action="view-cargo-item"]').first();
            await viewButton.waitFor({ state: 'visible', timeout: 10000 });
            await viewButton.click();

            await page.waitForSelector('#cargo-details.active', { timeout: 10000 });
            await page.waitForSelector('tm-cargo-details [data-cargo-analytics-root], tm-cargo-details #cargoDetailsContent .empty-state.error', { timeout: 15000 });
            state.tm.hasCargoAnalyticsRoot = (await page.locator('tm-cargo-details [data-cargo-analytics-root]').count()) > 0;
        }
    }

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-tm-cargo.png`),
        fullPage: true,
    });
}

async function runDriverFlow(page, state) {
    attachMonitors(page, state, 'driver');
    await mockApi(page, 'Driver', state);

    await page.goto(`${BASE_URL}/dashboard/driver/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('driver-trip-log', { timeout: 20000, state: 'attached' });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('trip-log');
        }
    });

    await page.waitForSelector('#trip-log.active', { timeout: 10000 });
    await page.waitForSelector('driver-trip-log #driverTripsList .inventory-item', { timeout: 15000 });

    state.driver.hasCargoSummaryInTripList = (await page.locator('driver-trip-log [data-driver-cargo-summary]').count()) > 0;

    await page.click('driver-trip-log [data-action="view-trip"]');
    await page.waitForSelector('#viewTripModal.active', { timeout: 10000 });

    state.driver.hasStructuredCargoInViewModal = (await page.locator('#viewTripModal [data-driver-cargo-items]').count()) > 0;

    await page.click('#viewTripModal [data-action="close-modal"]');

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('breakdown');
        }
    });

    await page.waitForSelector('#breakdown.active', { timeout: 10000 });
    await page.waitForSelector('driver-breakdown [data-action="open-route-breakdown-modal"]', { timeout: 10000 });
    await page.click('driver-breakdown [data-action="open-route-breakdown-modal"]');
    await page.waitForSelector('#breakdownInRouteModal.active', { timeout: 10000 });

    const routeSeverityField = page.locator('#routeBreakdownSeverity');
    state.driver.inRouteDangerousPriorityLocked = await routeSeverityField.isDisabled();
    state.driver.inRouteDangerousPriorityValue = await routeSeverityField.inputValue();
    state.driver.inRouteDangerousPriorityNoticeVisible = await page.locator('#routeBreakdownPriorityLockNotice').isVisible();

    await page.click('#breakdownInRouteModal [data-action="close-modal"]');

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-driver-cargo.png`),
        fullPage: true,
    });
}

async function runSupervisorFlow(page, state) {
    attachMonitors(page, state, 'supervisor');
    await mockApi(page, 'Supervisor', state);

    await page.goto(`${BASE_URL}/dashboard/supervisor/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('supervisor-fault-tickets', { timeout: 20000, state: 'attached' });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('fault-tickets');
        }
    });

    await page.waitForSelector('#fault-tickets.active', { timeout: 10000 });
    await page.waitForSelector('supervisor-fault-tickets #unassignedTicketsList', { timeout: 15000 });

    state.supervisor.hasDangerousCargoBadge = (await page.locator('supervisor-fault-tickets .dangerous-cargo-chip').count()) > 0;

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-supervisor-dangerous.png`),
        fullPage: true,
    });
}

test('Validate transportation cargo lifecycle UI flow', async ({ browser }) => {
    const state = {
        stage: STAGE,
        tm: {
            assignTripCalls: 0,
            cargoCreateCalls: 0,
        },
        driver: {},
        supervisor: {},
        console: [],
        failedRequests: [],
    };

    const tmContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const tmPage = await tmContext.newPage();
    await runTMFlow(tmPage, state);
    await tmContext.close();

    const driverContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const driverPage = await driverContext.newPage();
    await runDriverFlow(driverPage, state);
    await driverContext.close();

    const supervisorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const supervisorPage = await supervisorContext.newPage();
    await runSupervisorFlow(supervisorPage, state);
    await supervisorContext.close();

    const outFile = path.join(OUT_DIR, `${STAGE}-transportation-cargo-lifecycle.json`);
    fs.writeFileSync(outFile, JSON.stringify(state, null, 2));

    expect(state.failedRequests.length, 'API requests should not fail during validation flow').toBe(0);

    if (STAGE === 'before') {
        expect(state.tm.hasCargoAnalyticsRoot).toBeFalsy();
        expect(state.tm.hasCargoCatalogRoot).toBeFalsy();
        expect(state.tm.hasCargoDetailsViewAction).toBeFalsy();
        expect(state.tm.hasAssignCargoSection).toBeFalsy();
        expect(state.tm.hasAssignCargoAddButton).toBeFalsy();

        expect(state.driver.hasCargoSummaryInTripList).toBeFalsy();
        expect(state.driver.hasStructuredCargoInViewModal).toBeFalsy();
        expect(state.driver.inRouteDangerousPriorityLocked).toBeFalsy();
        expect(state.driver.inRouteDangerousPriorityValue).not.toBe('critical');
        expect(state.driver.inRouteDangerousPriorityNoticeVisible).toBeFalsy();

        expect(state.supervisor.hasDangerousCargoBadge).toBeFalsy();
    } else {
        expect(state.tm.hasCargoAnalyticsRoot).toBeTruthy();
        expect(state.tm.hasCargoCatalogRoot).toBeTruthy();
        expect(state.tm.hasCargoDetailsViewAction).toBeTruthy();
        expect(state.tm.hasAssignCargoSection).toBeTruthy();
        expect(state.tm.hasAssignCargoAddButton).toBeTruthy();

        expect(state.driver.hasCargoSummaryInTripList).toBeTruthy();
        expect(state.driver.hasStructuredCargoInViewModal).toBeTruthy();
        expect(state.driver.inRouteDangerousPriorityLocked).toBeTruthy();
        expect(state.driver.inRouteDangerousPriorityValue).toBe('critical');
        expect(state.driver.inRouteDangerousPriorityNoticeVisible).toBeTruthy();

        expect(state.supervisor.hasDangerousCargoBadge).toBeTruthy();
    }
});
