const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

const LEAFLET_STUB_JS = `
(function () {
    if (window.L) {
        return;
    }

    window.L = {
        map: function (target) {
            const container = typeof target === 'string'
                ? document.getElementById(target)
                : target;
            const handlers = {};

            if (container && !container.__leafletStubClickBound) {
                container.__leafletStubClickBound = true;
                container.addEventListener('click', function () {
                    if (typeof handlers.click === 'function') {
                        handlers.click({
                            latlng: {
                                lat: 6.9,
                                lng: 79.86,
                            },
                        });
                    }
                });
            }

            return {
                _zoom: 11,
                setView: function (_coords, zoom) {
                    if (typeof zoom === 'number') {
                        this._zoom = zoom;
                    }
                    return this;
                },
                fitBounds: function () {
                    return this;
                },
                invalidateSize: function () {
                    return this;
                },
                removeLayer: function () {
                    return this;
                },
                remove: function () {
                    return this;
                },
                getZoom: function () {
                    return this._zoom;
                },
                on: function (event, handler) {
                    handlers[event] = handler;
                    return this;
                },
            };
        },
        tileLayer: function () {
            return {
                addTo: function () {
                    return this;
                },
            };
        },
        marker: function (coords) {
            return {
                _coords: coords,
                addTo: function () {
                    return this;
                },
                bindPopup: function () {
                    return this;
                },
                on: function () {
                    return this;
                },
                setStyle: function () {
                    return this;
                },
                getLatLng: function () {
                    return {
                        lat: this._coords[0],
                        lng: this._coords[1],
                    };
                },
                openPopup: function () {
                    return this;
                },
            };
        },
        circleMarker: function (coords) {
            return this.marker(coords);
        },
    };
})();
`;

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

function script(route, body) {
    return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body,
    });
}

function css(route, body = '') {
    return route.fulfill({
        status: 200,
        contentType: 'text/css',
        body,
    });
}

function normalizeGaragePayload(payload, nextId) {
    return {
        id: nextId,
        name: String(payload?.name || '').trim(),
        address: String(payload?.address || '').trim(),
        city: payload?.city ? String(payload.city).trim() : null,
        phone: payload?.phone ? String(payload.phone).trim() : null,
        latitude: payload?.latitude === null || payload?.latitude === undefined || payload?.latitude === ''
            ? null
            : Number(payload.latitude),
        longitude: payload?.longitude === null || payload?.longitude === undefined || payload?.longitude === ''
            ? null
            : Number(payload.longitude),
        is_active: payload?.is_active ? 1 : 0,
    };
}

function garageMatchesQuery(garage, query) {
    if (!query) {
        return true;
    }

    const text = `${garage.name || ''} ${garage.address || ''} ${garage.city || ''}`.toLowerCase();
    return text.includes(String(query).toLowerCase());
}

async function mockExternalAssets(page) {
    await page.route('**/leaflet.css', (route) => css(route));
    await page.route('**/leaflet.js', (route) => script(route, LEAFLET_STUB_JS));
    await page.route('**/kit.fontawesome.com/**', (route) => script(route, 'window.FontAwesomeKitConfig = {};'));
    await page.route('**/font-awesome/**', (route) => css(route));
    await page.route('**/chart.umd.min.js', (route) => script(route, 'window.Chart = window.Chart || function () {};'));
}

function attachMonitors(page, artifact, scope) {
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'warning' || type === 'error') {
            artifact.console.push({
                scope,
                type,
                text: msg.text(),
            });
        }
    });

    page.on('response', (response) => {
        if (response.status() >= 400) {
            artifact.failedRequests.push({
                scope,
                url: response.url(),
                method: response.request().method(),
                status: response.status(),
            });
        }
    });
}

