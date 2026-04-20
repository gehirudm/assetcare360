const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    return {
        user: {
            id: 501,
            full_name: 'Maintenance Manager One',
            role: 'Maintenance Manager',
            employee_id: 'LITRO-MAINT-001',
        },
        faultTickets: [
            {
                id: 701,
                ticket_id: 'TKT-701',
                machine_id: 1,
                reported_by: 401,
                description: 'Hydraulic pressure drop while operating excavator',
                priority: 'High',
                location: 'Yard A',
                status: 'In Progress',
                created_at: '2026-04-10T07:30:00Z',
                updated_at: '2026-04-11T09:10:00Z',
            },
            {
                id: 702,
                ticket_id: 'TKT-702',
                machine_id: 2,
                reported_by: 402,
                description: 'Brake fluid leak on transport vehicle',
                priority: 'Critical',
                location: 'Route South',
                status: 'Waiting for Budget Approval',
                created_at: '2026-04-13T08:45:00Z',
                updated_at: '2026-04-13T08:45:00Z',
            },
            {
                id: 703,
                ticket_id: 'TKT-703',
                machine_id: 3,
                reported_by: 403,
                description: 'Electrical wiring issue on machine panel',
                priority: 'Medium',
                location: 'Yard C',
                status: 'Resolved',
                created_at: '2026-04-16T05:15:00Z',
                updated_at: '2026-04-17T12:05:00Z',
            },
        ],
        machineBreakdowns: [
            {
                id: 901,
                breakdown_id: 'MBD-901',
                machine_id: 1,
                machine_name: 'Excavator 320D',
                operator_name: 'Operator Silva',
                breakdown_type: 'hydraulic',
                severity: 'high',
                description: 'Hydraulic hose rupture during operation',
                status: 'Pending',
                ticket_status: 'Assigned',
                created_at: '2026-04-10T07:20:00Z',
                assignments: [
                    { technician_name: 'Tech One' },
                ],
            },
            {
                id: 902,
                breakdown_id: 'MBD-902',
                machine_id: 2,
                machine_name: 'Dozer D6R',
                operator_name: 'Operator Perera',
                breakdown_type: 'engine',
                severity: 'critical',
                description: 'Engine temperature spiked and shutdown triggered',
                status: 'Resolved',
                ticket_status: 'Resolved',
                created_at: '2026-04-15T11:50:00Z',
                assignments: [],
            },
        ],
        routeBreakdowns: [
            {
                id: 1001,
                route_breakdown_id: 'RBD-1001',
                vehicle_id: 10,
                number_plate: 'ABC-9012',
                driver_name: 'Driver Jayasuriya',
                breakdown_type: 'brake-system',
                severity: 'critical',
                description: 'Brake pressure dropped near expressway',
                status: 'In Progress',
                ticket_status: 'In Progress',
                breakdown_datetime: '2026-04-12T09:40:00Z',
                garage_workflow_status: 'garage_approved',
                approved_garage_name: 'FastFix Garage',
                assigned_technicians: [],
            },
            {
                id: 1002,
                route_breakdown_id: 'RBD-1002',
                vehicle_id: 12,
                number_plate: 'BCD-7788',
                driver_name: 'Driver Fernando',
                breakdown_type: 'electrical',
                severity: 'medium',
                description: 'Dashboard electrical failure in route',
                status: 'Resolved',
                ticket_status: 'Resolved',
                breakdown_datetime: '2026-04-18T13:20:00Z',
                garage_workflow_status: 'completed',
                approved_garage_name: 'City Wheels Garage',
                assigned_technicians: [],
            },
        ],
        pendingBudgetReports: [
            {
                id: 5001,
                status: 'pending',
                fault_ticket_id: 702,
                ticket_display_id: 'TKT-702',
                ticket_description: 'Brake fluid leak on transport vehicle',
                ticket_priority: 'Critical',
                submitted_by_name: 'Supervisor Nuwan',
                total_amount: 62000,
                approval_level: 'maintenance_manager',
                created_at: '2026-04-13T09:00:00Z',
            },
            {
                id: 5002,
                status: 'pending',
                fault_ticket_id: 704,
                ticket_display_id: 'TKT-704',
                ticket_description: 'Hydraulic pump replacement required',
                ticket_priority: 'High',
                submitted_by_name: 'Supervisor Ishara',
                total_amount: 28500,
                approval_level: 'supervisor',
                created_at: '2026-04-17T10:30:00Z',
            },
        ],
        vehicles: [
            {
                id: 10,
                vehicle_id: 'VEH-010',
                vehicle_name: 'Fleet Bus 10',
                model_number: 'ISUZU-BUS',
                number_plate: 'ABC-9012',
                next_service_date: '2026-04-25',
                warranty_expiry: '2026-05-06',
                status: 'Active',
                current_mileage: 45110,
                next_service_mileage: 45800,
            },
            {
                id: 12,
                vehicle_id: 'VEH-012',
                vehicle_name: 'Service Van 12',
                model_number: 'TOYOTA-HIACE',
                number_plate: 'BCD-7788',
                next_service_date: '2026-04-10',
                warranty_expiry: '2026-04-01',
                status: 'Under Maintenance',
                current_mileage: 78600,
                next_service_mileage: 78000,
            },
        ],
        machines: [
            {
                id: 1,
                machine_id: 'MCH-001',
                machine_name: 'Excavator 320D',
                model_number: 'CAT-320D',
                location: 'Yard A',
                next_service_date: '2026-04-27',
                warranty_expiry: '2026-06-15',
                status: 'Active',
                current_operating_hours: 1200,
                next_service_hours: 1250,
            },
            {
                id: 2,
                machine_id: 'MCH-002',
                machine_name: 'Dozer D6R',
                model_number: 'CAT-D6R',
                location: 'Yard B',
                next_service_date: '2026-04-05',
                warranty_expiry: '2026-03-29',
                status: 'Inactive',
                current_operating_hours: 1450,
                next_service_hours: 1420,
            },
        ],
        notifications: [
            {
                notification_id: 'NTF-501',
                title: 'Budget Review Required',
                message: 'Budget report BUD-5001 requires maintenance approval',
                type: 'warning',
                is_read: 0,
                created_at: '2026-04-17T10:35:00Z',
            },
            {
                notification_id: 'NTF-502',
                title: 'Service Overdue Alert',
                message: 'Vehicle BCD-7788 service date exceeded',
                type: 'error',
                is_read: 1,
                created_at: '2026-04-16T08:10:00Z',
            },
            {
                notification_id: 'NTF-503',
                title: 'Ticket Resolved',
                message: 'TKT-703 was marked resolved by technical team',
                type: 'success',
                is_read: 1,
                created_at: '2026-04-17T12:05:00Z',
            },
        ],
        repairTickets: [
            {
                id: 1,
                repair_ticket_id: 'RPT-101',
                fault_ticket_id: 701,
                technician_id: 100,
                machine_name: 'Excavator 320D',
                technician_name: 'Tech One',
                repair_status: 'In Repair',
                actual_cost: 18000,
                expected_completion_date: '2026-04-20',
                received_at: '2026-04-10T09:00:00Z',
            },
            {
                id: 2,
                repair_ticket_id: 'RPT-102',
                fault_ticket_id: 703,
                technician_id: 101,
                machine_name: 'Dozer D6R',
                technician_name: 'Tech Two',
                repair_status: 'Completed',
                actual_cost: 22000,
                expected_completion_date: '2026-04-18',
                received_at: '2026-04-15T11:00:00Z',
            },
        ],
        serviceTickets: [
            {
                id: 3001,
                service_ticket_id: 'SVT-301',
                status: 'Completed',
                asset_type: 'vehicle',
                asset_id: 10,
                asset_name: 'Fleet Bus 10',
                asset_code: 'VEH-010',
                estimated_cost: 25000,
                actual_cost: 23750,
                completed_at: '2026-04-19T11:20:00Z',
                updated_at: '2026-04-19T11:20:00Z',
                created_at: '2026-04-12T09:00:00Z',
            },
            {
                id: 3002,
                service_ticket_id: 'SVT-302',
                status: 'Completed',
                asset_type: 'machine',
                asset_id: 1,
                asset_name: 'Excavator 320D',
                asset_code: 'MCH-001',
                estimated_cost: 16000,
                actual_cost: 17400,
                completed_at: '2026-04-22T14:30:00Z',
                updated_at: '2026-04-22T14:30:00Z',
                created_at: '2026-04-15T10:30:00Z',
            },
        ],
    };
}

