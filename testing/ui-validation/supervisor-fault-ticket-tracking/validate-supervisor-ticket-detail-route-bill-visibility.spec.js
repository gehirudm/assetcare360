const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const STAGE = process.env.VAL_STAGE || 'after';
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

async function mockSupervisorApis(page) {
    const user = {
        id: 9301,
        full_name: 'Supervisor Route Bill',
        role: 'Supervisor',
        employee_id: 'LITRO-SUP-9301',
    };

    const billImagePath = 'uploads/route-breakdowns/bills/bill-7001.jpg';

    await page.route('**/js/dashboard-init.js', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `
                const DashboardInit = {
                    async init(_allowedRoles, options = {}) {
                        const user = ${JSON.stringify(user)};
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

    await page.route('**/uploads/route-breakdowns/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'image/jpeg',
            body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
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
                success: true,
                data: user,
            });
        }

        if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: {
                    id: 7001,
                    ticket_id: 'TKT-7001',
                    breakdown_type: 'route_breakdown',
                    breakdown_report_id: 'RBD-7001',
                    route_garage_workflow_status: 'completed',
                    status: 'Resolved',
                    priority: 'High',
                    location: 'A1 Highway, Kadawatha',
                    description: 'Engine issue on route',
                    reporter_full_name: 'Driver Completed',
                    reported_by_name: 'Driver Completed',
                    created_at: '2026-04-20T08:30:00Z',
                    updated_at: '2026-04-20T10:45:00Z',
                    resolution_notes: 'Garage repair completed by driver.',
                    assignments: [],
                    work_updates: [],
                },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: {
                    breakdowns: [
                        {
                            id: 701,
                            route_breakdown_id: 'RBD-7001',
                            fault_ticket_id: 7001,
                            vehicle_id: 77,
                            number_plate: 'CAB-7001',
                            driver_name: 'Driver Completed',
                            breakdown_type: 'engine',
                            severity: 'high',
                            description: 'Engine issue on route',
                            breakdown_location: 'A1 Highway, Kadawatha',
                            status: 'Resolved',
                            ticket_status: 'Resolved',
                            garage_workflow_status: 'completed',
                            approved_garage_name: 'Metro Fleet Garage',
                            completed_at: '2026-04-20T10:30:00Z',
                            bill_amount: 18750.5,
                            bill_image_path: billImagePath,
                            completion_remarks: 'Replaced alternator belt and completed road test.',
                            garage_workflow: {
                                status: 'completed',
                                completed_at: '2026-04-20T10:30:00Z',
                                completed_by: 'Driver Completed',
                                bill_amount: 18750.5,
                                bill_image_path: billImagePath,
                                completion_remarks: 'Replaced alternator belt and completed road test.',
                                approved_garage: {
                                    id: 11,
                                    name: 'Metro Fleet Garage',
                                },
                            },
                        },
                    ],
                },
            });
        }

        if (pathname.includes('/api/budget-reports/ticket/') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: null,
            });
        }

        if (pathname.includes('/api/spare-part-requests/ticket/') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: [],
            });
        }

        return json(route, {
            status: 'success',
            success: true,
            data: {},
        });
    });
}

async function runValidation(page, viewportName, viewport) {
    const state = {
        console: [],
        failedRequests: [],
    };

    await page.setViewportSize(viewport);
    attachMonitors(page, state);
    await mockSupervisorApis(page);

    const detailUrl = `${BASE_URL}/view-ticket/index.html?id=7001&role_override=SUPERVISOR&embedded=1`;
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#mainContent')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#routeGarageBillBox')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#routeGarageBillAmount')).toContainText('18,750');
    await expect(page.locator('#routeGarageCompletedBy')).toContainText('Driver Completed');
    await expect(page.locator('#routeGarageCompletionRemarks')).toContainText('Replaced alternator belt and completed road test.');
    await expect(page.locator('#step6-resolver-role')).toContainText('Driver');

    const billLink = page.locator('#routeGarageBillImageLink');
    await expect(billLink).toBeVisible();
    const billHref = await billLink.getAttribute('href');
    expect(billHref).toContain('/uploads/route-breakdowns/bills/bill-7001.jpg');

    const billPreview = page.locator('#routeGarageBillImagePreview');
    await expect(billPreview).toBeVisible();
    const billPreviewSrc = await billPreview.getAttribute('src');
    expect(billPreviewSrc).toContain('/uploads/route-breakdowns/bills/bill-7001.jpg');

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}-route-bill-visibility.png`),
        fullPage: true,
    });

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}-route-bill-visibility.json`),
        JSON.stringify({
            stage: STAGE,
            viewport: viewportName,
            detailUrl,
            finalUrl: page.url(),
            billHref,
            billPreviewSrc,
            console: state.console,
            failedRequests: state.failedRequests,
        }, null, 2)
    );
}

test('supervisor route bill visibility desktop', async ({ page }) => {
    await runValidation(page, 'desktop', { width: 1440, height: 900 });
});

test('supervisor route bill visibility mobile', async ({ page }) => {
    await runValidation(page, 'mobile', { width: 390, height: 844 });
});
