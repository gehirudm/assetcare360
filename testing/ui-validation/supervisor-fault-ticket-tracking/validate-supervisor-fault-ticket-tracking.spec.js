const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = __dirname;

function buildFixtures() {
    return {
        user: {
            id: 9001,
            full_name: 'Supervisor One',
            role: 'Supervisor',
            employee_id: 'LITRO-SUP-001'
        },
        routeBreakdowns: [
            {
                id: 201,
                route_breakdown_id: 'RBD-201',
                vehicle_id: 21,
                number_plate: 'WP-CAB-2010',
                driver_name: 'Driver One',
                breakdown_type: 'Engine Fault',
                severity: 'high',
                description: 'Engine vibration and warning light remain active',
                breakdown_location: 'Lat 6.927079, Lng 79.861244',
                breakdown_latitude: 6.927079,
                breakdown_longitude: 79.861244,
                breakdown_datetime: '2026-04-14T09:00:00Z',
                status: 'Pending',
                ticket_status: 'Pending',
                fault_ticket_id: 301,
                fault_ticket_number: 'TKT-301',
                dangerous_cargo_present: 1,
                dangerous_cargo_summary: 'Compressed gas cylinders',
                dangerous_cargo_trip_id: 'TRIP-991',
                garage_workflow_status: 'awaiting_supervisor_approval',
                garage_workflow: {
                    status: 'awaiting_supervisor_approval'
                },
                assigned_technicians: []
            },
            {
                id: 202,
                route_breakdown_id: 'RBD-202',
                vehicle_id: 22,
                number_plate: 'LK-3456',
                driver_name: 'Driver Two',
                breakdown_type: 'engine',
                severity: 'critical',
                description: '[Route Breakdown] Vehicle: LK-3456 | Driver: Driver Two Severity: critical | Type: engine Location: Lat 6.8778206, Lng 79.8787521 Description: Kaduna',
                breakdown_location: 'Lat 6.8778206, Lng 79.8787521',
                breakdown_datetime: '2026-04-14T11:10:00Z',
                status: 'Pending',
                ticket_status: 'Pending',
                fault_ticket_id: 303,
                fault_ticket_number: 'TKT-303',
                dangerous_cargo_present: 0,
                garage_workflow_status: 'garage_approved',
                approved_garage_name: 'AutoCare Service Center',
                garage_workflow: {
                    status: 'garage_approved',
                    approved_garage: {
                        name: 'AutoCare Service Center'
                    }
                },
                assigned_technicians: []
            }
        ],
        vehicleBreakdowns: [
            {
                id: 401,
                breakdown_id: 'VBD-401',
                vehicle_id: 23,
                number_plate: 'CAL-7788',
                driver_name: 'Driver Three',
                breakdown_type: 'Brake Failure',
                severity: 'medium',
                description: 'Brake pedal pressure is inconsistent and requires inspection',
                breakdown_date: '2026-04-14T12:30:00Z',
                status: 'Pending',
                ticket_status: 'Assigned',
                fault_ticket_id: 304,
                fault_ticket_number: 'TKT-304',
                assigned_technicians: [
                    {
                        technician_name: 'Technician Two'
                    }
                ]
            }
        ],
        machineBreakdowns: [
            {
                id: 301,
                breakdown_id: 'MBD-301',
                machine_id: 31,
                machine_name: 'Excavator EX-220',
                machine_model: 'EX-220',
                operator_name: 'Operator One',
                breakdown_type: 'Hydraulic Fault',
                severity: 'medium',
                description: 'Hydraulic pressure drops after warmup',
                created_at: '2026-04-14T10:15:00Z',
                status: 'In Progress',
                ticket_status: 'Assigned',
                fault_ticket_id: 302,
                fault_ticket_number: 'TKT-302',
                assignments: [
                    {
                        technician_name: 'Technician One'
                    }
                ]
            }
        ],
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
                name: 'Rapid Fleet Garage',
                address: '24 Parliament Road, Colombo 05',
                city: 'Colombo',
                phone: '+94 11 987 6543',
                latitude: 6.9112,
                longitude: 79.8683,
                is_active: 1,
            },
        ]
    };
}

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body)
    });
}

