const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const OUT_DIR = __dirname;
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';

function attachMonitors(page, state) {
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'warning' || type === 'error') {
            state.console.push({ type, text: msg.text() });
        }
    });

    page.on('response', (response) => {
        const status = response.status();
        if (status >= 400) {
            state.failedRequests.push({
                url: response.url(),
                method: response.request().method(),
                status,
            });
        }
    });
}

function buildBreakdowns() {
    return [
        {
            id: 1,
            breakdown_id: 'MBD-001',
            machine_id: 45,
            machine_name: 'Excavator #045',
            machine_model: 'Excavator #045',
            operator_id: 801,
            operator_name: 'Machinery Operator One',
            breakdown_type: 'Hydraulic Leak',
            description: 'Hydraulic pressure drop during operation',
            severity: 'High',
            status: 'Pending',
            breakdown_date: '2026-04-11T08:40:00Z',
            ticket_status: 'Open',
            fault_ticket_number: 'TKT-4501',
            fault_ticket_id: 4501,
            assignments: [],
            images: [],
        },
        {
            id: 2,
            breakdown_id: 'MBD-002',
            machine_id: 128,
            machine_name: 'Loader #128',
            machine_model: 'Loader #128',
            operator_id: 801,
            operator_name: 'Machinery Operator One',
            breakdown_type: 'Engine Issue',
            description: 'Engine noise and reduced pulling power',
            severity: 'Medium',
            status: 'Assigned',
            breakdown_date: '2026-04-10T11:15:00Z',
            ticket_status: 'In Progress',
            fault_ticket_number: 'TKT-4502',
            fault_ticket_id: 4502,
            assignments: [
                {
                    technician_name: 'Technical Officer Nimal',
                    assigned_date: '2026-04-10T13:00:00Z',
                },
            ],
            images: [],
        },
    ];
}

function buildWeeklyChecks() {
    return [
        {
            id: 11,
            check_id: 'MWC-001',
            machine_id: 45,
            machine_name: 'Excavator #045',
            week_start_date: '2026-04-06',
            week_end_date: '2026-04-12',
            submitted_date: '2026-04-12T07:35:00Z',
            overall_condition: 'good',
            engine_status: 1,
            hydraulics: 1,
            electrical_system: 1,
            safety_equipment: 1,
            controls: 1,
            lubrication: 1,
            cooling_system: 1,
            filters: 1,
            notes: 'No major issues observed this week.',
            issues_found: null,
            status: 'pending',
            reviewed_date: null,
            reviewed_by_name: null,
            rejection_reason: null,
        },
        {
            id: 12,
            check_id: 'MWC-002',
            machine_id: 128,
            machine_name: 'Loader #128',
            week_start_date: '2026-03-30',
            week_end_date: '2026-04-05',
            submitted_date: '2026-04-05T08:20:00Z',
            overall_condition: 'fair',
            engine_status: 0,
            hydraulics: 1,
            electrical_system: 1,
            safety_equipment: 1,
            controls: 1,
            lubrication: 1,
            cooling_system: 1,
            filters: 1,
            notes: 'Minor vibration detected.',
            issues_found: 'Monitor vibration in next service cycle.',
            status: 'approved',
            reviewed_date: '2026-04-06T10:00:00Z',
            reviewed_by_name: 'Supervisor John',
            rejection_reason: null,
        },
    ];
}

function buildMachines() {
    return [
        { id: 45, machine_id: 'EXC-045', machine_name: 'Excavator #045', status: 'Active' },
        { id: 128, machine_id: 'LOD-128', machine_name: 'Loader #128', status: 'Active' },
        { id: 203, machine_id: 'TRK-203', machine_name: 'Truck #203', status: 'Active' },
    ];
}

