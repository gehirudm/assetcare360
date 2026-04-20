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

    await page.route('**/api/vehicles*', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                message: 'Vehicles loaded',
                data: {
                    vehicles: [
                        {
                            id: 21,
                            vehicle_id: 'VEH-021',
                            vehicle_name: 'Auction Van AV-21',
                            model_number: 'Toyota Hiace',
                            number_plate: 'CAB-1234',
                            current_mileage: 120450,
                            status: 'For Auction',
                            notes: 'Good condition and ready for disposal',
                        },
                        {
                            id: 44,
                            vehicle_id: 'VEH-044',
                            vehicle_name: 'Fleet Truck FT-44',
                            model_number: 'Mitsubishi Fuso',
                            number_plate: 'NAB-8891',
                            current_mileage: 238100,
                            status: 'For Auction',
                            notes: 'Fair condition with visible wear',
                        },
                    ],
                },
            }),
        });
    });

    await page.route('**/api/machines*', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                message: 'Machines loaded',
                data: {
                    machines: [
                        {
                            id: 31,
                            machine_id: 'MCH-031',
                            machine_name: 'Loader LD-31',
                            model_number: 'CAT 930',
                            location: 'Yard A',
                            current_operating_hours: 6480,
                            status: 'For Auction',
                            notes: 'Fair condition after major repairs',
                        },
                        {
                            id: 18,
                            machine_id: 'MCH-018',
                            machine_name: 'Generator GN-18',
                            model_number: 'Perkins 100kVA',
                            location: 'Stores B',
                            current_operating_hours: 4200,
                            status: 'For Auction',
                            notes: 'Good condition and ready for sale',
                        },
                    ],
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

    const headerLeft = page.locator('ac-header .header-left');
    await expect(headerLeft).toBeVisible();
    await expect(headerLeft).toHaveCSS('display', 'flex');
    await expect(page.locator('ac-header .header-divider')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

    const overviewActions = page.locator('#dashboard .summary-grid .summary-card[data-nav-target]');
    await expect(overviewActions).toHaveCount(4);
    await expect(page.locator('#dashboard .summary-card[data-nav-target="active-auctions"]')).toBeVisible();
    await expect(page.locator('#dashboard .summary-card[data-nav-target="assets"]')).toBeVisible();
    await expect(page.locator('#dashboard .summary-card[data-nav-target="bidders"]')).toBeVisible();
    await expect(page.locator('#dashboard .summary-card[data-nav-target="schedule"]')).toBeVisible();
    await expect(page.getByText("Today's Activity", { exact: true })).toHaveCount(0);
    await expect(page.getByText('Auction Performance', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Pending Actions', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Quick Actions', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Recent Activities', { exact: true })).toHaveCount(0);

    await page.click('#dashboard .summary-card[data-nav-target="active-auctions"]');
    await expect(page.getByRole('heading', { name: 'Active Auctions' })).toBeVisible();
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await page.getByRole('button', { name: 'Create New Auction' }).click();
    const auctionModal = page.locator('#createAuctionModal');
    await expect(auctionModal).toBeVisible();
    await auctionModal.locator('.close').click();

    await navigateSection(page, 'assets');
    await expect(page.getByRole('heading', { name: 'Assets for Auction' })).toBeVisible();
    await expect(page.locator('#assetsAvailabilityBadge')).toContainText('4 available');
    await expect(page.getByText('Auction Van AV-21', { exact: true })).toBeVisible();
    await expect(page.getByText('Loader LD-31', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Good Condition', exact: true }).click();
    await expect(page.locator('#assetsContainer .item-card:visible')).toHaveCount(2);

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