async function installLeafletStub(page) {
    await page.addInitScript(() => {
        if (window.L) {
            return;
        }

        const toLatLng = (value) => {
            if (Array.isArray(value)) {
                return {
                    lat: Number(value[0]),
                    lng: Number(value[1]),
                };
            }

            return {
                lat: Number(value?.lat),
                lng: Number(value?.lng),
            };
        };

        const createMap = (target) => {
            const container = typeof target === 'string'
                ? document.getElementById(target)
                : target;

            return {
                _container: container,
                _layers: new Set(),
                setView() {
                    return this;
                },
                fitBounds() {
                    return this;
                },
                invalidateSize() {
                    return this;
                },
                panTo() {
                    return this;
                },
                removeLayer(layer) {
                    if (layer?._iconEl?.parentNode) {
                        layer._iconEl.parentNode.removeChild(layer._iconEl);
                    }
                    this._layers.delete(layer);
                },
                remove() {
                    if (this._container) {
                        this._container.innerHTML = '';
                    }
                    this._layers.clear();
                },
                _addLayer(layer) {
                    this._layers.add(layer);
                },
                _renderMarker(marker) {
                    if (!this._container) {
                        return;
                    }

                    const markerEl = document.createElement('div');
                    markerEl.className = marker._isCircleMarker
                        ? 'leaflet-marker-icon leaflet-circle-marker'
                        : 'leaflet-marker-icon';
                    markerEl.style.cursor = 'pointer';
                    markerEl.style.display = 'inline-flex';
                    markerEl.style.alignItems = 'center';
                    markerEl.style.justifyContent = 'center';
                    markerEl.style.margin = '6px';

                    if (marker._isCircleMarker) {
                        markerEl.style.width = `${marker._style.radius ? marker._style.radius * 2 : 16}px`;
                        markerEl.style.height = `${marker._style.radius ? marker._style.radius * 2 : 16}px`;
                        markerEl.style.borderRadius = '999px';
                        markerEl.style.border = `2px solid ${marker._style.color || '#1d4ed8'}`;
                        markerEl.style.background = marker._style.fillColor || '#2563eb';
                        markerEl.style.opacity = String(marker._style.fillOpacity ?? 0.75);
                    } else {
                        markerEl.textContent = marker._options?.title || 'Marker';
                        markerEl.style.fontSize = '11px';
                        markerEl.style.color = '#ffffff';
                        markerEl.style.background = '#1f4b99';
                        markerEl.style.padding = '4px 8px';
                        markerEl.style.borderRadius = '999px';
                    }

                    markerEl.addEventListener('click', () => {
                        const clickHandler = marker._events.click;
                        if (typeof clickHandler === 'function') {
                            clickHandler();
                        }
                    });

                    marker._iconEl = markerEl;
                    this._container.appendChild(markerEl);
                },
            };
        };

        const createMarker = (latlng, options = {}) => {
            return {
                _latlng: toLatLng(latlng),
                _options: options,
                _events: {},
                _map: null,
                _iconEl: null,
                _isCircleMarker: false,
                _style: {},
                addTo(map) {
                    this._map = map;
                    map._addLayer(this);
                    map._renderMarker(this);
                    return this;
                },
                bindPopup() {
                    return this;
                },
                openPopup() {
                    return this;
                },
                on(eventName, handler) {
                    this._events[eventName] = handler;
                    return this;
                },
                setStyle(style) {
                    this._style = {
                        ...this._style,
                        ...(style || {}),
                    };

                    if (this._iconEl && this._isCircleMarker) {
                        this._iconEl.style.border = `2px solid ${this._style.color || '#1d4ed8'}`;
                        this._iconEl.style.background = this._style.fillColor || '#2563eb';
                        this._iconEl.style.opacity = String(this._style.fillOpacity ?? 0.75);
                        if (this._style.radius) {
                            this._iconEl.style.width = `${this._style.radius * 2}px`;
                            this._iconEl.style.height = `${this._style.radius * 2}px`;
                        }
                    }

                    return this;
                },
                getLatLng() {
                    return this._latlng;
                },
            };
        };

        const createCircleMarker = (latlng, style = {}) => {
            const marker = createMarker(latlng, { title: 'Garage Marker' });
            marker._isCircleMarker = true;
            marker._style = {
                color: '#1d4ed8',
                fillColor: '#2563eb',
                fillOpacity: 0.75,
                radius: 8,
                ...style,
            };
            return marker;
        };

        window.L = {
            map: createMap,
            tileLayer() {
                return {
                    addTo(map) {
                        if (map && typeof map._addLayer === 'function') {
                            map._addLayer(this);
                        }
                        return this;
                    },
                };
            },
            marker: createMarker,
            circleMarker: createCircleMarker,
            icon: (options = {}) => ({ ...options }),
            divIcon: (options = {}) => ({ ...options }),
        };
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
                status: response.status()
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

        if (pathname.endsWith('/api/auth/me') && method === 'GET') {
            return json(route, { status: 'success', success: true, data: fixtures.user });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', success: true, data: { breakdowns: fixtures.routeBreakdowns } });
        }

        if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
            return json(route, { status: 'success', success: true, data: { reports: fixtures.vehicleBreakdowns } });
        }

        if (pathname.endsWith('/api/machine-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', success: true, data: { reports: fixtures.machineBreakdowns } });
        }

        if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'GET') {
            const id = Number(pathname.split('/').pop());

            if (id === 301) {
                return json(route, {
                    status: 'success',
                    success: true,
                    data: {
                        id,
                        ticket_id: `TKT-${id}`,
                        breakdown_type: 'route_breakdown',
                        breakdown_report_id: 'RBD-201',
                        status: 'Assigned',
                        priority: 'High',
                        location: 'Lat 6.927079, Lng 79.861244',
                        description: 'Engine vibration and warning light remain active',
                        machine_id: null,
                        machine_name: 'Route Vehicle',
                        reporter_full_name: 'Driver One',
                        insurance_claim: {
                            asset_type: 'vehicle',
                            asset_id: 21,
                            asset_label: 'WP-CAB-2010',
                            warranty_provider: 'Fleet Warranty Ltd',
                            warranty_expiry: '2027-12-31',
                            insurance_type: 'Full',
                            insurance_provider: 'Transit Assurance Ltd',
                            insurance_provider_details: '24/7 claim desk',
                            insurance_renew_interval_days: 365,
                            last_insurance_renew_date: '2026-01-01',
                            last_insurance_renew_details: 'Renewed with route breakdown rider',
                            next_insurance_renew_date: '2027-01-01',
                            eligible: false,
                            eligibility_reason: 'Insurance policy is active, but this damage type is outside claim coverage.'
                        },
                        created_at: '2026-04-14T10:00:00Z'
                    }
                });
            }

            return json(route, {
                status: 'success',
                success: true,
                data: {
                    id,
                    ticket_id: `TKT-${id}`,
                    status: 'Assigned',
                    priority: 'High',
                    machine_id: null,
                    machine_name: 'Test Asset',
                    reporter_full_name: 'Test Reporter',
                    created_at: '2026-04-14T10:00:00Z'
                }
            });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json(route, { status: 'success', success: true, data: { tickets: [] } });
        }

        if (pathname.endsWith('/api/garages') && method === 'GET') {
            return json(route, {
                status: 'success',
                success: true,
                data: {
                    garages: fixtures.garages,
                    count: fixtures.garages.length
                }
            });
        }

        if (pathname.match(/\/api\/route-breakdowns\/\d+\/garage-approval$/) && method === 'POST') {
            fixtures.state.approvalCalls += 1;
            try {
                fixtures.state.approvalPayload = JSON.parse(request.postData() || '{}');
            } catch (_error) {
                fixtures.state.approvalPayload = null;
            }

            return json(route, {
                status: 'success',
                success: true,
                message: 'Garage approved successfully'
            });
        }

        return json(route, { status: 'success', success: true, data: {} });
    });
}