async function mockMachineryOperatorApis(page) {
    const breakdowns = buildBreakdowns();
    const weeklyChecks = buildWeeklyChecks();
    const machines = buildMachines();

    await page.route('**/api/auth/me', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    id: 801,
                    employee_id: 'LITRO-MOP-001',
                    full_name: 'Machinery Operator One',
                    role: 'Machinary Operator',
                },
            }),
        });
    });

    await page.route('**/api/machines', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { machines } }),
        });
    });

    await page.route('**/api/machine-breakdowns', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { reports: breakdowns } }),
        });
    });

    await page.route('**/api/machine-breakdowns/*', (route) => {
        const url = new URL(route.request().url());
        const id = Number.parseInt(url.pathname.split('/').pop(), 10);
        const match = breakdowns.find((item) => item.id === id) || breakdowns[0];
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: match }),
        });
    });

    await page.route('**/api/budget-reports/ticket/*', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { reports: [] } }),
        });
    });

    await page.route('**/api/spare-part-requests/ticket/*', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: [] }),
        });
    });

    await page.route('**/api/machine-weekly-checks**', (route) => {
        const request = route.request();
        if (request.method() === 'POST') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'success', data: {} }),
            });
            return;
        }

        if (request.method() === 'PUT') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'success', data: {} }),
            });
            return;
        }

        const url = new URL(request.url());
        const pendingOnly = url.searchParams.get('status') === 'pending';

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    count: pendingOnly ? weeklyChecks.filter((item) => item.status === 'pending').length : weeklyChecks.length,
                    checks: weeklyChecks,
                },
            }),
        });
    });

    await page.route('**/api/fault-tickets/*', (route) => {
        const id = Number.parseInt(route.request().url().split('/').pop(), 10);
        const isEditableTicket = id === 4501;

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    id,
                    ticket_id: isEditableTicket ? 'TKT-4501' : 'TKT-4502',
                    machine_id: isEditableTicket ? 45 : 128,
                    machine_name: isEditableTicket ? 'Excavator #045' : 'Loader #128',
                    location: 'Site A',
                    created_at: '2026-04-11T08:40:00Z',
                    updated_at: '2026-04-12T09:00:00Z',
                    priority: isEditableTicket ? 'High' : 'Medium',
                    reported_by_name: 'Machinery Operator One',
                    status: isEditableTicket ? 'Open' : 'In Progress',
                    description: isEditableTicket
                        ? 'Hydraulic pressure drop during operation'
                        : 'Engine noise and reduced pulling power',
                    images: [],
                    assignments: [
                        {
                            technician_name: 'Technical Officer Nimal',
                            technician_employee_id: 'LITRO-TECH-003',
                            assigned_date: '2026-04-11T10:15:00Z',
                        },
                    ],
                },
            }),
        });
    });
}

async function navigateSection(page, sectionId, navLabel) {
    const moved = await page.evaluate((targetSection) => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo(targetSection);
        return true;
    }, sectionId);

    if (!moved) {
        await page.getByRole('navigation').getByText(navLabel).click();
    }
}

