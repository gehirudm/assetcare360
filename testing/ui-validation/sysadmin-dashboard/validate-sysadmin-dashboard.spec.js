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

function buildUsers() {
    return [
        {
            id: 1,
            full_name: 'Admin User',
            employee_id: 'LITRO-ADMIN-001',
            email: 'admin@assetcare360.test',
            phone: '+94770000001',
            role: 'Admin',
            technical_expertise: null,
            is_active: 1,
            require_password_change: 0,
            created_at: '2026-01-01 09:00:00',
            updated_at: '2026-04-01 09:00:00',
        },
        {
            id: 2,
            full_name: 'Technical Officer One',
            employee_id: 'LITRO-TECHOFFICER-001',
            email: 'to1@assetcare360.test',
            phone: '+94770000002',
            role: 'Technical Officer',
            technical_expertise: 'General',
            is_active: 1,
            require_password_change: 0,
            created_at: '2026-01-05 09:00:00',
            updated_at: '2026-04-01 09:00:00',
        },
        {
            id: 3,
            full_name: 'Supervisor One',
            employee_id: 'LITRO-SUPERVISOR-001',
            email: 'sup1@assetcare360.test',
            phone: '+94770000003',
            role: 'Supervisor',
            technical_expertise: null,
            is_active: 1,
            require_password_change: 0,
            created_at: '2026-01-10 09:00:00',
            updated_at: '2026-04-01 09:00:00',
        },
    ];
}

function buildLogs() {
    const now = Date.now();
    const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000).toISOString();

    return [
        {
            id: 5001,
            user_id: 3,
            user_name: 'Supervisor One',
            employee_id: 'LITRO-SUPERVISOR-001',
            user_role: 'Supervisor',
            ip_address: '192.168.1.45',
            method: 'POST',
            endpoint: '/api/auth/login',
            action: 'User login',
            category: 'Authentication',
            response_code: 200,
            created_at: minutesAgo(15),
        },
        {
            id: 5002,
            user_id: 3,
            user_name: 'Supervisor One',
            employee_id: 'LITRO-SUPERVISOR-001',
            user_role: 'Supervisor',
            ip_address: '192.168.1.45',
            method: 'GET',
            endpoint: '/api/breakdown-reports',
            action: 'Viewed breakdown report list',
            category: 'Breakdown Management',
            response_code: 200,
            created_at: minutesAgo(5),
        },
        {
            id: 5003,
            user_id: 2,
            user_name: 'Technical Officer One',
            employee_id: 'LITRO-TECHOFFICER-001',
            user_role: 'Technical Officer',
            ip_address: '192.168.1.52',
            method: 'POST',
            endpoint: '/api/auth/login',
            action: 'User login',
            category: 'Authentication',
            response_code: 200,
            created_at: minutesAgo(25),
        },
        {
            id: 5004,
            user_id: 2,
            user_name: 'Technical Officer One',
            employee_id: 'LITRO-TECHOFFICER-001',
            user_role: 'Technical Officer',
            ip_address: '192.168.1.52',
            method: 'POST',
            endpoint: '/api/tickets/123/updates',
            action: 'Added work update',
            category: 'Ticket Workflow',
            response_code: 201,
            created_at: minutesAgo(12),
        },
        {
            id: 5005,
            user_id: 1,
            user_name: 'Admin User',
            employee_id: 'LITRO-ADMIN-001',
            user_role: 'Admin',
            ip_address: '192.168.1.10',
            method: 'PATCH',
            endpoint: '/api/system-settings/petty-cash',
            action: 'Updated petty cash threshold config',
            category: 'System Administration',
            response_code: 200,
            created_at: minutesAgo(10),
        },
        {
            id: 5006,
            user_id: 1,
            user_name: 'Admin User',
            employee_id: 'LITRO-ADMIN-001',
            user_role: 'Admin',
            ip_address: '192.168.1.10',
            method: 'PATCH',
            endpoint: '/api/users/2/role',
            action: 'Updated permission role mapping',
            category: 'User Management',
            response_code: 200,
            created_at: minutesAgo(18),
        },
        {
            id: 5007,
            user_id: null,
            user_name: 'Unknown User',
            employee_id: '',
            user_role: '',
            ip_address: '10.0.0.8',
            method: 'POST',
            endpoint: '/api/auth/login',
            action: 'Failed login attempt',
            category: 'Authentication',
            response_code: 401,
            created_at: minutesAgo(20),
        },
        {
            id: 5008,
            user_id: 1,
            user_name: 'Admin User',
            employee_id: 'LITRO-ADMIN-001',
            user_role: 'Admin',
            ip_address: '192.168.1.10',
            method: 'GET',
            endpoint: '/api/system-settings/audit',
            action: 'Viewed system configuration audit',
            category: 'System Administration',
            response_code: 500,
            created_at: minutesAgo(8),
        },
    ];
}

