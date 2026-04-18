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
        ticket: {
            id: 601,
            ticket_id: 'TKT-601',
            breakdown_type: 'machine_breakdown',
            breakdown_report_id: 'MBD-601',
            machine_id: 11,
            machine_name: 'Hydraulic Excavator',
            machine_model_number: 'CAT 320D Excavator',
            description: 'Hydraulic pressure drops under load while operating boom.',
            location: 'Main Yard',
            priority: 'High',
            status: 'Assigned',
            reported_by_name: 'Supervisor One',
            created_at: '2026-04-18T06:40:00Z',
            updated_at: '2026-04-18T07:10:00Z',
            workflow: {
                has_budget_report: false,
                has_spare_part_request: false
            },
            work_updates: []
        },
        products: [
            {
                id: 1,
                sparepart_id: 'SP-001',
                name: 'Hydraulic Pump Seal Kit'
            },
            {
                id: 2,
                sparepart_id: 'SP-LOW',
                name: 'Hydraulic Filter Element'
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

function buildAvailabilityResponse(items) {
    const normalizedItems = Array.isArray(items) ? items : [];

    return normalizedItems.map((item) => {
        const code = String(item?.part_code || '').trim();
        const quantity = Number(item?.quantity || 0);

        if (code === 'SP-001') {
            return {
                part_code: code,
                requested_qty: quantity,
                available_qty: 25,
                status: 'available',
                message: 'Available in stock'
            };
        }

        if (code === 'SP-LOW') {
            return {
                part_code: code,
                requested_qty: quantity,
                available_qty: 1,
                status: 'insufficient',
                message: 'Insufficient stock'
            };
        }

        return {
            part_code: code,
            requested_qty: quantity,
            available_qty: 0,
            status: 'not_found',
            message: 'Part not found'
        };
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

        const body = (() => {
            try {
                return request.postDataJSON();
            } catch (_error) {
                return null;
            }
        })();

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json({ status: 'success', success: true, data: fixtures.user });
        }

        if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: fixtures.ticket });
        }

        if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'PUT') {
            state.statusUpdates.push({
                path: pathname,
                payload: body
            });

            fixtures.ticket.status = body?.status || fixtures.ticket.status;

            return json({
                status: 'success',
                success: true,
                message: 'Ticket updated successfully',
                data: fixtures.ticket
            });
        }

        if (pathname.match(/\/api\/budget-reports\/ticket\/\d+\/latest$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: { report: null } });
        }

        if (pathname.match(/\/api\/spare-part-requests\/ticket\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            return json({
                status: 'success',
                success: true,
                data: {
                    products: fixtures.products
                }
            });
        }

        if (pathname.endsWith('/api/spare-part-requests/check-availability') && method === 'POST') {
            const items = Array.isArray(body?.items) ? body.items : [];
            state.availabilityChecks.push(items);
            return json({
                status: 'success',
                success: true,
                data: {
                    items: buildAvailabilityResponse(items)
                }
            });
        }

        if (pathname.endsWith('/api/spare-part-requests') && method === 'POST') {
            state.spareRequests.push(body);

            return json({
                status: 'success',
                success: true,
                message: 'Spare parts request submitted',
                data: {
                    request_id: 'SPR-9001'
                }
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json({ status: 'success', success: true, data: { breakdowns: [] } });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json({ status: 'success', success: true, data: { notifications: [], unread_count: 0 } });
        }

        if (pathname.match(/\/api\/notifications\/read$/) && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (pathname.endsWith('/api/technicians') && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.endsWith('/api/garages') && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        return json({ status: 'success', success: true, data: {} });
    });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        availabilityChecks: [],
        spareRequests: [],
        statusUpdates: []
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures, state);

    const returnTo = encodeURIComponent('/dashboard/technical-officer/index.html?section=tickets');
    const startUrl = `${BASE_URL}/view-ticket/index.html?id=${fixtures.ticket.id}&role_override=TECHNICAL_OFFICER&return_to=${returnTo}`;

    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#mainContent')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#parts-action .btn-action')).toBeVisible({ timeout: 15000 });

    await page.locator('#parts-action .btn-action').click();
    await expect(page.locator('#partsModal.active')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('#requestingTicketId')).toHaveValue(String(fixtures.ticket.id));
    await expect(page.locator('#relatedTicketId')).not.toHaveValue('');
    await expect(page.locator('#equipmentInput')).toHaveValue(fixtures.ticket.machine_model_number);
    await expect(page.locator('#locationInput')).toHaveValue(fixtures.ticket.location);
    await expect(page.locator('#reportedByInput')).toHaveValue(fixtures.ticket.reported_by_name);

    const firstPartRow = page.locator('#sparePartsContainer .spare-part-item').first();
    await expect(firstPartRow).toBeVisible({ timeout: 10000 });

    await firstPartRow.locator('select.form-select').selectOption('SP-001');
    await firstPartRow.locator('input[type="number"]').fill('3');
    await expect(firstPartRow.locator('.availability-badge')).toContainText('In Stock', { timeout: 10000 });

    await page.locator('#additionalNotesTextarea').fill('Need urgently for pump repair');
    await page.locator('#partsSubmitBtn').click();

    await expect.poll(() => state.spareRequests.length, { timeout: 10000 }).toBe(1);

    const firstPayload = state.spareRequests[0];
    expect(firstPayload).toBeTruthy();
    expect(firstPayload.fault_ticket_id).toBe(fixtures.ticket.id);
    expect(firstPayload.ticket_id_formatted).toBeTruthy();
    expect(firstPayload.equipment_name).toContain('Excavator');
    expect(firstPayload.location).toBe(fixtures.ticket.location);
    expect(String(firstPayload.priority).toLowerCase()).toBe('high');
    expect(firstPayload.additional_notes).toBe('Need urgently for pump repair');
    expect(Array.isArray(firstPayload.items)).toBeTruthy();
    expect(firstPayload.items.length).toBe(1);
    expect(firstPayload.items[0].part_code).toBe('SP-001');
    expect(firstPayload.items[0].quantity).toBe(3);

    await expect.poll(() => state.availabilityChecks.length, { timeout: 10000 }).toBeGreaterThan(0);
    await expect.poll(async () => page.locator('#partsModal').evaluate((node) => node.classList.contains('active'))).toBe(false);
    await expect(page.locator('#requestingTicketId')).toHaveValue('');

    await page.locator('#parts-action .btn-action').click();
    await expect(page.locator('#partsModal.active')).toBeVisible({ timeout: 10000 });

    await page.locator('#noSparePartsNeeded').check();
    await expect(page.locator('#sparePartsSection')).toBeHidden();

    await page.locator('#partsSubmitBtn').click();

    await expect.poll(() => state.statusUpdates.length, { timeout: 10000 }).toBe(1);
    expect(state.statusUpdates[0].path).toContain(`/api/fault-tickets/${fixtures.ticket.id}`);
    expect(state.statusUpdates[0].payload).toEqual({ status: 'In Progress' });
    expect(state.spareRequests.length).toBe(1);

    await expect.poll(async () => page.locator('#partsModal').evaluate((node) => node.classList.contains('active'))).toBe(false);

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('body').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const screenshotPath = path.join(OUT_DIR, `${STAGE}-${viewportName}.png`);
    await page.screenshot({
        path: screenshotPath,
        fullPage: true
    });

    const artifact = {
        stage: STAGE,
        viewport: viewportName,
        startUrl,
        finalUrl: page.url(),
        title: await page.title(),
        checks: {
            partRequestSubmission: state.spareRequests.length >= 1,
            noPartStatusUpdate: state.statusUpdates.length >= 1,
            availabilityChecks: state.availabilityChecks.length,
            finalTicketStatus: fixtures.ticket.status
        },
        apiPayloads: {
            spareRequests: state.spareRequests,
            statusUpdates: state.statusUpdates
        },
        diagnostics: {
            console: state.console,
            failedRequests: state.failedRequests
        },
        accessibility: {
            ariaSnapshot,
            snapshotLength: ariaSnapshot.length
        },
        artifacts: {
            screenshot: screenshotPath
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('technical officer request spare parts modal validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('technical officer request spare parts modal validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
