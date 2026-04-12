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

async function ensureAuctionOfficerSession(page) {
    await page.route('**/api/auth/me', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                message: 'Validation session',
                data: {
                    id: 999,
                    employee_id: 'LITRO-AUCTION-VALIDATION',
                    full_name: 'Auction Validation User',
                    role: 'Auction Officer',
                },
            }),
        });
    });

    await page.goto(`${BASE_URL}/dashboard/auction/index.html`, { waitUntil: 'domcontentloaded' });
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
            'active-auctions': 'Active Auctions',
            assets: 'Assets for Auction',
            bidders: 'Bidder Management',
            schedule: 'Auction Schedule',
            reports: 'Reports',
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
    await ensureAuctionOfficerSession(page);

    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

    await navigateSection(page, 'active-auctions');
    await expect(page.getByRole('heading', { name: 'Active Auctions' })).toBeVisible();
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await page.getByRole('button', { name: 'Create New Auction' }).click();
    const auctionModal = page.locator('#createAuctionModal');
    await expect(auctionModal).toBeVisible();
    await auctionModal.locator('.close').click();

    await navigateSection(page, 'assets');
    await expect(page.getByRole('heading', { name: 'Assets for Auction' })).toBeVisible();
    await page.getByRole('button', { name: 'Good Condition', exact: true }).click();

    await navigateSection(page, 'bidders');
    await expect(page.getByRole('heading', { name: 'Bidder Management' })).toBeVisible();
    await page.getByRole('button', { name: 'Register New Bidder' }).click();
    const bidderModal = page.locator('#registerBidderModal');
    await expect(bidderModal).toBeVisible();
    await bidderModal.locator('.close').click();
    await page.getByRole('button', { name: 'Pending', exact: true }).click();

    await navigateSection(page, 'schedule');
    await expect(page.getByRole('heading', { name: 'Auction Schedule' })).toBeVisible();
    await page.getByRole('button', { name: 'This Week', exact: true }).click();

    await navigateSection(page, 'reports');
    await expect(page.getByRole('heading', { name: 'Auction Reports' })).toBeVisible();
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    await page.getByRole('button', { name: 'Scheduled', exact: true }).click();

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const visibleAuctions = Array.from(document.querySelectorAll('#auctionsContainer .item-card'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleAssets = Array.from(document.querySelectorAll('#assetsContainer .item-card'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleBidders = Array.from(document.querySelectorAll('#biddersContainer .item-card'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleSchedule = Array.from(document.querySelectorAll('#scheduleContainer .item-card'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleReports = Array.from(document.querySelectorAll('#reportsContainer .item-card'))
            .filter((item) => item.style.display !== 'none').length;
        const modalStates = {
            createAuctionOpen: document.getElementById('createAuctionModal')?.classList.contains('active') || false,
            registerBidderOpen: document.getElementById('registerBidderModal')?.classList.contains('active') || false,
            scheduleAuctionOpen: document.getElementById('scheduleAuctionModal')?.classList.contains('active') || false,
        };
        return {
            activeSection,
            visibleAuctions,
            visibleAssets,
            visibleBidders,
            visibleSchedule,
            visibleReports,
            modalStates,
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

test('auction dashboard desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('auction dashboard mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
