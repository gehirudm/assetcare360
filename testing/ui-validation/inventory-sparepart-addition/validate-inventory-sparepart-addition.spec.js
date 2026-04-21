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
        additions: [
            {
                id: 9001,
                sparepart_id: 'SPR-200',
                sparepart_name: 'Hydraulic Pump Seal',
                category: 'machines',
                location: 'LOCATION 2',
                quantity_added: 4,
                previous_stock: 6,
                new_stock: 10,
                received_date: '2026-04-13',
                supplier: 'SealWorks Ltd',
                supplier_contact: 'sales@sealworks.example',
                supplier_address: 'Industrial Zone',
                warranty_period: 12,
                warranty_start: '2026-04-13',
                warranty_terms: 'Standard replacement',
                compatible_machines: '["Gas Compressor"]',
                compatible_vehicles: '[]',
                reference: 'PO-200',
                notes: 'Seed record for sparepart addition validation',
                added_by: 'inventory.manager',
                created_at: '2026-04-13T08:00:00Z'
            }
        ],
        productsByCategory: {
            vehicles: [
                {
                    id: 101,
                    sparepart_id: 'SPR-123',
                    name: ' brake pads ',
                    category: 'vehicles',
                    quantity: 24,
                    location: 'LOCATION 1',
                    is_active: 1,
                    compatible_machines: null,
                    compatible_vehicles: '["LPG Distribution Truck"]'
                },
                {
                    id: 102,
                    sparepart_id: 'SPR-124',
                    name: 'Oil Filter',
                    category: 'vehicles',
                    quantity: 12,
                    location: 'LOCATION 1',
                    is_active: 1,
                    compatible_machines: null,
                    compatible_vehicles: '["Staff Car"]'
                }
            ],
            machines: []
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

        if (pathname.endsWith('/api/additions') && method === 'GET') {
            return json({ status: 'success', message: 'Additions retrieved successfully', data: { additions: fixtures.additions, page: 1, per_page: 50 } });
        }

        if (pathname.endsWith('/api/products/next-id') && method === 'GET') {
            const nextId = `SPR-${String(state.nextIdCounter).padStart(3, '0')}`;
            state.nextIdCounter += 1;
            state.nextIdCalls.push(nextId);
            return json({ status: 'success', message: 'Next product ID generated successfully', data: { next_id: nextId } });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            const category = url.searchParams.get('category');
            const products = category ? (fixtures.productsByCategory[category] || []) : Object.values(fixtures.productsByCategory).flat();
            return json({ status: 'success', message: 'Products retrieved successfully', data: { products } });
        }

        if (pathname.endsWith('/api/products') && method === 'POST') {
            const payload = request.postDataJSON();
            state.postedProducts.push(payload);
            return json({
                status: 'success',
                message: 'Product created successfully',
                data: { id: 2001 + state.postedProducts.length, sparepart_id: payload.sparepart_id }
            }, 201);
        }

        if (pathname.endsWith('/api/additions') && method === 'POST') {
            const payload = request.postDataJSON();
            state.postedAdditions.push(payload);
            return json({
                status: 'success',
                message: 'Addition recorded successfully',
                data: {
                    id: 3001 + state.postedAdditions.length,
                    previous_stock: payload.previous_stock ?? 0,
                    new_stock: payload.new_stock ?? payload.quantity_added,
                    quantity_added: payload.quantity_added,
                    auto_created_part: !fixtures.productsByCategory.vehicles.concat(fixtures.productsByCategory.machines).some((product) => product.sparepart_id === payload.sparepart_id)
                }
            }, 201);
        }

        if (pathname.endsWith('/api/machines') || pathname.endsWith('/api/vehicles') || pathname.endsWith('/api/orders') || pathname.endsWith('/api/notifications')) {
            return json({ status: 'success', message: 'OK', data: {} });
        }

        return json({ status: 'success', message: 'OK', data: {} });
    });
}

async function openSparepartAdditionSection(page) {
    await page.goto(`${BASE_URL}/pages/dashboard/inventory-manager/index.html`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('sparepart-addition');
        }
    });

    await expect(page.locator('#sparepart-addition')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Sparepart Addition' })).toBeVisible({ timeout: 10000 });
}

async function openAddStockModal(page) {
    await page.getByRole('button', { name: 'Add New Sparepart/Stock' }).click();
    await expect(page.locator('#addStockModal')).toHaveClass(/active/, { timeout: 10000 });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        postedProducts: [],
        postedAdditions: [],
        nextIdCounter: 45,
        nextIdCalls: []
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures, state);
    await openSparepartAdditionSection(page);

    await openAddStockModal(page);
    await expect(page.locator('#addStockSparepartIdDisplay')).toHaveValue('SPR-045', { timeout: 10000 });

    await page.locator('#addStockCategory').selectOption('vehicles');
    await page.locator('#addStockSparepartName').selectOption({ label: 'Brake Pads' });
    await expect(page.locator('#addStockSparepartIdDisplay')).toHaveValue('SPR-123', { timeout: 10000 });

    await page.locator('#addStockQuantity').fill('6');
    await page.locator('#addStockSupplier').fill('Existing Parts Supply');
    await page.locator('#addStockSupplierContact').fill('existing@example.com');
    await page.locator('#addStockSupplierAddress').fill('Warehouse Road');
    await page.locator('#addStockForm button[type="submit"]').click();
    await expect(page.locator('#addStockModal')).not.toHaveClass(/active/, { timeout: 10000 });

    await expect.poll(() => state.postedProducts.length).toBe(0);
    await expect.poll(() => state.postedAdditions.length).toBe(1);
    expect(state.postedAdditions[0].sparepart_id).toBe('SPR-123');
    expect(state.postedAdditions[0].sparepart_name).toBe('Brake Pads');

    await openAddStockModal(page);
    await expect(page.locator('#addStockSparepartIdDisplay')).toHaveValue('SPR-046', { timeout: 10000 });

    await page.locator('#addStockCategory').selectOption('machines');
    await page.locator('#addStockSparepartName').selectOption({ label: 'Gas Cylinder' });
    await expect(page.locator('#addStockSparepartIdDisplay')).toHaveValue('SPR-047', { timeout: 10000 });

    await page.locator('#addStockQuantity').fill('3');
    await page.locator('#addStockSupplier').fill('New Catalog Supply');
    await page.locator('#addStockSupplierContact').fill('new@example.com');
    await page.locator('#addStockSupplierAddress').fill('Industrial Estate');
    await page.locator('#addStockForm button[type="submit"]').click();
    await expect(page.locator('#addStockModal')).not.toHaveClass(/active/, { timeout: 10000 });

    await expect.poll(() => state.postedProducts.length).toBe(1);
    await expect.poll(() => state.postedAdditions.length).toBe(2);
    expect(state.postedProducts[0].sparepart_id).toBe('SPR-047');
    expect(state.postedProducts[0].name).toBe('Gas Cylinder');
    expect(state.postedAdditions[1].sparepart_id).toBe('SPR-047');
    expect(state.nextIdCalls).toEqual(['SPR-045', 'SPR-046', 'SPR-047']);

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
            existingResolvedId: 'SPR-123',
            newResolvedId: 'SPR-047',
            nextIdCalls: state.nextIdCalls,
            postedProducts: state.postedProducts.map((item) => item.sparepart_id),
            postedAdditions: state.postedAdditions.map((item) => item.sparepart_id)
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('inventory sparepart addition validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('inventory sparepart addition validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
