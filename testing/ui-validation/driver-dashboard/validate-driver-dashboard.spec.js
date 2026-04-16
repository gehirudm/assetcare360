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
                severity: 'high',
                breakdown_type: 'engine',
                description: 'Engine overheating on Matara Road',
                breakdown_date: '2026-04-12',
                status: 'Assigned',
                ticket_status: 'Assigned',
            },
        ],
        routeBreakdowns: [
            {
                id: 21,
                route_breakdown_id: 'RBR-001',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                severity: 'medium',
                breakdown_type: 'tires',
                breakdown_location: 'Galle Highway Exit 12',
                breakdown_datetime: '2026-04-11T14:20:00Z',
                description: 'Front tire puncture',
                status: 'Resolved',
                ticket_status: 'Resolved',
            },
        ],
    };
}

async function mockApi(page, fixtures) {
    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        const json = (body, status = 200) => route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: fixtures.user,
            });
        }

        if (pathname.endsWith('/api/trips') && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: { trips: fixtures.trips },
            });
        }

        if (pathname.endsWith('/api/trips') && method === 'POST') {
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

        if (pathname.match(/\/api\/trips\/[^/]+$/) && method === 'PUT') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (pathname.match(/\/api\/trips\/[^/]+\/(start|end|cancel)$/) && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (pathname.endsWith('/api/vehicle-checks') && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: fixtures.checks,
            });
        }

        if (pathname.endsWith('/api/vehicle-checks') && method === 'POST') {
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

        if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: { reports: fixtures.reports },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: { breakdowns: fixtures.routeBreakdowns },
            });
        }

        if (pathname.endsWith('/api/breakdown-reports') && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (pathname.match(/\/api\/(breakdown-reports|route-breakdowns)\/[^/]+$/) && (method === 'PUT' || method === 'DELETE')) {
            return json({ status: 'success', success: true, data: {} });
        }

        return route.continue();
    });
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
            layout.navigateTo('trip-log');
        }
    });

    await expect(page.locator('#trip-log')).toBeVisible();
    await page.locator('#trip-log [data-action="open-start-trip-modal"]').click();
    await expect(page.locator('#startTripModal')).toBeVisible();
    await page.locator('#startTripModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#startTripModal')).toBeHidden();

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('vehicle-check');
        }
    });

    await expect(page.locator('#vehicle-check')).toBeVisible();
    await page.locator('#vehicle-check [data-action="open-weekly-check"]').click();
    await expect(page.locator('#dailyCheckModal')).toBeVisible();
    await page.locator('#dailyCheckModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#dailyCheckModal')).toBeHidden();

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('breakdown');
        }
    });

    await expect(page.locator('#breakdown')).toBeVisible();
    await page.locator('#breakdown [data-action="open-breakdown-modal"]').click();
    await expect(page.locator('#breakdownModal')).toBeVisible();
    await page.locator('#breakdownModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#breakdownModal')).toBeHidden();

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('transport-ticket');
        }
    });

    await expect(page.locator('#transport-ticket')).toBeVisible();
    await page.locator('#transport-ticket [data-action="open-transport-ticket-modal"]').click();
    await expect(page.locator('#transportTicketModal')).toBeVisible();
    await page.locator('#transportTicketModal [data-action="close-modal"]').first().click();
    await expect(page.locator('#transportTicketModal')).toBeHidden();

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('ac-layout').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => ({
        activeSection: document.querySelector('.content-section.active')?.id || null,
        openModalCount: document.querySelectorAll('.modal.active').length,
        tripRows: document.querySelectorAll('#driverTripsList .inventory-item').length,
        checkRows: document.querySelectorAll('#driverChecksList .inventory-item').length,
        breakdownRows: document.querySelectorAll('#driverBreakdownList .inventory-item').length,
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