function filterLogsByPeriod(logs, period) {
    const now = Date.now();
    const periodWindowMs = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        all: Number.POSITIVE_INFINITY,
    };

    const windowMs = periodWindowMs[period] || periodWindowMs.today;

    return logs.filter((log) => {
        if (!Number.isFinite(windowMs)) {
            return true;
        }

        const timestamp = Date.parse(log.created_at || '');
        if (Number.isNaN(timestamp)) {
            return false;
        }

        return now - timestamp <= windowMs;
    });
}

async function ensureAdminSession(page) {
    const users = buildUsers();
    const logs = buildLogs();
    let pettyCashSetting = {
        id: 1,
        setting_key: 'petty_cash_limit',
        setting_value: '50000.00',
        data_type: 'decimal',
        description: 'Maximum budget amount that a Supervisor can approve. Amounts exceeding this require Maintenance Manager approval.',
        updated_by: 1,
        updated_by_name: 'Admin User',
        created_at: '2026-01-01 09:00:00',
        updated_at: '2026-04-01 09:00:00',
    };

    await page.route('**/api/auth/me', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    id: 999,
                    employee_id: 'LITRO-ADMIN-VALIDATION',
                    full_name: 'SysAdmin Validation User',
                    role: 'Admin',
                },
            }),
        });
    });

    await page.route('**/api/users**', (route) => {
        const request = route.request();
        const url = request.url();
        const { pathname } = new URL(url);
        const method = request.method();

        if (method === 'GET' && pathname === '/api/users') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    data: {
                        users,
                        pagination: {
                            page: 1,
                            limit: users.length,
                            total: users.length,
                            total_pages: 1,
                        },
                    },
                }),
            });
            return;
        }

        if (method === 'GET' && /^\/api\/users\/\d+$/.test(pathname)) {
            const idMatch = pathname.match(/\/api\/users\/(\d+)/);
            const user = users.find((item) => String(item.id) === String(idMatch ? idMatch[1] : '')) || users[0];
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'success', data: user }),
            });
            return;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: {} }),
        });
    });

    await page.route('**/api/logs**', (route) => {
        const request = route.request();
        const method = request.method();
        const requestUrl = new URL(request.url());

        if (method !== 'GET') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'success', data: {} }),
            });
            return;
        }

        const period = requestUrl.searchParams.get('period') || 'today';
        const filteredLogs = filterLogsByPeriod(logs, period)
            .slice()
            .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                data: {
                    logs: filteredLogs,
                    pagination: {
                        page: 1,
                        limit: filteredLogs.length,
                        total: filteredLogs.length,
                        total_pages: 1,
                    },
                },
            }),
        });
    });

    await page.route('**/api/system-settings**', async (route) => {
        const request = route.request();
        const url = request.url();
        const { pathname } = new URL(url);
        const method = request.method();

        if (method === 'GET' && pathname === '/api/system-settings') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    data: {
                        settings: [pettyCashSetting],
                    },
                }),
            });
            return;
        }

        if (method === 'GET' && pathname === '/api/system-settings/petty_cash_limit') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    data: {
                        setting: pettyCashSetting,
                    },
                }),
            });
            return;
        }

        if (method === 'PUT' && pathname === '/api/system-settings/petty_cash_limit') {
            let requestedValue = pettyCashSetting.setting_value;
            try {
                const payload = request.postDataJSON();
                if (payload && Object.prototype.hasOwnProperty.call(payload, 'value')) {
                    const numericValue = Number(payload.value);
                    if (Number.isFinite(numericValue)) {
                        requestedValue = numericValue.toFixed(2);
                    }
                }
            } catch (error) {
                // Keep prior value when payload cannot be parsed.
            }

            pettyCashSetting = {
                ...pettyCashSetting,
                setting_value: requestedValue,
                updated_at: new Date().toISOString(),
            };

            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    message: 'Setting updated successfully',
                    data: {
                        setting: pettyCashSetting,
                    },
                }),
            });
            return;
        }

        route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'error',
                message: 'Setting not found',
            }),
        });
    });

    await page.goto(`${BASE_URL}/dashboard/sysadministration/index.html`, { waitUntil: 'domcontentloaded' });
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
            'petty-cash-config': 'Petty Cash Config',
            'notifications-config': 'Notification Templates',
            'system-logs': 'System Logs',
            'activity-tracking': 'User Activity Tracking',
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
    await ensureAdminSession(page);

    await expect(page.getByRole('heading', { name: 'Dashboard Overview', exact: true })).toBeVisible();

    await navigateSection(page, 'petty-cash-config');
    await expect(page.getByRole('heading', { name: 'Petty Cash Configuration' })).toBeVisible();
    await expect(page.locator('#saPettyCashLimitValue')).toContainText('LKR');
    await expect(page.locator('#pettyCashRoutingSummary')).toContainText('Maintenance Manager approval');
    await page.getByRole('button', { name: 'Set New Limit' }).click();
    await expect(page.locator('#setPettyCashLimitModal')).toBeVisible();
    await page.locator('#setPettyCashLimitModal .close').click();
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.locator('#detailsModal')).toBeVisible();
    await page.locator('#detailsModal .btn-close').click();

    await navigateSection(page, 'notifications-config');
    await expect(page.getByRole('heading', { name: 'Notification Templates' })).toBeVisible();
    await page.getByRole('button', { name: 'Create New Template' }).click();
    await expect(page.locator('#createTemplateModal')).toBeVisible();
    await page.locator('#createTemplateModal .close').click();
    await page.getByRole('button', { name: 'Preview' }).first().click();
    await expect(page.locator('#detailsModal')).toBeVisible();
    await page.locator('#detailsModal .btn-close').click();

    await navigateSection(page, 'system-logs');
    await expect(page.getByRole('heading', { name: 'System Logs' })).toBeVisible();
    await expect(page.locator('#logCount')).toContainText('logs');
    await expect(page.locator('#logsList .log-entry').first()).toBeVisible();
    await page.getByRole('button', { name: 'Login Events' }).click();
    const logSearch = page.locator('#logSearch');
    await logSearch.click();
    await logSearch.type('login');
    await expect(page.locator('#logsList .log-entry').first()).toContainText('login');

    await navigateSection(page, 'activity-tracking');
    await expect(page.getByRole('heading', { name: 'User Activity Tracking' })).toBeVisible();
    await expect(page.locator('#summaryTotalActions')).toHaveText('8');
    await page.getByRole('button', { name: 'Supervisor' }).click();
    await expect(page.locator('#activeUsersList tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'View Session' }).first().click();
    await expect(page.locator('#detailsModal')).toBeVisible();
    await page.locator('#detailsModal .btn-close').click();

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const visibleLogs = Array.from(document.querySelectorAll('#logsList .log-entry'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleActiveUsers = Array.from(document.querySelectorAll('#activeUsersList tr'))
            .filter((item) => item.style.display !== 'none').length;

        return {
            activeSection,
            visibleLogs,
            visibleActiveUsers,
            modalStates: {
                setPettyCashLimitOpen: document.getElementById('setPettyCashLimitModal')?.classList.contains('active') || false,
                createTemplateOpen: document.getElementById('createTemplateModal')?.classList.contains('active') || false,
                detailsOpen: document.getElementById('detailsModal')?.classList.contains('active') || false,
            },
            activeFilters: {
                logFilter: document.querySelector('#logFilterTabs .filter-btn.active')?.textContent?.trim() || null,
                activityFilter: document.querySelector('#activityFilterTabs .filter-btn.active')?.textContent?.trim() || null,
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

test('sysadmin dashboard validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('sysadmin dashboard validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
