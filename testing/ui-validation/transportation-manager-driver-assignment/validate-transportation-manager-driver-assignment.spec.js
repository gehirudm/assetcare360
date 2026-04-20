const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'after';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:4173/pages';
const OUT_DIR = __dirname;

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

async function mockApi(page, state) {
    const vehicles = [
        {
            id: 1,
            vehicle_id: 'VEH-001',
            vehicle_name: 'Lorry 1',
            number_plate: 'WP-CAB-1001',
            vehicle_type: 'Lorry',
            assigned_driver_id: 11,
            driver_name: 'Driver One',
            driver_employee_id: 'DRV-001',
        },
        {
            id: 2,
            vehicle_id: 'VEH-002',
            vehicle_name: 'Truck 2',
            number_plate: 'WP-CAB-2002',
            vehicle_type: 'Truck',
            assigned_driver_id: 12,
            driver_name: 'Driver Two',
            driver_employee_id: 'DRV-002',
        },
        {
            id: 3,
            vehicle_id: 'VEH-003',
            vehicle_name: 'Van 3',
            number_plate: 'WP-CAB-3003',
            vehicle_type: 'Van',
            assigned_driver_id: null,
            driver_name: null,
            driver_employee_id: null,
        },
    ];

    const trips = [
        {
            id: 101,
            trip_id: 'TRP-101',
            vehicle_registration: 'WP-CAB-1001',
            driver_id: 11,
            status: 'Pending',
            origin: 'Colombo',
            destination: 'Kandy',
        },
        {
            id: 102,
            trip_id: 'TRP-102',
            vehicle_registration: 'WP-CAB-2002',
            driver_id: 12,
            status: 'Completed',
            origin: 'Galle',
            destination: 'Matara',
        },
    ];

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const pathname = url.pathname;
        const method = request.method();

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
            return json(route, {
                status: 'success',
                data: {
                    users: [
                        { id: 11, full_name: 'Driver One', role: 'Driver', employee_id: 'DRV-001', is_active: 1 },
                        { id: 12, full_name: 'Driver Two', role: 'Driver', employee_id: 'DRV-002', is_active: 1 },
                        { id: 101, full_name: 'TM User', role: 'Transportation Manager', employee_id: 'TM-001', is_active: 1 },
                    ],
                },
            });
        }

        if (pathname.endsWith('/api/vehicles/with-drivers') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { vehicles },
            });
        }

        if (pathname.endsWith('/api/trips') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { trips },
            });
        }

        if (pathname.endsWith('/api/fuel-logs') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { fuel_logs: [] },
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

        if (/\/api\/vehicles\/\d+\/(assign-driver|unassign-driver)$/.test(pathname) && method === 'POST') {
            state.assignmentPostCalls += 1;
            return json(route, {
                status: 'success',
                message: 'Driver assignment updated',
                data: {},
            });
        }

        return json(route, { status: 'success', data: {} });
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
            failure: request.failure()?.errorText || 'Unknown request failure',
        });
    });
}

async function runValidation(page, state) {
    attachMonitors(page, state);
    await mockApi(page, state);

    await page.goto(`${BASE_URL}/dashboard/transportation-manager/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('tm-driver-assignment', { timeout: 20000, state: 'attached' });

    await page.click('.nav-item[data-section="driver-assignment"]');
    await page.waitForSelector('#driver-assignment.active', { timeout: 10000 });
    await page.waitForSelector('tm-driver-assignment [data-id="1"]', { timeout: 15000 });

    const lockedCard = page.locator('tm-driver-assignment [data-id="1"]');
    const unlockedCard = page.locator('tm-driver-assignment [data-id="2"]');
    const unassignedCard = page.locator('tm-driver-assignment [data-id="3"]');

    state.lockedVehicle = {
        hasLockedAttribute: (await page.locator('tm-driver-assignment [data-id="1"][data-driver-assignment-locked="true"]').count()) > 0,
        hasLockBadge: (await lockedCard.locator('[data-driver-trip-lock-badge="true"]').count()) > 0,
        hasLockMessage: (await lockedCard.locator('[data-driver-trip-lock-message="true"]').count()) > 0,
        hasChangeButton: (await lockedCard.locator('button[data-action="change"]').count()) > 0,
        hasUnassignButton: (await lockedCard.locator('button[data-action="unassign"]').count()) > 0,
    };

    state.unlockedVehicle = {
        hasChangeButton: (await unlockedCard.locator('button[data-action="change"]').count()) > 0,
        hasUnassignButton: (await unlockedCard.locator('button[data-action="unassign"]').count()) > 0,
    };

    state.unassignedVehicle = {
        hasAssignButton: (await unassignedCard.locator('button[data-action="assign"]').count()) > 0,
    };

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-tm-driver-assignment.png`),
        fullPage: true,
    });
}

test('Validate TM driver assignment lock-state actions', async ({ page }) => {
    const state = {
        stage: STAGE,
        consoleErrors: [],
        failedRequests: [],
        assignmentPostCalls: 0,
        lockedVehicle: {},
        unlockedVehicle: {},
        unassignedVehicle: {},
    };

    await runValidation(page, state);

    const outFile = path.join(OUT_DIR, `${STAGE}-transportation-manager-driver-assignment.json`);
    fs.writeFileSync(outFile, JSON.stringify(state, null, 2));

    expect(state.failedRequests.length, 'No request should fail during TM driver assignment validation').toBe(0);
    expect(state.lockedVehicle.hasLockedAttribute).toBeTruthy();
    expect(state.lockedVehicle.hasLockBadge).toBeTruthy();
    expect(state.lockedVehicle.hasLockMessage).toBeTruthy();
    expect(state.lockedVehicle.hasChangeButton).toBeFalsy();
    expect(state.lockedVehicle.hasUnassignButton).toBeFalsy();

    expect(state.unlockedVehicle.hasChangeButton).toBeTruthy();
    expect(state.unlockedVehicle.hasUnassignButton).toBeTruthy();
    expect(state.unassignedVehicle.hasAssignButton).toBeTruthy();
});
