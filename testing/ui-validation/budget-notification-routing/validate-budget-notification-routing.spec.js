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
        tickets: [
            {
                id: 601,
                ticket_id: 'TKT-601',
                machine_name: 'Hydraulic Excavator',
                description: 'Hydraulic line pressure drop',
                issue: 'Hydraulic line pressure drop',
                status: 'Waiting for Budget Approval',
                assignments: [
                    {
                        assigned_to: 1001,
                        assigned_by: 3001,
                        status: 'Active'
                    }
                ]
            },
            {
                id: 602,
                ticket_id: 'TKT-602',
                machine_name: 'Compactor',
                description: 'Rear drum vibration anomaly',
                issue: 'Rear drum vibration anomaly',
                status: 'Assigned',
                assignments: [
                    {
                        assigned_to: 1001,
                        assigned_by: 3001,
                        status: 'Active'
                    }
                ]
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
            return json({ status: 'success', success: true, data: { tickets: fixtures.tickets } });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json({ status: 'success', success: true, data: { notifications: [], unread_count: 0 } });
        }

        if (pathname.endsWith('/api/notifications/read') && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
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

    const budgetCards = page.locator('to-notifications .notif-title', { hasText: 'Budget pending approval' });
    await expect(budgetCards.first()).toBeVisible({ timeout: 15000 });

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
            budgetCardCount: await page.locator('to-notifications .notif-title', { hasText: 'Budget pending approval' }).count(),
            actionableButtonCount: await page.locator('to-notifications button[data-action-section="tickets"]').count()
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('budget notification flow validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('budget notification flow validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