async function runFlow(page, viewportName) {
    const state = {
        console: [],
        failedRequests: [],
    };

    attachMonitors(page, state);
    await mockMachineryOperatorApis(page);

    await page.goto(`${BASE_URL}/dashboard/machinery-operator/index.html`, {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('ac-layout')).toBeVisible();

    await navigateSection(page, 'fault-reporting', 'Fault Reporting');
    await expect(page.locator('#fault-reporting .page-title')).toContainText('Fault Reporting');
    await page.locator('#fault-reporting .filter-btn', { hasText: 'Pending' }).click();
    await page.locator('#fault-reporting .filter-btn', { hasText: 'All Reports' }).click();
    await page.locator('#fault-reporting .btn.btn-primary', { hasText: 'Report New Fault' }).click();
    await expect(page.locator('#reportFaultModal')).toHaveClass(/active/);
    await page.locator('#reportFaultModal .btn.btn-secondary', { hasText: 'Cancel' }).click();

    await page.locator('#faultReportsList .btn.btn-primary, #faultsContainer .btn.btn-primary').filter({ hasText: 'VIEW' }).first().click();
    await expect(page.locator('#machineBreakdownModal')).toBeVisible();
    await page.locator('#machineBreakdownModal .btn.btn-secondary', { hasText: 'Close' }).click();

    const editableFaultCard = page.locator('#faultReportsList .inventory-item:has([data-action="edit-breakdown"]), #faultsContainer .inventory-item:has([data-action="edit-breakdown"])').first();
    await editableFaultCard.locator('[data-action="toggle-dropdown"]').click();
    await editableFaultCard.locator('[data-action="edit-breakdown"]').click();
    await expect(page.locator('#editFaultModal')).toHaveClass(/active/);
    await page.locator('#editFaultModal .btn.btn-secondary', { hasText: 'Cancel' }).click();

    await navigateSection(page, 'condition-updates', 'Weekly Check Reports');
    await expect(page.locator('#condition-updates .page-title')).toContainText('Weekly Check Reports');
    await page.locator('#condition-updates .filter-btn', { hasText: 'Approved' }).click();
    await page.locator('#condition-updates .filter-btn', { hasText: 'All Updates' }).click();
    await page.locator('#condition-updates .btn.btn-primary', { hasText: 'Submit Weekly Check Report' }).click();
    await expect(page.locator('#conditionUpdateModal')).toHaveClass(/active/);
    await page.locator('#conditionUpdateModal .btn.btn-secondary', { hasText: 'Cancel' }).click();
    await page.locator('#weeklyCheckReportsList .btn.btn-primary, #updatesContainer .btn.btn-primary').filter({ hasText: 'VIEW' }).first().click();
    const weeklyDetailsModal = page.locator('#detailsModal_weeklyCheck.active, [id^="detailsModal_"].active').first();
    await expect(weeklyDetailsModal).toBeVisible();
    await weeklyDetailsModal.locator('.btn.btn-secondary', { hasText: 'Close' }).click();

    const pendingWeeklyCard = page.locator('#weeklyCheckReportsList .inventory-item[data-status="pending"], #updatesContainer .inventory-item[data-status="pending"]').first();
    await pendingWeeklyCard.locator('[data-action="toggle-dropdown"]').click();
    await pendingWeeklyCard.locator('[data-action="edit-weekly-check"]').click();
    await expect(page.locator('#conditionUpdateModal')).toHaveClass(/active/);
    await expect(page.locator('#conditionUpdateModalTitle')).toContainText('Edit Weekly Check Report');
    await page.locator('#conditionUpdateModal .btn.btn-secondary', { hasText: 'Cancel' }).click();

    const approvedWeeklyCard = page.locator('#weeklyCheckReportsList .inventory-item[data-status="approved"], #updatesContainer .inventory-item[data-status="approved"]').first();
    await expect(approvedWeeklyCard.locator('[data-action="toggle-dropdown"]')).toHaveCount(1);
    await approvedWeeklyCard.locator('[data-action="toggle-dropdown"]').click();
    await approvedWeeklyCard.locator('[data-action="edit-weekly-check"]').click();
    await expect(page.locator('#conditionUpdateModal')).not.toHaveClass(/active/);

    await expect(page.locator('#ticket-tracking')).toHaveCount(0);

    await navigateSection(page, 'notifications', 'Notifications');
    await expect(page.locator('#notifications .page-title')).toContainText('Notifications');

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const visibleFaultCards = Array.from(document.querySelectorAll('#faultReportsList .inventory-item, #faultReportsList .item-card, #faultsContainer .inventory-item, #faultsContainer .item-card'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleUpdateCards = Array.from(document.querySelectorAll('#weeklyCheckReportsList .inventory-item, #weeklyCheckReportsList .item-card, #updatesContainer .inventory-item, #updatesContainer .item-card'))
            .filter((item) => item.style.display !== 'none').length;
        const notificationsCount = document.querySelectorAll('#operatorNotificationsList .item-card, #notificationsContainer .item-card').length;

        return {
            activeSection,
            visibleFaultCards,
            visibleUpdateCards,
            editableFaultActionCount: document.querySelectorAll('#faultReportsList [data-action="edit-breakdown"], #faultsContainer [data-action="edit-breakdown"]').length,
            editableWeeklyActionCount: document.querySelectorAll('#weeklyCheckReportsList [data-action="edit-weekly-check"], #updatesContainer [data-action="edit-weekly-check"]').length,
            ticketTrackingSectionPresent: Boolean(document.getElementById('ticket-tracking')),
            notificationsCount,
            modalStates: {
                reportFaultOpen: document.getElementById('reportFaultModal')?.classList.contains('active') || false,
                conditionUpdateOpen: document.getElementById('conditionUpdateModal')?.classList.contains('active') || false,
            },
        };
    });

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
        interactionSummary,
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('machinery operator dashboard validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('machinery operator dashboard validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
