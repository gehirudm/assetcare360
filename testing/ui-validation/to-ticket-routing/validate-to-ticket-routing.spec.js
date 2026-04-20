const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    return {
        user: {
            id: 1001,
            full_name: 'Technical Officer One',
            role: 'Technical Officer',
            employee_id: 'LITRO-TECHOFFICER-001'
        },
        tickets: [
            {
                id: 501,
                ticket_id: 'TKT-501',
                machine_id: 11,
                machine_model_number: 'CAT-320D',
                machine_name: 'Excavator 320D',
                description: 'Hydraulic pressure drop under load',
                priority: 'High',
                status: 'Parts Approved',
                reported_by_name: 'Supervisor One',
                created_at: '2026-04-12T08:00:00Z',
                updated_at: '2026-04-12T09:00:00Z',
                insurance_claim: {
                    asset_type: 'machine',
                    asset_id: 11,
                    asset_label: 'Excavator 320D',
                    warranty_provider: 'CAT Warranty Services',
                    warranty_expiry: '2027-06-30',
                    insurance_type: 'Full',
                    insurance_provider: 'Litro Insurance PLC',
                    insurance_provider_details: 'Fleet hotline 011-5555555',
                    insurance_renew_interval_days: 365,
                    last_insurance_renew_date: '2026-04-01',
                    last_insurance_renew_details: 'Annual comprehensive renewal',
                    next_insurance_renew_date: '2027-04-01',
                    eligible: true,
                    eligibility_reason: 'Insurance policy is active until 2027-04-01.'
                },
                assignments: [
                    {
                        assigned_by_name: 'Supervisor One',
                        assigned_at: '2026-04-12T08:30:00Z',
                        technician_name: 'Technical Officer One',
                        assigned_to: 1001,
                        status: 'Active'
                    }
                ]
            },
            {
                id: 502,
                ticket_id: 'TKT-502',
                machine_id: 12,
                machine_model_number: 'CAT-330D',
                machine_name: 'Excavator 330D',
                description: 'Emergency hydraulic pump fault',
                priority: 'Critical',
                status: 'Assigned',
                reported_by_name: 'Supervisor Two',
                created_at: '2026-04-10T05:00:00Z',
                updated_at: '2026-04-10T06:00:00Z',
                assignments: [
                    {
                        assigned_by_name: 'Supervisor Two',
                        assigned_at: '2026-04-10T05:30:00Z',
                        technician_name: 'Technical Officer One',
                        assigned_to: 1001,
                        status: 'Active'
                    }
                ]
            }
        ],
        serviceTickets: [
            {
                id: 901,
                service_ticket_id: 'SVT-901',
                title: 'Routine Service - Excavator 320D',
                description: 'Quarterly service and filter replacement.',
                service_type: 'Routine Service',
                priority: 'Medium',
                status: 'Assigned',
                asset_name: 'Excavator 320D',
                asset_code: 'EQ-320D',
                asset_type: 'machine',
                asset_reference: 'Zone A',
                asset_model: 'CAT-320D',
                asset_warranty_provider: 'CAT Shield',
                asset_warranty_expiry: '2026-12-01',
                asset_components: ['Hydraulic Pump', 'Main Filter'],
                component_comments: [],
                reported_by_name: 'Maintenance Manager One',
                assigned_to_name: 'Technical Officer One',
                created_at: '2026-04-14T08:00:00Z',
                updated_at: '2026-04-14T09:00:00Z',
                scheduled_date: '2026-04-16',
                started_at: null,
                completed_at: null,
                completion_notes: null,
                maintenance_notes: 'Inspect all rotating joints and replace worn filter media.',
                estimated_cost: '12500.00',
                actual_cost: null,
                next_service_date: null,
                service_meter_reading: 12540,
                warranty_action: 'none',
                asset_warranty_status: 'Active'
            },
            {
                id: 902,
                service_ticket_id: 'SVT-902',
                title: 'Hydraulic Pump Emergency Service',
                description: 'Critical hydraulic component service required.',
                service_type: 'Emergency Repair',
                priority: 'Critical',
                status: 'In Progress',
                asset_name: 'Excavator 330D',
                asset_code: 'EQ-330D',
                created_at: '2026-04-08T06:30:00Z',
                updated_at: '2026-04-09T10:30:00Z',
                scheduled_date: '2026-04-10',
                started_at: '2026-04-09T08:00:00Z',
                asset_warranty_status: 'Expired'
            },
            {
                id: 903,
                service_ticket_id: 'SVT-903',
                title: 'Assigned Ticket Start Flow Validation',
                description: 'Validation ticket for start to end-operation transition.',
                service_type: 'Routine Service',
                priority: 'Low',
                status: 'Assigned',
                asset_name: 'Forklift 12',
                asset_code: 'EQ-903',
                created_at: '2026-04-07T06:30:00Z',
                updated_at: '2026-04-07T07:30:00Z',
                scheduled_date: '2026-04-18',
                started_at: null,
                asset_warranty_status: 'Active'
            }
        ],
        vehicles: [
            {
                id: 201,
                vehicle_id: 'VEH-201',
                vehicle_name: 'Service Truck Alpha',
                number_plate: 'WP-CAB-1001',
                model_number: 'Mitsubishi Fuso',
                supplier_name: 'Litro Fleet Partners',
                status: 'Active'
            },
            {
                id: 202,
                vehicle_id: 'VEH-202',
                vehicle_name: 'Service Van Beta',
                number_plate: 'WP-CAB-2002',
                model_number: 'Toyota HiAce',
                supplier_name: 'City Logistics',
                status: 'Maintenance'
            }
        ],
        machines: [
            {
                id: 11,
                machine_id: 'MCH-011',
                machine_name: 'Excavator 320D',
                model_number: 'CAT-320D',
                serial_number: 'SN-320D-01',
                supplier_name: 'CAT Dealer Lanka',
                status: 'Active',
                current_operating_hours: 12540,
                last_service_date: '2026-03-15',
                next_service_date: '2026-06-13'
            },
            {
                id: 302,
                machine_id: 'MCH-302',
                machine_name: 'Wheel Loader 950M',
                model_number: 'CAT-950M',
                serial_number: 'SN-950M-88',
                supplier_name: 'CAT Dealer Lanka',
                status: 'Inactive'
            }
        ],
        products: [
            {
                id: 301,
                sparepart_id: 'SPR-001',
                name: 'Hydraulic Pump',
                quantity: 50
            },
            {
                id: 302,
                sparepart_id: 'SPR-002',
                name: 'Main Filter',
                quantity: 20
            }
        ]
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
                status: response.status()
            });
        }
    });
}

