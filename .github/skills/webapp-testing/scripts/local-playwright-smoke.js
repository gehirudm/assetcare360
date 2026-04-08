#!/usr/bin/env node

const path = require('path');
const { chromium } = require('playwright');
const {
    ensureDir,
    ensureServerReachable,
    attachBrowserLogging,
    captureScreenshot,
    withFailureArtifacts
} = require('../assets/test-helper');

async function main() {
    const targetUrl = process.argv[2] || 'http://127.0.0.1:3000';
    const artifactsDir = path.resolve(process.cwd(), 'playwright-artifacts');

    ensureDir(artifactsDir);

    const reachable = await ensureServerReachable(targetUrl, 5000);
    if (!reachable.ok) {
        throw new Error(`Target not reachable or unhealthy: ${targetUrl} (status: ${reachable.status})`);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();

    const logs = { console: [], network: [] };
    attachBrowserLogging(page, logs);

    try {
        await withFailureArtifacts(page, artifactsDir, 'goto', async () => {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        });

        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        const title = await page.title();
        const screenshot = await captureScreenshot(page, artifactsDir, 'smoke');

        console.log('SMOKE TEST PASSED');
        console.log(`URL: ${targetUrl}`);
        console.log(`Title: ${title}`);
        console.log(`Screenshot: ${screenshot}`);

        if (logs.console.length > 0) {
            console.log('Console messages captured:', logs.console.length);
        }
        if (logs.network.length > 0) {
            console.log('Failed network requests captured:', logs.network.length);
        }
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error('SMOKE TEST FAILED');
    console.error(error.message || error);
    process.exit(1);
});