async function mockMaintenanceApis(page, fixtures) {
    await page.route('**/js/dashboard-init.js', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `
                const DashboardInit = {
                    async init(_allowedRoles, options = {}) {
                        const user = ${JSON.stringify(fixtures.user)};
                        if (typeof options.onSuccess === 'function') {
                            await options.onSuccess(user);
                        }
                        return user;
                    },
                    updateUserInfo() {},
                    logout() {},
                };

                function createConfirmationDialog() {}
                function closeConfirmation() {}
                async function confirmAction() {}
                function logout() {}
            `,
        });
    });

    await page.route('**/api/**', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/service-tickets') {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'success',
                    success: true,
                    data: { tickets: fixtures.serviceTickets },
                }),
            });
            return;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });

    await page.route('**/api/auth/me', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: fixtures.user,
            }),
        });
    });

    await page.route('**/api/fault-tickets**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: { tickets: fixtures.faultTickets },
                tickets: fixtures.faultTickets,
            }),
        });
    });

    await page.route('**/api/machine-breakdowns**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: { reports: fixtures.machineBreakdowns },
            }),
        });
    });

    await page.route('**/api/route-breakdowns**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: { breakdowns: fixtures.routeBreakdowns },
            }),
        });
    });

    await page.route('**/api/budget-reports/pending**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                reports: fixtures.pendingBudgetReports,
                data: { reports: fixtures.pendingBudgetReports },
            }),
        });
    });

    await page.route('**/api/vehicles**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: { vehicles: fixtures.vehicles },
            }),
        });
    });

    await page.route('**/api/machines**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: { machines: fixtures.machines },
            }),
        });
    });

    await page.route('**/api/notifications**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: {
                    notifications: fixtures.notifications,
                    unread_count: fixtures.notifications.filter((item) => Number(item.is_read) === 0).length,
                    pagination: {
                        page: 1,
                        limit: 50,
                        total: fixtures.notifications.length,
                        total_pages: 1,
                    },
                },
            }),
        });
    });

    await page.route('**/api/tec-repair-tickets**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: fixtures.repairTickets,
            }),
        });
    });

    await page.route('**/api/machine-weekly-checks**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'success',
                success: true,
                data: { checks: [] },
            }),
        });
    });

    await page.route('**://localhost:8000/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', success: true, data: {} }),
        });
    });
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

