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

    return { users, vehicles, cargoItems, trips };
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

async function mockApi(page) {
    const data = buildMockData();

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json(route, {
                status: 'success',
                message: 'User authenticated',
                data: {
                    id: 101,
                    employee_id: 'TM-001',
                    full_name: 'TM User',
                    role: 'Transportation Manager',
                },
            });
        }

        if (pathname.endsWith('/api/users') && method === 'GET') {
            return json(route, { status: 'success', data: { users: data.users } });
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

        if (/\/api\/vehicles\/\d+$/.test(pathname) && method === 'GET') {
            const id = Number(pathname.split('/').pop());
            const vehicle = data.vehicles.find((entry) => entry.id === id) || data.vehicles[0];
            return json(route, { status: 'success', data: { vehicle } });
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

        if (pathname.endsWith('/api/trips') && method === 'POST') {
            return json(route, { success: true, message: 'Trip created', data: { trip: data.trips[0] } }, 201);
        }

        if (pathname.endsWith('/api/trips/cargo-items') && method === 'GET') {
            return json(route, { success: true, data: { cargo_items: data.cargoItems }, count: data.cargoItems.length });
        }

        if (pathname.endsWith('/api/trips/cargo-items') && method === 'POST') {
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

        if (pathname.endsWith('/api/fuel-logs') && method === 'POST') {
            return json(route, {
                success: true,
                message: 'Fuel log created successfully',
                data: { fuel_log: { fuel_log_id: 'FL-999' } },
            }, 201);
        }

        if (/\/api\/fuel-logs\/.+$/.test(pathname) && method === 'GET') {
            return json(route, { success: true, data: { fuel_log: null } });
        }

        if (pathname.endsWith('/api/vehicle-checks') && method === 'GET') {
            return json(route, { status: 'success', data: { checks: [] } });
        }

        if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
            return json(route, { status: 'success', data: { reports: [] } });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', data: { breakdowns: [] } });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json(route, { status: 'success', data: { tickets: [] } });
        }

        if (/\/api\/vehicles\/\d+\/(assign-driver|unassign-driver)$/.test(pathname) && method === 'POST') {
            return json(route, { status: 'success', message: 'Driver assignment updated', data: {} });
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

async function navigateToSection(page, sectionId) {
    const navigated = await page.evaluate((targetSection) => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo(targetSection);
            return true;
        }

        return false;
    }, sectionId);

    if (navigated) {
        return;
    }

    await page.click(`.nav-item[data-section="${sectionId}"]`);
}

async function runTMFlow(page, state, scope) {
    attachMonitors(page, state, scope);
    await mockApi(page);

    const scopeState = state[scope];

    await page.goto(`${BASE_URL}/dashboard/transportation-manager/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('tm-trips', { timeout: 20000, state: 'attached' });

    scopeState.hasCargoNavItem = (await page.locator('.nav-item[data-section="cargo-management"]').count()) > 0;
    scopeState.hasCargoSectionComponent = (await page.locator('tm-cargo-management').count()) > 0;
    scopeState.hasCargoDetailsSectionComponent = (await page.locator('tm-cargo-details').count()) > 0;

    await navigateToSection(page, 'trips');
    await page.waitForSelector('#trips.active', { timeout: 10000 });
    await page.waitForSelector('tm-trips #tripsContainer', { timeout: 15000 });

    scopeState.hasCargoAnalyticsInTrips = (await page.locator('tm-trips [data-cargo-analytics-root]').count()) > 0;
    scopeState.hasCargoCatalogInTrips = (await page.locator('tm-trips [data-cargo-catalog-root]').count()) > 0;

    if (scopeState.hasCargoNavItem) {
        await navigateToSection(page, 'cargo-management');
        await page.waitForSelector('#cargo-management.active', { timeout: 10000 });
        await page.waitForSelector('tm-cargo-management #cargoCatalogContainer', { timeout: 10000 });
        await page.waitForSelector('tm-cargo-management #cargoCatalogContainer .inventory-item, tm-cargo-management #cargoCatalogContainer .empty-state', { timeout: 15000 });

        scopeState.hasCargoAnalyticsInCargoSection = (await page.locator('tm-cargo-management [data-cargo-analytics-root]').count()) > 0;
        scopeState.hasCargoCatalogInCargoSection = (await page.locator('tm-cargo-management [data-cargo-catalog-root]').count()) > 0;
        scopeState.hasCargoAddEntryPoint = (await page.locator('tm-cargo-management [data-action="open-cargo-item-modal"], tm-cargo-management #cargoItemCreateBtn').count()) > 0;
        scopeState.hasCargoViewDetailsAction = (await page.locator('tm-cargo-management [data-action="view-cargo-item"]').count()) > 0;

        if (scopeState.hasCargoViewDetailsAction) {
            const viewButton = page.locator('tm-cargo-management [data-action="view-cargo-item"]').first();
            await viewButton.waitFor({ state: 'visible', timeout: 10000 });
            await viewButton.click();
            await page.waitForSelector('#cargo-details.active', { timeout: 10000 });
            await page.waitForSelector('tm-cargo-details [data-cargo-analytics-root], tm-cargo-details #cargoDetailsContent .empty-state.error', { timeout: 15000 });

            scopeState.hasCargoAnalyticsInDetailsView = (await page.locator('tm-cargo-details [data-cargo-analytics-root]').count()) > 0;

            await page.click('tm-cargo-details [data-action="back"]');
            await page.waitForSelector('#cargo-management.active', { timeout: 10000 });
        } else {
            scopeState.hasCargoAnalyticsInDetailsView = false;
        }
    } else {
        scopeState.hasCargoAnalyticsInCargoSection = false;
        scopeState.hasCargoCatalogInCargoSection = false;
        scopeState.hasCargoAddEntryPoint = false;
        scopeState.hasCargoViewDetailsAction = false;
        scopeState.hasCargoAnalyticsInDetailsView = false;
    }

    await navigateToSection(page, 'trips');
    await page.waitForSelector('#trips.active', { timeout: 10000 });
    await page.waitForSelector('tm-trips [data-action="assign-trip"]', { timeout: 10000 });
    const assignButton = page.locator('tm-trips [data-action="assign-trip"]').first();
    await assignButton.scrollIntoViewIfNeeded();
    await assignButton.click();
    await page.waitForSelector('#assignTripModal.active', { timeout: 10000 });

    scopeState.hasAssignCargoSection = (await page.locator('#assignTripModal #assignCargoItemsContainer').count()) > 0;
    scopeState.hasAssignCargoAddButton = (await page.locator('#assignTripModal [data-action="add-cargo-row"]').count()) > 0;

    await page.click('#assignTripModal [data-action="close"]');

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${scope}-tm-cargo-section-split.png`),
        fullPage: true,
    });
}

