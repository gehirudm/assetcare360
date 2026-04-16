const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

async function mockDriverApi(page, state) {
    const routeBreakdowns = [
        {
            id: 501,
            route_breakdown_id: 'RBD-501',
            driver_id: 901,
            driver_name: 'Driver One',
            number_plate: 'WP-CAB-1234',
            breakdown_type: 'engine',
            severity: 'high',
            description: 'Engine warning light remains on',
            status: 'Pending',
            ticket_status: 'Pending',
            garage_workflow_status: 'awaiting_supervisor_approval',
            garage_workflow: {
                status: 'awaiting_supervisor_approval',
            },
        },
        {
            id: 502,
            route_breakdown_id: 'RBD-502',
            driver_id: 901,
            driver_name: 'Driver One',
            number_plate: 'WP-CAB-2345',
            breakdown_type: 'brakes',
            severity: 'medium',
            description: 'Brake pedal feels soft',
            status: 'In Progress',
            ticket_status: 'Assigned',
            approved_garage_name: 'AutoCare Service Center',
            garage_workflow_status: 'garage_approved',
            garage_workflow: {
                status: 'garage_approved',
                approved_garage: {
                    id: 1,
                    name: 'AutoCare Service Center',
                    address: '123 Galle Road, Colombo 03',
                },
            },
        },
        {
            id: 503,
            route_breakdown_id: 'RBD-503',
            driver_id: 901,
            driver_name: 'Driver One',
            number_plate: 'WP-CAB-3456',
            breakdown_type: 'electrical',
            severity: 'critical',
            description: 'Electrical failure after startup',
            status: 'In Progress',
            ticket_status: 'In Progress',
            approved_garage_name: 'Reliable Motors',
            garage_workflow_status: 'repair_in_progress',
            garage_workflow: {
                status: 'repair_in_progress',
                approved_garage: {
                    id: 2,
                    name: 'Reliable Motors',
                    address: '456 Kandy Road, Kadawatha',
                },
            },
        },
    ];

    const garages = [
        {
            id: 1,
            name: 'AutoCare Service Center',
            address: '123 Galle Road, Colombo 03',
            city: 'Colombo',
            phone: '+94 11 234 5678',
            latitude: 6.9032,
            longitude: 79.8501,
            is_active: 1,
        },
        {
            id: 2,
            name: 'Reliable Motors',
            address: '456 Kandy Road, Kadawatha',
            city: 'Kadawatha',
            phone: '+94 11 345 6789',
            latitude: 7.0014,
            longitude: 79.9496,
            is_active: 1,
        },
    ];

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
                    id: 901,
                    employee_id: 'LITRO-DRIVER-001',
                    full_name: 'Driver One',
                    role: 'Driver',
                },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    breakdowns: routeBreakdowns,
                    count: routeBreakdowns.length,
                },
            });
        }

        if (/\/api\/route-breakdowns\/\d+$/.test(pathname) && method === 'GET') {
            const id = Number(pathname.split('/').pop());
            const found = routeBreakdowns.find((item) => item.id === id) || routeBreakdowns[0];
            return json(route, {
                status: 'success',
                data: {
                    breakdown: {
                        ...found,
                        garage_updates: [],
                        available_garages: garages,
                    },
                },
            });
        }

        if (/\/api\/route-breakdowns\/502\/garage-entry$/.test(pathname) && method === 'POST') {
            state.entryCalls += 1;
            return json(route, { status: 'success', message: 'Garage entry logged' });
        }

        if (/\/api\/route-breakdowns\/503\/garage-progress$/.test(pathname) && method === 'POST') {
            state.progressCalls += 1;
            return json(route, { status: 'success', message: 'Progress update submitted' });
        }

        if (/\/api\/route-breakdowns\/503\/garage-complete$/.test(pathname) && method === 'POST') {
            state.completeCalls += 1;
            return json(route, { status: 'success', message: 'Route breakdown completed' });
        }

        if (pathname.endsWith('/api/garages') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    garages,
                    count: garages.length,
                },
            });
        }

        if (pathname.endsWith('/api/trips') && method === 'GET') {
            return json(route, { status: 'success', data: { trips: [] } });
        }

        if (pathname.endsWith('/api/trips/active-count') && method === 'GET') {
            return json(route, { status: 'success', data: { active_count: 0 } });
        }

        if (pathname.endsWith('/api/vehicle-checks') && method === 'GET') {
            return json(route, { status: 'success', data: { checks: [] } });
        }

        if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
            return json(route, { status: 'success', data: { reports: [] } });
        }

        if (pathname.endsWith('/api/fuel-logs') && method === 'GET') {
            return json(route, { status: 'success', data: { fuel_logs: [] } });
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

        if (pathname.endsWith('/api/vehicles/my-vehicle') && method === 'GET') {
            return json(route, { status: 'success', data: { id: 10, number_plate: 'WP-CAB-1234', vehicle_name: 'Cab' } });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json(route, { status: 'success', data: { vehicles: [] } });
        }

        return json(route, { status: 'success', data: {} });
    });
}

