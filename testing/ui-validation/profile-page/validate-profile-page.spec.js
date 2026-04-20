const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    return {
        user: {
            id: 701,
            employee_id: 'LITRO-INVENTORY-001',
            full_name: 'Inventory Manager One',
            role: 'Inventory Manager',
            email: 'inventory.manager@assetcare.local',
            phone: '+94 71 123 4567',
            is_active: true,
            force_password_change: false,
            created_at: '2025-01-15T08:30:00Z',
            last_login: '2026-04-20T09:10:00Z',
        },
        loginActivities: [
            {
                id: 9001,
                endpoint: '/api/auth/login',
                action: 'User Login',
                response_code: 200,
                ip_address: '10.20.30.40',
                user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                created_at: '2026-04-20T09:10:00Z',
                login_method: 'password',
            },
            {
                id: 9002,
                endpoint: '/api/auth/login',
                action: 'User Login',
                response_code: 200,
                ip_address: '10.20.30.41',
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
                created_at: '2026-04-19T06:00:00Z',
                login_method: 'password',
            },
        ],
    };
}

function attachMonitors(page, state) {
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'warning' || type === 'error') {
            state.console.push({ type, text: msg.text() });
        }
    });

    page.on('response', (response) => {
        if (response.status() >= 400) {
            state.failedRequests.push({
                url: response.url(),
                method: response.request().method(),
                status: response.status(),
            });
        }
    });
}

async function mockApi(page, fixtures) {
    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        const json = (body, status = 200) => route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json({ status: 'success', message: 'User authenticated', data: fixtures.user });
        }

        if (pathname.endsWith('/api/auth/profile') && method === 'GET') {
            return json({ status: 'success', message: 'Profile retrieved', data: fixtures.user });
        }

        if (pathname.endsWith('/api/auth/passkey') && method === 'GET') {
            return json({ status: 'success', message: 'Passkeys retrieved', data: [] });
        }

        if (pathname.endsWith('/api/auth/login-activities') && method === 'GET') {
            return json({
                status: 'success',
                message: 'Login activities retrieved successfully',
                data: {
                    activities: fixtures.loginActivities,
                    count: fixtures.loginActivities.length,
                    limit: 20,
                },
            });
        }

        if (pathname.endsWith('/api/auth/logout') && method === 'POST') {
            return json({ status: 'success', message: 'Logged out', data: {} });
        }

        return json({ status: 'success', message: 'OK', data: {} });
    });
}

async function openProfilePage(page) {
    await page.goto(`${BASE_URL}/pages/profile/index.html`, { waitUntil: 'domcontentloaded' });

    let hasProfileHeader = await page.locator('.header .header-title').count();
    if (!hasProfileHeader) {
        await page.goto(`${BASE_URL}/profile/index.html`, { waitUntil: 'domcontentloaded' });
        hasProfileHeader = await page.locator('.header .header-title').count();
    }

    expect(hasProfileHeader).toBeGreaterThan(0);
    await expect(page.locator('.header .header-title')).toBeVisible({ timeout: 15000 });
}

async function runBeforeFlow(page, state) {
    await expect(page.locator('.header .header-title')).toContainText('User Profile');
    await expect(page.locator('main .breadcrumb')).toBeVisible();

    const totalBackButtons = await page.locator('button:has-text("Back to Dashboard"), .back-icon-btn[aria-label="Back to Dashboard"]').count();
    const headerBackButtons = await page.locator('.header button:has-text("Back to Dashboard"), .header .back-icon-btn').count();
    const contentBackButtons = await page.locator('main .back-icon-btn[aria-label="Back to Dashboard"]').count();
    const breadcrumbCount = await page.locator('main .breadcrumb .breadcrumb-item').count();

    expect(totalBackButtons).toBeGreaterThan(0);
    expect(breadcrumbCount).toBeGreaterThan(1);

    state.flowSummary.totalBackButtons = totalBackButtons;
    state.flowSummary.headerBackButtons = headerBackButtons;
    state.flowSummary.contentBackButtons = contentBackButtons;
    state.flowSummary.breadcrumbVisible = (await page.locator('main .breadcrumb').count()) > 0;
}

