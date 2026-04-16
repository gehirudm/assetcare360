const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

const DATA_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2l9U8AAAAASUVORK5CYII=';

function buildFixtures() {
    const baseTicket = {
        id: 501,
        ticket_id: 'TKT-501',
        machine_id: 11,
        machine_model_number: 'CAT-320D',
        machine_name: 'Excavator 320D',
        machine_type: 'Excavator',
        description: 'Hydraulic pressure drop under load',
        priority: 'High',
        status: 'Open',
        reported_by_name: 'Supervisor One',
        location: 'North Yard',
        created_at: '2026-04-12T08:00:00Z',
        updated_at: '2026-04-12T09:00:00Z',
        photos: [
            { url: DATA_IMAGE },
            { url: DATA_IMAGE }
        ],
        assignments: [
            {
                assigned_by_name: 'Supervisor One',
                assigned_at: '2026-04-12T08:30:00Z',
                technician_name: 'Technical Officer One',
                technician_email: 'tech.officer@example.com',
                technician_phone: '+94-11-123-4567',
                expected_completion_date: '2026-04-15T12:00:00Z'
            }
        ]
    };

    const priorTickets = [
        {
            ...baseTicket,
            id: 502,
            ticket_id: 'TKT-502',
            status: 'Resolved',
            description: 'Engine overheating at idle',
            created_at: '2026-03-20T10:00:00Z',
            updated_at: '2026-03-21T10:00:00Z',
            photos: [{ url: DATA_IMAGE }]
        },
        {
            ...baseTicket,
            id: 503,
            ticket_id: 'TKT-503',
            status: 'Completed',
            description: 'Hydraulic hose leakage',
            created_at: '2026-02-10T10:00:00Z',
            updated_at: '2026-02-12T10:00:00Z',
            photos: []
        }
    ];

    return {
        user: {
            id: 1001,
            full_name: 'Technical Officer One',
            role: 'Technical Officer',
            employee_id: 'LITRO-TECHOFFICER-001'
        },
        ticket: baseTicket,
        machineTickets: [baseTicket, ...priorTickets]
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

        if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: fixtures.ticket });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            const machineId = url.searchParams.get('machine_id');
            if (machineId) {
                return json({ status: 'success', success: true, data: { tickets: fixtures.machineTickets } });
            }

            return json({ status: 'success', success: true, data: { tickets: fixtures.machineTickets } });
        }

        if (pathname.match(/\/api\/budget-reports\/ticket\/\d+\/latest$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: { report: null } });
        }

        if (pathname.endsWith('/api/budget-reports') && method === 'POST') {
            return json({
                status: 'success',
                success: true,
                data: {
                    id: 910,
                    status: 'pending'
                }
            });
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

    const returnTo = encodeURIComponent('/dashboard/technical-officer/index.html?section=tickets');
    const startUrl = `${BASE_URL}/view-ticket/index.html?id=${fixtures.ticket.id}&return_to=${returnTo}`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#mainContent')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#ticketId')).toContainText('TKT-501');

    await expect(page.locator('#viewAllTicketsBtn')).toBeVisible({ timeout: 10000 });
    await page.locator('#viewAllTicketsBtn').click();
    await expect(page.locator('#allTicketsModal')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.locator('#allTicketsContent .modal-ticket-item')).toHaveCount(3);

    await page.locator('#allTicketsModal .modal-close').first().click();
    await expect(page.locator('#allTicketsModal')).not.toHaveClass(/active/, { timeout: 10000 });

    await page.locator('#ticketPhotos .photo-gallery-item').first().click();
    await expect(page.locator('#imageViewerModal')).toHaveClass(/active/, { timeout: 10000 });
    await page.locator('#imageViewerModal .modal-close').click();
    await expect(page.locator('#imageViewerModal')).not.toHaveClass(/active/, { timeout: 10000 });

    await page.locator('#budgetReportContent button.btn-primary').first().click();
    await expect(page.locator('#budgetReportModal')).toHaveClass(/active/, { timeout: 10000 });
    await page.locator('#budgetReportModal .modal-close').click();
    await expect(page.locator('#budgetReportModal')).not.toHaveClass(/active/, { timeout: 10000 });

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
            ticketId: fixtures.ticket.id,
            allTicketsModalOpened: true,
            imageViewerOpened: true,
            budgetModalOpened: true,
            priorTicketsLoaded: fixtures.machineTickets.length
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('shared fault-ticket detail desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('shared fault-ticket detail mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
