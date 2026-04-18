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
                ticket_status: 'In Progress',
            },
        ],
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

        if (normalizedPath === '/breakdown-reports' && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (normalizedPath === '/route-breakdowns' && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
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

    await page.locator('#ticket-tracking .filter-btn', { hasText: 'Pending' }).click();
    await page.locator('#ticket-tracking .filter-btn', { hasText: 'All Tickets' }).click();

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
