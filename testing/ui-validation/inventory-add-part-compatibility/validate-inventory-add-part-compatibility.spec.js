const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:8000';
const OUT_DIR = __dirname;

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
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

async function mockApi(page) {
    await page.route('**/js/dashboard-init.js', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `
                const DashboardInit = {
                    async init(_allowedRoles, options = {}) {
                        const user = {
                            id: 501,
                            employee_id: 'INV-501',
                            full_name: 'Inventory Manager Validation',
                            role: 'Inventory Manager'
                        };
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
                data: {
                    id: 501,
                    employee_id: 'INV-501',
                    full_name: 'Inventory Manager Validation',
                    role: 'Inventory Manager',
                },
            });
        }

        if (pathname.endsWith('/api/products/next-id') && method === 'GET') {
            return json(route, {
                status: 'success',
                message: 'Next product ID generated successfully',
                data: { next_id: 'SPR-901' },
            });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            return json(route, {
                status: 'success',
                message: 'Products retrieved successfully',
                data: { products: [] },
            });
        }

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    machines: [
                        { id: 1, machine_id: 'MAC-001', machine_name: 'Machine Alpha', status: 'Active' },
                        { id: 2, machine_id: 'MAC-002', machine_name: 'Machine Beta', status: 'Active' },
                    ],
                },
            });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    vehicles: [
                        {
                            id: 1,
                            vehicle_id: 'VEH-001',
                            vehicle_name: 'Fleet Unit 101',
                            vehicle_type: 'Tanker Lorry',
                            number_plate: 'CAB-101',
                            status: 'Active',
                        },
                        {
                            id: 2,
                            vehicle_id: 'VEH-002',
                            vehicle_name: 'Fleet Unit 202',
                            vehicle_type: 'Staff Car',
                            number_plate: 'CAB-202',
                            status: 'Active',
                        },
                    ],
                },
            });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    notifications: [],
                    unread_count: 0,
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        total_pages: 1,
                    },
                },
            });
        }

        return json(route, { status: 'success', data: {} });
    });
}

async function collectCompatibilityOptions(page, category) {
    await page.selectOption('#partCategory', category);
    await page.waitForTimeout(100);

    return page.$$eval('#compatibilityCheckboxes label', labels => {
        return labels.map(label => label.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    });
}

test('Inventory add-part modal compatibility options reflect stage expectations', async ({ page }) => {
    const state = {
        stage: STAGE,
        consoleErrors: [],
        failedRequests: [],
        machineOptions: [],
        vehicleOptions: [],
    };

    attachMonitors(page, state);
    await mockApi(page);

    await page.goto(`${BASE_URL}/pages/dashboard/inventory-manager/index.html`, {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 20000 });

    await page.evaluate(async () => {
        if (typeof openAddPartModal === 'function') {
            await openAddPartModal();
        }
    });

    await expect(page.locator('#addPartModal.active')).toBeVisible({ timeout: 15000 });

    state.machineOptions = await collectCompatibilityOptions(page, 'machines');
    state.vehicleOptions = await collectCompatibilityOptions(page, 'vehicles');

    if (STAGE === 'before') {
        expect(state.machineOptions).toEqual(expect.arrayContaining(['Machine Alpha', 'Machine Beta']));
        expect(state.vehicleOptions).toEqual(expect.arrayContaining(['Fleet Unit 101', 'Fleet Unit 202']));
    } else {
        expect(state.machineOptions).toContain('LPG Cylinder Filling Machine');
        expect(state.vehicleOptions).toContain('LPG Distribution Truck');
        expect(state.vehicleOptions).not.toEqual(expect.arrayContaining(['Fleet Unit 101', 'Fleet Unit 202']));
    }

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-inventory-add-part-compatibility.json`),
        JSON.stringify(state, null, 2)
    );

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-inventory-add-part-compatibility.png`),
        fullPage: true,
    });

    expect(state.failedRequests.length).toBe(0);
});
