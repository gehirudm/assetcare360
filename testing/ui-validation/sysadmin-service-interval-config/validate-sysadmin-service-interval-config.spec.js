const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const OUT_DIR = __dirname;
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';

function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function buildFixtures() {
    const today = new Date();
    const inTwoDays = formatDate(addDays(today, 2));
    const inFiveDays = formatDate(addDays(today, 5));

    return {
        vehicles: [
            {
                id: 1,
                vehicle_id: 'VEH-001',
                vehicle_name: 'Service Van 01',
                number_plate: 'CAA-1234',
                service_interval_type: 'Both',
                service_interval_days: 30,
                service_interval_km: 5000,
                current_mileage: 9700,
                last_service_mileage: 5000,
                next_service_mileage: 10000,
                last_service_date: formatDate(addDays(today, -28)),
                next_service_date: inTwoDays,
                status: 'Active',
            },
            {
                id: 2,
                vehicle_id: 'VEH-002',
                vehicle_name: 'Cargo Truck 02',
                number_plate: 'CAB-9281',
                service_interval_type: 'Time-Based',
                service_interval_days: 45,
                service_interval_km: null,
                current_mileage: 42000,
                last_service_mileage: 39000,
                next_service_mileage: null,
                last_service_date: formatDate(addDays(today, -40)),
                next_service_date: inFiveDays,
                status: 'Active',
            },
        ],
        machines: [
            {
                id: 1,
                machine_id: 'MCH-001',
                machine_name: 'Excavator A',
                model_number: 'EX-90',
                service_interval_days: 60,
                service_interval_hours: 200,
                current_operating_hours: 395,
                last_service_hours: 200,
                next_service_hours: 400,
                last_service_date: formatDate(addDays(today, -55)),
                next_service_date: inFiveDays,
                status: 'Active',
            },
            {
                id: 2,
                machine_id: 'MCH-002',
                machine_name: 'Forklift B',
                model_number: 'FL-20',
                service_interval_days: 90,
                service_interval_hours: 300,
                current_operating_hours: 120,
                last_service_hours: 0,
                next_service_hours: 300,
                last_service_date: formatDate(addDays(today, -20)),
                next_service_date: formatDate(addDays(today, 70)),
                status: 'Active',
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

function isDueByDate(nextServiceDate) {
    if (!nextServiceDate) {
        return false;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueBoundary = addDays(now, 7);
    const dueDate = new Date(`${nextServiceDate}T00:00:00`);

    if (Number.isNaN(dueDate.getTime())) {
        return false;
    }

    return dueDate <= dueBoundary;
}

function getDueVehicles(vehicles) {
    return vehicles.filter((vehicle) => {
        const dueByDate = isDueByDate(vehicle.next_service_date);
        const currentMileage = Number(vehicle.current_mileage);
        const nextMileage = Number(vehicle.next_service_mileage);
        const dueByMileage = Number.isFinite(currentMileage)
            && Number.isFinite(nextMileage)
            && currentMileage >= (nextMileage - 500);

        return dueByDate || dueByMileage;
    });
}

function getDueMachines(machines) {
    return machines.filter((machine) => {
        const dueByDate = isDueByDate(machine.next_service_date);
        const currentHours = Number(machine.current_operating_hours);
        const nextHours = Number(machine.next_service_hours);
        const dueByHours = Number.isFinite(currentHours)
            && Number.isFinite(nextHours)
            && currentHours >= Math.max(nextHours - 10, 0);

        return dueByDate || dueByHours;
    });
}

function jsonResponse(body) {
    return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
    };
}

async function stubApi(page, fixtures) {
    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();
        const pathName = url.pathname;

        if (pathName.endsWith('/auth/me') && method === 'GET') {
            await route.fulfill(jsonResponse({
                status: 'success',
                data: {
                    id: 999,
                    employee_id: 'LITRO-ADMIN-VALIDATION',
                    full_name: 'SysAdmin Validation User',
                    role: 'Admin',
                },
            }));
            return;
        }

        if (pathName.endsWith('/users') && method === 'GET') {
            await route.fulfill(jsonResponse({
                status: 'success',
                data: { users: [] },
            }));
            return;
        }

        if (pathName.endsWith('/machines') && method === 'GET') {
            await route.fulfill(jsonResponse({
                status: 'success',
                data: {
                    machines: fixtures.machines,
                    pagination: {
                        page: 1,
                        per_page: 200,
                        total: fixtures.machines.length,
                        total_pages: 1,
                    },
                },
            }));
            return;
        }

        if (pathName.endsWith('/vehicles') && method === 'GET') {
            await route.fulfill(jsonResponse({
                status: 'success',
                data: {
                    vehicles: fixtures.vehicles,
                    pagination: {
                        page: 1,
                        per_page: 200,
                        total: fixtures.vehicles.length,
                        total_pages: 1,
                    },
                },
            }));
            return;
        }

        if (pathName.endsWith('/machines/due-service') && method === 'GET') {
            await route.fulfill(jsonResponse({
                status: 'success',
                data: { machines: getDueMachines(fixtures.machines) },
            }));
            return;
        }

        if (pathName.endsWith('/vehicles/due-service') && method === 'GET') {
            await route.fulfill(jsonResponse({
                status: 'success',
                data: { vehicles: getDueVehicles(fixtures.vehicles) },
            }));
            return;
        }

        const machineUpdateMatch = pathName.match(/\/api\/machines\/(\d+)$/);
        if (machineUpdateMatch && method === 'PUT') {
            const machineId = Number(machineUpdateMatch[1]);
            const payload = request.postDataJSON();
            const machineIndex = fixtures.machines.findIndex((machine) => machine.id === machineId);

            if (machineIndex === -1) {
                await route.fulfill(jsonResponse({ status: 'error', message: 'Machine not found' }));
                return;
            }

            const updatedMachine = {
                ...fixtures.machines[machineIndex],
                ...payload,
            };

            if (payload.service_interval_hours != null) {
                const baseHours = payload.last_service_hours != null
                    ? Number(payload.last_service_hours)
                    : Number(updatedMachine.last_service_hours ?? updatedMachine.current_operating_hours ?? 0);
                updatedMachine.next_service_hours = Number(baseHours) + Number(payload.service_interval_hours);
            }

            fixtures.machines[machineIndex] = updatedMachine;
            await route.fulfill(jsonResponse({
                status: 'success',
                message: 'Machine updated successfully',
                data: updatedMachine,
            }));
            return;
        }

        const vehicleUpdateMatch = pathName.match(/\/api\/vehicles\/(\d+)$/);
        if (vehicleUpdateMatch && method === 'PUT') {
            const vehicleId = Number(vehicleUpdateMatch[1]);
            const payload = request.postDataJSON();
            const vehicleIndex = fixtures.vehicles.findIndex((vehicle) => vehicle.id === vehicleId);

            if (vehicleIndex === -1) {
                await route.fulfill(jsonResponse({ status: 'error', message: 'Vehicle not found' }));
                return;
            }

            const updatedVehicle = {
                ...fixtures.vehicles[vehicleIndex],
                ...payload,
            };

            if (payload.service_interval_km != null) {
                const baseMileage = payload.last_service_mileage != null
                    ? Number(payload.last_service_mileage)
                    : Number(updatedVehicle.last_service_mileage ?? updatedVehicle.current_mileage ?? 0);
                updatedVehicle.next_service_mileage = Number(baseMileage) + Number(payload.service_interval_km);
            }

            fixtures.vehicles[vehicleIndex] = updatedVehicle;
            await route.fulfill(jsonResponse({
                status: 'success',
                message: 'Vehicle updated successfully',
                data: updatedVehicle,
            }));
            return;
        }

        await route.fulfill(jsonResponse({
            status: 'success',
            data: {},
        }));
    });
}

async function navigateToServiceConfig(page) {
    const moved = await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo('service-config');
        return true;
    });

    if (!moved) {
        await page.getByRole('navigation').getByText('Service Configuration').click();
    }
}

