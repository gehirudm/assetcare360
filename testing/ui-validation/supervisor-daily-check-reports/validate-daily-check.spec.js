const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const OUT_DIR = __dirname;

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

async function loginAsSupervisor(page) {
    await page.goto('http://127.0.0.1:3000/auth/login.html', { waitUntil: 'domcontentloaded' });

    const employeeInput = page.locator('#employeeId');
    if (await employeeInput.count()) {
        await employeeInput.fill('LITRO-SUPERVISOR-001');
        await page.locator('#password').fill('password123');

        await Promise.all([
            page.waitForURL('**/dashboard/supervisor/index.html', { timeout: 30000 }),
            page.getByRole('button', { name: 'Log in' }).click(),
        ]);
    } else {
        await page.goto('http://127.0.0.1:3000/dashboard/supervisor/index.html', { waitUntil: 'domcontentloaded' });
    }
}

async function runFlow(page, viewportName) {
    const state = {
        console: [],
        failedRequests: [],
    };

    attachMonitors(page, state);
    await loginAsSupervisor(page);

    const navigatedViaLayout = await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo('daily-check-reports');
        return true;
    });

    if (!navigatedViaLayout) {
        await page.getByRole('navigation').getByText('Weekly Check Reports').click();
    }

    await expect(page.getByRole('heading', { name: 'Weekly Check Reports' })).toBeVisible();

    await page.getByRole('button', { name: 'Pending', exact: true }).click();
    await page.getByRole('button', { name: 'Driver Reports', exact: true }).click();

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const firstView = page.getByRole('button', { name: 'VIEW' }).first();
    let modalOpened = false;
    if (await firstView.count()) {
        await firstView.click();
        const modal = page.locator('supervisor-report-details-modal #reportDetailsModal');
        if (await modal.count()) {
            await modal.waitFor({ state: 'visible', timeout: 5000 });
            modalOpened = await modal.evaluate((node) => node.style.display === 'flex');
        }

        const closeButtons = page.locator('supervisor-report-details-modal [data-modal-close]');
        if (modalOpened && await closeButtons.count()) {
            modalOpened = true;
            await closeButtons.first().click();
        }
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const visibleReports = Array.from(document.querySelectorAll('#reportsTableBody .inventory-item'))
            .filter((item) => item.style.display !== 'none').length;
        const totalReports = document.querySelectorAll('#reportsTableBody .inventory-item').length;
        return { activeSection, visibleReports, totalReports };
    });

    const screenshotName = `${STAGE}-${viewportName}.png`;
    await page.screenshot({
        path: path.join(OUT_DIR, screenshotName),
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
        interactionSummary: {
            ...interactionSummary,
            modalOpened,
        },
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('supervisor daily-check desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('supervisor daily-check mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
