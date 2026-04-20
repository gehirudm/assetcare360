const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

async function mockRoleApis(page, { user, faultTickets }) {
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

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        if (pathname.includes('/api/auth/me') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: user,
            });
        }

        if (pathname.includes('/api/fault-tickets') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { tickets: faultTickets },
                tickets: faultTickets,
            });
        }

        if (pathname.includes('/api/machine-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { reports: [] },
            });
        }

        if (pathname.includes('/api/route-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { breakdowns: [] },
            });
        }

        if (pathname.includes('/api/breakdown-reports') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { reports: [] },
            });
        }

        if (pathname.includes('/api/vehicle-weekly-checks') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { checks: [] },
            });
        }

        if (pathname.includes('/api/machine-weekly-checks') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { checks: [] },
            });
        }

        if (pathname.includes('/api/budget-reports/pending') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { reports: [] },
            });
        }

        if (pathname.includes('/api/notifications') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: {
                    notifications: [],
                    unread_count: 0,
                    pagination: {
                        page: 1,
                        limit: 50,
                        total: 0,
                        total_pages: 1,
                    },
                },
            });
        }

        if (pathname.includes('/api/users') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { users: [] },
            });
        }

        if (pathname.includes('/api/spare-part-requests') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { requests: [] },
            });
        }

        if (pathname.includes('/api/vehicles') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { vehicles: [] },
            });
        }

        if (pathname.includes('/api/machines') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { machines: [] },
            });
        }

        return json(route, {
            status: 'success',
            success: true,
            data: {},
        });
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

test('supervisor analytics report generation and CSV download', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const supervisorFixtures = {
        user: {
            id: 6101,
            full_name: 'Supervisor Report User',
            role: 'Supervisor',
            employee_id: 'LITRO-SUP-REPORT-001',
        },
        faultTickets: [
            {
                id: 1001,
                ticket_id: 'TKT-1001',
                status: 'Assigned',
                priority: 'High',
                location: 'Yard A',
                created_at: '2026-04-10T10:00:00Z',
                assignments: [
                    { technician_name: 'Technician One' },
                ],
            },
            {
                id: 1002,
                ticket_id: 'TKT-1002',
                status: 'In Progress',
                priority: 'Medium',
                location: 'Yard B',
                created_at: '2026-03-10T10:00:00Z',
                assignments: [
                    { technician_name: 'Technician Two' },
                ],
            },
        ],
    };

    await mockRoleApis(page, supervisorFixtures);

    await page.goto(`${BASE_URL}/dashboard/supervisor/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible();

    await navigateSection(page, 'analytics', 'Analytics');

    await expect(page.locator('#analytics .page-title')).toContainText('Supervisor Analytics');

    await page.fill('#svReportFromDate', '2026-04-01');
    await page.fill('#svReportToDate', '2026-04-30');
    await page.selectOption('#svReportScope', 'tickets');

    await page.click('#analytics [data-action="generate-report"]');
    await expect(page.locator('#svReportStatus')).toContainText(/generated successfully/i);
    await expect(page.locator('#svReportPreview tbody tr')).toHaveCount(1);

    const downloadBtn = page.locator('#svReportDownloadBtn');
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadBtn.click(),
    ]);

    expect(download.suggestedFilename()).toContain('supervisor-tickets-report-');
});

test('technical officer analytics report generation and CSV download', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const toFixtures = {
        user: {
            id: 7201,
            full_name: 'TO Report User',
            role: 'Technical Officer',
            employee_id: 'LITRO-TO-REPORT-001',
        },
        faultTickets: [
            {
                id: 2001,
                ticket_id: 'TKT-2001',
                status: 'In Progress',
                priority: 'High',
                location: 'Route North',
                created_at: '2026-04-12T11:00:00Z',
                assignments: [
                    {
                        assigned_to: 7201,
                        assignee_name: 'TO Report User',
                    },
                ],
            },
            {
                id: 2002,
                ticket_id: 'TKT-2002',
                status: 'Assigned',
                priority: 'Medium',
                location: 'Route South',
                created_at: '2026-04-14T11:00:00Z',
                assignments: [
                    {
                        assigned_to: 9999,
                        assignee_name: 'Other Officer',
                    },
                ],
            },
            {
                id: 2003,
                ticket_id: 'TKT-2003',
                status: 'Assigned',
                priority: 'Low',
                location: 'Depot East',
                created_at: '2026-03-02T11:00:00Z',
                assignments: [
                    {
                        assigned_to: 7201,
                        assignee_name: 'TO Report User',
                    },
                ],
            },
        ],
    };

    await mockRoleApis(page, toFixtures);

    await page.goto(`${BASE_URL}/dashboard/technical-officer/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible();

    await navigateSection(page, 'analytics', 'Analytics');

    await expect(page.locator('#analytics .page-title')).toContainText('Technical Officer Analytics');

    await page.fill('#toReportFromDate', '2026-04-01');
    await page.fill('#toReportToDate', '2026-04-30');
    await page.selectOption('#toReportScope', 'tickets');

    await page.click('#analytics [data-action="generate-report"]');
    await expect(page.locator('#toReportStatus')).toContainText(/generated successfully/i);
    await expect(page.locator('#toReportPreview tbody tr')).toHaveCount(1);

    const downloadBtn = page.locator('#toReportDownloadBtn');
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadBtn.click(),
    ]);

    expect(download.suggestedFilename()).toContain('technical-officer-tickets-report-');
});