async function mockSupervisorApi(page, state) {
    const routeBreakdowns = [
        {
            id: 701,
            route_breakdown_id: 'RBD-701',
            number_plate: 'WP-CAB-7001',
            vehicle_id: 55,
            driver_name: 'Driver Seven',
            breakdown_type: 'engine',
            severity: 'high',
            description: 'Engine stalled on route',
            status: 'Pending',
            ticket_status: 'Pending',
            garage_workflow_status: 'awaiting_supervisor_approval',
            garage_workflow: {
                status: 'awaiting_supervisor_approval',
            },
        },
    ];

    const garages = [
        {
            id: 1,
            name: 'AutoCare Service Center',
            address: '123 Galle Road, Colombo 03',
            city: 'Colombo',
            phone: '+94 11 234 5678',
            is_active: 1,
        },
    ];

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
                    id: 404,
                    employee_id: 'LITRO-SUPERVISOR-001',
                    full_name: 'Supervisor One',
                    role: 'Supervisor',
                },
            });
        }

        if (pathname.endsWith('/api/machine-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', data: { reports: [] } });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', data: { breakdowns: routeBreakdowns, count: routeBreakdowns.length } });
        }

        if (pathname.endsWith('/api/garages') && method === 'GET') {
            return json(route, { status: 'success', data: { garages, count: garages.length } });
        }

        if (/\/api\/route-breakdowns\/701\/garage-approval$/.test(pathname) && method === 'POST') {
            state.approvalCalls += 1;
            return json(route, { status: 'success', message: 'Garage approved successfully' });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json(route, { status: 'success', data: { tickets: [] } });
        }

        if (pathname.endsWith('/api/technicians') && method === 'GET') {
            return json(route, { status: 'success', data: { users: [] } });
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

function attachMonitors(page, state, scope) {
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'warning' || type === 'error') {
            state.console.push({
                scope,
                type,
                text: msg.text(),
            });
        }
    });

    page.on('response', (response) => {
        if (response.status() >= 400) {
            state.failedRequests.push({
                scope,
                url: response.url(),
                method: response.request().method(),
                status: response.status(),
            });
        }
    });
}

