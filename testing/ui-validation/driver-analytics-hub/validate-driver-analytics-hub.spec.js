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
                trip_id: 'TRP-101',
                origin: 'Colombo',
                destination: 'Kandy',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                starting_odometer: 45100,
                final_odometer: 45220,
                cargo_description: 'Spare parts crates',
                status: 'Completed',
                created_at: '2026-04-10T08:00:00Z',
            },
            {
                id: 2,
                trip_id: 'TRP-102',
                origin: 'Kandy',
                destination: 'Galle',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                starting_odometer: 45220,
                final_odometer: 45310,
                cargo_description: 'Machinery components',
                status: 'In Progress',
                created_at: '2026-04-11T09:10:00Z',
            },
            {
                id: 3,
                trip_id: 'TRP-103',
                origin: 'Galle',
                destination: 'Matara',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                starting_odometer: 45310,
                final_odometer: 45390,
                cargo_description: 'Fuel filters',
                status: 'Pending',
                created_at: '2026-04-13T07:30:00Z',
            },
        ],
        checks: [
            {
                id: 1,
                check_id: 'VCHK-101',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                odometer_reading: 45220,
                week_start_date: '2026-04-06',
                week_end_date: '2026-04-12',
                status: 'approved',
                engine_oil: 1,
                brakes: 1,
                lights: 1,
                tires: 1,
                coolant: 1,
                wipers: 1,
                notes: 'All checks passed',
            },
            {
                id: 2,
                check_id: 'VCHK-102',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                odometer_reading: 45340,
                week_start_date: '2026-04-13',
                week_end_date: '2026-04-19',
                status: 'pending',
                engine_oil: 1,
                brakes: 0,
                lights: 1,
                tires: 1,
                coolant: 0,
                wipers: 1,
                notes: 'Awaiting supervisor review',
            },
        ],
        reports: [
            {
                id: 11,
                breakdown_id: 'BR-201',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                severity: 'high',
                breakdown_type: 'engine',
                description: 'Engine overheating on Matara Road',
                breakdown_date: '2026-04-12T06:20:00Z',
                status: 'Assigned',
                ticket_status: 'Assigned',
            },
            {
                id: 12,
                breakdown_id: 'BR-202',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                severity: 'low',
                breakdown_type: 'electrical',
                description: 'Dashboard indicator intermittently failing',
                breakdown_date: '2026-04-15T08:45:00Z',
                status: 'Pending',
                ticket_status: 'Open',
            },
        ],
        routeBreakdowns: [
            {
                id: 21,
                route_breakdown_id: 'RBR-301',
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
                garage_workflow_status: 'garage_approved',
                approved_garage_name: 'FastFix Garage',
                bill_amount: null,
            },
            {
                id: 22,
                route_breakdown_id: 'RBR-302',
                vehicle_id: 1,
                number_plate: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                severity: 'medium',
                breakdown_type: 'tires',
                breakdown_location: 'Galle Highway Exit 12',
                breakdown_datetime: '2026-04-16T14:20:00Z',
                description: 'Front tire puncture',
                status: 'Resolved',
                ticket_status: 'Resolved',
                garage_workflow_status: 'completed',
                approved_garage_name: 'City Wheels Garage',
                bill_amount: 12500,
            },
        ],
        fuelLogs: [
            {
                id: 1,
                fuel_log_id: 'FL-101',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                log_datetime: '2026-04-09T09:20:00Z',
                fuel_volume: 35.5,
                total_cost: 14900,
                fuel_source: 'external',
                distance_since_last: 210,
                fuel_efficiency: 5.92,
                station_name: 'IOC Kottawa',
            },
            {
                id: 2,
                fuel_log_id: 'FL-102',
                vehicle_registration: 'LKA-1234',
                driver_id: 701,
                driver_name: 'Driver One',
                log_datetime: '2026-04-14T12:40:00Z',
                fuel_volume: 22.0,
                total_cost: null,
                fuel_source: 'internal',
                distance_since_last: 120,
                fuel_efficiency: 5.45,
                station_name: 'Main Depot',
            },
        ],
        garages: [
            {
                id: 90,
                name: 'FastFix Garage',
                address: 'Colombo Road, Maharagama',
                city: 'Maharagama',
                phone: '+94 11 123 4567',
                is_active: 1,
            },
            {
                id: 91,
                name: 'City Wheels Garage',
                address: 'Galle Main Street',
                city: 'Galle',
                phone: '+94 91 765 4321',
                is_active: 1,
            },
        ],
        notifications: [
            {
                notification_id: 'NTF-101',
                title: 'Trip Update',
                message: 'TRP-102 is now in progress',
                type: 'info',
                is_read: 0,
                created_at: '2026-04-11T09:15:00Z',
            },
            {
                notification_id: 'NTF-102',
                title: 'Breakdown Ticket',
                message: 'BR-201 assigned to technician',
                type: 'warning',
                is_read: 1,
                created_at: '2026-04-12T10:00:00Z',
            },
        ],
    };
}

