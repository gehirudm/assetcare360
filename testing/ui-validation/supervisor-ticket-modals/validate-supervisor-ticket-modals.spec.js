const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    const tickets = [
        {
            id: 101,
            ticket_id: 'TKT-101',
            machine_id: 11,
            machine_name: 'Excavator 320D',
            machine_model_number: 'CAT-320D',
            description: 'Hydraulic leak near pump housing',
            priority: 'High',
            status: 'Assigned',
            reported_by_name: 'Driver One',
            reporter_full_name: 'Driver One',
            breakdown_report_id: 'VBD-101',
            breakdown_type: 'vehicle_breakdown',
            created_at: '2026-04-12T08:00:00Z',
            updated_at: '2026-04-12T08:30:00Z',
            assignments: [
                {
                    assigned_to: 2001,
                    technician_name: 'Technician One',
                    expected_completion_date: '2026-04-15',
                    notes: 'Handle urgently',
                    status: 'Active',
                    assigned_at: '2026-04-12T08:30:00Z'
                }
            ]
        },
        {
            id: 102,
            ticket_id: 'TKT-102',
            machine_id: 12,
            machine_name: 'Wheel Loader 950H',
            machine_model_number: 'CAT-950H',
            description: 'Intermittent steering lock under load',
            priority: 'Medium',
            status: 'Open',
            reported_by_name: 'Operator Two',
            reporter_full_name: 'Operator Two',
            created_at: '2026-04-12T10:00:00Z',
            updated_at: '2026-04-12T10:15:00Z',
            assignments: []
        }
    ];

    return {
        user: {
            id: 9001,
            full_name: 'Supervisor One',
            role: 'Supervisor',
            employee_id: 'LITRO-SUP-001'
        },
        tickets,
        technicians: [
            {
                id: 2001,
                full_name: 'Technician One',
                username: 'tech.one',
                technical_expertise: 'Hydraulics',
                active_ticket_count: 1,
                employee_id: 'TECH-001',
                email: 'tech1@example.com',
                phone: '+94-11-000-0001'
            },
            {
                id: 2002,
                full_name: 'Technician Two',
                username: 'tech.two',
                technical_expertise: 'Electrical',
                active_ticket_count: 0,
                employee_id: 'TECH-002',
                email: 'tech2@example.com',
                phone: '+94-11-000-0002'
            }
        ],
        breakdownReports: [
            {
                id: 77,
                breakdown_id: 'VBD-077',
                vehicle_id: 12,
                description: 'Brake response delay',
                severity: 'Medium',
                status: 'Pending',
                driver_name: 'Driver One',
                number_plate: 'ABC-1234',
                breakdown_date: '2026-04-10T09:00:00Z',
                breakdown_type: 'Brake',
                created_at: '2026-04-10T09:00:00Z'
            }
        ],
        routeBreakdowns: []
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
            const id = Number(pathname.split('/').pop());
            const ticket = fixtures.tickets.find((item) => item.id === id) || fixtures.tickets[0];
            return json({ status: 'success', success: true, data: ticket });
        }

        if (pathname.endsWith('/api/technicians') && method === 'GET') {
            return json({ status: 'success', success: true, data: { users: fixtures.technicians } });
        }

        if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
            return json({ status: 'success', success: true, data: { reports: fixtures.breakdownReports } });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json({ status: 'success', success: true, data: { breakdowns: fixtures.routeBreakdowns } });
        }

        if (pathname.endsWith('/api/machine-breakdowns') && method === 'GET') {
            return json({ status: 'success', success: true, data: { reports: [] } });
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

    const startUrl = `${BASE_URL}/dashboard/supervisor/index.html?section=fault-tickets`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 20000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('fault-tickets');
        }
    });

    await expect(page.locator('#fault-tickets')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('supervisor-fault-tickets [data-ticket-action="create"]')).toBeVisible({ timeout: 15000 });
    await page.locator('supervisor-fault-tickets [data-ticket-action="create"]').click();
    await expect(page.locator('#createTicketModal')).toBeVisible({ timeout: 10000 });

    await page.locator('#createTicketModal .btn-close').click();
    await expect(page.locator('#createTicketModal')).not.toHaveClass(/active/, { timeout: 10000 });

    const assignedCard = page.locator('supervisor-fault-tickets .inventory-item').filter({ hasText: 'TKT-101' }).first();
    await assignedCard.locator('button[data-dropdown-id="active-101"]').click();
    await assignedCard.locator('button[data-action="edit-assignment"][data-ticket-id="101"]').click();
    await expect(page.locator('#assignTicketModal')).toBeVisible({ timeout: 15000 });
    await page.locator('#assignTicketModal .btn-close').click();
    await expect(page.locator('#assignTicketModal')).not.toBeVisible({ timeout: 15000 });

    await assignedCard.locator('button[data-action="view-ticket"][data-ticket-id="101"]').click();
    await expect(page.locator('#viewTicketModal')).toBeVisible({ timeout: 15000 });
    await page.locator('#viewTicketModal .btn-close').click();
    await expect(page.locator('#viewTicketModal')).not.toBeVisible({ timeout: 15000 });

    const unassignedCard = page.locator('supervisor-fault-tickets .inventory-item').filter({ hasText: 'TKT-102' }).first();
    await unassignedCard.locator('button[data-dropdown-id="ticket-TKT-102"]').click();
    await unassignedCard.locator('button[data-action="assign-ticket"][data-ticket-id="102"]').click();
    await expect(page.locator('#assignTicketModal')).toBeVisible({ timeout: 15000 });
    await page.locator('#assignTicketModal .btn-close').click();
    await expect(page.locator('#assignTicketModal')).not.toBeVisible({ timeout: 15000 });

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
            createModalOpened: true,
            assignModalOpened: true,
            viewModalOpened: true,
            componentActionFlowVerified: true
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('supervisor ticket modals desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('supervisor ticket modals mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