async function navigateSection(page, sectionId, fallbackLabel) {
    const moved = await page.evaluate((targetSection) => {
        const layout = document.querySelector('ac-layout');
        if (!layout || typeof layout.navigateTo !== 'function') {
            return false;
        }
        layout.navigateTo(targetSection);
        return true;
    }, sectionId);

    if (!moved && fallbackLabel) {
        await page.getByRole('navigation').getByText(fallbackLabel).click();
    }
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
    };

    await mockMaintenanceApis(page, fixtures);
    attachMonitors(page, state);

    await page.goto(`${BASE_URL}/dashboard/maintenance/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible();

    let interactionSummary = {
        stage: STAGE,
        analyticsNavPresent: false,
        analyticsSectionPresent: false,
        activeSection: await page.evaluate(() => document.querySelector('.content-section.active')?.id || null),
        reportRows: 0,
        downloadSuggestedFilename: null,
    };

    if (STAGE === 'before') {
        const analyticsNav = page.locator('.nav-item', { hasText: 'Analytics' });
        await expect(analyticsNav).toHaveCount(0);

        interactionSummary = {
            ...interactionSummary,
            analyticsNavPresent: false,
            analyticsSectionPresent: await page.locator('#analytics').count() > 0,
        };
    } else {
        const analyticsNav = page.locator('.nav-item', { hasText: 'Analytics' });
        await expect(analyticsNav).toHaveCount(1);

        await navigateSection(page, 'analytics', 'Analytics');

        await expect(page.locator('#analytics .page-title')).toContainText('Maintenance Analytics');
        await expect(page.locator('#analytics .analytics-option-btn')).toHaveCount(4);
        await expect(page.locator('#analytics .analytics-option-btn[data-view="notifications"]')).toHaveCount(0);
        await expect(page.locator('#maintenanceReportScope option[value="notifications"]')).toHaveCount(0);

        await page.fill('#maintenanceAnalyticsFromDate', '2026-04-01');
        await page.fill('#maintenanceAnalyticsToDate', '2026-04-30');
        await page.click('#analytics [data-action="apply-filter"]');
        await expect(page.locator('#maintenanceAnalyticsStatus')).toContainText(/updated|showing/i);

        await page.click('#analytics .analytics-option-btn[data-view="service"]');
        await expect(page.locator('#analytics .maintenance-analytics-panel.active .chart-card')).toHaveCount(2);

        await page.selectOption('#maintenanceReportScope', 'active');
        await page.click('#analytics [data-action="generate-report"]');
        await expect(page.locator('#maintenanceReportStatus')).toContainText(/generated successfully/i);

        const rowsCount = await page.locator('#maintenanceReportPreview tbody tr').count();
        const downloadBtn = page.locator('#maintenanceReportDownloadBtn');
        await expect(downloadBtn).toBeEnabled();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            downloadBtn.click(),
        ]);

        interactionSummary = {
            ...interactionSummary,
            analyticsNavPresent: true,
            analyticsSectionPresent: await page.locator('#analytics').count() > 0,
            activeSection: await page.evaluate(() => document.querySelector('.content-section.active')?.id || null),
            reportRows: rowsCount,
            downloadSuggestedFilename: download.suggestedFilename(),
        };
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
        interactionSummary,
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('maintenance analytics hub validation desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('maintenance analytics hub validation mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
