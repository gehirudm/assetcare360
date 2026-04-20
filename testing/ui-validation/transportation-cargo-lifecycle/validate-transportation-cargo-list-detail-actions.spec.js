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
            created_at: '2026-04-17 08:00:00',
            updated_at: '2026-04-17 08:30:00',
        },
        {
            id: 2,
            cargo_item_id: 'CGI-002',
            name: 'Steel Beams',
            description: 'Construction steel',
            unit: 'beams',
            is_dangerous: 0,
            is_active: 1,
            created_at: '2026-04-17 08:00:00',
            updated_at: '2026-04-17 08:30:00',
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
            status: 'Completed',
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
                },
                {
                    cargo_item_db_id: 2,
                    cargo_item_id: 'CGI-002',
                    name: 'Steel Beams',
                    unit: 'beams',
                    is_dangerous: 0,
                    quantity: 15,
                },
            ],
            created_at: '2026-04-17 08:00:00',
            start_time: '2026-04-17 08:30:00',
            end_time: '2026-04-17 12:10:00',
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

async function mockApi(page, scopeState) {
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

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json(route, { status: 'success', data: { vehicles: data.vehicles } });
        }

        if (pathname.endsWith('/api/trips') && method === 'GET') {
            return json(route, { success: true, data: { trips: data.trips }, count: data.trips.length });
        }

        if (pathname.endsWith('/api/trips/cargo-items') && method === 'GET') {
            return json(route, { success: true, data: { cargo_items: data.cargoItems }, count: data.cargoItems.length });
        }

        if (/\/api\/trips\/cargo-items\/[0-9]+$/.test(pathname) && method === 'PUT') {
            scopeState.cargoStateMutationCalls += 1;
            return json(route, {
                success: true,
                message: 'Cargo item updated successfully',
                data: { cargo_item: data.cargoItems[0] },
            });
        }

        if (/\/api\/trips\/cargo-items\/[0-9]+$/.test(pathname) && method === 'DELETE') {
            scopeState.cargoStateMutationCalls += 1;
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
            return json(route, { status: 'success', data: { breakdowns: [] } });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json(route, { status: 'success', data: { tickets: [] } });
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

    if (!navigated) {
        await page.click(`.nav-item[data-section="${sectionId}"]`);
    }
}

async function runTMFlow(page, state, scope) {
    const scopeState = state[scope];

    attachMonitors(page, state, scope);
    await mockApi(page, scopeState);

    await page.goto(`${BASE_URL}/dashboard/transportation-manager/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('tm-cargo-management', { timeout: 20000, state: 'attached' });

    await navigateToSection(page, 'cargo-management');
    await page.waitForSelector('#cargo-management.active', { timeout: 10000 });
    await page.waitForSelector('tm-cargo-management #cargoCatalogContainer .inventory-item, tm-cargo-management #cargoCatalogContainer .empty-state', { timeout: 15000 });

    scopeState.hasCargoViewDetailsAction = (await page.locator('tm-cargo-management [data-action="view-cargo-item"]').count()) > 0;
    scopeState.hasCargoListDeactivateAction = (await page.locator('tm-cargo-management [data-action="deactivate-cargo-item"]').count()) > 0;
    scopeState.hasCargoListStatusBadge = (await page.locator('tm-cargo-management .cargo-catalog-item .cargo-badge-row .status-badge').count()) > 0;

    if (scopeState.hasCargoViewDetailsAction) {
        const viewButton = page.locator('tm-cargo-management [data-action="view-cargo-item"]').first();
        await viewButton.waitFor({ state: 'visible', timeout: 10000 });
        await viewButton.click();

        await page.waitForSelector('#cargo-details.active', { timeout: 10000 });
        await page.waitForSelector('tm-cargo-details [data-cargo-analytics-root], tm-cargo-details #cargoDetailsContent .empty-state.error', { timeout: 15000 });

        const detailsStateButton = page.locator('tm-cargo-details [data-action="deactivate-cargo-item"], tm-cargo-details [data-action="activate-cargo-item"]').first();
        scopeState.hasCargoDetailsStateAction = (await detailsStateButton.count()) > 0;

        if (STAGE === 'after' && scopeState.hasCargoDetailsStateAction) {
            const action = await detailsStateButton.getAttribute('data-action');
            const expectedMethod = action === 'activate-cargo-item' ? 'PUT' : 'DELETE';

            const stateMutationResponse = page.waitForResponse((response) => {
                if (response.request().method() !== expectedMethod) {
                    return false;
                }
                const responsePath = new URL(response.url()).pathname;
                return /\/api\/trips\/cargo-items\/[0-9]+$/.test(responsePath);
            }, { timeout: 10000 });

            page.once('dialog', (dialog) => dialog.accept());
            await detailsStateButton.click();
            await stateMutationResponse;
        }
    } else {
        scopeState.hasCargoDetailsStateAction = false;
    }

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${scope}-tm-cargo-list-detail-actions.png`),
        fullPage: true,
    });
}

function assertScopeExpectations(scopeState) {
    expect(scopeState.hasCargoViewDetailsAction).toBeTruthy();
    expect(scopeState.hasCargoListDeactivateAction).toBeFalsy();
    expect(scopeState.hasCargoListStatusBadge).toBeFalsy();
    expect(scopeState.hasCargoDetailsStateAction).toBeTruthy();

    if (STAGE === 'before') {
        expect(scopeState.cargoStateMutationCalls).toBe(0);
        return;
    }

    expect(scopeState.cargoStateMutationCalls).toBeGreaterThanOrEqual(1);
}

test('Validate TM cargo list/detail action placement', async ({ browser }) => {
    const state = {
        stage: STAGE,
        desktop: {
            cargoStateMutationCalls: 0,
        },
        mobile: {
            cargoStateMutationCalls: 0,
        },
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

    const outFile = path.join(OUT_DIR, `${STAGE}-transportation-cargo-list-detail-actions.json`);
    fs.writeFileSync(outFile, JSON.stringify(state, null, 2));

    expect(state.failedRequests.length, 'API requests should not fail during validation flow').toBe(0);

    assertScopeExpectations(state.desktop);
    assertScopeExpectations(state.mobile);
});