async function runFlow(page, viewportName) {
    const fixtures = buildFixtures();
    const state = {
        console: [],
        failedRequests: [],
        approvalCalls: 0,
        approvalPayload: null
    };

    fixtures.state = state;

    await installLeafletStub(page);
    attachMonitors(page, state);
    await mockApi(page, fixtures);

    const startUrl = `${BASE_URL}/dashboard/supervisor/index.html?section=fault-ticket-tracking`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 20000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('fault-ticket-tracking');
        }
    });

    await expect(page.locator('#fault-ticket-tracking')).toBeVisible({ timeout: 15000 });
    const tracking = page.locator('supervisor-fault-ticket-tracking');
    await expect(tracking).toBeVisible({ timeout: 15000 });

    const listItems = tracking.locator('#supervisorFaultTicketList .inventory-item');
    await expect(listItems).toHaveCount(4, { timeout: 15000 });

    const newestCard = listItems.first();
    const routeCard = listItems.filter({ hasText: 'RBD-201' }).first();
    const approvedRouteCard = listItems.filter({ hasText: 'RBD-202' }).first();
    const vehicleCard = listItems.filter({ hasText: 'VBD-401' }).first();
    const machineCard = listItems.filter({ hasText: 'MBD-301' }).first();

    await expect(newestCard).toContainText('VBD-401');
    await expect(newestCard).toContainText('MEDIUM');

    const sortSelect = tracking.locator('#supervisorFaultTicketSort');
    await expect(sortSelect).toBeVisible();

    await sortSelect.selectOption('priority');
    await expect(listItems.first()).toContainText('RBD-202');
    await expect(listItems.first()).toContainText('CRITICAL');

    await sortSelect.selectOption('created');
    await expect(listItems.first()).toContainText('VBD-401');

    await expect(routeCard).toBeVisible();
    await expect(approvedRouteCard).toBeVisible();
    await expect(vehicleCard).toBeVisible();
    await expect(machineCard).toBeVisible();

    await expect(vehicleCard.locator('.item-meta').first()).toContainText('Driver Three (Driver)');
    await expect(vehicleCard).toContainText('Brake Failure');
    await expect(vehicleCard).toContainText('MEDIUM');

    await expect(routeCard).toContainText('Dangerous Cargo');
    await expect(routeCard).not.toContainText('Compressed gas cylinders');
    await expect(routeCard).not.toContainText('Cargo Trip: TRIP-991');
    await expect(routeCard).not.toContainText('Garage Workflow:');
    await expect(routeCard).not.toContainText('Ticket:');
    await expect(routeCard.locator('.item-details strong')).not.toContainText('(Driver)');
    await expect(routeCard.locator('.item-meta').first()).toContainText('Driver One (Driver)');
    await expect(machineCard.locator('.item-meta').first()).toContainText('Operator One (Machinery Operator)');

    await expect(approvedRouteCard).toContainText('Garage Approved');
    await expect(approvedRouteCard).toContainText('Kaduna');
    await expect(approvedRouteCard).not.toContainText('Lat 6.8778206');
    await expect(approvedRouteCard).not.toContainText('Lng 79.8787521');
    await expect(approvedRouteCard).not.toContainText('[Route Breakdown]');
    await expect(approvedRouteCard).not.toContainText('Vehicle: LK-3456 | Driver: Driver Two');

    const mapButtonCount = await tracking.locator('button[data-action="open-map"]').count();
    expect(mapButtonCount).toBe(0);

    const listText = await tracking.innerText();
    const listCoordinatesHidden = !listText.includes('Lat ') && !listText.includes('Lng ');
    const listTicketLineRemoved = !listText.includes('Ticket:');
    const routeMetaText = await routeCard.locator('.item-meta').first().innerText();
    const machineMetaText = await machineCard.locator('.item-meta').first().innerText();
    const reporterRoleShownNextToName = routeMetaText.includes('Driver One (Driver)')
        && machineMetaText.includes('Operator One (Machinery Operator)');

    await expect(tracking.locator('button[data-action="approve-garage"]')).toHaveCount(0);

    const viewButtons = tracking.locator('button[data-action="view-ticket"]');
    const viewButtonCount = await viewButtons.count();
    for (let index = 0; index < viewButtonCount; index += 1) {
        await expect(viewButtons.nth(index)).toContainText('View');
        await expect(viewButtons.nth(index)).not.toContainText('VIEW TICKET');
    }

    await tracking.locator('button[data-action="set-source-filter"][data-source="vehicle"]').click();
    await expect(tracking.locator('#supervisorFaultTicketList .inventory-item')).toHaveCount(3);
    await expect(tracking.locator('#supervisorFaultTicketList .inventory-item').first()).toContainText('VBD-401');

    await tracking.locator('button[data-action="set-source-filter"][data-source="machine"]').click();
    await expect(tracking.locator('#supervisorFaultTicketList .inventory-item')).toHaveCount(1);
    await expect(tracking.locator('#supervisorFaultTicketList .inventory-item').first()).toContainText('MBD-301');

    await tracking.locator('button[data-action="set-source-filter"][data-source="all"]').click();
    await expect(tracking.locator('#supervisorFaultTicketList .inventory-item')).toHaveCount(4);

    await page.evaluate(() => {
        const detailView = document.querySelector('#ticket-details supervisor-ticket-detail-view');
        if (!detailView) {
            return;
        }

        detailView.open = (ticketId, options = {}) => {
            window.__supervisorViewCapture = {
                ticketId,
                options
            };
        };
    });

    await routeCard.locator('button[data-action="view-ticket"]').click();

    await page.waitForFunction(() => Boolean(window.__supervisorViewCapture), null, { timeout: 10000 });
    const detailNavigationCapture = await page.evaluate(() => window.__supervisorViewCapture || null);

    expect(detailNavigationCapture).toBeTruthy();
    expect(Number(detailNavigationCapture.ticketId)).toBe(301);
    expect(detailNavigationCapture.options?.returnSection).toBe('fault-ticket-tracking');

    const detailUrl = `${BASE_URL}/view-ticket/index.html?id=301&role_override=SUPERVISOR&embedded=1`;
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#mainContent')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#routeLocationPanel')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#routeLocationMap')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#routeLocationHint')).toContainText('map', { timeout: 15000 });
    await expect(page.locator('#approveGarageBtn')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#ovInsurancePanel')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#ovInsuranceProvider')).toContainText('Transit Assurance Ltd');
    await expect(page.locator('#ovWarrantyProvider')).toContainText('Fleet Warranty Ltd');
    await expect(page.locator('#ovInsuranceEligibility')).toContainText('Not Eligible for Insurance Claim');


    await page.locator('#approveGarageBtn').click();
    await expect(page.locator('#garageApprovalModal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#garageApprovalList .assign-tech-item')).toHaveCount(2, { timeout: 10000 });
    await expect(page.locator('#garageApprovalMap')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#garageApprovalMap .leaflet-circle-marker').first()).toBeVisible({ timeout: 10000 });

    const modalGeometry = await page.evaluate(() => {
        const overlay = Array.from(document.querySelectorAll('#garageApprovalModal')).find((el) => {
            const styles = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return styles.display !== 'none' && rect.width > 0 && rect.height > 0;
        }) || null;
        const card = overlay?.querySelector('.modal');
        if (!overlay || !card) {
            return null;
        }

        const overlayRect = overlay.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const overlayCenterX = overlayRect.left + (overlayRect.width / 2);
        const overlayCenterY = overlayRect.top + (overlayRect.height / 2);
        const cardCenterX = cardRect.left + (cardRect.width / 2);
        const cardCenterY = cardRect.top + (cardRect.height / 2);

        return {
            overlayDisplay: window.getComputedStyle(overlay).display,
            overlayAlignItems: window.getComputedStyle(overlay).alignItems,
            overlayJustifyContent: window.getComputedStyle(overlay).justifyContent,
            left: cardRect.left,
            top: cardRect.top,
            deltaX: Math.abs(cardCenterX - overlayCenterX),
            deltaY: Math.abs(cardCenterY - overlayCenterY),
        };
    });

    expect(modalGeometry).toBeTruthy();
    expect(modalGeometry.overlayDisplay).toBe('flex');
    expect(modalGeometry.overlayAlignItems).toBe('center');
    expect(modalGeometry.overlayJustifyContent).toBe('center');
    expect(modalGeometry.left).toBeGreaterThan(8);
    expect(modalGeometry.top).toBeGreaterThan(8);
    expect(modalGeometry.deltaX).toBeLessThan(80);
    expect(modalGeometry.deltaY).toBeLessThan(140);

    const mapMarkerCount = await page.locator('#garageApprovalMap .leaflet-marker-icon').count();
    const garageMarkerCount = await page.locator('#garageApprovalMap .leaflet-circle-marker').count();
    expect(garageMarkerCount).toBeGreaterThan(0);
    expect(mapMarkerCount).toBeGreaterThanOrEqual(garageMarkerCount);

    await page.locator('#garageApprovalMap .leaflet-circle-marker').first().click();
    await expect(page.locator('input[name="approveGarageChoice"]:checked')).toHaveValue('1', { timeout: 10000 });

    await page.fill('#garageApprovalNotes', 'Approved nearest garage for immediate repair.');
    await page.locator('#garageApprovalForm button[type="submit"]').click();
    await expect.poll(() => state.approvalCalls).toBe(1);
    expect(state.approvalPayload?.garage_id).toBe(1);
    await expect
        .poll(async () => page.evaluate(() => {
            const visibleModals = Array.from(document.querySelectorAll('#garageApprovalModal')).filter((el) => {
                const styles = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return styles.display !== 'none' && rect.width > 0 && rect.height > 0;
            });
            return visibleModals.length;
        }))
        .toBe(0);

    const routeMapPanelVisible = await page.locator('#routeLocationPanel').isVisible();
    const routeMapContainerVisible = await page.locator('#routeLocationMap').isVisible();
    const garageApprovalButtonVisible = await page.locator('#approveGarageBtn').isVisible();

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
            dangerousCargoBadgeVisible: true,
            driverVehicleBreakdownVisible: true,
            approveGarageActionRemoved: true,
            viewLabelUpdated: true,
            newestFirstSortWorks: true,
            prioritySortWorks: true,
            garageApprovedStatusShown: true,
            legacyRouteDescriptionNormalized: true,
            listMapActionRemoved: mapButtonCount === 0,
            listCoordinatesHidden,
            listTicketLineRemoved,
            reporterRoleShownNextToName,
            viewTicketEmbeddedMapVisible: routeMapPanelVisible && routeMapContainerVisible,
            detailGarageApprovalActionVisible: garageApprovalButtonVisible,
            detailGarageApprovalModalCentered: modalGeometry.deltaX < 80 && modalGeometry.deltaY < 140,
            detailGarageMapMarkersVisible: garageMarkerCount > 0,
            detailGarageMarkerSelectWorks: state.approvalPayload?.garage_id === 1,
            detailGarageApprovalSubmitWorks: state.approvalCalls === 1,
            sourceFilterVehicleWorks: true,
            sourceFilterMachineWorks: true,
            detailReturnSectionUsesFaultTicketTracking: detailNavigationCapture?.options?.returnSection === 'fault-ticket-tracking'
        },
        detailGarageModalGeometry: modalGeometry,
        detailGarageApproval: {
            approvalCalls: state.approvalCalls,
            approvalPayload: state.approvalPayload,
            mapMarkerCount,
            garageMarkerCount
        }
    };

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('supervisor fault ticket tracking desktop validation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runFlow(page, 'desktop');
});

test('supervisor fault ticket tracking mobile validation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await runFlow(page, 'mobile');
});