async function runDriverFlow(page, viewportName, artifact) {
    const state = {
        entryCalls: 0,
        progressCalls: 0,
        completeCalls: 0,
    };

    await mockDriverApi(page, state);
    attachMonitors(page, artifact, 'driver');

    await page.goto(`${BASE_URL}/dashboard/driver/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('ticket-tracking');
        }
    });

    await expect(page.locator('#ticket-tracking')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Ticket Tracking' })).toBeVisible({ timeout: 10000 });

    const approvedCard = page.locator('#driverTicketTrackingList .inventory-item').filter({ hasText: 'RBD-502' });
    await expect(approvedCard).toBeVisible({ timeout: 10000 });
    await approvedCard.locator('[data-action="log-garage-entry"]').click();

    await expect(page.locator('#nearbyGaragesModal')).toHaveClass(/active/, { timeout: 10000 });
    await page.fill('#garageEntryNotes', 'Arrived at approved garage and handed over vehicle.');
    await page.locator('#garageEntrySubmitBtn').click();
    await expect.poll(() => state.entryCalls).toBe(1);

    const inProgressCard = page.locator('#driverTicketTrackingList .inventory-item').filter({ hasText: 'RBD-503' });
    await expect(inProgressCard).toBeVisible({ timeout: 10000 });

    await inProgressCard.locator('[data-action="add-garage-progress"]').click();
    await expect(page.locator('#garageProgressModal')).toHaveClass(/active/, { timeout: 10000 });
    await page.fill('#garageProgressNote', 'Completed electrical diagnostics and replaced damaged relay.');
    await page.setInputFiles('#garageProgressImages', [{
        name: 'progress.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-jpg-content'),
    }]);
    await page.locator('#garageProgressForm button[type="submit"]').click();
    await expect.poll(() => state.progressCalls).toBe(1);

    await inProgressCard.locator('[data-action="complete-garage-breakdown"]').click();
    await expect(page.locator('#completeBreakdownModal')).toHaveClass(/active/, { timeout: 10000 });
    await page.fill('#completeBillAmount', '12500');
    await page.fill('#completeRemarks', 'Repair completed and vehicle test run passed.');
    await page.setInputFiles('#completeBillImage', [{
        name: 'bill.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-bill-content'),
    }]);
    await page.locator('#completeBreakdownForm button[type="submit"]').click();
    await expect.poll(() => state.completeCalls).toBe(1);

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}-driver.png`),
        fullPage: true,
    });

    artifact.driver = {
        url: page.url(),
        actions: {
            entryCalls: state.entryCalls,
            progressCalls: state.progressCalls,
            completeCalls: state.completeCalls,
        },
        ui: await page.evaluate(() => ({
            activeSection: document.querySelector('.content-section.active')?.id || null,
            ticketRows: document.querySelectorAll('#driverTicketTrackingList .inventory-item').length,
            openModalCount: document.querySelectorAll('.modal.active').length,
        })),
    };
}

async function runSupervisorFlow(page, viewportName, artifact) {
    const state = {
        approvalCalls: 0,
    };

    await mockSupervisorApi(page, state);
    attachMonitors(page, artifact, 'supervisor');

    await page.goto(`${BASE_URL}/dashboard/supervisor/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('fault-ticket-tracking');
        }
    });

    await expect(page.locator('#fault-ticket-tracking')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Fault Tickets' })).toBeVisible({ timeout: 10000 });

    const routeCard = page.locator('#supervisorFaultTicketList .inventory-item').filter({ hasText: 'RBD-701' });
    await expect(routeCard).toBeVisible({ timeout: 10000 });
    await routeCard.locator('[data-action="approve-garage"]').click();

    await expect(page.locator('#garageApprovalModal')).toBeVisible({ timeout: 10000 });
    await page.selectOption('#garageApprovalSelect', '1');
    await page.fill('#garageApprovalNotes', 'Approved nearest garage for immediate repair.');
    await page.locator('#garageApprovalForm button[type="submit"]').click();
    await expect.poll(() => state.approvalCalls).toBe(1);
    await expect(page.locator('#garageApprovalModal')).toBeHidden({ timeout: 5000 });

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}-supervisor.png`),
        fullPage: true,
    });

    artifact.supervisor = {
        url: page.url(),
        actions: {
            approvalCalls: state.approvalCalls,
        },
        ui: await page.evaluate(() => ({
            activeSection: document.querySelector('.content-section.active')?.id || null,
            ticketRows: document.querySelectorAll('#supervisorFaultTicketList .inventory-item').length,
            modalVisible: document.querySelector('#garageApprovalModal')
                ? document.querySelector('#garageApprovalModal').style.display !== 'none'
                : false,
        })),
    };
}

async function runValidation(browser, viewportName, viewport) {
    const artifact = {
        stage: STAGE,
        viewport: viewportName,
        title: null,
        console: [],
        failedRequests: [],
        driver: null,
        supervisor: null,
    };

    const driverContext = await browser.newContext({ viewport });
    const driverPage = await driverContext.newPage();
    await runDriverFlow(driverPage, viewportName, artifact);
    artifact.title = await driverPage.title();
    await driverContext.close();

    const supervisorContext = await browser.newContext({ viewport });
    const supervisorPage = await supervisorContext.newPage();
    await runSupervisorFlow(supervisorPage, viewportName, artifact);
    await supervisorContext.close();

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('route breakdown garage workflow desktop validation', async ({ browser }) => {
    await runValidation(browser, 'desktop', { width: 1440, height: 900 });
});

test('route breakdown garage workflow mobile validation', async ({ browser }) => {
    await runValidation(browser, 'mobile', { width: 390, height: 844 });
});
