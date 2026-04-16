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
                    reports: [],
                },
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

    await page.getByRole('button', { name: 'Under Review' }).click();
    await page.getByRole('button', { name: 'All Reports' }).click();

    await page.getByRole('button', { name: 'View Report' }).first().click();
    await expect(page.locator('#reportDetailsModal')).toBeVisible();
    await page.locator('#reportDetailsModal .close').click();

    await page.getByRole('button', { name: 'Approve' }).first().click();
    await page.waitForTimeout(1700);

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
            modalStates: {
                reportDetailsOpen: document.getElementById('reportDetailsModal')?.classList.contains('active') || false,
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

test('maintenance service reports validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('maintenance service reports validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
