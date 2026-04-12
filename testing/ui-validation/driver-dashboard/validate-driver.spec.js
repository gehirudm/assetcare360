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

async function loginAsDriver(page) {
    await page.goto('http://127.0.0.1:3000/auth/login.html', { waitUntil: 'domcontentloaded' });

    const employeeInput = page.locator('#employeeId');
    if (await employeeInput.count()) {
        await employeeInput.fill('LITRO-DRIVER-001'); // Assume we have a driver account
        await page.locator('#password').fill('password123');

        await Promise.all([
            page.waitForURL('**/dashboard/driver/index.html', { timeout: 30000 }).catch(() => null),
            page.getByRole('button', { name: 'Log in' }).click(),
        ]);
        
        // If it didn't auto redirect (e.g. backend not fully seeded for this user) just go directly:
        if (!page.url().includes('driver/index.html')) {
            await page.goto('http://127.0.0.1:3000/dashboard/driver/index.html', { waitUntil: 'domcontentloaded' });
        }
    } else {
        await page.goto('http://127.0.0.1:3000/dashboard/driver/index.html', { waitUntil: 'domcontentloaded' });
    }
}

async function runFlow(page, viewportName) {
    const state = {
        console: [],
        failedRequests: [],
    };

    attachMonitors(page, state);
    await loginAsDriver(page);

    // Wait for the layout to be ready
    await expect(page.locator('ac-layout')).toBeVisible();

    // Navigate to Trip Log section as a core interaction representing this dashboard's complexity
    const navigatedViaLayout = await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo('trip-log');
        return true;
    });

    if (!navigatedViaLayout) {
        await page.getByRole('navigation').getByText('Trip Log').click();
    }

    // Give content time to render
    await page.waitForTimeout(500);

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('ac-layout').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        return { activeSection };
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
        interactionSummary
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('driver dashboard desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('driver dashboard mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
