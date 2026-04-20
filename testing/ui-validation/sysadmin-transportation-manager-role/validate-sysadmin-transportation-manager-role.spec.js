const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const OUT_DIR = __dirname;
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';

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
            full_name: 'Transport Manager One',
            employee_id: 'LITRO-TRANSPORT-001',
            email: 'tm1@assetcare360.test',
            phone: '+94770000009',
            role: 'Transportation Manager',
            technical_expertise: null,
            is_active: 1,
            require_password_change: 0,
            created_at: '2026-01-08 09:00:00',
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
        {
            id: 4,
            full_name: 'Transport Manager Inactive',
            employee_id: 'LITRO-TRANSPORT-002',
            email: 'tm2@assetcare360.test',
            phone: '+94770000019',
            role: 'Transportation Manager',
            technical_expertise: null,
            is_active: '0',
            require_password_change: 0,
            created_at: '2026-01-18 09:00:00',
            updated_at: '2026-04-01 09:00:00',
        },
    ];
}

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

async function mockApi(page) {
    const users = buildUsers();

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
            return json({
                status: 'success',
                data: {
                    id: 999,
                    employee_id: 'LITRO-ADMIN-VALIDATION',
                    full_name: 'SysAdmin Validation User',
                    role: 'Admin',
                },
            });
        }

        if (pathname.endsWith('/api/users') && method === 'GET') {
            return json({
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
            });
        }

        if (/\/api\/users\/\d+$/.test(pathname) && method === 'GET') {
            const idMatch = pathname.match(/\/api\/users\/(\d+)$/);
            const user = users.find((item) => String(item.id) === String(idMatch ? idMatch[1] : '')) || users[0];
            return json({ status: 'success', data: user });
        }

        if (pathname.endsWith('/api/users') && method === 'POST') {
            return json({
                status: 'success',
                data: {
                    id: 501,
                },
                temporary_password: 'Temp#12345',
            });
        }

        if (/\/api\/users\/\d+$/.test(pathname) && (method === 'PUT' || method === 'PATCH')) {
            return json({
                status: 'success',
                message: 'User updated successfully',
                data: {},
            });
        }

        return json({ status: 'success', data: {} });
    });
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
        await page.getByRole('navigation').getByText('User Accounts').click();
    }
}

async function runFlow(page, viewportName) {
    const state = {
        console: [],
        failedRequests: [],
    };

    attachMonitors(page, state);
    await mockApi(page);

    const startUrl = `${BASE_URL}/dashboard/sysadministration/index.html`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await navigateSection(page, 'user-accounts');
    await expect(page.getByRole('heading', { name: 'User Management', exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#userList .user-item').first()).toBeVisible({ timeout: 15000 });

    const filterHasTransportation = await page.locator('#userFilterTabs [data-role-filter="Transportation Manager"]').count() > 0;

    await page.getByRole('button', { name: /Create New User/i }).click();
    await expect(page.locator('#createUserModal')).toBeVisible({ timeout: 15000 });

    const createRoleOptions = await page.$$eval('#createUserForm select[name="role"] option', (options) =>
        options.map((option) => ({
            value: option.value,
            label: option.textContent ? option.textContent.trim() : '',
        }))
    );

    const createHasTransportation = createRoleOptions.some((option) => option.value === 'Transportation Manager');
    if (STAGE === 'after' && createHasTransportation) {
        await page.selectOption('#createUserForm select[name="role"]', 'Transportation Manager');
    }

    await page.locator('#createUserModal [data-close-modal]').first().click();
    await expect(page.locator('#createUserModal')).not.toBeVisible({ timeout: 15000 });

    await page.locator('#userList .dropdown-trigger').first().click();
    await page.locator('#userList .dropdown-menu .dropdown-item', { hasText: 'Edit' }).first().click();
    await expect(page.locator('#editUserModal')).toBeVisible({ timeout: 15000 });

    const editRoleOptions = await page.$$eval('#editUserForm select[name="role"] option', (options) =>
        options.map((option) => ({
            value: option.value,
            label: option.textContent ? option.textContent.trim() : '',
        }))
    );

    const editHasTransportation = editRoleOptions.some((option) => option.value === 'Transportation Manager');
    if (STAGE === 'after' && editHasTransportation) {
        await page.selectOption('#editUserForm select[name="role"]', 'Transportation Manager');
    }

    await page.locator('#editUserModal [data-close-modal]').first().click();
    await expect(page.locator('#editUserModal')).not.toBeVisible({ timeout: 15000 });

    let visibleUsersAfterFilter = null;
    let visibleInactiveTransportationUsers = null;
    if (filterHasTransportation) {
        await page.locator('#userFilterTabs [data-role-filter="Transportation Manager"]').click();

        visibleUsersAfterFilter = await page.$$eval('#userList .user-item', (rows) =>
            rows.filter((row) => {
                const style = window.getComputedStyle(row);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }).length
        );

        await page.selectOption('#statusFilter', 'inactive');
        visibleInactiveTransportationUsers = await page.$$eval('#userList .user-item', (rows) =>
            rows.filter((row) => {
                const style = window.getComputedStyle(row);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }).length
        );

        await page.selectOption('#statusFilter', '');
    }

    if (STAGE === 'after') {
        expect(createHasTransportation).toBeTruthy();
        expect(editHasTransportation).toBeTruthy();
        expect(filterHasTransportation).toBeTruthy();
        expect((visibleUsersAfterFilter || 0) > 0).toBeTruthy();
        expect((visibleInactiveTransportationUsers || 0) > 0).toBeTruthy();
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

    const interactionSummary = {
        destinationPath: new URL(page.url()).pathname,
        filterHasTransportation,
        createHasTransportation,
        editHasTransportation,
        visibleUsersAfterFilter,
        visibleInactiveTransportationUsers,
        createRoleOptionsCount: createRoleOptions.length,
        editRoleOptionsCount: editRoleOptions.length,
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify({
            stage: STAGE,
            viewport: viewportName,
            startUrl,
            finalUrl: page.url(),
            title: await page.title(),
            accessibility: {
                ariaSnapshot,
                snapshotLength: ariaSnapshot.length,
            },
            console: state.console,
            failedRequests: state.failedRequests,
            interactionSummary,
        }, null, 2)
    );
}

test('sysadmin transportation-manager role validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('sysadmin transportation-manager role validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