async function mockApi(page, fixtures) {
    const serviceSpareRequests = new Map();
    let nextSpareRequestId = 100;

    fixtures.serviceTickets.forEach((ticket) => {
        serviceSpareRequests.set(Number(ticket.id), []);
    });

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        const json = (body, status = 200) => route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body)
        });

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json({ status: 'success', success: true, data: fixtures.user });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json({ status: 'success', success: true, data: { tickets: fixtures.tickets } });
        }

        if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'GET') {
            const ticketId = Number(pathname.split('/').pop());
            const ticket = fixtures.tickets.find((item) => Number(item.id) === ticketId) || fixtures.tickets[0];
            return json({ status: 'success', success: true, data: ticket });
        }

        if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'PUT') {
            const ticketId = Number(pathname.split('/').pop());
            const payload = request.postDataJSON() || {};
            const ticket = fixtures.tickets.find((item) => Number(item.id) === ticketId);

            if (ticket && payload.status) {
                ticket.status = payload.status;
                ticket.updated_at = '2026-04-16T10:05:00Z';
            }

            return json({ status: 'success', success: true, data: ticket || {} });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json({ status: 'success', success: true, data: { notifications: [], unread_count: 0 } });
        }

        if (pathname.endsWith('/api/service-tickets') && method === 'GET') {
            return json({ status: 'success', success: true, data: { tickets: fixtures.serviceTickets } });
        }

        if (pathname.match(/\/api\/service-tickets\/\d+$/) && method === 'GET') {
            const ticketId = Number(pathname.split('/').pop());
            const ticket = fixtures.serviceTickets.find((item) => Number(item.id) === ticketId) || fixtures.serviceTickets[0];
            return json({ status: 'success', success: true, data: ticket });
        }

        if (pathname.match(/\/api\/service-tickets\/\d+\/start$/) && method === 'POST') {
            const ticketId = Number(pathname.split('/').slice(-2)[0]);
            const ticket = fixtures.serviceTickets.find((item) => Number(item.id) === ticketId);
            if (ticket) {
                ticket.status = 'In Progress';
                ticket.started_at = ticket.started_at || '2026-04-16T10:00:00Z';
                ticket.updated_at = '2026-04-16T10:00:00Z';
            }

            return json({ status: 'success', success: true, data: ticket || {} });
        }

        if (pathname.match(/\/api\/notifications\/read$/) && method === 'POST') {
            return json({ status: 'success', success: true, data: {} });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json({ status: 'success', success: true, data: { vehicles: fixtures.vehicles } });
        }

        if (pathname.endsWith('/api/machines') && method === 'GET') {
            return json({ status: 'success', success: true, data: { machines: fixtures.machines } });
        }

        if (pathname.match(/\/api\/machines\/\d+$/) && method === 'GET') {
            const machineId = Number(pathname.split('/').pop());
            const machine = fixtures.machines.find((item) => Number(item.id) === machineId) || null;

            if (!machine) {
                return json({ status: 'error', success: false, message: 'Machine not found' }, 404);
            }

            return json({ status: 'success', success: true, data: machine });
        }

        if (pathname.endsWith('/api/spare-part-requests') && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.endsWith('/api/spare-part-requests') && method === 'POST') {
            const payload = request.postDataJSON() || {};
            const requestDbId = nextSpareRequestId;
            nextSpareRequestId += 1;

            const requestCode = `SPR-${String(requestDbId).padStart(3, '0')}`;
            const requestContext = payload.service_ticket_id ? 'service_ticket' : 'fault_ticket';

            const requestRecord = {
                id: requestDbId,
                request_id: requestCode,
                status: 'Pending',
                request_context: requestContext,
                fault_ticket_id: payload.fault_ticket_id || null,
                service_ticket_id: payload.service_ticket_id || null,
                created_at: '2026-04-16T09:40:00Z',
                updated_at: '2026-04-16T09:40:00Z',
                items: Array.isArray(payload.items) ? payload.items : []
            };

            if (payload.service_ticket_id) {
                const list = serviceSpareRequests.get(Number(payload.service_ticket_id)) || [];
                list.push(requestRecord);
                serviceSpareRequests.set(Number(payload.service_ticket_id), list);
            }

            return json({
                status: 'success',
                success: true,
                message: 'Spare part request created successfully',
                data: {
                    id: requestDbId,
                    request_id: requestCode,
                    request_context: requestContext,
                    fault_ticket_id: payload.fault_ticket_id || null,
                    service_ticket_id: payload.service_ticket_id || null,
                    status: 'Pending'
                }
            }, 201);
        }

        if (pathname.match(/\/api\/spare-part-requests\/ticket\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.match(/\/api\/spare-part-requests\/service-ticket\/\d+$/) && method === 'GET') {
            const ticketId = Number(pathname.split('/').pop());
            const requests = serviceSpareRequests.get(ticketId) || [];
            return json({ status: 'success', success: true, data: requests });
        }

        if (pathname.endsWith('/api/spare-parts') && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        if (pathname.endsWith('/api/products') && method === 'GET') {
            return json({ status: 'success', success: true, data: { products: fixtures.products } });
        }

        if (pathname.endsWith('/api/spare-part-requests/check-availability') && method === 'POST') {
            const payload = request.postDataJSON() || {};
            const items = Array.isArray(payload.items) ? payload.items : [];
            return json({
                status: 'success',
                success: true,
                data: {
                    items: items.map((item) => ({
                        part_code: item.part_code,
                        part_name: item.part_code === 'SPR-001' ? 'Hydraulic Pump' : 'Main Filter',
                        status: 'available',
                        available_qty: 50,
                        requested_qty: Number(item.quantity || 1),
                        reorder_level: 10,
                        message: 'In stock'
                    }))
                }
            });
        }

        if (pathname.match(/\/api\/budget-reports\/ticket\/\d+\/latest$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: { report: null } });
        }

        if (pathname.match(/\/api\/ticket-work-updates\/ticket\/\d+$/) && method === 'GET') {
            return json({ status: 'success', success: true, data: [] });
        }

        return json({ status: 'success', success: true, data: {} });
    });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: []
    };

    attachMonitors(page, state);
    await mockApi(page, fixtures);

    const startUrl = `${BASE_URL}/dashboard/technical-officer/index.html?section=tickets`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('ac-layout')).toBeVisible();

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('tickets');
        }
    });

    await expect(page.locator('#tickets')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('to-tickets #allTicketsList .ticket-item').first()).toBeVisible({ timeout: 15000 });

    const toSortSelect = page.locator('to-tickets #ticketSortSelect');
    await expect(toSortSelect).toBeVisible({ timeout: 15000 });
    await expect(page.locator('to-tickets #allTicketsList .ticket-item').first()).toContainText('TKT-501');

    await toSortSelect.selectOption('priority');
    await expect(page.locator('to-tickets #allTicketsList .ticket-item').first()).toContainText('TKT-502');

    await toSortSelect.selectOption('created');
    await expect(page.locator('to-tickets #allTicketsList .ticket-item').first()).toContainText('TKT-501');

    await page.locator('to-tickets #allTicketsList .ticket-item').first().click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'ticket-details';
    }, { timeout: 15000 });

    const detailHost = page.locator('#ticket-details to-ticket-detail-view');
    await expect(detailHost).toBeVisible({ timeout: 15000 });
    await expect(detailHost.locator('iframe')).toHaveCount(0);

    await expect(detailHost.locator('#mainContent')).toBeVisible({ timeout: 15000 });
    await expect(detailHost.locator('#ovTicketId')).toContainText('TKT-501');
    await expect(detailHost.locator('#ovMachinePanel')).toBeVisible({ timeout: 15000 });
    await expect(detailHost.locator('#ovMachineCode')).toContainText('MCH-011');
    await expect(detailHost.locator('#ovMachineName')).toContainText('Excavator 320D');
    await expect(detailHost.locator('#ovMachineSerial')).toContainText('SN-320D-01');
    await expect(detailHost.locator('#ovMachineModel')).toContainText('CAT-320D');
    await expect(detailHost.locator('#ovMachineSupplier')).toContainText('CAT Dealer Lanka');
    await expect(detailHost.locator('#ovMachineStatus')).toContainText('Active');
    await expect(detailHost.locator('#ovMachineHours')).toContainText('12,540 hrs');
    const detailTicketLabel = await detailHost.locator('#ovTicketId').innerText();
    const detailHasIframe = (await detailHost.locator('iframe').count()) > 0;

    await expect(page.locator('#ovInsurancePanel')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#ovInsuranceProvider')).toContainText('Litro Insurance PLC');
    await expect(page.locator('#ovWarrantyProvider')).toContainText('CAT Warranty Services');
    await expect(page.locator('#ovInsuranceEligibility')).toContainText('Eligible for Insurance Claim');

    await expect(detailHost.locator('#submitBudgetBtn')).toBeVisible({ timeout: 15000 });
    await detailHost.locator('#submitBudgetBtn').click();

    const budgetModal = detailHost.locator('#budgetModal');
    const budgetModalShell = budgetModal.locator('.budget-modal-shell');
    const budgetModalHeader = budgetModal.locator('.budget-modal-header');

    await expect(budgetModal).toBeVisible({ timeout: 15000 });
    await expect(budgetModalHeader).toBeVisible({ timeout: 15000 });
    await expect(budgetModalHeader.locator('#budgetModalTitle')).toContainText('Submit Budget Report');
    await expect(budgetModalHeader.locator('.budget-modal-subtitle')).toContainText('Provide a clear cost breakdown and justification for approval.');
    await expect(budgetModal.locator('.budget-ticket-panel')).toBeVisible({ timeout: 15000 });

    const budgetHeaderBackground = await budgetModalHeader.evaluate((element) => {
        return window.getComputedStyle(element).backgroundImage;
    });
    expect(budgetHeaderBackground).not.toBe('none');

    const budgetBodyMargin = await budgetModal.locator('.budget-modal-body').evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
            left: style.marginLeft,
            right: style.marginRight,
            bottom: style.marginBottom
        };
    });
    expect(budgetBodyMargin.left).toBe('0px');
    expect(budgetBodyMargin.right).toBe('0px');
    expect(budgetBodyMargin.bottom).toBe('0px');

    if (viewportName === 'desktop') {
        const budgetModalWidth = await budgetModalShell.evaluate((element) => {
            return Math.round(element.getBoundingClientRect().width);
        });
        expect(budgetModalWidth).toBeGreaterThanOrEqual(740);
    }

    await budgetModal.locator('.budget-modal-close').click();
    await expect(budgetModal).not.toBeVisible({ timeout: 15000 });

    const openPartsModalButton = detailHost.getByRole('button', { name: /request spare parts/i }).first();
    await expect(openPartsModalButton).toBeVisible({ timeout: 15000 });
    await openPartsModalButton.click();

    const partsModal = detailHost.locator('#partsModal');
    const partsModalHeader = partsModal.locator('.modal-header');

    await expect(partsModal).toBeVisible({ timeout: 15000 });
    await expect(partsModalHeader).toBeVisible({ timeout: 15000 });
    await expect(partsModalHeader.locator('h3')).toContainText('Request Spare Parts');

    const partsHeaderBackground = await partsModalHeader.evaluate((element) => {
        return window.getComputedStyle(element).backgroundImage;
    });
    expect(partsHeaderBackground).not.toBe('none');

    if (viewportName === 'desktop') {
        const partsModalWidth = await partsModal.locator(':scope > .modal').evaluate((element) => {
            return Math.round(element.getBoundingClientRect().width);
        });
        expect(partsModalWidth).toBeGreaterThanOrEqual(980);
    }

    await partsModal.locator('.modal-close').click();
    await expect(partsModal).not.toBeVisible({ timeout: 15000 });

    const startWorkAction = detailHost.locator('#start-work-action');
    const startWorkButton = startWorkAction.getByRole('button', { name: /start fault ticket work/i });

    await expect(startWorkAction).toBeVisible({ timeout: 15000 });
    await expect(startWorkButton).toBeVisible({ timeout: 15000 });
    await startWorkButton.click();

    const processTicketModal = detailHost.locator('#processTicketModal');
    await expect(processTicketModal).toBeVisible({ timeout: 15000 });
    await expect(processTicketModal.locator('#processTicketId')).toHaveValue('TKT-501');

    const estimatedCompletionInput = processTicketModal.locator('#processEstimatedCompletion');
    const completionDate = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
    const completionDateValue = new Date(completionDate.getTime() - (completionDate.getTimezoneOffset() * 60000))
        .toISOString()
        .slice(0, 16);

    await processTicketModal.locator('#processInitialAssessment').fill('Initial diagnosis complete and repair workflow started.');
    await estimatedCompletionInput.fill(completionDateValue);
    await processTicketModal.locator('#processTicketForm button[type="submit"]').click();

    await expect(processTicketModal).not.toBeVisible({ timeout: 15000 });
    await expect(detailHost.locator('#complete-action')).toBeVisible({ timeout: 15000 });
    await expect(detailHost.locator('#start-work-action')).not.toBeVisible({ timeout: 15000 });

    await expect(page.locator('#backButton')).toBeVisible({ timeout: 15000 });
    await page.locator('#backButton').click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'tickets';
    }, { timeout: 15000 });

    await expect(page.locator('#tickets')).toBeVisible({ timeout: 15000 });

    const returnPath = new URL(page.url()).pathname;
    const returnSearch = new URL(page.url()).search;

    expect(returnPath).toContain('/dashboard/technical-officer/');
    expect(returnSearch).toContain('section=tickets');

    await expect(page.locator('.nav-item[data-section="inventory"]')).toContainText('Inventory Lookup');

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('inventory');
        }
    });

    await expect(page.locator('#inventory')).toBeVisible({ timeout: 15000 });

    const inventoryHost = page.locator('#inventory to-inventory');
    const inventoryItems = inventoryHost.locator('[data-role="list"] .inventory-item');
    const inventorySearchInput = inventoryHost.locator('input[data-role="search-input"]');

    await expect(inventoryHost.locator('.page-title')).toContainText('Inventory Lookup');
    await expect(inventorySearchInput).toBeVisible({ timeout: 15000 });
    await expect(inventoryItems).toHaveCount(4, { timeout: 15000 });

    await inventoryHost.locator('button[data-filter-type="vehicle"]').click();
    await expect(inventoryItems).toHaveCount(2, { timeout: 15000 });

    await inventorySearchInput.fill('WP-CAB-1001');
    await expect(inventoryItems).toHaveCount(1, { timeout: 15000 });
    await expect(inventoryItems.first()).toContainText('WP-CAB-1001');

    await inventorySearchInput.fill('missing asset');
    await expect(inventoryItems).toHaveCount(0, { timeout: 15000 });
    await expect(inventoryHost.locator('[data-role="empty"]')).toContainText('No vehicles match "missing asset"');

    await inventorySearchInput.fill('');
    await inventoryHost.locator('button[data-filter-type="all"]').click();
    await expect(inventoryItems).toHaveCount(4, { timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('service-tickets');
        }
    });

    await expect(page.locator('#service-tickets')).toBeVisible({ timeout: 15000 });

    const serviceSortSelect = page.locator('to-service-tickets #toServiceTicketSort');
    const serviceRows = page.locator('to-service-tickets #toServiceTicketList .inventory-item');

    await expect(serviceSortSelect).toBeVisible({ timeout: 15000 });
    await expect(serviceRows.first()).toBeVisible({ timeout: 15000 });
    await expect(serviceRows.first()).toContainText('SVT-901');
    await expect(serviceRows.locator('[data-action="start-ticket"]')).toHaveCount(0);
    await expect(serviceRows.locator('[data-action="toggle-complete-form"]')).toHaveCount(0);

    await serviceSortSelect.selectOption('priority');
    await expect(serviceRows.first()).toContainText('SVT-902');
    await expect(serviceRows.locator('[data-action="start-ticket"]')).toHaveCount(0);
    await expect(serviceRows.locator('[data-action="toggle-complete-form"]')).toHaveCount(0);

    await serviceSortSelect.selectOption('created');
    await expect(serviceRows.first()).toContainText('SVT-901');
    await expect(serviceRows.locator('[data-action="start-ticket"]')).toHaveCount(0);
    await expect(serviceRows.locator('[data-action="toggle-complete-form"]')).toHaveCount(0);

    await serviceRows
        .first()
        .locator('[data-action="view-ticket"]')
        .click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'service-ticket-details';
    }, { timeout: 15000 });

    const serviceDetailHost = page.locator('#service-ticket-details to-service-ticket-detail-view');
    await expect(serviceDetailHost).toBeVisible({ timeout: 15000 });

    await expect(serviceDetailHost.locator('.service-ticket-detail-subheader')).toBeVisible({ timeout: 15000 });
    await expect(serviceDetailHost.locator('.service-ticket-detail-breadcrumb')).toBeVisible({ timeout: 15000 });
    await expect(serviceDetailHost.locator('.service-ticket-detail-overview-card')).toBeVisible({ timeout: 15000 });
    await expect(serviceDetailHost.locator('.service-ticket-detail-overview-ticket')).toContainText('SVT-901');
    await expect(serviceDetailHost.locator('.service-ticket-detail-overview-grid')).toContainText('Expected Cost');
    await expect(serviceDetailHost.locator('.service-ticket-detail-overview-grid')).toContainText('LKR');
    await expect(serviceDetailHost.locator('.service-ticket-detail-flow-step')).toHaveCount(4);
    await expect(serviceDetailHost.locator('.service-ticket-detail-card-title').first()).toBeVisible({ timeout: 15000 });
    await expect(serviceDetailHost.locator('.service-ticket-detail-card-title', { hasText: 'Service Report Details' })).toHaveCount(0);
    await expect(serviceDetailHost.locator('[data-action="request-spare-parts"]')).toBeVisible({ timeout: 15000 });
    await expect(serviceDetailHost.locator('[data-action="start-ticket"]')).toBeVisible({ timeout: 15000 });

    await serviceDetailHost.locator('[data-action="request-spare-parts"]').click();

    const requestPartsModal = page.locator('#requestPartsModal');
    await expect(requestPartsModal).toBeVisible({ timeout: 15000 });
    await expect(requestPartsModal.locator('.modal-header h2')).toContainText('Service Ticket');
    await expect(page.locator('#requestingTicketContext')).toHaveValue('service_ticket');
    await expect(page.locator('#relatedTicketId')).toHaveValue('SVT-901');

    const partSelect = page.locator('#sparePartsContainer .spare-part-item .form-select').first();
    await expect(partSelect).toBeVisible({ timeout: 15000 });
    await partSelect.selectOption('SPR-001');
    await page.locator('#sparePartsContainer .spare-part-item input[type="number"]').first().fill('2');

    await page.locator('#requestPartsForm button[type="submit"]').click();
    await expect(requestPartsModal).not.toBeVisible({ timeout: 15000 });

    await expect(serviceDetailHost.locator('.service-ticket-detail-request-meta')).toContainText('Pending Approval', { timeout: 15000 });
    await expect(serviceDetailHost.locator('[data-action="start-ticket"]')).toBeDisabled();

    const serviceDetailTicketLabel = await serviceDetailHost.locator('.service-ticket-detail-overview-ticket').innerText();
    const serviceDetailFlowStepCount = await serviceDetailHost.locator('.service-ticket-detail-flow-step').count();

    await serviceDetailHost.locator('[data-action="back"]').first().click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'service-tickets';
    }, { timeout: 15000 });

    await expect(page.locator('#service-tickets')).toBeVisible({ timeout: 15000 });

    const startFlowRow = serviceRows.filter({ hasText: 'SVT-903' }).first();
    await expect(startFlowRow).toBeVisible({ timeout: 15000 });
    await startFlowRow.locator('[data-action="view-ticket"]').click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'service-ticket-details';
    }, { timeout: 15000 });

    await expect(serviceDetailHost.locator('.service-ticket-detail-overview-ticket')).toContainText('SVT-903');
    await expect(serviceDetailHost.locator('[data-action="start-ticket"]')).toBeVisible({ timeout: 15000 });

    await serviceDetailHost.locator('[data-action="start-ticket"]').click();

    const startServiceModal = page.locator('.service-ticket-detail-start-modal');
    await expect(startServiceModal).toBeVisible({ timeout: 15000 });

    const modalBox = await startServiceModal.boundingBox();
    const viewport = page.viewportSize();
    if (modalBox && viewport) {
        const modalCenterX = modalBox.x + (modalBox.width / 2);
        const viewportCenterX = viewport.width / 2;
        expect(Math.abs(modalCenterX - viewportCenterX)).toBeLessThanOrEqual(80);
    }

    const expectedCompletionDate = new Date(Date.now() + (5 * 24 * 60 * 60 * 1000));
    const expectedCompletionDateValue = expectedCompletionDate.toISOString().split('T')[0];
    await startServiceModal.locator('input[name="expected_completion_date"]').fill(expectedCompletionDateValue);
    await startServiceModal.locator('button[type="submit"]').click();

    const endOperationButton = serviceDetailHost.locator('[data-action="toggle-complete-form"]');
    await expect(endOperationButton).toBeVisible({ timeout: 15000 });
    await expect(endOperationButton).toBeEnabled({ timeout: 15000 });
    await endOperationButton.click();
    await expect(serviceDetailHost.locator('form[data-action="complete-form"]')).toBeVisible({ timeout: 15000 });

    await serviceDetailHost.locator('[data-action="back"]').first().click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'service-tickets';
    }, { timeout: 15000 });

    await expect(page.locator('#service-tickets')).toBeVisible({ timeout: 15000 });

    await serviceRows
        .nth(1)
        .locator('[data-action="view-ticket"]')
        .click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'service-ticket-details';
    }, { timeout: 15000 });

    await expect(serviceDetailHost.locator('.service-ticket-detail-overview-ticket')).toContainText('SVT-902');
    await expect(serviceDetailHost.locator('.service-ticket-detail-card-title', { hasText: 'Service Report Details' })).toHaveCount(0);
    await expect(serviceDetailHost.locator('[data-action="toggle-complete-form"]')).toBeVisible({ timeout: 15000 });
    await serviceDetailHost.locator('[data-action="toggle-complete-form"]').click();
    await expect(serviceDetailHost.locator('form[data-action="complete-form"]')).toBeVisible({ timeout: 15000 });

    await serviceDetailHost.locator('[data-action="back"]').first().click();

    await page.waitForURL((url) => {
        return url.pathname.includes('/dashboard/technical-officer/index.html')
            && url.searchParams.get('section') === 'service-tickets';
    }, { timeout: 15000 });

    await expect(page.locator('#service-tickets')).toBeVisible({ timeout: 15000 });

    let ariaSnapshot = '';
    try {
        ariaSnapshot = await page.locator('body').ariaSnapshot();
    } catch (error) {
        ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
    }

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}.png`),
        fullPage: true
    });

    const artifact = {
        stage: STAGE,
        viewport: viewportName,
        startUrl,
        finalUrl: page.url(),
        title: await page.title(),
        accessibility: {
            ariaSnapshot,
            snapshotLength: ariaSnapshot.length
        },
        console: state.console,
        failedRequests: state.failedRequests,
        interactionSummary: {
            detailMode: 'dashboard-component',
            detailTicketLabel,
            detailHasIframe,
            serviceDetailTicketLabel,
            serviceDetailFlowStepCount,
            serviceSpareRequestSubmitted: true,
            serviceStartTransitionClickableWithoutRefresh: true,
            returnUrl: page.url(),
            returnPath,
            returnSearch
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('technical officer ticket navigation desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('technical officer ticket navigation mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
