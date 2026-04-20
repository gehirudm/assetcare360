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
            breakdown_id: 'MBD-201',
            machine_id: 45,
            machine_name: 'Excavator #045',
            machine_model: 'EX-450',
            operator_id: 901,
            operator_name: 'Machinery Operator One',
            breakdown_type: 'Hydraulic Leak',
            severity: 'High',
            status: 'Pending',
            ticket_status: 'Open',
            fault_ticket_id: 6101,
            fault_ticket_number: 'TKT-6101',
            breakdown_date: '2026-04-03T08:30:00Z',
            created_at: '2026-04-03T08:30:00Z',
            resolved_at: null,
        },
        {
            id: 2,
            breakdown_id: 'MBD-202',
            machine_id: 128,
            machine_name: 'Loader #128',
            machine_model: 'LD-128',
            operator_id: 901,
            operator_name: 'Machinery Operator One',
            breakdown_type: 'Engine Overheat',
            severity: 'Critical',
            status: 'Assigned',
            ticket_status: 'In Progress',
            fault_ticket_id: 6102,
            fault_ticket_number: 'TKT-6102',
            breakdown_date: '2026-04-07T11:45:00Z',
            created_at: '2026-04-07T11:45:00Z',
            resolved_at: null,
        },
        {
            id: 3,
            breakdown_id: 'MBD-203',
            machine_id: 203,
            machine_name: 'Truck #203',
            machine_model: 'TR-203',
            operator_id: 901,
            operator_name: 'Machinery Operator One',
            breakdown_type: 'Brake System',
            severity: 'Medium',
            status: 'Resolved',
            ticket_status: 'Resolved',
            fault_ticket_id: 6103,
            fault_ticket_number: 'TKT-6103',
            breakdown_date: '2026-04-10T07:10:00Z',
            created_at: '2026-04-10T07:10:00Z',
            resolved_at: '2026-04-11T15:20:00Z',
        },
        {
            id: 4,
            breakdown_id: 'MBD-204',
            machine_id: 45,
            machine_name: 'Excavator #045',
            machine_model: 'EX-450',
            operator_id: 901,
            operator_name: 'Machinery Operator One',
            breakdown_type: 'Sensor Fault',
            severity: 'Low',
            status: 'Closed',
            ticket_status: 'Closed',
            fault_ticket_id: 6104,
            fault_ticket_number: 'TKT-6104',
            breakdown_date: '2026-04-14T09:05:00Z',
            created_at: '2026-04-14T09:05:00Z',
            resolved_at: '2026-04-15T12:00:00Z',
        },
    ];
}

function buildWeeklyChecks() {
    return [
        {
            id: 301,
            check_id: 'MCHK-301',
            machine_id: 45,
            machine_name: 'Excavator #045',
            operator_id: 901,
            operator_name: 'Machinery Operator One',
            week_start_date: '2026-03-30',
            week_end_date: '2026-04-05',
            submitted_date: '2026-04-05T08:00:00Z',
            overall_condition: 'good',
            status: 'approved',
            engine_status: 1,
            hydraulics: 1,
            electrical_system: 1,
            safety_equipment: 1,
            controls: 1,
            lubrication: 1,
            cooling_system: 1,
            filters: 1,
        },
        {
            id: 302,
            check_id: 'MCHK-302',
            machine_id: 128,
            machine_name: 'Loader #128',
            operator_id: 901,
            operator_name: 'Machinery Operator One',
            week_start_date: '2026-04-06',
            week_end_date: '2026-04-12',
            submitted_date: '2026-04-12T09:30:00Z',
            overall_condition: 'fair',
            status: 'pending',
            engine_status: 0,
            hydraulics: 1,
            electrical_system: 1,
            safety_equipment: 1,
            controls: 1,
            lubrication: 0,
            cooling_system: 1,
            filters: 0,
        },
        {
            id: 303,
            check_id: 'MCHK-303',
            machine_id: 203,
            machine_name: 'Truck #203',
            operator_id: 901,
            operator_name: 'Machinery Operator One',
            week_start_date: '2026-04-13',
            week_end_date: '2026-04-19',
            submitted_date: '2026-04-19T08:40:00Z',
            overall_condition: 'poor',
            status: 'rejected',
            engine_status: 0,
            hydraulics: 0,
            electrical_system: 1,
            safety_equipment: 1,
            controls: 0,
            lubrication: 0,
            cooling_system: 1,
            filters: 0,
        },
    ];
}

function buildMachines() {
    return [
        {
            id: 45,
            machine_id: 'EXC-045',
            machine_name: 'Excavator #045',
            model_number: 'EX-450',
            status: 'Active',
        },
        {
            id: 128,
            machine_id: 'LOD-128',
            machine_name: 'Loader #128',
            model_number: 'LD-128',
            status: 'Active',
        },
        {
            id: 203,
            machine_id: 'TRK-203',
            machine_name: 'Truck #203',
            model_number: 'TR-203',
            status: 'Under Maintenance',
        },
    ];
}

