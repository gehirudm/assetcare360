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
    const vehicles = [
        {
            id: 1,
            vehicle_id: 'VEH-001',
            vehicle_name: 'Fuel Truck 01',
            vehicle_type: 'Truck',
            number_plate: 'WP-CAB-1001',
            fuel_type: 'Diesel',
            current_mileage: 125000,
            status: 'Active',
            assigned_driver_id: 11,
        },
        {
            id: 2,
            vehicle_id: 'VEH-002',
            vehicle_name: 'City Van 02',
            vehicle_type: 'Van',
            number_plate: 'WP-CAB-2002',
            fuel_type: 'Petrol',
            current_mileage: 88000,
            status: 'In Use',
            assigned_driver_id: 12,
        },
    ];

    const users = [
        { id: 11, full_name: 'Driver One', role: 'Driver', is_active: 1, employee_id: 'DRV-001' },
        { id: 12, full_name: 'Driver Two', role: 'Driver', is_active: 1, employee_id: 'DRV-002' },
        { id: 101, full_name: 'TM User', role: 'Transportation Manager', is_active: 1, employee_id: 'TM-001' },
    ];

    const fuelLogs = [
        {
            id: 1,
            fuel_log_id: 'FL-001',
            vehicle_registration: 'WP-CAB-1001',
            driver_id: 11,
            driver_name: 'Driver One',
            log_datetime: '2026-04-15 08:10:00',
            fuel_volume: '40.00',
            total_cost: '14500.00',
            odometer_reading: 124500,
            station_name: 'IOC Town',
            fuel_type: 'Diesel',
            fuel_source: 'external',
            distance_since_last: '420.00',
            fuel_efficiency: '10.50',
            bill_image: 'uploads/fuel-bills/sample-a.jpg',
        },
        {
            id: 2,
            fuel_log_id: 'FL-002',
            vehicle_registration: 'WP-CAB-1001',
            driver_id: 11,
            driver_name: 'Driver One',
            log_datetime: '2026-04-16 09:45:00',
            fuel_volume: '35.00',
            total_cost: null,
            odometer_reading: 125000,
            station_name: 'Depot Tank',
            fuel_type: 'Diesel',
            fuel_source: 'internal',
            distance_since_last: '500.00',
            fuel_efficiency: '14.29',
            bill_image: null,
        },
    ];

    const trips = [
        {
            id: 1,
            trip_id: 'TRP-001',
            vehicle_registration: 'WP-CAB-1001',
            driver_id: 11,
            driver_name: 'Driver One',
            origin: 'Colombo',
            destination: 'Kandy',
            starting_odometer: 124000,
            final_odometer: 124400,
            status: 'Completed',
            start_time: '2026-04-14 07:00:00',
            end_time: '2026-04-14 13:00:00',
        },
        {
            id: 2,
            trip_id: 'TRP-002',
            vehicle_registration: 'WP-CAB-1001',
            driver_id: 11,
            driver_name: 'Driver One',
            origin: 'Kandy',
            destination: 'Colombo',
            starting_odometer: 124450,
            final_odometer: 124900,
            status: 'Completed',
            start_time: '2026-04-15 06:30:00',
            end_time: '2026-04-15 12:45:00',
        },
    ];

    return { vehicles, users, fuelLogs, trips };
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
            url,
            method: response.request().method(),
            status: response.status(),
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
            return json(route, {
                status: 'success',
                message: 'User authenticated',
                data: {
                    id: role === 'Driver' ? 11 : 101,
                    employee_id: role === 'Driver' ? 'DRV-001' : 'TM-001',
                    full_name: role === 'Driver' ? 'Driver One' : 'TM User',
                    role,
                },
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

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json(route, { status: 'success', data: { vehicles: data.vehicles } });
        }

        if (/\/api\/vehicles\/\d+$/.test(pathname) && method === 'GET') {
            const id = Number(pathname.split('/').pop());
            const vehicle = data.vehicles.find((v) => v.id === id);
            return json(route, { status: 'success', data: { vehicle: vehicle || data.vehicles[0] } });
        }

        if (/\/api\/vehicles\/.+\/with-driver$/.test(pathname) && method === 'GET') {
            const segments = pathname.split('/');
            const numberPlate = decodeURIComponent(segments[segments.length - 2]);
            const vehicle = data.vehicles.find((v) => v.number_plate === numberPlate);
            const driver = vehicle ? data.users.find((u) => u.id === vehicle.assigned_driver_id) : null;
            return json(route, {
                status: 'success',
                data: {
                    vehicle: {
                        ...(vehicle || data.vehicles[0]),
                        driver_name: driver ? driver.full_name : null,
                        driver_user_id: driver ? driver.id : null,
                        driver_employee_id: driver ? driver.employee_id : null,
                    },
                },
            });
        }

        if (pathname.endsWith('/api/trips') && method === 'GET') {
            return json(route, { success: true, data: { trips: data.trips }, count: data.trips.length });
        }

        if (pathname.endsWith('/api/trips/active-count') && method === 'GET') {
            return json(route, { success: true, data: { active_count: 1 } });
        }

        if (pathname.endsWith('/api/fuel-logs') && method === 'GET') {
            const reg = url.searchParams.get('vehicle_registration');
            const driverId = url.searchParams.get('driver_id');

            let logs = data.fuelLogs;
            if (reg) {
                logs = logs.filter((log) => String(log.vehicle_registration) === String(reg));
            }
            if (driverId) {
                logs = logs.filter((log) => String(log.driver_id) === String(driverId));
            }

            return json(route, { success: true, data: { fuel_logs: logs }, count: logs.length });
        }

        if (/\/api\/fuel-logs\/.+$/.test(pathname) && method === 'GET') {
            const id = pathname.split('/').pop();
            const log = data.fuelLogs.find((entry) => entry.fuel_log_id === id) || data.fuelLogs[0];
            return json(route, { success: true, data: { fuel_log: log } });
        }

        if (pathname.endsWith('/api/fuel-logs') && method === 'POST') {
            state.fuelCreateCalls += 1;
            return json(route, {
                success: true,
                message: 'Fuel log created successfully',
                data: { fuel_log: { fuel_log_id: 'FL-999' } },
            }, 201);
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

        if (/\/api\/vehicles\/\d+\/(assign-driver|unassign-driver)$/.test(pathname) && method === 'POST') {
            return json(route, { status: 'success', message: 'Driver assignment updated', data: {} });
        }

        return json(route, { status: 'success', data: {} });
    });
}

