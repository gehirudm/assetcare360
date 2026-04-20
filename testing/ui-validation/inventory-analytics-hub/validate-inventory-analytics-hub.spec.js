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
            role: 'Inventory Manager',
        },
        products: [
            {
                id: 101,
                sparepart_id: 'SPR-001',
                name: 'Hydraulic Pump Seal',
                category: 'machines',
                quantity: 18,
                unit_price: 4500,
                low_stock_threshold: 5,
                last_issue_date: '2026-04-10',
                created_at: '2026-03-10 09:00:00',
                updated_at: '2026-04-10 09:00:00',
            },
            {
                id: 102,
                sparepart_id: 'SPR-002',
                name: 'Brake Pad Set',
                category: 'vehicles',
                quantity: 3,
                unit_price: 2100,
                low_stock_threshold: 6,
                last_issue_date: '2026-04-09',
                created_at: '2026-03-14 09:00:00',
                updated_at: '2026-04-09 09:00:00',
            },
            {
                id: 103,
                sparepart_id: 'SPR-003',
                name: 'Fuel Filter',
                category: 'vehicles',
                quantity: 0,
                unit_price: 1300,
                low_stock_threshold: 4,
                last_issue_date: '2026-04-07',
                created_at: '2026-03-20 09:00:00',
                updated_at: '2026-04-07 09:00:00',
            },
        ],
        additions: [
            {
                id: 501,
                sparepart_id: 'SPR-001',
                sparepart_name: 'Hydraulic Pump Seal',
                category: 'machines',
                quantity_added: 15,
                received_date: '2026-04-05',
                supplier: 'Industrial Parts Lanka',
                added_by: 'inventory-manager',
                notes: 'Scheduled replenishment',
                created_at: '2026-04-05 08:00:00',
            },
            {
                id: 502,
                sparepart_id: 'SPR-002',
                sparepart_name: 'Brake Pad Set',
                category: 'vehicles',
                quantity_added: 8,
                received_date: '2026-04-11',
                supplier: 'Fleet Supplies Co',
                added_by: 'inventory-manager',
                notes: 'Urgent order',
                created_at: '2026-04-11 10:30:00',
            },
        ],
        usage: [
            {
                id: 801,
                sparepart_id: 'SPR-001',
                sparepart_name: 'Hydraulic Pump Seal',
                quantity_issued: 3,
                issue_date: '2026-04-10',
                machine_id: 'MCH-011',
                vehicle_id: null,
                issued_by: 34,
                notes: 'Preventive maintenance',
                created_at: '2026-04-10 12:00:00',
            },
            {
                id: 802,
                sparepart_id: 'SPR-002',
                sparepart_name: 'Brake Pad Set',
                quantity_issued: 2,
                issue_date: '2026-04-09',
                machine_id: null,
                vehicle_id: 'VEH-021',
                issued_by: 34,
                notes: 'Service issue',
                created_at: '2026-04-09 11:00:00',
            },
        ],
        requests: [
            {
                id: 901,
                request_id: 'SPR-901',
                status: 'Pending',
                priority: 'High',
                ticket_priority: 'High',
                fault_ticket_code: 'TKT-901',
                requested_by_name: 'Technician One',
                created_at: '2026-04-10 09:00:00',
                reviewed_at: null,
                items: [
                    { part_code: 'SPR-002', quantity: 3 },
                    { part_code: 'SPR-003', quantity: 2 },
                ],
            },
            {
                id: 902,
                request_id: 'SPR-902',
                status: 'Approved',
                priority: 'Medium',
                ticket_priority: 'Medium',
                fault_ticket_code: 'TKT-902',
                requested_by_name: 'Technician Two',
                created_at: '2026-04-08 15:20:00',
                reviewed_at: '2026-04-09 08:30:00',
                items: [
                    { part_code: 'SPR-001', quantity: 4 },
                ],
            },
        ],
        machines: [
            {
                id: 11,
                machine_id: 'MCH-011',
                machine_name: 'LPG Cylinder Filling Machine',
                location: 'LOCATION 1',
                status: 'Active',
                insurance_provider: 'Litro Insurance PLC',
                next_insurance_renew_date: '2026-04-18',
                created_at: '2025-06-15 09:00:00',
                updated_at: '2026-04-01 09:00:00',
            },
        ],
        vehicles: [
            {
                id: 21,
                vehicle_id: 'VEH-021',
                vehicle_name: 'LPG Distribution Truck',
                number_plate: 'NB-2026',
                status: 'Active',
                insurance_provider: 'Transit Assurance Ltd',
                next_insurance_renew_date: '2026-06-20',
                created_at: '2025-02-11 11:00:00',
                updated_at: '2026-04-01 09:00:00',
            },
        ],
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
                status: response.status(),
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
            body: JSON.stringify(body),
        });

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json({ status: 'success', message: 'User authenticated', data: fixtures.user });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            return json({ status: 'success', message: 'Products retrieved', data: { products: fixtures.products } });
        }

        if (pathname.endsWith('/api/additions') && method === 'GET') {
            return json({ status: 'success', message: 'Additions retrieved', data: { additions: fixtures.additions } });
        }

        if (pathname.endsWith('/api/usage') && method === 'GET') {
            return json({ status: 'success', message: 'Usage retrieved', data: { usage: fixtures.usage } });
        }

        if (pathname.endsWith('/api/spare-part-requests') && method === 'GET') {
            return json({ status: 'success', message: 'Requests retrieved', data: fixtures.requests });
        }

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json({ status: 'success', message: 'Machines retrieved', data: { machines: fixtures.machines } });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json({ status: 'success', message: 'Vehicles retrieved', data: { vehicles: fixtures.vehicles } });
        }

        return json({ status: 'success', message: 'OK', data: {} });
    });
}