async function runFlow(page, viewportName) {
    const state = {
        console: [],
        failedRequests: [],
    };

    const fixtures = buildFixtures();

    attachMonitors(page, state);
    await stubApi(page, fixtures);

    await page.goto(`${BASE_URL}/dashboard/sysadministration/index.html`, { waitUntil: 'domcontentloaded' });
    await navigateToServiceConfig(page);

    await expect(page.getByRole('heading', { name: 'Service Interval Configuration' })).toBeVisible();
    await expect(page.locator('#serviceConfigRows tr')).toHaveCount(4);
    await expect(page.locator('#serviceAlertList .notification-item').first()).toBeVisible();

    await page.getByRole('button', { name: 'Add Service Interval' }).click();
    await expect(page.locator('#addServiceIntervalModal')).toBeVisible();
    await page.selectOption('#saIntervalAssetType', 'machine');
    await page.selectOption('#saIntervalAssetId', '1');
    await page.fill('#saIntervalDays', '45');
    await page.fill('#saIntervalHours', '180');
    await page.locator('#saIntervalSubmitBtn').click();

    await expect(page.locator('#addServiceIntervalModal')).toBeHidden();

    await page.getByRole('button', { name: 'Add Service Interval' }).click();
    await expect(page.locator('#addServiceIntervalModal')).toBeVisible();
    await page.selectOption('#saIntervalAssetType', 'vehicle');
    await page.selectOption('#saIntervalAssetId', '1');
    await page.fill('#saIntervalDays', '60');
    await page.fill('#saIntervalKm', '6000');
    await page.locator('#saIntervalSubmitBtn').click();

    await expect(page.locator('#addServiceIntervalModal')).toBeHidden();
    await expect(page.locator('#serviceConfigRows')).toContainText('6,000 km');
    await expect(page.locator('#serviceConfigRows')).toContainText('180 hours');

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const configuredRows = document.querySelectorAll('#serviceConfigRows tr').length;
        const alertCount = document.querySelectorAll('#serviceAlertList .notification-item').length;

        return {
            activeSection,
            configuredRows,
            alertCount,
            hasVehicleMileageInterval: document.querySelector('#serviceConfigRows')?.textContent?.includes('6,000 km') || false,
            hasMachineHourInterval: document.querySelector('#serviceConfigRows')?.textContent?.includes('180 hours') || false,
            modalOpen: document.getElementById('addServiceIntervalModal')?.classList.contains('active') || false,
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

test('sysadmin service interval validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('sysadmin service interval validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
