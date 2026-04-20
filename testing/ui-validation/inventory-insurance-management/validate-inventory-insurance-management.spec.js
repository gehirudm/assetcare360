const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    const now = new Date();
    const toISODate = (date) => date.toISOString().slice(0, 10);
    const addDays = (date, days) => {
        const clone = new Date(date);
        clone.setDate(clone.getDate() + days);
        return clone;
    };

    const nextRenewDate = toISODate(addDays(now, 10));
    const scheduledRenewDate = toISODate(addDays(now, 45));
    const lastRenewDate = toISODate(addDays(now, -355));

    return {
        user: {
            id: 701,
            employee_id: 'LITRO-INVENTORY-001',
            full_name: 'Inventory Manager One',
            role: 'Inventory Manager',
        },
        machines: [
            {
                id: 11,
                machine_id: 'MCH-011',
                machine_name: 'LPG Cylinder Filling Machine',
                model_number: 'CAT-320D',
                location: 'LOCATION 1',
                status: 'Active',
                insurance_type: 'Full',
                insurance_provider: 'Litro Insurance PLC',
                insurance_provider_details: 'Hotline 011-2222222',
                insurance_renew_interval_days: 365,
                last_insurance_renew_date: lastRenewDate,
                last_insurance_renew_details: 'Annual comprehensive policy renewed',
                next_insurance_renew_date: nextRenewDate,
            },
        ],
        vehicles: [
            {
                id: 21,
                vehicle_id: 'VEH-021',
                vehicle_name: 'LPG Distribution Truck',
                model_number: 'ISUZU-NPR',
                number_plate: 'NB-2026',
                status: 'Active',
                insurance_type: 'Third-Party',
                insurance_provider: 'Transit Assurance Ltd',
                insurance_provider_details: 'Fleet desk 011-8888888',
                insurance_renew_interval_days: 365,
                last_insurance_renew_date: lastRenewDate,
                last_insurance_renew_details: 'Third-party policy renewed with rider updates',
                next_insurance_renew_date: nextRenewDate,
            },
            {
                id: 22,
                vehicle_id: 'VEH-022',
                vehicle_name: 'LPG Long-Haul Trailer',
                model_number: 'ISUZU-FVR',
                number_plate: 'NB-3037',
                status: 'Active',
                insurance_type: 'Full',
                insurance_provider: 'Transit Assurance Ltd',
                insurance_provider_details: 'Fleet desk 011-8888888',
                insurance_renew_interval_days: 365,
                last_insurance_renew_date: lastRenewDate,
                last_insurance_renew_details: 'Long-haul coverage renewed and validated',
                next_insurance_renew_date: scheduledRenewDate,
            },
        ],
        products: [
            { id: 1, sparepart_id: 'SPR-001', name: 'Hydraulic Pump Seal', quantity: 4, low_stock_threshold: 5 },
        ],
        orders: [
            { id: 1, status: 'pending' },
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

async function mockApi(page, fixtures, state) {
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

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json({ status: 'success', message: 'Machines retrieved', data: { machines: fixtures.machines } });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json({ status: 'success', message: 'Vehicles retrieved', data: { vehicles: fixtures.vehicles } });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            return json({ status: 'success', message: 'Products retrieved', data: { products: fixtures.products } });
        }

        if (pathname.endsWith('/api/spare-part-requests') && method === 'GET') {
            return json({ status: 'success', message: 'Requests retrieved', data: { requests: fixtures.orders } });
        }

        if ((pathname.includes('/api/machines/') || pathname.includes('/api/vehicles/')) && method === 'PUT') {
            const payload = JSON.parse(request.postData() || '{}');
            state.updateCalls.push({ pathname, payload });
            return json({ status: 'success', message: 'Insurance updated', data: {} });
        }

        return json({ status: 'success', message: 'OK', data: {} });
    });
}

async function openInventoryDashboard(page) {
    await page.goto(`${BASE_URL}/pages/dashboard/inventory-manager/index.html`, { waitUntil: 'domcontentloaded' });

    let hasLayout = await page.locator('ac-layout').count();
    if (!hasLayout) {
        await page.goto(`${BASE_URL}/dashboard/inventory-manager/index.html`, { waitUntil: 'domcontentloaded' });
        hasLayout = await page.locator('ac-layout').count();
    }

    expect(hasLayout).toBeGreaterThan(0);
    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });
}

async function runBeforeFlow(page, state) {
    const insuranceNavCount = await page.getByText('Insurance Management', { exact: true }).count();
    state.flowSummary.insuranceNavVisible = insuranceNavCount > 0;

    const sectionCount = await page.locator('#insurance-management').count();
    state.flowSummary.insuranceSectionCount = sectionCount;

    expect(insuranceNavCount).toBeGreaterThan(0);
    expect(sectionCount).toBeGreaterThan(0);
}

