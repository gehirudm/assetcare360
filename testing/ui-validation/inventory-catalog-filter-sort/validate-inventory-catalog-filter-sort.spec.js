const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:4173';
const OUT_DIR = __dirname;

function buildFixtures() {
    return {
        user: {
            id: 990,
            employee_id: 'INV-990',
            full_name: 'Inventory Catalog Validator',
            role: 'Inventory Manager',
        },
        products: [
            {
                id: 501,
                sparepart_id: 'SPR-501',
                name: 'Brake Pad Set',
                category: 'vehicles',
                quantity: 34,
                low_stock_threshold: 8,
                created_at: '2026-04-12T08:00:00Z',
            },
            {
                id: 502,
                sparepart_id: 'SPR-502',
                name: 'Hydraulic Seal',
                category: 'machines',
                quantity: 3,
                low_stock_threshold: 10,
                created_at: '2026-03-09T08:00:00Z',
            },
            {
                id: 503,
                sparepart_id: 'SPR-503',
                name: 'Air Filter Cartridge',
                category: 'vehicles',
                quantity: 0,
                low_stock_threshold: 5,
                created_at: '2026-04-21T10:00:00Z',
            },
            {
                id: 504,
                sparepart_id: 'SPR-504',
                name: 'Compressor Valve Kit',
                category: 'machines',
                quantity: 15,
                low_stock_threshold: 6,
                created_at: '2026-02-15T08:00:00Z',
            },
        ],
    };
}

function attachMonitors(page, state) {
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            state.consoleErrors.push(msg.text());
        }
    });

    page.on('requestfailed', (request) => {
        state.failedRequests.push({
            method: request.method(),
            url: request.url(),
            errorText: request.failure()?.errorText || 'Unknown request failure',
        });
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
            return json({
                status: 'success',
                message: 'User authenticated',
                data: fixtures.user,
            });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            return json({
                status: 'success',
                message: 'Products retrieved successfully',
                data: {
                    products: fixtures.products,
                },
            });
        }

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json({ status: 'success', data: { machines: [] } });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json({ status: 'success', data: { vehicles: [] } });
        }

        if (pathname.endsWith('/api/orders') && method === 'GET') {
            return json({ status: 'success', data: { orders: [] } });
        }

        if (pathname.endsWith('/api/additions') && method === 'GET') {
            return json({ status: 'success', data: { additions: [] } });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json({
                status: 'success',
                data: {
                    notifications: [],
                    unread_count: 0,
                    pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
                },
            });
        }

        return json({ status: 'success', data: {} });
    });
}

async function openCatalogSection(page) {
    await page.goto(`${BASE_URL}/pages/dashboard/inventory-manager/index.html`, {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('catalog');
        }
    });

    await expect(page.locator('#catalog')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Spare Parts Catalog' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#catalogItems .inventory-item')).toHaveCount(4, { timeout: 10000 });
}

async function getRenderedOrder(page) {
    await page.locator('#catalogItems .inventory-item').first().waitFor({
        state: 'visible',
        timeout: 10000,
    });

    const ids = await page.locator('#catalogItems .inventory-item').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-id'))
    );

    return ids.filter(Boolean);
}

async function runFlow(page, viewportLabel) {
    const fixtures = buildFixtures();
    const state = {
        stage: STAGE,
        viewport: viewportLabel,
        consoleErrors: [],
        failedRequests: [],
        orderDefault: [],
        orderCreatedAsc: [],
        orderCreatedDesc: [],
        orderQuantityDesc: [],
        orderNameAsc: [],
        lowStockCount: 0,
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures);
    await openCatalogSection(page);

    if (STAGE === 'before') {
        await expect(page.locator('#catalogSort')).toHaveCount(0);
        state.orderDefault = await getRenderedOrder(page);
    } else {
        await expect(page.locator('#catalogSort')).toBeVisible();
        await expect(page.locator('.catalog-filter-sort-panel')).toBeVisible();

        state.orderDefault = await getRenderedOrder(page);

        await page.selectOption('#catalogSort', 'created-asc');
        state.orderCreatedAsc = await getRenderedOrder(page);

        await page.selectOption('#catalogSort', 'created-desc');
        state.orderCreatedDesc = await getRenderedOrder(page);

        await page.selectOption('#catalogSort', 'quantity-desc');
        state.orderQuantityDesc = await getRenderedOrder(page);

        await page.selectOption('#catalogSort', 'name-asc');
        state.orderNameAsc = await getRenderedOrder(page);

        await page.getByRole('button', { name: 'Low Stock' }).click();
        state.lowStockCount = await page.locator('#catalogItems .inventory-item').count();

        expect(state.orderDefault[0]).toBe('SPR-503');
        expect(state.orderCreatedAsc[0]).toBe('SPR-504');
        expect(state.orderCreatedDesc[0]).toBe('SPR-503');
        expect(state.orderQuantityDesc[0]).toBe('SPR-501');
        expect(state.orderNameAsc[0]).toBe('SPR-503');
        expect(state.lowStockCount).toBe(1);
    }

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('#catalog').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportLabel}.png`),
        fullPage: true,
    });

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportLabel}.json`),
        JSON.stringify({
            ...state,
            ariaSnapshot,
        }, null, 2)
    );

    expect(state.failedRequests.length, 'No failed requests expected').toBe(0);
}

test('inventory catalog filter/sort toolbar desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('inventory catalog filter/sort toolbar mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
