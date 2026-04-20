const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    return {
        user: {
            id: 1001,
            full_name: 'Technical Officer One',
            role: 'Technical Officer',
            employee_id: 'LITRO-TECHOFFICER-001'
        },
        notifications: [
            {
                notification_id: 'n-assigned-1',
                title: 'New ticket assigned - TKT-602',
                message: 'You have been assigned to inspect the rear drum vibration issue.',
                type: 'info',
                source_event: 'FAULT_TICKET_ASSIGNED',
                is_read: 0,
                created_at: '2026-04-10T09:00:00Z'
            },
            {
                notification_id: 'n-budget-1',
                title: 'Budget update - TKT-601',
                message: 'Budget review completed for your pending report.',
                type: 'warning',
                source_event: 'BUDGET_REPORT_REVIEWED',
                is_read: 1,
                created_at: '2026-04-09T16:45:00Z'
            },
            {
                notification_id: 'n-spare-1',
                title: 'Spare-part request approved - SPR-010',
                message: 'Your spare-part request was approved and is now ready for fulfillment.',
                type: 'success',
                source_event: 'SPARE_PART_REQUEST_APPROVED',
                is_read: 0,
                created_at: '2026-04-08T11:30:00Z'
            }
        ]
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
        if (response.status() >= 400) {
            state.failedRequests.push({
                url: response.url(),
                method: response.request().method(),
                status: response.status()
            });
        }
    });
}