function assertScopeExpectations(scopeState) {
    expect(scopeState.hasAssignCargoSection).toBeTruthy();
    expect(scopeState.hasAssignCargoAddButton).toBeTruthy();

    if (STAGE === 'before') {
        expect(scopeState.hasCargoNavItem).toBeTruthy();
        expect(scopeState.hasCargoSectionComponent).toBeTruthy();
        expect(scopeState.hasCargoDetailsSectionComponent).toBeFalsy();

        expect(scopeState.hasCargoAnalyticsInTrips).toBeFalsy();
        expect(scopeState.hasCargoCatalogInTrips).toBeFalsy();

        expect(scopeState.hasCargoAnalyticsInCargoSection).toBeTruthy();
        expect(scopeState.hasCargoCatalogInCargoSection).toBeTruthy();
        expect(scopeState.hasCargoAddEntryPoint).toBeTruthy();
        expect(scopeState.hasCargoViewDetailsAction).toBeFalsy();
        expect(scopeState.hasCargoAnalyticsInDetailsView).toBeFalsy();
        return;
    }

    expect(scopeState.hasCargoNavItem).toBeTruthy();
    expect(scopeState.hasCargoSectionComponent).toBeTruthy();
    expect(scopeState.hasCargoDetailsSectionComponent).toBeTruthy();

    expect(scopeState.hasCargoAnalyticsInTrips).toBeFalsy();
    expect(scopeState.hasCargoCatalogInTrips).toBeFalsy();

    expect(scopeState.hasCargoAnalyticsInCargoSection).toBeFalsy();
    expect(scopeState.hasCargoCatalogInCargoSection).toBeTruthy();
    expect(scopeState.hasCargoAddEntryPoint).toBeTruthy();
    expect(scopeState.hasCargoViewDetailsAction).toBeTruthy();
    expect(scopeState.hasCargoAnalyticsInDetailsView).toBeTruthy();
}

test('Validate TM cargo section split from trips', async ({ browser }) => {
    const state = {
        stage: STAGE,
        desktop: {},
        mobile: {},
        console: [],
        failedRequests: [],
    };

    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopContext.newPage();
    await runTMFlow(desktopPage, state, 'desktop');
    await desktopContext.close();

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await runTMFlow(mobilePage, state, 'mobile');
    await mobileContext.close();

    const outFile = path.join(OUT_DIR, `${STAGE}-transportation-cargo-section-split.json`);
    fs.writeFileSync(outFile, JSON.stringify(state, null, 2));

    expect(state.failedRequests.length, 'API requests should not fail during validation flow').toBe(0);

    assertScopeExpectations(state.desktop);
    assertScopeExpectations(state.mobile);
});
