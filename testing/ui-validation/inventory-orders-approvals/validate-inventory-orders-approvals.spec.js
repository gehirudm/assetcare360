const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'after';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    return {
        user: {
            id: 801,
            employee_id: 'LITRO-INVENTORY-001',
            full_name: 'Inventory Manager One',
            role: 'Inventory Manager',
        },
        requests: [
            {
                id: 2001,
                request_id: 'SPR-2001',
                fault_ticket_id: 321,
                ticket_id_formatted: 'VBD-1001',
                fault_ticket_code: 'FT-321',
                equipment_name: 'LPG Distribution Truck',
                location: 'Plant A',
                priority: 'High',
                status: 'Pending',
                requested_by_name: 'Technical Officer One',
                additional_notes: 'Urgent replacement',
                created_at: '2026-04-17 10:00:00',
                items: [
                    { part_code: 'SPR-001', part_name: 'Brake Pad Set', quantity: 7 },
                ],
            },
            {
                id: 2003,
                request_id: 'SPR-2003',
                fault_ticket_id: 323,
                ticket_id_formatted: 'MBD-1003',
                fault_ticket_code: 'FT-323',
                equipment_name: 'Compressor Unit B',
                location: 'Plant C',
                priority: 'Medium',
                status: 'Pending',
                requested_by_name: 'Technical Officer Three',
                additional_notes: 'Routine replacement',
                created_at: '2026-04-16 14:00:00',
                items: [
                    { part_code: 'SPR-002', part_name: 'Hydraulic Hose', quantity: 1 },
                ],
            },
            {
                id: 2002,
                request_id: 'SPR-2002',
                fault_ticket_id: 322,
                ticket_id_formatted: 'MBD-1002',
                fault_ticket_code: 'FT-322',
                equipment_name: 'Compressor Unit',
                location: 'Plant B',
                priority: 'Medium',
                status: 'Approved',
                requested_by_name: 'Technical Officer Two',
                additional_notes: '',
                created_at: '2026-04-16 12:00:00',
                reviewed_at: '2026-04-16 13:00:00',
                reviewed_by_name: 'Inventory Manager One',
                items: [
                    { part_code: 'SPR-003', part_name: 'Filter Cartridge', quantity: 4 },
                ],
            },
        ],
        availabilityByCode: {
            'SPR-001': {
                part_name: 'Brake Pad Set',
                available_qty: 2,
            },
            'SPR-002': {
                part_name: 'Hydraulic Hose',
                available_qty: 8,
            },
            'SPR-003': {
                part_name: 'Filter Cartridge',
                available_qty: 10,
            },
        },
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
            return json({ status: 'success', data: fixtures.user });
        }

        if (pathname.endsWith('/api/spare-part-requests') && method === 'GET') {
            return json({ status: 'success', data: fixtures.requests });
        }

        if (pathname.endsWith('/api/spare-part-requests/check-availability') && method === 'POST') {
            const payload = request.postDataJSON() || {};
            const requestItems = Array.isArray(payload.items) ? payload.items : [];

            const responseItems = requestItems.map((item) => {
                const partCode = item.part_code || '';
                const requestedQty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;

                if (!partCode) {
                    return {
                        part_code: partCode,
                        part_name: null,
                        status: 'invalid',
                        available_qty: 0,
                        requested_qty: requestedQty,
                        message: 'Part code is required',
                    };
                }

                const stockInfo = fixtures.availabilityByCode[partCode];
                if (!stockInfo) {
                    return {
                        part_code: partCode,
                        part_name: null,
                        status: 'not_found',
                        available_qty: 0,
                        requested_qty: requestedQty,
                        message: 'Spare part not found in catalog',
                    };
                }

                const availableQty = Number(stockInfo.available_qty) || 0;
                let status = 'available';
                let message = `In stock (${availableQty} available)`;

                if (availableQty === 0) {
                    status = 'out_of_stock';
                    message = 'Out of stock';
                } else if (availableQty < requestedQty) {
                    status = 'insufficient';
                    message = `Low stock (${availableQty} available, ${requestedQty} requested)`;
                }

                return {
                    part_code: partCode,
                    part_name: stockInfo.part_name,
                    status,
                    available_qty: availableQty,
                    requested_qty: requestedQty,
                    message,
                };
            });

            return json({
                status: 'success',
                data: {
                    items: responseItems,
                },
            });
        }

        if (pathname.match(/\/api\/spare-part-requests\/\d+\/approve$/) && method === 'POST') {
            state.interactionSummary.approveApiCalls += 1;
            return json({ status: 'success', message: 'Approved', data: { status: 'Approved' } });
        }

        if (pathname.match(/\/api\/spare-part-requests\/\d+\/reject$/) && method === 'POST') {
            return json({ status: 'success', message: 'Rejected', data: { status: 'Rejected' } });
        }

        return json({ status: 'success', data: {} });
    });
}

