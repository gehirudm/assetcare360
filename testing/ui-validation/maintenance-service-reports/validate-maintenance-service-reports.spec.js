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

async function ensureMaintenanceSession(page) {
    const completedServiceReport = {
        id: 4004,
        service_ticket_id: 'SVT-004',
        title: 'Quarterly Service Report',
        status: 'Completed',
        priority: 'High',
        service_type: 'Quarterly Maintenance',
        asset_type: 'vehicle',
        asset_name: 'Fuel Bowser 12KL',
        asset_code: 'VH901',
        asset_reference: 'VH901',
        asset_model: 'Isuzu NQR',
        asset_warranty_provider: 'Litro Warranty Team',
        asset_warranty_expiry: '2026-12-31',
        asset_warranty_status: 'Active',
        reported_by_name: 'Supervisor A',
        assigned_to_name: 'Technical Officer One',
        description: 'Completed periodic maintenance and diagnostics.',
        maintenance_notes: 'All checklist items completed and verified.',
        completion_notes: 'Vehicle ready for dispatch with no pending issues.',
        component_comments: [
            { component: 'Engine', comment: 'Oil changed and leak check complete.' },
            { component: 'Brakes', comment: 'Pad wear normal, no replacement required.' },
        ],
        asset_components: ['Engine', 'Brakes', 'Hydraulic Pump'],
        created_at: '2026-04-01T08:30:00Z',
        scheduled_date: '2026-04-02',
        started_at: '2026-04-02T07:00:00Z',
        completed_at: '2026-04-02T10:15:00Z',
        estimated_cost: '25000',
        actual_cost: '23750',
        next_service_date: '2026-07-02',
        service_meter_reading: '85210',
        warranty_action: 'none',
        warranty_void_reason: null,
    };

    await page.route('**/api/**', (route) => {
        const requestUrl = new URL(route.request().url());
        const pathName = requestUrl.pathname;

        if (pathName.endsWith('/api/auth/me')) {
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
            return;
        }

        if (pathName.endsWith('/api/budget-reports/pending')) {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    data: {
                        reports: [],
                    },
                }),
            });
            return;
        }

        if (/\/api\/service-tickets\/\d+$/.test(pathName)) {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    data: completedServiceReport,
                }),
            });
            return;
        }

        if (pathName.endsWith('/api/service-tickets')) {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    data: {
                        tickets: [completedServiceReport],
                    },
                }),
            });
            return;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
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
            'service-reports': 'Service Report Management',
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

    await navigateSection(page, 'service-reports');
    await expect(page.getByRole('heading', { name: 'Service Report Management' })).toBeVisible();

    const underReviewButton = page.getByRole('button', { name: 'Under Review' }).first();
    if (await underReviewButton.count()) {
        await underReviewButton.click();
    }

    const allReportsButton = page.getByRole('button', { name: 'All Reports' }).first();
    if (await allReportsButton.count()) {
        await allReportsButton.click();
    }

    await expect(page.getByRole('button', { name: 'View Report' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'View Report' }).first().click();
    await expect(page.locator('#service-ticket-details')).toHaveClass(/active/);
    await expect(page.locator('#service-ticket-details .service-ticket-detail-shell, #service-ticket-details .service-ticket-detail-error-card').first()).toBeVisible();
    await page.locator('#service-ticket-details [data-action="back"]').first().click();
    await expect(page.locator('#service-reports')).toHaveClass(/active/);

    const approveButton = page.getByRole('button', { name: 'Approve' }).first();
    if (await approveButton.count()) {
        await approveButton.click();
        await expect(page.locator('#service-ticket-details')).toHaveClass(/active/);
        await page.locator('#service-ticket-details [data-action="back"]').first().click();
        await expect(page.locator('#service-reports')).toHaveClass(/active/);
    }

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const activeFilter = document.querySelector('#service-reports .filter-btn.active')?.textContent?.trim() || null;
        const underReviewVisible = Array.from(document.querySelectorAll('#service-reports .service-report-card[data-report-status="under-review"]'))
            .filter((card) => card.style.display !== 'none').length;
        const reviewedVisible = Array.from(document.querySelectorAll('#service-reports .service-report-card[data-report-status="reviewed"]'))
            .filter((card) => card.style.display !== 'none').length;

        return {
            activeSection,
            activeFilter,
            underReviewVisible,
            reviewedVisible,
            detailViewActive: document.getElementById('service-ticket-details')?.classList.contains('active') || false,
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

test('maintenance service reports validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('maintenance service reports validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
