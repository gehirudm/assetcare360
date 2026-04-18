const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const OUT_DIR = __dirname;
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';

function dateOffset(days) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function buildMaintenanceFixtures() {
    return {
        user: {
            id: 501,
            employee_id: 'LITRO-MAINT-001',
            full_name: 'Maintenance Manager One',
            role: 'Maintenance Manager',
        },
        machineBreakdowns: [
            {
                id: 2001,
                breakdown_id: 'MB-2001',
                machine_id: 701,
                machine_name: 'Excavator 701',
                operator_name: 'Operator Silva',
                description: 'Hydraulic pressure drop during operation',
                breakdown_type: 'Hydraulic',
                severity: 'High',
                created_at: '2026-04-12T08:10:00Z',
                status: 'Pending',
                ticket_status: 'Pending',
                assignments: [],
            },
        ],
        routeBreakdowns: [
            {
                id: 3001,
                route_breakdown_id: 'RB-3001',
                vehicle_id: 901,
                number_plate: 'ABC-901',
                driver_name: 'Driver Perera',
                description: 'Engine vibration under load',
                breakdown_type: 'Engine',
                severity: 'Medium',
                breakdown_datetime: '2026-04-13T09:00:00Z',
                status: 'Assigned',
                ticket_status: 'Assigned',
                assigned_technicians: [
                    { technician_name: 'Tech One' },
                ],
            },
        ],
        vehicles: [
            {
                id: 901,
                vehicle_id: 'VH901',
                vehicle_name: 'Crew Transport Bus',
                number_plate: 'ABC-901',
                model_number: 'ISUZU-NQR',
                warranty_expiry: dateOffset(75),
                next_service_date: dateOffset(5),
                last_service_date: dateOffset(-20),
                service_interval_type: 'Preventive Maintenance',
                service_interval_days: 30,
                service_interval_km: 5000,
                current_mileage: 45200,
                next_service_mileage: 45600,
                warranty_provider: 'Allied Insurance',
                notes: 'Assigned to delivery fleet',
            },
            {
                id: 902,
                vehicle_id: 'VH902',
                vehicle_name: 'Light Duty Van',
                number_plate: 'BCD-902',
                model_number: 'TOYOTA-HIACE',
                warranty_expiry: dateOffset(160),
                next_service_date: dateOffset(40),
                last_service_date: dateOffset(-10),
                service_interval_type: 'Routine Check',
                service_interval_days: 45,
                service_interval_km: 7000,
                current_mileage: 28900,
                next_service_mileage: 34000,
                warranty_provider: 'General Warranty Ltd',
                notes: 'No active alerts',
            },
        ],
        machines: [
            {
                id: 701,
                machine_id: 'MC701',
                machine_name: 'Excavator 701',
                location: 'Yard A',
                model_number: 'CAT-320D',
                warranty_expiry: dateOffset(10),
                next_service_date: dateOffset(18),
                last_service_date: dateOffset(-12),
                service_interval_days: 30,
                service_interval_hours: 120,
                current_operating_hours: 945,
                next_service_hours: 1000,
                warranty_provider: 'Heavy Machinery Cover',
                notes: 'Monitor hydraulic behavior',
            },
            {
                id: 702,
                machine_id: 'MC702',
                machine_name: 'Dozer 702',
                location: 'Yard B',
                model_number: 'CAT-D6R',
                warranty_expiry: dateOffset(-7),
                next_service_date: dateOffset(-2),
                last_service_date: dateOffset(-60),
                service_interval_days: 45,
                service_interval_hours: 150,
                current_operating_hours: 1255,
                next_service_hours: 1240,
                warranty_provider: 'Heavy Machinery Cover',
                notes: 'Warranty lapsed - urgent attention required',
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
    const fixtures = buildMaintenanceFixtures();

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
            return json({ status: 'success', data: fixtures.user });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json({ status: 'success', tickets: [] });
        }

        if (pathname.endsWith('/api/machine-breakdowns') && method === 'GET') {
            return json({
                status: 'success',
                data: { reports: fixtures.machineBreakdowns },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json({
                status: 'success',
                data: { breakdowns: fixtures.routeBreakdowns },
            });
        }

        if (pathname.endsWith('/api/budget-reports/pending') && method === 'GET') {
            return json({
                status: 'success',
                reports: [],
                data: { reports: [] },
            });
        }

        if (pathname.match(/\/api\/budget-reports\/[^/]+\/review$/) && (method === 'POST' || method === 'PUT')) {
            return json({ status: 'success', data: {} });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json({
                status: 'success',
                data: { vehicles: fixtures.vehicles },
            });
        }

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json({
                status: 'success',
                data: { machines: fixtures.machines },
            });
        }

        if (pathname.match(/\/api\/vehicles\/\d+$/) && method === 'PUT') {
            return json({ status: 'success', data: {} });
        }

        if (pathname.match(/\/api\/machines\/\d+$/) && method === 'PUT') {
            return json({ status: 'success', data: {} });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json({ status: 'success', data: { notifications: [], unread_count: 0 } });
        }

        if (pathname.match(/\/api\/notifications\/read$/) && method === 'POST') {
            return json({ status: 'success', data: {} });
        }

        return json({ status: 'success', data: {} });
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

    const maintenanceSortSelect = page.locator('#fault-tickets #maintenanceFaultSort');
    await expect(maintenanceSortSelect).toBeVisible();
    await expect(page.locator('#breakdownReportsList .inventory-item').first()).toContainText('RB-3001');

    await maintenanceSortSelect.selectOption('priority');
    await expect(page.locator('#breakdownReportsList .inventory-item').first()).toContainText('MB-2001');

    await maintenanceSortSelect.selectOption('created');
    await expect(page.locator('#breakdownReportsList .inventory-item').first()).toContainText('RB-3001');

    await page.getByRole('button', { name: 'Pending' }).click();
    await expect(page.locator('#breakdownReportsList [data-action="view-breakdown"]').first()).toBeVisible();
    await page.locator('#breakdownReportsList [data-action="view-breakdown"]').first().click();
    await expect(page.locator('#ticketDetailsModal')).toBeVisible();
    await page.locator('#ticketDetailsModal [data-action="close-modal"]').click();

    await navigateSection(page, 'service-records');
    await expect(page.getByRole('heading', { name: 'Service Records' })).toBeVisible();
    await page.getByRole('button', { name: 'Machinery' }).click();
    await page.getByRole('button', { name: 'View' }).first().click();

    await navigateSection(page, 'service-warranty');
    await expect(page.getByRole('heading', { name: 'Service & Warranty Monitoring' })).toBeVisible();
    await expect(page.locator('#service-schedule-list .inventory-item[data-filter-status]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Expiring Soon' }).click();
    await page.getByRole('button', { name: 'View' }).first().click();
    await expect(page.locator('#serviceScheduleModal')).toBeVisible();
    await page.locator('#serviceScheduleModal [data-action="close-modal"]').click();

    await page.evaluate(() => {
        if (typeof window.openModal === 'function') {
            window.openModal('addServiceModal');
        }
    });
    await expect(page.locator('#addServiceModal')).toBeVisible();
    await page.locator('#addServiceModal input[name="equipmentId"]').fill('VH901');
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
