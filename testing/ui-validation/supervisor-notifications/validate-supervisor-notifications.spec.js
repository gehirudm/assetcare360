const { test, expect } = require('@playwright/test');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildState() {
    return {
        user: {
            id: 501,
            employee_id: 'LITRO-SUP-501',
            full_name: 'Supervisor Validation',
            role: 'Supervisor',
        },
        notifications: [
            {
                notification_id: 'NTF-SUP-001',
                title: 'New fault ticket created',
                message: 'A new fault ticket TKT-909 was created and is awaiting assignment.',
                type: 'info',
                is_read: 0,
                created_at: '2026-04-20T08:15:00Z',
            },
            {
                notification_id: 'NTF-SUP-002',
                title: 'New fault ticket created',
                message: 'A new fault ticket RBD-433 was created and is awaiting assignment.',
                type: 'warning',
                is_read: 0,
                created_at: '2026-04-20T08:20:00Z',
            },
            {
                notification_id: 'NTF-SUP-003',
                title: 'Budget review required',
                message: 'A budget report is waiting for your approval.',
                type: 'success',
                is_read: 1,
                created_at: '2026-04-20T08:05:00Z',
            },
        ],
    };
}

function unreadCount(state) {
    return state.notifications.filter((item) => Number(item.is_read) !== 1).length;
}

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

async function mockSupervisorNotificationsApi(page, state) {
    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const pathname = url.pathname;
        const method = request.method();

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: state.user,
            });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    notifications: state.notifications,
                    unread_count: unreadCount(state),
                    pagination: {
                        page: 1,
                        limit: 50,
                        total: state.notifications.length,
                        total_pages: 1,
                    },
                },
            });
        }

        if (pathname.endsWith('/api/notifications/read') && method === 'POST') {
            let payload = {};
            try {
                payload = request.postDataJSON() || {};
            } catch (error) {
                payload = {};
            }

            if (payload.mark_all === true) {
                state.notifications = state.notifications.map((item) => ({
                    ...item,
                    is_read: 1,
                }));
            } else if (payload.notification_id) {
                state.notifications = state.notifications.map((item) => {
                    if (item.notification_id === payload.notification_id) {
                        return { ...item, is_read: 1 };
                    }
                    return item;
                });
            }

            return json(route, {
                status: 'success',
                message: 'Notification read state updated',
                data: {
                    unread_count: unreadCount(state),
                },
            });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { tickets: [] },
            });
        }

        if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { reports: [] },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { breakdowns: [] },
            });
        }

        if (pathname.endsWith('/api/machine-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: { reports: [] },
            });
        }

        return json(route, {
            status: 'success',
            data: {},
        });
    });
}

async function readSidebarBadge(page) {
    return page.evaluate(() => {
        const badge = document.querySelector('ac-layout ac-sidebar #notifBadge');
        if (!badge) {
            return null;
        }

        return {
            text: String(badge.textContent || '').trim(),
            display: badge.style.display || '',
        };
    });
}

async function runScenario(page, viewportName) {
    const state = buildState();
    await mockSupervisorNotificationsApi(page, state);

    await page.goto(`${BASE_URL}/dashboard/supervisor/index.html?section=notifications`, {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('supervisor-notifications .page-title')).toContainText('Notifications', {
        timeout: 20000,
    });

    const root = page.locator('supervisor-notifications');

    await expect(root.locator('.supervisor-notifications-filters')).toBeVisible();
    await expect(root.locator('.notif-card')).toHaveCount(3);
    await expect(root.locator('#supervisorNotificationsFilterSummary')).toContainText('Showing all 3 notifications');

    await root.locator('select[data-filter="readStatus"]').selectOption('unread');
    await expect(root.locator('.notif-card')).toHaveCount(2);
    await expect(root.locator('#supervisorNotificationsFilterSummary')).toContainText('Showing 2 of 3 notifications');

    await root.locator('select[data-filter="type"]').selectOption('warning');
    await expect(root.locator('.notif-card')).toHaveCount(1);
    await expect(root.locator('.notif-desc').first()).toContainText('RBD-433');

    await root.locator('button[data-action="clear-filters"]').click();
    await expect(root.locator('.notif-card')).toHaveCount(3);
    await expect(root.locator('#supervisorNotificationsFilterSummary')).toContainText('Showing all 3 notifications');

    await root.locator('input[data-filter="search"]').fill('budget');
    await expect(root.locator('.notif-card')).toHaveCount(1);
    await expect(root.locator('.notif-title').first()).toContainText('Budget review required');

    await root.locator('input[data-filter="search"]').fill('');
    await root.locator('select[data-filter="sort"]').selectOption('oldest');
    await expect(root.locator('.notif-card')).toHaveCount(3);
    await expect(root.locator('.notif-title').first()).toContainText('Budget review required');

    await root.locator('button[data-action="clear-filters"]').click();
    await expect(root.locator('.notif-card')).toHaveCount(3);

    const initialBadge = await readSidebarBadge(page);
    expect(initialBadge).not.toBeNull();
    expect(initialBadge.text).toBe('2');

    await page.locator('supervisor-notifications button[data-notification-id]').first().click();
    await expect(page.locator('supervisor-notifications button[data-notification-id]')).toHaveCount(1);

    const afterSingleRead = await readSidebarBadge(page);
    expect(afterSingleRead).not.toBeNull();
    expect(afterSingleRead.text).toBe('1');

    await page.locator('supervisor-notifications button[data-action="mark-all-read"]').click();
    await expect(page.locator('supervisor-notifications button[data-notification-id]')).toHaveCount(0);

    const afterMarkAll = await readSidebarBadge(page);
    expect(afterMarkAll).not.toBeNull();
    expect(afterMarkAll.text).toBe('0');
    expect(afterMarkAll.display).toBe('none');

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}-supervisor-notifications.png`),
        fullPage: true,
    });
}

test.describe('Supervisor Notifications Validation', () => {
    test('supervisor notifications desktop validation', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await runScenario(page, 'desktop');
    });

    test('supervisor notifications mobile validation', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await runScenario(page, 'mobile');
    });
});
