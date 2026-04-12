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

    await page.route('**/api/budget-reports/*/review', (route) => {
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
            dashboard: 'Dashboard',
            'fault-tickets': 'Fault Tickets',
            'service-records': 'Service Records',
            'service-warranty': 'Service & Warranty Monitor',
            notifications: 'Notifications',
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
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

    await navigateSection(page, 'fault-tickets');
    await expect(page.getByRole('heading', { name: 'Fault Tickets' })).toBeVisible();
    await page.getByRole('button', { name: 'Pending' }).click();
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.locator('#ticketDetailsModal')).toBeVisible();
    await page.locator('#ticketDetailsModal .close').click();

    await navigateSection(page, 'service-records');
    await expect(page.getByRole('heading', { name: 'Service Records' })).toBeVisible();
    await page.getByRole('button', { name: 'Machinery' }).click();
    await page.getByRole('button', { name: 'View' }).first().click();

    await navigateSection(page, 'service-warranty');
    await expect(page.getByRole('heading', { name: 'Service & Warranty Monitoring' })).toBeVisible();
    await page.getByRole('button', { name: 'Expiring Soon' }).click();
    await page.getByRole('button', { name: 'View' }).first().click();
    await expect(page.locator('#serviceScheduleModal')).toBeVisible();
    await page.locator('#serviceScheduleModal .close').click();

    await page.evaluate(() => {
        if (typeof window.openModal === 'function') {
            window.openModal('addServiceModal');
        }
    });
    await expect(page.locator('#addServiceModal')).toBeVisible();
    await page.locator('#addServiceModal input[name="equipmentId"]').fill('Vehicle #777');
    await page.locator('#addServiceModal select[name="equipmentType"]').selectOption('vehicle');
    await page.locator('#addServiceModal input[name="insuranceExpiry"]').fill('2026-12-20');
    await page.locator('#addServiceModal input[name="nextServiceDue"]').fill('2026-05-20');
    await page.locator('#addServiceModal select[name="serviceType"]').selectOption('Inspection');
    await page.locator('#addServiceModal textarea[name="notes"]').fill('Validation-added service record');
    await page.locator('#addServiceModal button[type="submit"]').click();

    await navigateSection(page, 'notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await page.getByRole('button', { name: 'Cost Approvals' }).click();
    await page.getByRole('button', { name: 'Service' }).click();
    await page.getByRole('button', { name: 'All Notifications' }).click();

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('main.main-content').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    const interactionSummary = await page.evaluate(() => {
        const activeSection = document.querySelector('.content-section.active')?.id || null;
        const visibleTickets = Array.from(document.querySelectorAll('#fault-tickets .ticket-item'))
            .filter((item) => item.style.display !== 'none').length;
        const visibleWarrantyRows = Array.from(document.querySelectorAll('[data-warranty-status]'))
            .filter((row) => row.style.display !== 'none').length;
        const visibleNotificationCards = Array.from(document.querySelectorAll('#notifications [data-notification-category]'))
            .filter((card) => card.style.display !== 'none').length;

        return {
            activeSection,
            visibleTickets,
            visibleWarrantyRows,
            visibleNotificationCards,
            modalStates: {
                ticketDetailsOpen: document.getElementById('ticketDetailsModal')?.classList.contains('active') || false,
                serviceScheduleOpen: document.getElementById('serviceScheduleModal')?.classList.contains('active') || false,
                addServiceOpen: document.getElementById('addServiceModal')?.classList.contains('active') || false,
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

test('maintenance remaining sections desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('maintenance remaining sections mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
