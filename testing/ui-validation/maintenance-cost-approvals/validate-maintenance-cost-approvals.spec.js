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

function buildPendingReports() {
    return [
        {
            id: 101,
            status: 'pending',
            total_amount: 45250,
            justification: 'Engine overhaul and cooling system replacement.',
            quotation: 'QTN-ENG-101',
            approval_level: 'maintenance_manager',
            ticket_priority: 'High',
            ticket_display_id: 'TKT-001',
            fault_ticket_id: 1,
            ticket_description: 'Engine overheating on Vehicle #101',
            submitted_by_name: 'Supervisor John',
            submitted_by_employee_id: 'SUP-001',
            created_at: '2026-04-12T08:30:00Z',
        },
        {
            id: 102,
            status: 'pending',
            total_amount: 28300,
            justification: 'Hydraulic pump seal and hose replacement.',
            quotation: 'QTN-HYD-205',
            approval_level: 'maintenance_manager',
            ticket_priority: 'Medium',
            ticket_display_id: 'TKT-002',
            fault_ticket_id: 2,
            ticket_description: 'Hydraulic leak on Machine #205',
            submitted_by_name: 'Supervisor Mike',
            submitted_by_employee_id: 'SUP-002',
            created_at: '2026-04-11T11:15:00Z',
        },
    ];
}

async function ensureMaintenanceSession(page) {
    const pendingReports = buildPendingReports();

    await page.route('**/api/auth/me', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    id: 501,
                    employee_id: 'LITRO-MAINT-001',
                    full_name: 'Maintenance Manager One',
                    role: 'Maintenance Manager',
                },
            }),
        });
    });

    await page.route('**/api/budget-reports/pending', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    reports: pendingReports,
                },
            }),
        });
    });

    await page.route('**/api/budget-reports/*/review', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                message: 'Budget request reviewed',
                data: {},
            }),
        });
    });

    await page.goto(`${BASE_URL}/dashboard/maintenance/index.html`, { waitUntil: 'domcontentloaded' });
}

async function navigateSection(page, section) {
    const moved = await page.evaluate((targetSection) => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo(targetSection);
        return true;
    }, section);

    if (!moved) {
        const labels = {
            'cost-approvals': 'Cost Approvals',
        };
        await page.getByRole('navigation').getByText(labels[section] || section).click();
    }
}

async function runFlow(page, viewportName) {
    const state = {
        console: [],
        failedRequests: [],
    };

    attachMonitors(page, state);
    await ensureMaintenanceSession(page);

    await expect(page.locator('ac-layout')).toBeVisible();

    await navigateSection(page, 'cost-approvals');
    await expect(page.getByRole('heading', { name: 'Cost Approvals' })).toBeVisible();

    await page.getByRole('button', { name: 'Pending' }).click();
    await page.getByRole('button', { name: 'All Requests' }).click();

    const detailsBtn = page.locator('#costApprovalPendingList button').filter({ hasText: 'Details' }).first();
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();
    await expect(page.locator('#costDetailsModal')).toBeVisible();
    await page.locator('#costDetailsModal .close').click();

    await page.locator('#costApprovalPendingList button').filter({ hasText: 'Approve' }).first().click();
    await expect(page.locator('#approveModal')).toBeVisible();
    await page.locator('#approveComments').fill('Validated approval path in UI refactor test');
    await page.locator('#approveModal button[type="submit"]').click();

    await page.locator('#costApprovalPendingList button').filter({ hasText: 'Reject' }).first().click();
    await expect(page.locator('#rejectModal')).toBeVisible();
    await page.locator('#rejectReason').selectOption('timing');
    await page.locator('#rejectComments').fill('Validated rejection path in UI refactor test');
    await page.locator('#rejectModal button[type="submit"]').click();

    await page.getByRole('button', { name: 'Approved' }).click();
    await page.getByRole('button', { name: 'Rejected' }).click();

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const pendingCount = document.querySelectorAll('#costApprovalPendingList .request-item').length;
        const approvedRows = Array.from(document.querySelectorAll('#costApprovalApprovedBody tr')).filter((row) => row.querySelector('button')).length;
        const rejectedRows = Array.from(document.querySelectorAll('#costApprovalRejectedBody tr')).filter((row) => row.querySelector('button')).length;
        const activeFilter = document.querySelector('#cost-approvals .filter-btn.active')?.textContent?.trim() || null;

        return {
            activeSection,
            pendingCount,
            approvedRows,
            rejectedRows,
            activeFilter,
            modalStates: {
                costDetailsOpen: document.getElementById('costDetailsModal')?.classList.contains('active') || false,
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

test('maintenance cost approvals validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('maintenance cost approvals validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