async function mockDriverApis(page, fixtures) {
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

    await page.route('**/api/auth/me', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: fixtures.user,
            }),
        });
    });

    await page.route('**/api/vehicles/my-vehicle**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: {
                    id: 1,
                    vehicle_id: 'VEH-001',
                    number_plate: 'LKA-1234',
                    vehicle_name: 'Fleet Lorry 01',
                    vehicle_type: 'Truck',
                    current_mileage: 45390,
                    status: 'active',
                    fuel_type: 'diesel',
                    government_fuel_qr_image: null,
                },
            }),
        });
    });

    await page.route('**/api/trips**', (route) => {
        const request = route.request();
        const method = request.method();
        if (method === 'GET') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    success: true,
                    data: { trips: fixtures.trips },
                }),
            });
            return;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: {},
            }),
        });
    });

    await page.route('**/api/trips/*', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/vehicle-checks**', (route) => {
        const request = route.request();
        const method = request.method();
        if (method === 'GET') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    success: true,
                    data: fixtures.checks,
                }),
            });
            return;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/breakdown-reports**', (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    success: true,
                    data: { reports: fixtures.reports },
                }),
            });
            return;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/breakdown-reports/*', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/route-breakdowns**', (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    success: true,
                    data: { breakdowns: fixtures.routeBreakdowns },
                }),
            });
            return;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/route-breakdowns/*', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/fuel-logs**', (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    success: true,
                    data: { fuel_logs: fixtures.fuelLogs },
                }),
            });
            return;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/fuel-logs/*', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/garages**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: { garages: fixtures.garages },
            }),
        });
    });

    await page.route('**/api/notifications**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: {
                    notifications: fixtures.notifications,
                    unread_count: fixtures.notifications.filter((item) => Number(item.is_read) === 0).length,
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: fixtures.notifications.length,
                        total_pages: 1,
                    },
                },
            }),
        });
    });

    await page.route('**/api/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**://localhost:8000/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
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

async function navigateSection(page, sectionId, fallbackLabel) {
    const moved = await page.evaluate((targetSection) => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo(targetSection);
        return true;
    }, sectionId);

    if (!moved && fallbackLabel) {
        await page.getByRole('navigation').getByText(fallbackLabel).click();
    }
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
    };

    await mockDriverApis(page, fixtures);
    attachMonitors(page, state);

    await page.goto(`${BASE_URL}/dashboard/driver/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible();

    let interactionSummary = {
        stage: STAGE,
        analyticsNavPresent: false,
        analyticsSectionPresent: false,
        activeSection: await page.evaluate(() => document.querySelector('.content-section.active')?.id || null),
        reportRows: 0,
        downloadSuggestedFilename: null,
    };

    if (STAGE === 'before') {
        const analyticsNav = page.locator('.nav-item', { hasText: 'Analytics' });
        await expect(analyticsNav).toHaveCount(0);

        interactionSummary = {
            ...interactionSummary,
            analyticsNavPresent: false,
            analyticsSectionPresent: await page.locator('#analytics').count() > 0,
        };
    } else {
        const analyticsNav = page.locator('.nav-item', { hasText: 'Analytics' });
        await expect(analyticsNav).toHaveCount(1);

        await navigateSection(page, 'analytics', 'Analytics');

        await expect(page.locator('#analytics .page-title')).toContainText('Driver Analytics');
        await expect(page.locator('#analytics .analytics-option-btn')).toHaveCount(5);

        await page.fill('#driverAnalyticsFromDate', '2026-04-01');
        await page.fill('#driverAnalyticsToDate', '2026-04-30');
        await page.click('#analytics [data-action="apply-filter"]');

        await expect(page.locator('#driverAnalyticsStatus')).toContainText(/updated|showing/i);

        await page.click('#analytics .analytics-option-btn[data-view="fuel"]');
        await expect(page.locator('#analytics .driver-analytics-panel.active .chart-card')).toHaveCount(2);

        await page.click('#analytics .analytics-option-btn[data-view="workflow"]');
        await expect(page.locator('#analytics .driver-analytics-panel.active .chart-card')).toHaveCount(2);

        await page.selectOption('#driverReportScope', 'active');
        await page.click('#analytics [data-action="generate-report"]');
        await expect(page.locator('#driverReportStatus')).toContainText(/generated successfully/i);

        const rowsCount = await page.locator('#driverReportPreview tbody tr').count();
        const downloadBtn = page.locator('#driverReportDownloadBtn');
        await expect(downloadBtn).toBeEnabled();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            downloadBtn.click(),
        ]);

        interactionSummary = {
            ...interactionSummary,
            analyticsNavPresent: true,
            analyticsSectionPresent: await page.locator('#analytics').count() > 0,
            activeSection: await page.evaluate(() => document.querySelector('.content-section.active')?.id || null),
            reportRows: rowsCount,
            downloadSuggestedFilename: download.suggestedFilename(),
        };
    }

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

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

test('driver analytics hub validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('driver analytics hub validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
