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
            id: 701,
            ticket_id: 'TKT-701',
            breakdown_type: 'machine_breakdown',
            breakdown_report_id: 'MBD-701',
            machine_id: 11,
            machine_name: 'Hydraulic Excavator',
            machine_model_number: 'CAT 320D Excavator',
            description: 'Hydraulic leak and pressure fluctuation during operation.',
            location: 'Main Yard',
            priority: 'High',
            status: 'In Progress',
            reported_by_name: 'Supervisor One',
            created_at: '2026-04-18T06:40:00Z',
            updated_at: '2026-04-18T07:10:00Z',
            workflow: {
                has_budget_report: true,
                has_spare_part_request: true
            },
            work_updates: []
        },
        sparePartRequests: [
            {
                id: 5001,
                request_id: 'SPR-5001',
                status: 'Approved',
                items: [
                    { part_code: 'SP-001', part_name: 'Hydraulic Pump Seal Kit', quantity: 2 },
                    { part_code: 'SP-002', part_name: 'Pressure Relief Valve', quantity: 1 }
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
            state.ticketUpdates.push({ path: pathname, payload: body });
            fixtures.ticket.status = body?.status || fixtures.ticket.status;
            return json({ status: 'success', success: true, data: fixtures.ticket });
        }

        if (pathname.match(/\/api\/budget-reports\/ticket\/\d+\/latest$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: { report: null } });
        }

        if (pathname.match(/\/api\/spare-part-requests\/ticket\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: fixtures.sparePartRequests });
        }

        if (pathname.endsWith('/api/ticket-work-updates') && method === 'POST') {
            state.workUpdates.push(body);
            return json({ status: 'success', success: true, data: { id: 9901 } });
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

        return json({ status: 'success', success: true, data: {} });
    });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        workUpdates: [],
        ticketUpdates: []
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures, state);

    const returnTo = encodeURIComponent('/dashboard/technical-officer/index.html?section=tickets');
    const startUrl = `${BASE_URL}/view-ticket/index.html?id=${fixtures.ticket.id}&role_override=TECHNICAL_OFFICER&return_to=${returnTo}`;

    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#mainContent')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#complete-action .btn-action')).toBeVisible({ timeout: 15000 });

    await page.locator('#complete-action .btn-action').click();
    await expect(page.locator('#completeModal.active')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('#updateTicketId')).not.toHaveValue('');
    await expect(page.locator('#updatePartsUsedContainer input[name="partsUsed"]').first()).toBeVisible({ timeout: 10000 });

    const selectedPart = await page.locator('#updatePartsUsedContainer input[name="partsUsed"]').first().inputValue();
    await page.locator('#updatePartsUsedContainer input[name="partsUsed"]').first().check();

    await page.locator('#completeTimeSpent').fill('2.5');
    await page.locator('#completeMachineDescription').fill('Replaced faulty seals and recalibrated hydraulic pressure settings.');

    await page.locator('#completeSubmitBtn').click();

    await expect.poll(() => state.workUpdates.length, { timeout: 10000 }).toBe(1);
    await expect.poll(() => state.ticketUpdates.length, { timeout: 10000 }).toBe(1);

    const workUpdatePayload = state.workUpdates[0];
    expect(workUpdatePayload.ticket_id).toBe(fixtures.ticket.id);
    expect(workUpdatePayload.parts_used).toContain(selectedPart);
    expect(workUpdatePayload.time_spent).toBe(2.5);
    expect(workUpdatePayload.machine_description).toContain('Replaced faulty seals');
    expect(workUpdatePayload.work_status).toBe('Completed');

    const ticketUpdatePayload = state.ticketUpdates[0];
    expect(ticketUpdatePayload.path).toContain(`/api/fault-tickets/${fixtures.ticket.id}`);
    expect(ticketUpdatePayload.payload).toEqual({
        status: 'Resolved',
        resolution_notes: 'Replaced faulty seals and recalibrated hydraulic pressure settings.'
    });

    await expect.poll(async () => page.locator('#completeModal').evaluate((node) => node.classList.contains('active'))).toBe(false);

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
        checks: {
            workUpdateCreated: state.workUpdates.length === 1,
            ticketResolved: state.ticketUpdates.length === 1,
            finalTicketStatus: fixtures.ticket.status
        },
        apiPayloads: {
            workUpdates: state.workUpdates,
            ticketUpdates: state.ticketUpdates
        },
        diagnostics: {
            console: state.console,
            failedRequests: state.failedRequests
        },
        accessibility: {
            ariaSnapshot,
            snapshotLength: ariaSnapshot.length
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('technical officer finish work modal validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('technical officer finish work modal validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