function buildNotifications() {
    return [
        {
            notification_id: 'NTF-001',
            title: 'Fault Ticket Updated',
            message: 'TKT-6102 moved to In Progress',
            type: 'info',
            is_read: 0,
            created_at: '2026-04-08T09:10:00Z',
        },
        {
            notification_id: 'NTF-002',
            title: 'Weekly Check Approved',
            message: 'MCHK-301 approved by supervisor',
            type: 'success',
            is_read: 1,
            created_at: '2026-04-06T14:20:00Z',
        },
        {
            notification_id: 'NTF-003',
            title: 'Weekly Check Rejected',
            message: 'MCHK-303 requires corrections',
            type: 'warning',
            is_read: 0,
            created_at: '2026-04-19T11:05:00Z',
        },
    ];
}

async function mockMachineryOperatorApis(page) {
    const breakdowns = buildBreakdowns();
    const checks = buildWeeklyChecks();
    const machines = buildMachines();
    const notifications = buildNotifications();

    await page.route('**/api/auth/me', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    id: 901,
                    employee_id: 'LITRO-MOP-901',
                    full_name: 'Machinery Operator One',
                    role: 'Machinary Operator',
                },
            }),
        });
    });

    await page.route('**/api/machines**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    machines,
                    pagination: {
                        page: 1,
                        per_page: 20,
                        total: machines.length,
                    },
                },
            }),
        });
    });

    await page.route('**/api/machine-breakdowns**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    reports: breakdowns,
                },
            }),
        });
    });

    await page.route('**/api/machine-weekly-checks**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    checks,
                    count: checks.length,
                },
            }),
        });
    });

    await page.route('**/api/notifications**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    notifications,
                    unread_count: notifications.filter((n) => Number(n.is_read) === 0).length,
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: notifications.length,
                        total_pages: 1,
                    },
                },
            }),
        });
    });
}

async function navigateSection(page, sectionId, fallbackLabel) {
    const moved = await page.evaluate((targetSection) => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo(targetSection);
        return true;
    }, sectionId);

    if (!moved && fallbackLabel) {
        await page.getByRole('navigation').getByText(fallbackLabel).click();
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

    let interactionSummary = {
        stage: STAGE,
        analyticsNavPresent: false,
        analyticsSectionPresent: false,
        activeSection: null,
        reportRows: 0,
        downloadSuggestedFilename: null,
    };

    if (STAGE === 'before') {
        const analyticsNav = page.locator('.nav-item', { hasText: 'Analytics' });
        await expect(analyticsNav).toHaveCount(0);

        interactionSummary = {
            ...interactionSummary,
            analyticsNavPresent: false,
            analyticsSectionPresent: await page.locator('#analytics').count() > 0,
            activeSection: await page.evaluate(() => document.querySelector('.content-section.active')?.id || null),
        };
    } else {
        const analyticsNav = page.locator('.nav-item', { hasText: 'Analytics' });
        await expect(analyticsNav).toHaveCount(1);

        await navigateSection(page, 'analytics', 'Analytics');

        await expect(page.locator('#analytics .page-title')).toContainText('Machinery Operator Analytics');
        await expect(page.locator('#analytics .analytics-option-btn')).toHaveCount(5);

        await page.fill('#moAnalyticsFromDate', '2026-04-01');
        await page.fill('#moAnalyticsToDate', '2026-04-30');
        await page.click('#analytics [data-action="apply-filter"]');

        await expect(page.locator('#moAnalyticsStatus')).toContainText(/updated|showing/i);

        await page.click('#analytics .analytics-option-btn[data-view="weekly-check"]');
        await expect(page.locator('#analytics .mo-analytics-panel.active .chart-card')).toHaveCount(2);

        await page.click('#analytics .analytics-option-btn[data-view="notifications"]');
        await expect(page.locator('#analytics .mo-analytics-panel.active .chart-card')).toHaveCount(2);

        await page.selectOption('#moReportScope', 'active');
        await page.click('#analytics [data-action="generate-report"]');
        await expect(page.locator('#moReportStatus')).toContainText(/generated successfully/i);

        const rowsCount = await page.locator('#moReportPreview tbody tr').count();
        const downloadBtn = page.locator('#moReportDownloadBtn');
        await expect(downloadBtn).toBeEnabled();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            downloadBtn.click(),
        ]);

        interactionSummary = {
            ...interactionSummary,
            analyticsNavPresent: true,
            analyticsSectionPresent: await page.locator('#analytics').count() > 0,
            activeSection: await page.evaluate(() => document.querySelector('.content-section.active')?.id || null),
            reportRows: rowsCount,
            downloadSuggestedFilename: download.suggestedFilename(),
        };
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
        interactionSummary,
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('machinery operator analytics hub validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('machinery operator analytics hub validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
