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
                id: 501,
                ticket_id: 'TKT-501',
                machine_id: 11,
                machine_model_number: 'CAT-320D',
                machine_name: 'Excavator 320D',
                description: 'Hydraulic pressure drop under load',
                priority: 'High',
                status: 'Assigned',
                reported_by_name: 'Supervisor One',
                created_at: '2026-04-12T08:00:00Z',
                updated_at: '2026-04-12T09:00:00Z',
                assignments: [
                    {
                        assigned_by_name: 'Supervisor One',
                        assigned_at: '2026-04-12T08:30:00Z',
                        technician_name: 'Technical Officer One',
                        assigned_to: 1001,
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

        if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: fixtures.tickets[0] });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json({ status: 'success', success: true, data: { notifications: [], unread_count: 0 } });
        }

        if (pathname.match(/\/api\/notifications\/read$/) && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json({ status: 'success', success: true, data: { machines: [] } });
        }

        if (pathname.endsWith('/api/spare-part-requests') && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.match(/\/api\/spare-part-requests\/ticket\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.endsWith('/api/spare-parts') && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.match(/\/api\/budget-reports\/ticket\/\d+\/latest$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: { report: null } });
        }

        if (pathname.match(/\/api\/ticket-work-updates\/ticket\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
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

    const startUrl = `${BASE_URL}/dashboard/technical-officer/index.html?section=tickets`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('ac-layout')).toBeVisible();

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('tickets');
        }
    });

    await expect(page.locator('#tickets')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('to-tickets #allTicketsList .ticket-item').first()).toBeVisible({ timeout: 15000 });

    await page.locator('to-tickets #allTicketsList .ticket-item').first().click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/view-ticket/index.html')
            && url.searchParams.get('id') === '501'
            && url.searchParams.get('role_override') === 'TECHNICAL_OFFICER';
    }, { timeout: 15000 });

    const detailUrl = page.url();
    const detailUrlObject = new URL(detailUrl);
    const destinationPath = detailUrlObject.pathname;

    expect(destinationPath).toContain('/view-ticket/index.html');

    await expect(page.locator('#backButton')).toBeVisible({ timeout: 15000 });
    await page.locator('#backButton').click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'tickets';
    }, { timeout: 15000 });

    await expect(page.locator('#tickets')).toBeVisible({ timeout: 15000 });

    const returnPath = new URL(page.url()).pathname;
    const returnSearch = new URL(page.url()).search;

    expect(returnPath).toContain('/dashboard/technical-officer/');
    expect(returnSearch).toContain('section=tickets');

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
            detailUrl,
            destinationPath,
            destinationSearch: detailUrlObject.search,
            returnUrl: page.url(),
            returnPath,
            returnSearch
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('technical officer ticket navigation desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('technical officer ticket navigation mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
