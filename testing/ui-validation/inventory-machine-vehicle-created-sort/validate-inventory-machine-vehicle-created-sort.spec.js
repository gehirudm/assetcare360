const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:4173';
const OUT_DIR = __dirname;

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

function buildFixtures() {
    return {
        user: {
            id: 801,
            employee_id: 'INV-801',
            full_name: 'Inventory Sort Validation',
            role: 'Inventory Manager',
        },
        machines: [
            {
                id: 101,
                machine_id: 'MAC-101',
                machine_name: 'Gas Compressor Alpha',
                model_number: 'GC-A1',
                status: 'Active',
                location: 'LOCATION 1',
                created_at: '2026-03-12T09:00:00Z',
            },
            {
                id: 102,
                machine_id: 'MAC-102',
                machine_name: 'Cylinder Washer Beta',
                model_number: 'CW-B2',
                status: 'Under Maintenance',
                location: 'LOCATION 2',
                created_at: '2026-04-12T09:00:00Z',
            },
            {
                id: 103,
                machine_id: 'MAC-103',
                machine_name: 'Valve Crimper Gamma',
                model_number: 'VC-G3',
                status: 'Inactive',
                location: 'LOCATION 3',
                created_at: '2026-02-02T09:00:00Z',
            },
        ],
        vehicles: [
            {
                id: 201,
                vehicle_id: 'VEH-201',
                vehicle_name: 'Fleet Unit 201',
                model_number: 'FU-201',
                number_plate: 'CAB-201',
                insurance_type: 'Comprehensive',
                insurance_provider: 'Litro Insurance',
                current_mileage: 12000,
                status: 'Active',
                created_at: '2026-01-08T09:00:00Z',
            },
            {
                id: 202,
                vehicle_id: 'VEH-202',
                vehicle_name: 'Fleet Unit 202',
                model_number: 'FU-202',
                number_plate: 'CAB-202',
                insurance_type: 'Third Party',
                insurance_provider: 'Transit Cover',
                current_mileage: 8400,
                status: 'Under Maintenance',
                created_at: '2026-05-01T09:00:00Z',
            },
            {
                id: 203,
                vehicle_id: 'VEH-203',
                vehicle_name: 'Fleet Unit 203',
                model_number: 'FU-203',
                number_plate: 'CAB-203',
                insurance_type: 'Comprehensive',
                insurance_provider: 'Transit Cover',
                current_mileage: 6400,
                status: 'Inactive',
                created_at: '2026-02-14T09:00:00Z',
            },
        ],
    };
}

function attachMonitors(page, state) {
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            state.consoleErrors.push(msg.text());
        }
    });

    page.on('requestfailed', (request) => {
        state.failedRequests.push({
            url: request.url(),
            method: request.method(),
            failure: request.failure()?.errorText || 'Unknown request failure',
        });
    });
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
                    logout() {}
                };

                function logout() {}
            `,
        });
    });

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json(route, {
                status: 'success',
                message: 'User authenticated',
                data: fixtures.user,
            });
        }

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { machines: fixtures.machines },
            });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { vehicles: fixtures.vehicles },
            });
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

        if (pathname.endsWith('/api/orders') && method === 'GET') {
            return json(route, { status: 'success', data: { orders: [] } });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            return json(route, { status: 'success', data: { products: [] } });
        }

        if (pathname.endsWith('/api/additions') && method === 'GET') {
            return json(route, { status: 'success', data: { additions: [] } });
        }

        return json(route, { status: 'success', data: {} });
    });
}

async function openSection(page, sectionId) {
    await page.evaluate((target) => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo(target);
        }
    }, sectionId);

    await expect(page.locator(`#${sectionId}`)).toHaveClass(/active/, { timeout: 10000 });
}

async function firstItemId(page, listSelector) {
    const item = page.locator(`${listSelector} .inventory-item`).first();
    await expect(item).toBeVisible({ timeout: 10000 });
    return item.getAttribute('data-id');
}

test('Inventory machine and vehicle lists support created-date sorting', async ({ page }) => {
    const fixtures = buildFixtures();
    const state = {
        stage: STAGE,
        consoleErrors: [],
        failedRequests: [],
        machineFirstDefaultId: null,
        machineFirstAscId: null,
        machineFirstDescId: null,
        vehicleFirstDefaultId: null,
        vehicleFirstAscId: null,
        vehicleFirstDescId: null,
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures);

    await page.goto(`${BASE_URL}/pages/dashboard/inventory-manager/index.html`, {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 20000 });

    await openSection(page, 'machines');

    const machineSortSelect = page.locator('#machineCreatedSort');

    if (STAGE === 'before') {
        await expect(machineSortSelect).toHaveCount(0);
    } else {
        await expect(machineSortSelect).toBeVisible();

        state.machineFirstDefaultId = await firstItemId(page, '#machinesList');
        await page.selectOption('#machineCreatedSort', 'created-asc');
        state.machineFirstAscId = await firstItemId(page, '#machinesList');
        await page.selectOption('#machineCreatedSort', 'created-desc');
        state.machineFirstDescId = await firstItemId(page, '#machinesList');

        expect(state.machineFirstAscId).toBe('103');
        expect(state.machineFirstDescId).toBe('102');
    }

    await openSection(page, 'vehicles');

    const vehicleSortSelect = page.locator('#vehicleCreatedSort');

    if (STAGE === 'before') {
        await expect(vehicleSortSelect).toHaveCount(0);
    } else {
        await expect(vehicleSortSelect).toBeVisible();

        state.vehicleFirstDefaultId = await firstItemId(page, '#vehiclesList');
        await page.selectOption('#vehicleCreatedSort', 'created-asc');
        state.vehicleFirstAscId = await firstItemId(page, '#vehiclesList');
        await page.selectOption('#vehicleCreatedSort', 'created-desc');
        state.vehicleFirstDescId = await firstItemId(page, '#vehiclesList');

        expect(state.vehicleFirstAscId).toBe('201');
        expect(state.vehicleFirstDescId).toBe('202');
    }

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-inventory-machine-vehicle-created-sort.json`),
        JSON.stringify(state, null, 2)
    );

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-inventory-machine-vehicle-created-sort.png`),
        fullPage: true,
    });

    expect(state.failedRequests.length, 'No request should fail during inventory list sort validation').toBe(0);
});