async function runAfterFlow(page, state, fixtures) {
    await expect(page.locator('.header .header-title')).toContainText('User Profile');
    await expect(page.locator('.header .user-info')).toBeVisible();
    await expect(page.locator('#userAvatar')).toContainText('I');
    await expect(page.locator('#userName')).toContainText('Inventory Manager One');
    await expect(page.locator('#headerUserRole')).toHaveText('Inventory Manager');
    await expect(page.locator('#headerUserEmployeeId')).toHaveText('LITRO-INVENTORY-001');

    const headerBackButtons = await page.locator('.header button:has-text("Back to Dashboard"), .header .back-icon-btn').count();
    const contentBackButton = page.locator('main .profile-detail-subheader .back-icon-btn[aria-label="Back to Dashboard"]');
    const breadcrumb = page.locator('main .breadcrumb');
    const dashboardCrumb = page.locator('#profileDashboardBreadcrumb');
    const currentCrumb = page.locator('main .breadcrumb .breadcrumb-current');

    await expect(contentBackButton).toBeVisible();
    await expect(page.locator('.profile-detail-subheader .page-title')).toContainText('My Profile');
    await expect(breadcrumb).toBeVisible();
    await expect(dashboardCrumb).toContainText('Dashboard');
    await expect(currentCrumb).toHaveText('My Profile');

    expect(headerBackButtons).toBe(0);

    const contentBackButtons = await page.locator('main .back-icon-btn[aria-label="Back to Dashboard"]').count();

    const activityTab = page.locator('.profile-tab[data-tab="activity"]');
    await activityTab.click();

    const activityItems = page.locator('.activity-log-item');
    await expect(activityItems).toHaveCount(fixtures.loginActivities.length);
    await expect(page.locator('#activityLogContainer')).toContainText('Password login successful');
    await expect(page.locator('#activityLogContainer')).toContainText('10.20.30.40');

    state.flowSummary.totalBackButtons = headerBackButtons + contentBackButtons;
    state.flowSummary.headerBackButtons = headerBackButtons;
    state.flowSummary.contentBackButtons = contentBackButtons;
    state.flowSummary.userInfoVisible = (await page.locator('.header .user-info').count()) > 0;
    state.flowSummary.breadcrumbVisible = (await breadcrumb.count()) > 0;
    state.flowSummary.currentBreadcrumbText = (await currentCrumb.textContent() || '').trim();
    state.flowSummary.activityItems = await activityItems.count();
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        flowSummary: {
            totalBackButtons: 0,
            headerBackButtons: 0,
            contentBackButtons: 0,
            userInfoVisible: false,
            breadcrumbVisible: false,
            currentBreadcrumbText: '',
            activityItems: 0,
        },
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures);
    await openProfilePage(page);

    if (STAGE === 'before') {
        await runBeforeFlow(page, state);
    } else {
        await runAfterFlow(page, state, fixtures);
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
        interactionSummary: {
            totalBackButtons: state.flowSummary.totalBackButtons,
            headerBackButtons: state.flowSummary.headerBackButtons,
            contentBackButtons: state.flowSummary.contentBackButtons,
            userInfoVisible: state.flowSummary.userInfoVisible,
            breadcrumbVisible: state.flowSummary.breadcrumbVisible,
            currentBreadcrumbText: state.flowSummary.currentBreadcrumbText,
            activityItems: state.flowSummary.activityItems,
        },
    };

    fs.writeFileSync(path.join(OUT_DIR, `${STAGE}-${viewportName}.json`), JSON.stringify(artifact, null, 2));
}

test('profile page header validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('profile page header validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