async function runAfterFlow(page, state) {
    await expect(page.getByRole('navigation').getByText('Insurance Management', { exact: true })).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('insurance-management');
        }
    });

    const section = page.locator('#insurance-management');
    await expect(section).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Insurance Management' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#insuranceSummaryGrid')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Scheduled', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#insuranceSort')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Scheduled', exact: true }).click();
    await expect(page.locator('.insurance-item')).toHaveCount(1);
    await expect(page.locator('.insurance-item .insurance-item-title').first()).toContainText('LPG Long-Haul Trailer');
    state.flowSummary.scheduledFilterCount = await page.locator('.insurance-item').count();

    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.selectOption('#insuranceSort', 'asset-name-desc');

    const firstSortedAsset = (await page.locator('.insurance-item .insurance-item-title span:last-child').first().textContent() || '').trim();
    state.flowSummary.firstAssetAfterSort = firstSortedAsset;
    expect(firstSortedAsset).toContain('LPG Long-Haul Trailer');

    const renewalButton = page.getByRole('button', { name: /Submit Renewal/i }).first();
    await expect(renewalButton).toBeVisible({ timeout: 10000 });
    await renewalButton.click();

    await expect(page.getByRole('heading', { name: /Submit Insurance Renewal/i })).toBeVisible({ timeout: 10000 });
    const assetDetailsCard = page.locator('#insuranceRenewalAssetDetails');
    await expect(assetDetailsCard).toBeVisible({ timeout: 10000 });
    await expect(assetDetailsCard.locator('.insurance-modal-asset-item')).toHaveCount(6);
    await expect(assetDetailsCard).toContainText('LPG Long-Haul Trailer');
    await expect(assetDetailsCard).toContainText('VEH-022');
    await expect(assetDetailsCard).toContainText('Number Plate');
    await expect(assetDetailsCard).toContainText('NB-3037');
    state.flowSummary.modalAssetDetailsVisible = (await assetDetailsCard.count()) > 0;
    state.flowSummary.modalAssetDetailsFieldCount = await assetDetailsCard.locator('.insurance-modal-asset-item').count();

    await page.selectOption('#insuranceRenewalType', 'Full');
    await page.fill('#insuranceRenewalProvider', 'Litro Insurance PLC');
    await page.fill('#insuranceRenewalProviderDetails', 'Hotline 011-9999999, policy account managed by fleet team');
    await page.fill('#insuranceRenewalIntervalDays', '365');
    await page.fill('#insuranceRenewalLastDate', '2026-04-01');
    await page.fill('#insuranceRenewalLastDetails', 'Renewed annual policy and attached payment receipt reference INV-2026-44');

    await page.getByRole('button', { name: /^Save Renewal$/ }).click();

    await expect.poll(() => state.updateCalls.length).toBeGreaterThan(0);

    const latestUpdate = state.updateCalls[state.updateCalls.length - 1] || null;
    state.flowSummary.latestUpdatePath = latestUpdate?.pathname || null;
    state.flowSummary.latestUpdatePayloadKeys = latestUpdate ? Object.keys(latestUpdate.payload) : [];

    expect(latestUpdate).not.toBeNull();
    expect(latestUpdate.payload).toMatchObject({
        insurance_type: 'Full',
        insurance_provider: 'Litro Insurance PLC',
        insurance_renew_interval_days: 365,
        last_insurance_renew_date: '2026-04-01',
    });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        updateCalls: [],
        flowSummary: {
            insuranceNavVisible: false,
            insuranceSectionCount: 0,
            latestUpdatePath: null,
            latestUpdatePayloadKeys: [],
            scheduledFilterCount: 0,
            firstAssetAfterSort: null,
            modalAssetDetailsVisible: false,
            modalAssetDetailsFieldCount: 0,
        },
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures, state);
    await openInventoryDashboard(page);

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
        interactionSummary: {
            insuranceNavVisible: state.flowSummary.insuranceNavVisible,
            insuranceSectionCount: state.flowSummary.insuranceSectionCount,
            latestUpdatePath: state.flowSummary.latestUpdatePath,
            latestUpdatePayloadKeys: state.flowSummary.latestUpdatePayloadKeys,
            scheduledFilterCount: state.flowSummary.scheduledFilterCount,
            firstAssetAfterSort: state.flowSummary.firstAssetAfterSort,
            modalAssetDetailsVisible: state.flowSummary.modalAssetDetailsVisible,
            modalAssetDetailsFieldCount: state.flowSummary.modalAssetDetailsFieldCount,
            updateCalls: state.updateCalls.length,
        },
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('inventory insurance management validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('inventory insurance management validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