async function runTransportationManagerFlow(page, state) {
    attachMonitors(page, state, 'transportation-manager');
    await mockApi(page, 'Transportation Manager', state);

    await page.goto(`${BASE_URL}/dashboard/transportation-manager/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('tm-fleet', { timeout: 20000, state: 'attached' });

    await page.click('.nav-item[data-section="fleet"]');
    await page.waitForSelector('tm-fleet .inventory-item .btn[data-action="view"]', { timeout: 20000 });
    await page.click('tm-fleet .inventory-item .btn[data-action="view"]');

    const modalActive = await page.locator('#viewVehicleModal.active').count();
    const detailSectionActive = await page.locator('#fleet-details.active').count();

    state.transportationManager.fleetViewMode = detailSectionActive > 0 ? 'section' : (modalActive > 0 ? 'modal' : 'unknown');

    if (modalActive > 0) {
        await page.click('#viewVehicleModal [data-action="close"]');
        await page.waitForTimeout(100);
    }

    await page.click('.nav-item[data-section="fuel-log"]');
    await page.waitForSelector('#addFuelLogModal', { timeout: 10000, state: 'attached' });
    await page.click('tm-fuel-log [data-action="add-fuel"]');
    await page.waitForSelector('#addFuelLogModal.active', { timeout: 10000 });

    const hasFuelType = await page.locator('#addFuelLogModal #fuelType').count();
    const hasFuelSource = await page.locator('#addFuelLogModal #fuelSource').count();

    state.transportationManager.fuelModal = {
        hasFuelTypeField: hasFuelType > 0,
        hasFuelSourceField: hasFuelSource > 0,
    };

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-tm-dashboard.png`),
        fullPage: true,
    });
}

async function runDriverFlow(page, state) {
    attachMonitors(page, state, 'driver');
    await mockApi(page, 'Driver', state);

    await page.goto(`${BASE_URL}/dashboard/driver/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('driver-fuel-mileage', { timeout: 20000, state: 'attached' });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('fuel-mileage');
        }
    });
    await page.waitForSelector('#fuel-mileage.active', { timeout: 10000 });
    await page.waitForSelector('driver-fuel-mileage [data-action="open-fuel-modal"]', { timeout: 15000 });
    await page.click('driver-fuel-mileage [data-action="open-fuel-modal"]');
    await page.waitForSelector('#fuelMileageModal.active', { timeout: 10000 });

    const hasFuelType = await page.locator('#fuelMileageModal #fuelType').count();
    const hasFuelSource = await page.locator('#fuelMileageModal #fuelSource').count();

    let internalCostRequired = null;
    if (hasFuelSource > 0) {
        await page.selectOption('#fuelMileageModal #fuelSource', 'internal');
        internalCostRequired = await page.evaluate(() => {
            const field = document.querySelector('#fuelMileageModal #fuelCost');
            return field ? field.required : null;
        });
    }

    state.driver = {
        hasFuelTypeField: hasFuelType > 0,
        hasFuelSourceField: hasFuelSource > 0,
        internalCostRequired,
    };

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-driver-fuel-modal.png`),
        fullPage: true,
    });
}

test('Validate transportation manager fuel + fleet details flow', async ({ browser }) => {
    const state = {
        stage: STAGE,
        transportationManager: {},
        driver: {},
        console: [],
        failedRequests: [],
        fuelCreateCalls: 0,
    };

    const tmContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const tmPage = await tmContext.newPage();
    await runTransportationManagerFlow(tmPage, state);
    await tmContext.close();

    const driverContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const driverPage = await driverContext.newPage();
    await runDriverFlow(driverPage, state);
    await driverContext.close();

    const outFile = path.join(OUT_DIR, `${STAGE}-transportation-manager-fuel-fleet.json`);
    fs.writeFileSync(outFile, JSON.stringify(state, null, 2));

    expect(state.failedRequests.length, 'API requests should not fail during validation flow').toBe(0);

    if (STAGE === 'before') {
        expect(state.transportationManager.fleetViewMode).toBe('modal');
        expect(state.transportationManager.fuelModal.hasFuelTypeField).toBeTruthy();
        expect(state.transportationManager.fuelModal.hasFuelSourceField).toBeFalsy();

        expect(state.driver.hasFuelTypeField).toBeTruthy();
        expect(state.driver.hasFuelSourceField).toBeFalsy();
    } else {
        expect(state.transportationManager.fleetViewMode).toBe('section');
        expect(state.transportationManager.fuelModal.hasFuelTypeField).toBeFalsy();
        expect(state.transportationManager.fuelModal.hasFuelSourceField).toBeTruthy();

        expect(state.driver.hasFuelTypeField).toBeFalsy();
        expect(state.driver.hasFuelSourceField).toBeTruthy();
        expect(state.driver.internalCostRequired).toBeFalsy();
    }
});