async function openOrdersApprovalsSection(page) {
    await page.goto(`${BASE_URL}/dashboard/inventory-manager/index.html`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('orders-approvals');
        }
    });

    await expect(page.locator('#orders-approvals')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Orders & Approvals' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#ordersList .inventory-item').first()).toBeVisible({ timeout: 10000 });
}

async function openActionMenu(page, rowIndex = 0) {
    const trigger = page.locator('#ordersList .dropdown-trigger').nth(rowIndex);
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();
}

async function assertModalPresentation(page, state, modalSelector) {
    const modal = page.locator(modalSelector);
    await expect(modal).toHaveClass(/active/, { timeout: 10000 });

    const metrics = await page.evaluate((selector) => {
        const modalEl = document.querySelector(selector);
        const content = modalEl ? modalEl.querySelector('.modal-content') : null;
        if (!modalEl || !content) {
            return null;
        }

        const modalRect = modalEl.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const style = window.getComputedStyle(content);

        return {
            modalVisible: modalRect.width > 0 && modalRect.height > 0,
            contentVisible: contentRect.width > 0 && contentRect.height > 0,
            contentWidth: contentRect.width,
            contentHeight: contentRect.height,
            background: style.backgroundColor,
        };
    }, modalSelector);

    expect(metrics).not.toBeNull();
    expect(metrics.modalVisible).toBeTruthy();
    expect(metrics.contentVisible).toBeTruthy();
    expect(metrics.contentWidth).toBeGreaterThan(280);
    expect(metrics.contentHeight).toBeGreaterThan(180);
    expect(metrics.background).not.toBe('rgba(0, 0, 0, 0)');

    state.interactionSummary.lastModalMetrics = metrics;
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        interactionSummary: {
            pendingRows: 0,
            approvalFormVisible: false,
            approvalBlockedByStock: false,
            rejectionFormVisible: false,
            approveApiCalls: 0,
            lastModalMetrics: null,
        },
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures, state);
    await openOrdersApprovalsSection(page);

    state.interactionSummary.pendingRows = await page.locator('#ordersList .inventory-item[data-status="Pending"]').count();

    await openActionMenu(page, 0);
    await page.locator('#ordersList .dropdown-item', { hasText: 'Approve Request' }).first().click();

    await assertModalPresentation(page, state, '#orderActionModal');
    await expect(page.getByRole('heading', { name: 'Approve Spare Parts Request' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.form-warning-text')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.form-warning-text')).toContainText('Cannot approve this request');
    await expect(page.getByRole('button', { name: 'Cannot Approve' })).toBeDisabled({ timeout: 10000 });
    await expect(page.locator('#approvalForm button[type="submit"]')).toHaveCount(0);
    state.interactionSummary.approvalBlockedByStock = true;

    await page.locator('#cancelApproval').click();
    await expect(page.locator('#orderActionModal')).not.toHaveClass(/active/, { timeout: 10000 });

    await openActionMenu(page, 1);
    await page.locator('#ordersList .dropdown-item', { hasText: 'Approve Request' }).nth(1).click();

    await assertModalPresentation(page, state, '#orderActionModal');
    await expect(page.getByRole('heading', { name: 'Approve Spare Parts Request' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#approvalForm')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#approvalForm button[type="submit"]')).toBeVisible({ timeout: 10000 });
    state.interactionSummary.approvalFormVisible = true;

    await page.locator('#cancelApproval').click();
    await expect(page.locator('#orderActionModal')).not.toHaveClass(/active/, { timeout: 10000 });

    await openActionMenu(page, 1);
    await page.locator('#ordersList .dropdown-item', { hasText: 'Reject Request' }).nth(1).click();

    await assertModalPresentation(page, state, '#orderActionModal');
    await expect(page.getByRole('heading', { name: 'Reject Spare Parts Request' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#rejectionForm')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#rejectionReason')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#rejectionComments')).toBeVisible({ timeout: 10000 });
    state.interactionSummary.rejectionFormVisible = true;

    await page.locator('#cancelRejection').click();
    await expect(page.locator('#orderActionModal')).not.toHaveClass(/active/, { timeout: 10000 });

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
        interactionSummary: state.interactionSummary,
    };

    fs.writeFileSync(path.join(OUT_DIR, `${STAGE}-${viewportName}.json`), JSON.stringify(artifact, null, 2));

    expect(state.failedRequests, 'No failed requests expected during modal interactions').toEqual([]);
    expect(state.interactionSummary.approvalBlockedByStock, 'Insufficient stock warning must block approval').toBeTruthy();
    expect(state.interactionSummary.approveApiCalls, 'Approve API should not be called while stock-blocked form is shown').toBe(0);
}

test('inventory orders approvals modal flow desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('inventory orders approvals modal flow mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
