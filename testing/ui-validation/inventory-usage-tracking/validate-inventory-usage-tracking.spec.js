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
            employee_id: 'LITRO-INVENTORY-001',
            full_name: 'Inventory Manager One',
            role: 'Inventory Manager'
        },
        products: [
            {
                id: 101,
                sparepart_id: 'SPR-001',
                name: 'Hydraulic Pump Seal',
                category: 'machines',
                quantity: 18,
                last_issue_date: '2026-04-10',
                low_stock_threshold: 5,
                is_active: 1
            },
            {
                id: 102,
                sparepart_id: 'SPR-002',
                name: 'Brake Pad Set',
                category: 'vehicles',
                quantity: 6,
                last_issue_date: '2026-04-09',
                low_stock_threshold: 8,
                is_active: 1
            }
        ],
        usageRecords: [
            { sparepart_id: 'SPR-001', quantity_issued: 2, issue_date: '2026-04-08' },
            { sparepart_id: 'SPR-001', quantity_issued: 3, issue_date: '2026-04-10' },
            { sparepart_id: 'SPR-002', quantity_issued: 1, issue_date: '2026-04-09' }
        ],
        usageHistoryByPart: {
            'SPR-001': {
                history: [
                    {
                        id: 9003,
                        sparepart_id: 'SPR-001',
                        sparepart_name: 'Hydraulic Pump Seal',
                        quantity_issued: 3,
                        issue_date: '2026-04-10',
                        machine_id: 'MC-110',
                        vehicle_id: null,
                        notes: 'Planned replacement cycle'
                    },
                    {
                        id: 9002,
                        sparepart_id: 'SPR-001',
                        sparepart_name: 'Hydraulic Pump Seal',
                        quantity_issued: 2,
                        issue_date: '2026-04-08',
                        machine_id: 'MC-107',
                        vehicle_id: null,
                        notes: 'Leakage repair'
                    },
                    {
                        id: 9001,
                        sparepart_id: 'SPR-001',
                        sparepart_name: 'Hydraulic Pump Seal',
                        quantity_issued: 1,
                        issue_date: '2026-04-04',
                        machine_id: null,
                        vehicle_id: 'VEH-021',
                        notes: 'Emergency replacement'
                    }
                ],
                stats: {
                    total_issuances: 3,
                    total_quantity: 6,
                    first_issue_date: '2026-04-04',
                    last_issue_date: '2026-04-10'
                }
            },
            'SPR-002': {
                history: [
                    {
                        id: 9004,
                        sparepart_id: 'SPR-002',
                        sparepart_name: 'Brake Pad Set',
                        quantity_issued: 1,
                        issue_date: '2026-04-09',
                        machine_id: null,
                        vehicle_id: 'VEH-103',
                        notes: 'Quarterly service'
                    }
                ],
                stats: {
                    total_issuances: 1,
                    total_quantity: 1,
                    first_issue_date: '2026-04-09',
                    last_issue_date: '2026-04-09'
                }
            }
        }
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

async function mockApi(page, fixtures, state) {
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
            return json({ status: 'success', message: 'User authenticated', data: fixtures.user });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            return json({
                status: 'success',
                message: 'Products retrieved successfully',
                data: { products: fixtures.products }
            });
        }

        if (pathname.endsWith('/api/usage') && method === 'GET') {
            return json({
                status: 'success',
                message: 'Usage records retrieved successfully',
                data: { usage: fixtures.usageRecords, page: 1, per_page: 50 }
            });
        }

        if (pathname.includes('/api/usage/sparepart/') && method === 'GET') {
            const sparepartId = decodeURIComponent(pathname.split('/api/usage/sparepart/')[1] || '').split('/')[0];
            state.historyCalls.push(sparepartId);

            const payload = fixtures.usageHistoryByPart[sparepartId] || { history: [], stats: null };

            return json({
                status: 'success',
                message: 'Usage history retrieved successfully',
                data: payload
            });
        }

        if (pathname.endsWith('/api/usage') && method === 'POST') {
            state.usagePostCalls += 1;
            return json({
                status: 'success',
                message: 'Issued successfully',
                data: { new_quantity: 15 }
            }, 201);
        }

        return json({ status: 'success', message: 'OK', data: {} });
    });
}

async function openUsageTrackingSection(page) {
    await page.goto(`${BASE_URL}/pages/dashboard/inventory-manager/index.html`, { waitUntil: 'domcontentloaded' });

    let hasLayout = await page.locator('ac-layout').count();
    if (!hasLayout) {
        await page.goto(`${BASE_URL}/dashboard/inventory-manager/index.html`, { waitUntil: 'domcontentloaded' });
        hasLayout = await page.locator('ac-layout').count();
    }

    expect(hasLayout).toBeGreaterThan(0);
    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('usage-tracking');
        }
    });

    await expect(page.locator('#usage-tracking')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Usage Tracking' })).toBeVisible({ timeout: 10000 });
}

async function runBeforeFlow(page, state) {
    const viewUsageButton = page.getByRole('button', { name: 'View Usage' }).first();
    await expect(viewUsageButton).toBeVisible({ timeout: 10000 });
    await viewUsageButton.click();

    const usageModal = page.locator('#usageModal');
    await expect(usageModal).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Usage Overview' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.usage-chart-column').first()).toBeVisible({ timeout: 10000 });

    state.flowSummary.modalOpened = 'usage-modal-bar';
    state.flowSummary.chartBars = await page.locator('.usage-chart-column').count();

    await page.getByRole('button', { name: 'Close' }).first().click();
    await expect(usageModal).not.toHaveClass(/active/, { timeout: 10000 });
}

async function runAfterFlow(page, state) {
    const viewUsageButton = page.getByRole('button', { name: 'View Usage' }).first();
    await expect(viewUsageButton).toBeVisible({ timeout: 10000 });
    await viewUsageButton.click();

    const usageModal = page.locator('#usageModal');
    await expect(usageModal).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Usage Overview' })).toBeVisible({ timeout: 10000 });

    await expect(page.locator('.usage-line-point').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.usage-line-detail-item').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.usage-date-detail-card')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Details for')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Recent Issuance Records')).toBeVisible({ timeout: 10000 });

    state.flowSummary.modalOpened = 'usage-modal-line';
    state.flowSummary.chartBars = await page.locator('.usage-chart-column').count();
    state.flowSummary.linePoints = await page.locator('.usage-line-point').count();

    await page.getByRole('button', { name: 'Close' }).first().click();
    await expect(usageModal).not.toHaveClass(/active/, { timeout: 10000 });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        historyCalls: [],
        usagePostCalls: 0,
        flowSummary: {
            modalOpened: 'none',
            chartBars: 0,
            linePoints: 0
        }
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures, state);
    await openUsageTrackingSection(page);

    if (STAGE === 'before') {
        await runBeforeFlow(page, state);
    } else {
        await runAfterFlow(page, state);
    }

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
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
        url: page.url(),
        title: await page.title(),
        accessibility: {
            ariaSnapshot,
            snapshotLength: ariaSnapshot.length
        },
        console: state.console,
        failedRequests: state.failedRequests,
        interactionSummary: {
            modalOpened: state.flowSummary.modalOpened,
            chartBars: state.flowSummary.chartBars,
            linePoints: state.flowSummary.linePoints,
            historyCalls: state.historyCalls,
            usagePostCalls: state.usagePostCalls
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('inventory usage tracking validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('inventory usage tracking validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