async function mockApi(page, fixtures) {
    const state = {
        notifications: fixtures.notifications.map((notification) => ({ ...notification }))
    };

    const countUnread = () => state.notifications.filter((notification) => Number(notification.is_read) !== 1).length;

    const parseRequestBody = (request) => {
        const raw = request.postData();
        if (!raw) return {};

        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    };

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        const json = (body, status = 200) => route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body)
        });

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json({ status: 'success', success: true, data: fixtures.user });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json({ status: 'success', success: true, data: { tickets: [] } });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: {
                    notifications: state.notifications,
                    unread_count: countUnread(),
                }
            });
        }

        if (pathname.endsWith('/api/notifications/read') && method === 'POST') {
            const payload = parseRequestBody(request);

            if (payload.mark_all === true) {
                state.notifications = state.notifications.map((notification) => ({
                    ...notification,
                    is_read: 1,
                }));
            } else {
                const targetId = String(payload.notification_id || '').trim();
                state.notifications = state.notifications.map((notification) => {
                    if (String(notification.notification_id) === targetId) {
                        return {
                            ...notification,
                            is_read: 1,
                        };
                    }

                    return notification;
                });
            }

            return json({
                status: 'success',
                success: true,
                data: {
                    unread_count: countUnread()
                }
            });
        }

        return json({ status: 'success', success: true, data: {} });
    });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: []
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures);

    const startUrl = `${BASE_URL}/dashboard/technical-officer/index.html?section=notifications`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('ac-layout')).toBeVisible();

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('notifications');
        }
    });

    await expect(page.locator('#notifications')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('to-notifications .notif-card').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('to-notifications .notif-card')).toHaveCount(3);

    const notificationsRoot = page.locator('to-notifications');
    const filterPanel = notificationsRoot.locator('.to-notifications-filters');

    if (STAGE === 'after') {
        await expect(filterPanel).toBeVisible({ timeout: 15000 });
        await expect(notificationsRoot.locator('#toNotificationsFilterSummary')).toContainText('Showing all 3 notifications');

        await notificationsRoot.locator('select[data-filter="readStatus"]').selectOption('unread');
        await expect(notificationsRoot.locator('.notif-card')).toHaveCount(2);
        await expect(notificationsRoot.locator('#toNotificationsFilterSummary')).toContainText('Showing 2 of 3 notifications');

        await notificationsRoot.locator('select[data-filter="type"]').selectOption('success');
        await expect(notificationsRoot.locator('.notif-card')).toHaveCount(1);
        await expect(notificationsRoot.locator('.notif-title').first()).toContainText('Spare-part request approved - SPR-010');

        await notificationsRoot.locator('button[data-action="clear-filters"]').click();
        await expect(notificationsRoot.locator('.notif-card')).toHaveCount(3);
        await expect(notificationsRoot.locator('#toNotificationsFilterSummary')).toContainText('Showing all 3 notifications');

        await notificationsRoot.locator('input[data-filter="search"]').fill('budget');
        await expect(notificationsRoot.locator('.notif-card')).toHaveCount(1);
        await expect(notificationsRoot.locator('.notif-title').first()).toContainText('Budget update - TKT-601');

        await notificationsRoot.locator('input[data-filter="search"]').fill('');
        await notificationsRoot.locator('select[data-filter="sort"]').selectOption('oldest');
        await expect(notificationsRoot.locator('.notif-card')).toHaveCount(3);
        await expect(notificationsRoot.locator('.notif-title').first()).toContainText('Spare-part request approved - SPR-010');

        await notificationsRoot.locator('button[data-action="clear-filters"]').click();
        await expect(notificationsRoot.locator('.notif-card')).toHaveCount(3);
    } else {
        await expect(filterPanel).toBeVisible({ timeout: 15000 });
    }

    const assignedCardTitle = page.locator('to-notifications .notif-title', { hasText: 'New ticket assigned - TKT-602' });
    await expect(assignedCardTitle.first()).toBeVisible({ timeout: 15000 });

    const actionableButton = page.locator('to-notifications button[data-action-section="tickets"]').first();
    await expect(actionableButton).toBeVisible({ timeout: 15000 });
    await actionableButton.click();

    await expect(page.locator('#tickets')).toBeVisible({ timeout: 15000 });
    const ticketSectionVisibleAfterAction = await page.locator('#tickets').isVisible();

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('notifications');
        }
    });

    await expect(page.locator('#notifications')).toBeVisible({ timeout: 15000 });

    const markAsReadButton = page.locator('to-notifications button[data-notification-id="n-assigned-1"]');
    await expect(markAsReadButton).toBeVisible({ timeout: 15000 });
    await markAsReadButton.click();

    await expect(page.locator('to-notifications .notif-read-pill', { hasText: 'Read' }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('to-notifications button[data-notification-id]')).toHaveCount(1);
    await expect(page.locator('to-notifications button[data-action="mark-all-read"]')).toBeEnabled({ timeout: 15000 });

    const markAllButton = page.locator('to-notifications button[data-action="mark-all-read"]');
    await markAllButton.click();
    await expect(page.locator('to-notifications button[data-notification-id]')).toHaveCount(0);
    await expect(markAllButton).toBeDisabled({ timeout: 15000 });

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('body').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}.png`),
        fullPage: true
    });

    const artifact = {
        stage: STAGE,
        viewport: viewportName,
        startUrl,
        finalUrl: page.url(),
        title: await page.title(),
        accessibility: {
            ariaSnapshot,
            snapshotLength: ariaSnapshot.length
        },
        console: state.console,
        failedRequests: state.failedRequests,
        interactionSummary: {
            notificationsVisible: await page.locator('#notifications').isVisible(),
            ticketSectionVisibleAfterAction,
            filterPanelVisible: await page.locator('to-notifications .to-notifications-filters').count() > 0,
            filterSummaryText: (await page.locator('to-notifications #toNotificationsFilterSummary').count())
                ? await page.locator('to-notifications #toNotificationsFilterSummary').first().textContent()
                : '',
            assignedCardCount: await page.locator('to-notifications .notif-title', { hasText: 'New ticket assigned - TKT-602' }).count(),
            readPillCount: await page.locator('to-notifications .notif-read-pill').count(),
            actionableButtonCount: await page.locator('to-notifications button[data-action-section="tickets"]').count()
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('assignment notification flow validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('assignment notification flow validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