async function openAnalyticsSection(page) {
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
            layout.navigateTo('analytics');
        }
    });

    const analyticsSection = page.locator('#analytics');
    await expect(analyticsSection).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Inventory Analytics' })).toBeVisible({ timeout: 10000 });
}

async function runBeforeFlow(page, state) {
    await expect(page.locator('inventory-analytics-hub .iv-tab[data-view="stock"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('inventory-analytics-hub [data-action="generate-report"]').first()).toBeVisible({ timeout: 10000 });

    state.flowSummary.tabsVisible = await page.locator('.iv-tab').count();
    state.flowSummary.reportToolbarVisible = await page.locator('.iv-report-toolbar').count();
    state.flowSummary.previewCards = await page.locator('.iv-report-card').count();
}

async function runAfterFlow(page, state) {
    await expect(page.locator('inventory-analytics-hub .iv-tab[data-view="additions"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('inventory-analytics-hub .iv-tab[data-view="usage"]').first()).toBeVisible({ timeout: 10000 });

    await page.fill('#inventoryReportFromDate', '2026-04-01');
    await page.fill('#inventoryReportToDate', '2026-04-30');
    await page.selectOption('#inventoryReportScope', 'usage');

    await page.locator('inventory-analytics-hub [data-action="generate-report"]').first().click();

    const reportStatus = page.locator('#inventoryReportStatus');
    await expect(reportStatus).toContainText('Report generated successfully', { timeout: 10000 });
    await expect(page.locator('#inventoryReportPreview .iv-report-card')).toBeVisible({ timeout: 10000 });

    const downloadButton = page.locator('#inventoryReportDownloadBtn').first();
    await expect(downloadButton).toBeEnabled({ timeout: 10000 });
    await downloadButton.click();

    await expect(reportStatus).toContainText('Report downloaded successfully', { timeout: 10000 });

    state.flowSummary.tabsVisible = await page.locator('.iv-tab').count();
    state.flowSummary.reportToolbarVisible = await page.locator('.iv-report-toolbar').count();
    state.flowSummary.previewCards = await page.locator('.iv-report-card').count();
    state.flowSummary.reportStatus = await reportStatus.textContent();
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        flowSummary: {
            tabsVisible: 0,
            reportToolbarVisible: 0,
            previewCards: 0,
            reportStatus: '',
        },
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures);
    await openAnalyticsSection(page);

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
        interactionSummary: state.flowSummary,
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('inventory analytics hub validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('inventory analytics hub validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