async function mockTMApi(page, state) {
    await mockExternalAssets(page);

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json(route, {
                status: 'success',
                message: 'User authenticated',
                data: {
                    id: 610,
                    employee_id: 'LITRO-TM-001',
                    full_name: 'Transportation Manager One',
                    role: 'Transportation Manager',
                },
            });
        }

        if (pathname.endsWith('/api/garages') && method === 'GET') {
            const includeInactive = String(url.searchParams.get('include_inactive') || '').toLowerCase() === 'true';
            const q = String(url.searchParams.get('q') || '').trim();

            const garages = state.garages
                .filter((garage) => includeInactive || Number(garage.is_active) === 1)
                .filter((garage) => garageMatchesQuery(garage, q));

            return json(route, {
                status: 'success',
                data: {
                    garages,
                    count: garages.length,
                },
            });
        }

        if (pathname.endsWith('/api/garages') && method === 'POST') {
            state.createCalls += 1;
            const payload = request.postDataJSON ? request.postDataJSON() : JSON.parse(request.postData() || '{}');
            state.lastCreatePayload = payload;

            const nextId = state.garages.reduce((max, garage) => Math.max(max, Number(garage.id || 0)), 0) + 1;
            const createdGarage = normalizeGaragePayload(payload, nextId);
            state.garages.push(createdGarage);

            return json(route, {
                status: 'success',
                message: 'Garage created successfully',
                data: {
                    garage: createdGarage,
                },
            }, 201);
        }

        if (pathname.endsWith('/api/trips') && method === 'GET') {
            return json(route, { status: 'success', data: { trips: [] } });
        }

        if (pathname.endsWith('/api/fuel-logs') && method === 'GET') {
            return json(route, { status: 'success', data: { fuel_logs: [] } });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json(route, { status: 'success', data: { vehicles: [] } });
        }

        if (pathname.endsWith('/api/vehicles/with-drivers') && method === 'GET') {
            return json(route, { status: 'success', data: { vehicles: [] } });
        }

        if (pathname.endsWith('/api/drivers') && method === 'GET') {
            return json(route, { status: 'success', data: { drivers: [] } });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json(route, { status: 'success', data: { tickets: [] } });
        }

        if (pathname.endsWith('/api/users') && method === 'GET') {
            return json(route, { status: 'success', data: { users: [] } });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    notifications: [],
                    unread_count: 0,
                    pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
                },
            });
        }

        return json(route, { status: 'success', data: {} });
    });
}

async function mockSupervisorApi(page, state) {
    await mockExternalAssets(page);

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const pathname = url.pathname;

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json(route, {
                status: 'success',
                message: 'User authenticated',
                data: {
                    id: 404,
                    employee_id: 'LITRO-SUPERVISOR-001',
                    full_name: 'Supervisor One',
                    role: 'Supervisor',
                },
            });
        }

        if (/\/api\/fault-tickets\/\d+$/.test(pathname) && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    id: 321,
                    ticket_id: 'FT-0321',
                    breakdown_report_id: 'RBD-701',
                    breakdown_type: 'route_breakdown',
                    status: 'Open',
                    priority: 'High',
                    location: 'Kandy Road - Wattala',
                    description: 'Vehicle stalled during route operation.',
                    created_at: '2026-04-17T08:30:00Z',
                    updated_at: '2026-04-17T09:15:00Z',
                    assignments: [],
                },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    breakdowns: [
                        {
                            id: 701,
                            route_breakdown_id: 'RBD-701',
                            fault_ticket_id: 321,
                            garage_workflow_status: 'awaiting_supervisor_approval',
                            approved_garage_name: null,
                        },
                    ],
                    count: 1,
                },
            });
        }

        if ((pathname.endsWith('/api/route-breakdowns/garages') || pathname.endsWith('/api/garages')) && method === 'GET') {
            const garages = state.garages.filter((garage) => Number(garage.is_active) === 1);
            return json(route, {
                status: 'success',
                data: {
                    garages,
                    count: garages.length,
                },
            });
        }

        if (/\/api\/route-breakdowns\/701\/garage-approval$/.test(pathname) && method === 'POST') {
            state.approvalCalls += 1;
            const payload = request.postDataJSON ? request.postDataJSON() : JSON.parse(request.postData() || '{}');
            state.lastApprovalPayload = payload;

            return json(route, {
                status: 'success',
                message: 'Garage approved successfully',
                data: {
                    route_breakdown_id: 701,
                    garage: state.garages.find((garage) => Number(garage.id) === Number(payload.garage_id)) || null,
                },
            });
        }

        if (pathname.endsWith('/api/budget-reports/ticket/321/latest') && method === 'GET') {
            return json(route, { status: 'success', data: null });
        }

        if (pathname.endsWith('/api/spare-part-requests/ticket/321') && method === 'GET') {
            return json(route, { status: 'success', data: [] });
        }

        if (pathname.endsWith('/api/technicians') && method === 'GET') {
            return json(route, { status: 'success', data: { users: [] } });
        }

        if (pathname.endsWith('/api/notifications') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    notifications: [],
                    unread_count: 0,
                    pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
                },
            });
        }

        return json(route, { status: 'success', data: {} });
    });
}

