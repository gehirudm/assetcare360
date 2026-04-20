const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

async function mockSupervisorApis(page) {
    const user = {
        id: 9201,
        full_name: 'Supervisor Toast Validation',
        role: 'Supervisor',
        employee_id: 'LITRO-SUP-9201',
    };

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
                data: { tickets: [] },
                tickets: [],
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

        if (pathname.includes('/api/machine-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { reports: [] },
            });
        }

        return json(route, {
            status: 'success',
            success: true,
            data: {},
        });
    });
}

test('supervisor ticket detail toast stays anchored after detail assets load', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockSupervisorApis(page);

    await page.goto(`${BASE_URL}/dashboard/supervisor/index.html?section=ticket-details`, {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('ac-layout')).toBeVisible();

    await page.evaluate(async () => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('ticket-details');
        }

        const detailView = document.querySelector('#ticket-details supervisor-ticket-detail-view');
        if (detailView && typeof detailView.ensureViewTicketAssets === 'function') {
            await detailView.ensureViewTicketAssets();
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Toast style probe', 'warning');
        }
    });

    // Wait for show animation to settle before geometry assertions.
    await page.waitForTimeout(360);

    const toast = page.locator('body > #toast');
    await expect(toast).toBeVisible();

    const metrics = await page.evaluate(() => {
        const node = document.querySelector('body > #toast');
        if (!node) {
            return null;
        }

        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();

        return {
            position: style.position,
            top: style.top,
            left: style.left,
            right: style.right,
            display: style.display,
            height: rect.height,
            width: rect.width,
            x: rect.x,
            y: rect.y,
            viewportWidth: window.innerWidth,
        };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.position).toBe('fixed');
    expect(metrics.top).toBe('20px');
    expect(metrics.right).toBe('20px');
    expect(metrics.display).not.toBe('none');
    expect(metrics.height).toBeLessThan(120);
    expect(metrics.y).toBeLessThan(80);
    expect(metrics.x + metrics.width).toBeLessThanOrEqual(metrics.viewportWidth);
});
