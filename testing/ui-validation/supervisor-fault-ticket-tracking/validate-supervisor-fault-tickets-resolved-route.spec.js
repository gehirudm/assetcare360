const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

async function mockSupervisorApis(page) {
    const user = {
        id: 9101,
        full_name: 'Supervisor Route Workflow',
        role: 'Supervisor',
        employee_id: 'LITRO-SUP-9101',
    };

    const faultTickets = [
        {
            id: 5001,
            ticket_id: 'TKT-5001',
            breakdown_type: 'route_breakdown',
            breakdown_report_id: 'RBD-901',
            status: 'Assigned',
            priority: 'High',
            created_at: '2026-04-16T08:00:00Z',
            updated_at: '2026-04-16T11:00:00Z',
            assignments: [],
        },
        {
            id: 5002,
            ticket_id: 'TKT-5002',
            breakdown_type: 'route_breakdown',
            breakdown_report_id: 'RBD-902',
            status: 'Assigned',
            priority: 'Medium',
            created_at: '2026-04-16T09:00:00Z',
            updated_at: '2026-04-16T10:00:00Z',
            assignments: [],
        },
        {
            id: 5003,
            ticket_id: 'TKT-5003',
            breakdown_type: 'route_breakdown',
            breakdown_report_id: 'RBD-903',
            status: 'Assigned',
            priority: 'High',
            created_at: '2026-04-16T07:00:00Z',
            updated_at: '2026-04-16T07:45:00Z',
            assignments: [],
        },
    ];

    const routeBreakdowns = [
        {
            id: 901,
            route_breakdown_id: 'RBD-901',
            vehicle_id: 51,
            number_plate: 'CAB-901',
            driver_name: 'Driver Completed',
            breakdown_type: 'engine',
            severity: 'high',
            description: 'Engine warning light remains on',
            status: 'In Progress',
            fault_ticket_id: 5001,
            approved_garage_name: 'Metro Fleet Garage',
            garage_workflow_status: 'completed',
            garage_workflow: {
                status: 'completed',
                approved_garage: {
                    id: 11,
                    name: 'Metro Fleet Garage',
                },
            },
        },
        {
            id: 902,
            route_breakdown_id: 'RBD-902',
            vehicle_id: 52,
            number_plate: 'CAB-902',
            driver_name: 'Driver Active',
            breakdown_type: 'brakes',
            severity: 'medium',
            description: 'Brake system requires inspection',
            status: 'In Progress',
            fault_ticket_id: 5002,
            approved_garage_name: 'Prime Repair Hub',
            garage_workflow_status: 'repair_in_progress',
            garage_workflow: {
                status: 'repair_in_progress',
                approved_garage: {
                    id: 12,
                    name: 'Prime Repair Hub',
                },
            },
        },
        {
            id: 903,
            route_breakdown_id: 'RBD-903',
            vehicle_id: 53,
            number_plate: 'CAB-903',
            driver_name: 'Driver Priority',
            breakdown_type: 'electrical',
            severity: 'high',
            description: 'Electrical diagnostics required',
            status: 'Assigned',
            fault_ticket_id: 5003,
            approved_garage_name: 'Lightning Garage',
            garage_workflow_status: 'garage_approved',
            garage_workflow: {
                status: 'garage_approved',
                approved_garage: {
                    id: 13,
                    name: 'Lightning Garage',
                },
            },
        },
    ];

    await page.route('**/js/dashboard-init.js', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `
                const DashboardInit = {
                    async init(_allowedRoles, options = {}) {
                        const user = ${JSON.stringify(user)};
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

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        if (pathname.includes('/api/auth/me') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: user,
            });
        }

        if (pathname.includes('/api/fault-tickets') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { tickets: faultTickets },
                tickets: faultTickets,
            });
        }

        if (pathname.includes('/api/route-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { breakdowns: routeBreakdowns },
            });
        }

        if (pathname.includes('/api/breakdown-reports') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { reports: [] },
            });
        }

        if (pathname.includes('/api/machine-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: { reports: [] },
            });
        }

        return json(route, {
            status: 'success',
            success: true,
            data: {},
        });
    });
}

test('completed route garage workflow ticket appears in resolved list without assignments', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockSupervisorApis(page);

    await page.goto(`${BASE_URL}/dashboard/supervisor/index.html?section=fault-ticket-tracking`, {
        waitUntil: 'domcontentloaded',
    });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('fault-ticket-tracking');
        }
    });

    await expect(page.locator('#fault-ticket-tracking')).toBeVisible();

    const component = page.locator('supervisor-fault-tickets');
    await expect(component).toBeVisible();

    await expect(component.locator('.supervisor-ticket-filter-toolbar')).toBeVisible();
    await expect(component.locator('#supervisorTicketSortSelect')).toBeVisible();

    await expect(component.locator('#resolvedTicketsList')).toContainText('TKT-5001');
    await expect(component.locator('#activeTicketsList')).toContainText('TKT-5002');
    await expect(component.locator('#activeTicketsList')).toContainText('TKT-5003');

    const activeTicketItems = component.locator('#activeTicketsList .inventory-item');
    await expect(activeTicketItems.first()).toContainText('TKT-5002');

    await component.locator('#supervisorTicketSortSelect').selectOption('priority');
    await expect(activeTicketItems.first()).toContainText('TKT-5003');

    await component.locator('#supervisorTicketSortSelect').selectOption('date');
    await expect(activeTicketItems.first()).toContainText('TKT-5002');

    await expect(component.locator('#activeTicketsList')).not.toContainText('TKT-5001');
    await expect(component.locator('#unassignedTicketsList')).not.toContainText('TKT-5001');
});