async function runTMFlow(page, viewportName, artifact, state) {
    await mockTMApi(page, state);
    attachMonitors(page, artifact, 'tm');

    await page.goto(`${BASE_URL}/dashboard/transportation-manager/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('garages');
        }
    });

    await expect(page.locator('#garages')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Company Garages' })).toBeVisible({ timeout: 10000 });

    const garageName = `New Garage ${STAGE}`;

    await page.locator('[data-action="add-garage"]').click();
    await expect(page.locator('#addGarageModal')).toHaveClass(/active/, { timeout: 10000 });

    await page.fill('#tmGarageName', garageName);
    await page.fill('#tmGarageAddress', '45 Marine Drive, Colombo 06');
    await page.locator('#tmGarageMapPicker').click();

    await expect(page.locator('#tmGarageLatitude')).toHaveValue('6.900000');
    await expect(page.locator('#tmGarageLongitude')).toHaveValue('79.860000');

    await page.fill('#tmGarageCity', 'Colombo');
    await page.fill('#tmGaragePhone', '+94 11 765 4321');
    await page.locator('#tmGarageForm button[type="submit"]').click();

    await expect.poll(() => state.createCalls).toBe(1);
    await expect(page.locator('#addGarageModal')).not.toHaveClass(/active/, { timeout: 10000 });
    await expect(page.locator('#tmGarageList .inventory-item').filter({ hasText: garageName })).toBeVisible({ timeout: 10000 });

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}-tm.png`),
        fullPage: true,
    });

    artifact.transportationManager = {
        createdGarageName: garageName,
        createCalls: state.createCalls,
        lastCreatePayload: state.lastCreatePayload,
        listCount: await page.locator('#tmGarageList .inventory-item').count(),
        activeSection: await page.evaluate(() => document.querySelector('.content-section.active')?.id || null),
    };
}

async function runSupervisorFlow(page, viewportName, artifact, state) {
    await mockSupervisorApi(page, state);
    attachMonitors(page, artifact, 'supervisor');

    await page.goto(`${BASE_URL}/view-ticket/index.html?id=321`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mainContent')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('#approveGarageBtn')).toBeVisible({ timeout: 10000 });
    await page.locator('#approveGarageBtn').click();

    await expect(page.locator('#garageApprovalModal')).toHaveClass(/active/, { timeout: 10000 });

    const garageSelect = page.locator('#garageApprovalSelect');
    await expect(garageSelect).toBeVisible({ timeout: 10000 });

    await expect.poll(async () => {
        return page.locator('#garageApprovalSelect option').count();
    }).toBeGreaterThan(1);

    const optionTexts = await page.locator('#garageApprovalSelect option').allTextContents();
    const selectableOptions = optionTexts.slice(1);
    expect(selectableOptions.length).toBe(3);
    expect(selectableOptions.some((text) => text.includes(artifact.transportationManager.createdGarageName))).toBeTruthy();

    await expect(page.locator('#garageApprovalMap')).toBeVisible({ timeout: 10000 });
    const mapHintText = (await page.locator('#garageApprovalMapHint').textContent()) || '';
    expect(mapHintText.trim().length).toBeGreaterThan(0);

    await page.selectOption('#garageApprovalSelect', { index: 2 });

    await page.fill('#garageApprovalNotes', 'Approved nearest connected garage for immediate repair.');
    await page.locator('#garageApprovalForm button[type="submit"]').click();

    await expect.poll(() => state.approvalCalls).toBe(1);

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}-supervisor.png`),
        fullPage: true,
    });

    artifact.supervisor = {
        approvalCalls: state.approvalCalls,
        lastApprovalPayload: state.lastApprovalPayload,
        optionCount: await page.evaluate(() => {
            const select = document.getElementById('garageApprovalSelect');
            if (!(select instanceof HTMLSelectElement)) {
                return 0;
            }

            return Array.from(select.options).filter((option) => option.value !== '').length;
        }),
        mapHint: await page.locator('#garageApprovalMapHint').textContent(),
    };
}

async function runValidation(browser, viewportName, viewport) {
    const state = {
        garages: [
            {
                id: 1,
                name: 'AutoCare Service Center',
                address: '123 Galle Road, Colombo 03',
                city: 'Colombo',
                phone: '+94 11 234 5678',
                latitude: 6.9032,
                longitude: 79.8501,
                is_active: 1,
            },
            {
                id: 2,
                name: 'Reliable Motors',
                address: '456 Kandy Road, Kadawatha',
                city: 'Kadawatha',
                phone: '+94 11 345 6789',
                latitude: 7.0014,
                longitude: 79.9496,
                is_active: 1,
            },
        ],
        createCalls: 0,
        approvalCalls: 0,
        lastCreatePayload: null,
        lastApprovalPayload: null,
    };

    const artifact = {
        stage: STAGE,
        viewport: viewportName,
        console: [],
        failedRequests: [],
        transportationManager: null,
        supervisor: null,
    };

    const tmContext = await browser.newContext({ viewport });
    const tmPage = await tmContext.newPage();
    await runTMFlow(tmPage, viewportName, artifact, state);
    await tmContext.close();

    const supervisorContext = await browser.newContext({ viewport });
    const supervisorPage = await supervisorContext.newPage();
    await runSupervisorFlow(supervisorPage, viewportName, artifact, state);
    await supervisorContext.close();

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('transportation manager garages desktop validation', async ({ browser }) => {
    await runValidation(browser, 'desktop', { width: 1440, height: 900 });
});

test('transportation manager garages mobile validation', async ({ browser }) => {
    await runValidation(browser, 'mobile', { width: 390, height: 844 });
});
