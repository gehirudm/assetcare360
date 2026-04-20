const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STAGE = process.env.VAL_STAGE || 'before';
const BASE_URL = process.env.VAL_BASE_URL || 'http://127.0.0.1:3000';
const BASE_ORIGIN = new URL(BASE_URL).origin;
const OUT_DIR = __dirname;

function json(route, body, status = 200) {
    return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });
}

function parseMultipartPayload(request) {
    const contentType = request.headers()['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2] || '').trim() : '';
    const rawBuffer = request.postDataBuffer();
    const rawBody = rawBuffer ? rawBuffer.toString('utf8') : '';

    if (!boundary || !rawBody) {
        return {
            fields: {},
            files: {},
            rawBody,
            isMultipart: false,
            contentType,
        };
    }

    const parts = rawBody.split(`--${boundary}`);
    const fields = {};
    const files = {};

    for (const rawPart of parts) {
        const part = rawPart.trim();
        if (!part || part === '--') {
            continue;
        }

        const [headerBlock, ...bodyParts] = part.split('\r\n\r\n');
        if (!headerBlock || !bodyParts.length) {
            continue;
        }

        const body = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
        const nameMatch = headerBlock.match(/name="([^"]+)"/i);
        if (!nameMatch) {
            continue;
        }

        const fieldName = nameMatch[1];
        const fileMatch = headerBlock.match(/filename="([^"]*)"/i);

        if (fileMatch) {
            const list = files[fieldName] || [];
            list.push({
                filename: fileMatch[1],
                size: Buffer.byteLength(body, 'utf8'),
            });
            files[fieldName] = list;
        } else {
            fields[fieldName] = body;
        }
    }

    return {
        fields,
        files,
        rawBody,
        isMultipart: true,
        contentType,
    };
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

            const map = {
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
                eachLayer(callback) {
                    Array.from(this._layers).forEach((layer) => callback(layer));
                },
                removeLayer(layer) {
                    if (layer && layer._iconEl && layer._iconEl.parentNode) {
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
                _showPopup(marker) {
                    if (!this._container) {
                        return;
                    }

                    const existing = this._container.querySelector('.leaflet-popup');
                    if (existing) {
                        existing.remove();
                    }

                    const popup = document.createElement('div');
                    popup.className = 'leaflet-popup';
                    popup.innerHTML = `<div class="leaflet-popup-content">${marker._popupHtml || ''}</div>`;
                    this._container.appendChild(popup);
                },
                _renderMarker(marker) {
                    if (!this._container) {
                        return;
                    }

                    const iconEl = document.createElement('div');
                    iconEl.className = 'leaflet-marker-icon';
                    iconEl.style.cursor = 'pointer';
                    iconEl.style.display = 'inline-flex';
                    iconEl.style.margin = '6px';

                    if (marker._isCircleMarker) {
                        iconEl.classList.add('leaflet-circle-marker');
                        iconEl.style.width = '16px';
                        iconEl.style.height = '16px';
                        iconEl.style.borderRadius = '999px';
                        iconEl.style.border = `2px solid ${marker._style?.color || '#1d4ed8'}`;
                        iconEl.style.background = marker._style?.fillColor || '#2563eb';
                        iconEl.style.opacity = String(marker._style?.fillOpacity ?? 0.75);
                    }

                    if (marker._icon && typeof marker._icon.html === 'string') {
                        iconEl.innerHTML = marker._icon.html;
                    } else {
                        if (!marker._isCircleMarker) {
                            iconEl.textContent = marker._options?.title || 'Marker';
                            iconEl.style.background = '#1f4b99';
                            iconEl.style.color = '#fff';
                            iconEl.style.padding = '4px 8px';
                            iconEl.style.borderRadius = '999px';
                            iconEl.style.fontSize = '12px';
                        }
                    }

                    iconEl.addEventListener('click', () => {
                        const clickHandler = marker._events.click;
                        if (typeof clickHandler === 'function') {
                            clickHandler();
                        }
                        if (marker._popupHtml) {
                            this._showPopup(marker);
                        }
                    });

                    marker._iconEl = iconEl;
                    this._container.appendChild(iconEl);
                },
            };

            return map;
        };

        const createMarker = (latlng, options = {}) => {
            const marker = {
                _latlng: toLatLng(latlng),
                _options: options,
                _icon: options.icon || null,
                _events: {},
                _popupHtml: '',
                _map: null,
                _iconEl: null,
                _style: {},
                _isCircleMarker: false,
                addTo(map) {
                    this._map = map;
                    map._addLayer(this);
                    map._renderMarker(this);
                    return this;
                },
                bindPopup(html) {
                    this._popupHtml = html || '';
                    return this;
                },
                on(eventName, handler) {
                    this._events[eventName] = handler;
                    return this;
                },
                setIcon(icon) {
                    this._icon = icon;
                    if (this._iconEl && icon && typeof icon.html === 'string') {
                        this._iconEl.innerHTML = icon.html;
                    }
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
                    }

                    return this;
                },
                openPopup() {
                    if (this._map) {
                        this._map._showPopup(this);
                    }
                    return this;
                },
                getLatLng() {
                    return this._latlng;
                },
            };

            return marker;
        };

        const createCircleMarker = (latlng, style = {}) => {
            const marker = createMarker(latlng, { title: 'Garage Marker' });
            marker._isCircleMarker = true;
            marker._style = {
                color: '#1d4ed8',
                fillColor: '#2563eb',
                fillOpacity: 0.75,
                ...style,
            };
            return marker;
        };

        window.L = {
            map: createMap,
            tileLayer: () => ({
                addTo(map) {
                    if (map && typeof map._addLayer === 'function') {
                        map._addLayer(this);
                    }
                    return this;
                },
            }),
            marker: createMarker,
            circleMarker: createCircleMarker,
            icon: (options = {}) => ({ ...options }),
            divIcon: (options = {}) => ({ ...options }),
            latLngBounds(initial = []) {
                const points = [];

                const addPoint = (value) => {
                    if (!value) {
                        return;
                    }
                    points.push(toLatLng(value));
                };

                if (Array.isArray(initial)) {
                    initial.forEach(addPoint);
                }

                return {
                    extend(value) {
                        addPoint(value);
                        return this;
                    },
                    isValid() {
                        return points.length > 0;
                    },
                };
            },
        };
    });
}

async function mockDriverApi(page, state) {
    const routeBreakdowns = [
        {
            id: 501,
            route_breakdown_id: 'RBD-501',
            driver_id: 901,
            driver_name: 'Driver One',
            number_plate: 'WP-CAB-1234',
            breakdown_type: 'engine',
            severity: 'high',
            description: 'Engine warning light remains on',
            status: 'Pending',
            ticket_status: 'Pending',
            garage_workflow_status: 'awaiting_supervisor_approval',
            garage_workflow: {
                status: 'awaiting_supervisor_approval',
            },
        },
        {
            id: 502,
            route_breakdown_id: 'RBD-502',
            driver_id: 901,
            driver_name: 'Driver One',
            number_plate: 'WP-CAB-2345',
            breakdown_type: 'brakes',
            severity: 'medium',
            description: 'Brake pedal feels soft',
            status: 'In Progress',
            ticket_status: 'Assigned',
            approved_garage_name: 'AutoCare Service Center',
            garage_workflow_status: 'garage_approved',
            garage_workflow: {
                status: 'garage_approved',
                approved_garage: {
                    id: 1,
                    name: 'AutoCare Service Center',
                    address: '123 Galle Road, Colombo 03',
                },
            },
        },
        {
            id: 503,
            route_breakdown_id: 'RBD-503',
            driver_id: 901,
            driver_name: 'Driver One',
            number_plate: 'WP-CAB-3456',
            breakdown_type: 'electrical',
            severity: 'critical',
            description: 'Electrical failure after startup',
            status: 'In Progress',
            ticket_status: 'In Progress',
            approved_garage_name: 'Reliable Motors',
            garage_workflow_status: 'repair_in_progress',
            garage_workflow: {
                status: 'repair_in_progress',
                approved_garage: {
                    id: 2,
                    name: 'Reliable Motors',
                    address: '456 Kandy Road, Kadawatha',
                },
            },
        },
    ];

    const garages = [
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
    ];

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
                    id: 901,
                    employee_id: 'LITRO-DRIVER-001',
                    full_name: 'Driver One',
                    role: 'Driver',
                },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    breakdowns: routeBreakdowns,
                    count: routeBreakdowns.length,
                },
            });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'POST') {
            state.createCalls += 1;
            state.createContentType = request.headers()['content-type'] || '';

            if (state.createContentType.includes('multipart/form-data')) {
                const multipart = parseMultipartPayload(request);
                state.createdPayload = multipart.fields;
                state.createImageCount = (
                    (multipart.files['breakdown_images[]'] || []).length
                    + (multipart.files.breakdown_images || []).length
                );
            } else {
                try {
                    state.createdPayload = JSON.parse(request.postData() || '{}');
                } catch (_error) {
                    state.createdPayload = null;
                }
                state.createImageCount = 0;
            }

            return json(route, {
                status: 'success',
                message: 'Route breakdown created successfully',
                data: {
                    breakdown: {
                        id: 504,
                        route_breakdown_id: 'RBD-504',
                    },
                },
            });
        }

        if (/\/api\/route-breakdowns\/\d+$/.test(pathname) && method === 'GET') {
            const id = Number(pathname.split('/').pop());
            const found = routeBreakdowns.find((item) => item.id === id) || routeBreakdowns[0];
            return json(route, {
                status: 'success',
                data: {
                    breakdown: {
                        ...found,
                        garage_updates: [],
                        available_garages: garages,
                    },
                },
            });
        }

        if (/\/api\/route-breakdowns\/502\/garage-entry$/.test(pathname) && method === 'POST') {
            state.entryCalls += 1;
            return json(route, { status: 'success', message: 'Garage entry logged' });
        }

        if (/\/api\/route-breakdowns\/503\/garage-progress$/.test(pathname) && method === 'POST') {
            state.progressCalls += 1;
            return json(route, { status: 'success', message: 'Progress update submitted' });
        }

        if (/\/api\/route-breakdowns\/503\/garage-complete$/.test(pathname) && method === 'POST') {
            state.completeCalls += 1;
            return json(route, { status: 'success', message: 'Route breakdown completed' });
        }

        if (pathname.endsWith('/api/garages') && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    garages,
                    count: garages.length,
                },
            });
        }

        if (pathname.endsWith('/api/trips') && method === 'GET') {
            return json(route, { status: 'success', data: { trips: [] } });
        }

        if (pathname.endsWith('/api/trips/active-count') && method === 'GET') {
            return json(route, { status: 'success', data: { active_count: 0 } });
        }

        if (pathname.endsWith('/api/vehicle-checks') && method === 'GET') {
            return json(route, { status: 'success', data: { checks: [] } });
        }

        if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
            return json(route, { status: 'success', data: { reports: [] } });
        }

        if (pathname.endsWith('/api/fuel-logs') && method === 'GET') {
            return json(route, { status: 'success', data: { fuel_logs: [] } });
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

        if (pathname.endsWith('/api/vehicles/my-vehicle') && method === 'GET') {
            return json(route, { status: 'success', data: { id: 10, number_plate: 'WP-CAB-1234', vehicle_name: 'Cab' } });
        }

        if (pathname.endsWith('/api/vehicles') && method === 'GET') {
            return json(route, { status: 'success', data: { vehicles: [] } });
        }

        return json(route, { status: 'success', data: {} });
    });
}

async function mockSupervisorApi(page, state) {
    const routeBreakdowns = [
        {
            id: 701,
            route_breakdown_id: 'RBD-701',
            fault_ticket_id: 701,
            fault_ticket_number: 'RBD-701',
            number_plate: 'WP-CAB-7001',
            vehicle_id: 55,
            driver_name: 'Driver Seven',
            breakdown_type: 'engine',
            severity: 'high',
            description: 'Engine stalled on route',
            status: 'Pending',
            ticket_status: 'Pending',
            breakdown_latitude: 6.9271,
            breakdown_longitude: 79.8612,
            breakdown_images: [
                'uploads/route-breakdowns/reports/report_20260420112200_aa11bb22cc33.jpg',
                'uploads/route-breakdowns/reports/report_20260420112205_dd44ee55ff66.jpg',
            ],
            garage_workflow_status: 'awaiting_supervisor_approval',
            garage_workflow: {
                status: 'awaiting_supervisor_approval',
            },
        },
    ];

    const garages = [
        {
            id: 1,
            name: 'AutoCare Service Center',
            address: '123 Galle Road, Colombo 03',
            city: 'Colombo',
            phone: '+94 11 234 5678',
            latitude: 6.9032,
            longitude: 79.8501,
            contact_person: 'Nimal Perera',
            contact_person_phone: '+94 77 200 3000',
            capabilities: ['engine', 'electrical'],
            notes: '24/7 emergency support',
            estimated_distance_km: 4.8,
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
            contact_person: 'Kasun Silva',
            contact_person_phone: '+94 77 400 5000',
            capabilities: ['brakes', 'tires'],
            notes: 'Fleet priority lane available',
            estimated_distance_km: 6.2,
            is_active: 1,
        },
    ];

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

        if (pathname.endsWith('/api/machine-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', data: { reports: [] } });
        }

        if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
            return json(route, { status: 'success', data: { breakdowns: routeBreakdowns, count: routeBreakdowns.length } });
        }

        if (pathname.endsWith('/api/garages') && method === 'GET') {
            return json(route, { status: 'success', data: { garages, count: garages.length } });
        }

        if (/\/api\/route-breakdowns\/701\/garage-approval$/.test(pathname) && method === 'POST') {
            state.approvalCalls += 1;
            return json(route, { status: 'success', message: 'Garage approved successfully' });
        }

        if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
            return json(route, { status: 'success', data: { tickets: [] } });
        }

        if (/\/api\/fault-tickets\/701$/.test(pathname) && method === 'GET') {
            return json(route, {
                status: 'success',
                data: {
                    id: 701,
                    ticket_id: 'RBD-701',
                    breakdown_type: 'route_breakdown',
                    breakdown_report_id: 'RBD-701',
                    status: 'Pending',
                    priority: 'High',
                    description: 'Engine stalled on route',
                    reporter_full_name: 'Driver Seven',
                    reported_by_name: 'Driver Seven',
                    number_plate: 'WP-CAB-7001',
                    route_breakdown_numeric_id: 701,
                    work_updates: [],
                    assignments: [],
                    created_at: '2026-04-20T08:20:00Z',
                    updated_at: '2026-04-20T08:20:00Z',
                    breakdown_context: {
                        route_breakdown_id: 'RBD-701',
                        route_breakdown_numeric_id: 701,
                        number_plate: 'WP-CAB-7001',
                        reporter_name: 'Driver Seven',
                        location: 'Colombo - Kandy A1',
                        description: 'Engine stalled on route',
                    },
                },
            });
        }

        if (/\/api\/budget-reports\/ticket\/701\/latest$/.test(pathname) && method === 'GET') {
            return json(route, { status: 'success', data: { report: null } });
        }

        if (/\/api\/spare-part-requests\/ticket\/701$/.test(pathname) && method === 'GET') {
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

    await page.route('**/uploads/route-breakdowns/reports/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'image/jpeg',
            body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        });
    });
}

function attachMonitors(page, state, scope) {
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'warning' || type === 'error') {
            state.console.push({
                scope,
                type,
                text: msg.text(),
            });
        }
    });

    page.on('response', (response) => {
        if (response.status() >= 400) {
            state.failedRequests.push({
                scope,
                url: response.url(),
                method: response.request().method(),
                status: response.status(),
            });
        }
    });
}

async function runDriverFlow(page, viewportName, artifact) {
    const state = {
        createCalls: 0,
        createdPayload: null,
        createContentType: null,
        createImageCount: 0,
        entryCalls: 0,
        progressCalls: 0,
        completeCalls: 0,
    };

    await installLeafletStub(page);
    await mockDriverApi(page, state);
    attachMonitors(page, artifact, 'driver');

    await page.goto(`${BASE_URL}/dashboard/driver/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('breakdown');
        }
    });

    await expect(page.locator('#breakdown')).toHaveClass(/active/, { timeout: 10000 });

    await page.locator('[data-action="open-route-breakdown-modal"]').click();
    await expect(page.locator('#breakdownInRouteModal')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.locator('#vehicleDisplay')).toBeVisible({ timeout: 10000 });

    const incidentAt = new Date();
    incidentAt.setMinutes(incidentAt.getMinutes() - incidentAt.getTimezoneOffset());

    await page.selectOption('#routeBreakdownSeverity', 'high');
    await page.fill('#routeBreakdownLocation', 'A1 Highway near Kadawatha');
    await page.fill('#routeBreakdownDatetime', incidentAt.toISOString().slice(0, 16));
    await page.selectOption('#routeBreakdownType', 'engine');
    await page.fill('#routeBreakdownDescription', 'Engine overheated and stalled while in route.');

    const routeBreakdownImagesInput = page.locator('#routeBreakdownImages');
    if (STAGE === 'after') {
        await expect(routeBreakdownImagesInput).toHaveCount(1);
        await page.setInputFiles('#routeBreakdownImages', [
            {
                name: 'route-breakdown-front.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('route-image-front'),
            },
            {
                name: 'route-breakdown-engine.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('route-image-engine'),
            },
        ]);
    } else {
        // Baseline capture can run on either pre-change or post-change code;
        // only the "after" stage enforces the new image-upload behavior.
        const imageInputCount = await routeBreakdownImagesInput.count();
        expect(imageInputCount).toBeGreaterThanOrEqual(0);
    }

    await page.locator('[data-action="capture-location"]').click();
    await expect(page.locator('#routeBreakdownCoordinateStatus')).toHaveText(/captured successfully/i, { timeout: 10000 });

    await page.locator('#breakdownInRouteForm button[type="submit"]').click();
    await expect.poll(() => state.createCalls).toBe(1);
    expect(state.createdPayload).toBeTruthy();
    expect(Number(state.createdPayload.breakdown_latitude)).toBeCloseTo(6.9271, 3);
    expect(Number(state.createdPayload.breakdown_longitude)).toBeCloseTo(79.8612, 3);
    if (STAGE === 'after') {
        expect(state.createContentType).toContain('multipart/form-data');
        expect(state.createImageCount).toBe(2);
    } else {
        expect(state.createImageCount).toBe(0);
    }

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('ticket-tracking');
        }
    });

    await expect(page.locator('#ticket-tracking')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Ticket Tracking' })).toBeVisible({ timeout: 10000 });

    const inProgressCard = page.locator('#driverTicketTrackingList .inventory-item').filter({ hasText: 'RBD-503' });
    await expect(inProgressCard).toBeVisible({ timeout: 10000 });

    await inProgressCard.locator('[data-action="toggle-actions-menu"]').click();
    await inProgressCard.locator('[data-action="add-garage-progress"]').click();
    await expect(page.locator('#garageProgressModal')).toHaveClass(/active/, { timeout: 10000 });
    await page.fill('#garageProgressNote', 'Completed electrical diagnostics and replaced damaged relay.');
    await page.setInputFiles('#garageProgressImages', [{
        name: 'progress.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-jpg-content'),
    }]);
    await page.locator('#garageProgressForm button[type="submit"]').click();
    await expect.poll(() => state.progressCalls).toBe(1);

    await inProgressCard.locator('[data-action="toggle-actions-menu"]').click();
    await inProgressCard.locator('[data-action="complete-garage-breakdown"]').click();
    await expect(page.locator('#completeBreakdownModal')).toHaveClass(/active/, { timeout: 10000 });
    await page.fill('#completeBillAmount', '12500');
    await page.fill('#completeRemarks', 'Repair completed and vehicle test run passed.');
    await page.setInputFiles('#completeBillImage', [{
        name: 'bill.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-bill-content'),
    }]);
    await page.locator('#completeBreakdownForm button[type="submit"]').click();
    await expect.poll(() => state.completeCalls).toBe(1);

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}-driver.png`),
        fullPage: true,
    });

    artifact.driver = {
        url: page.url(),
        actions: {
            createCalls: state.createCalls,
            createImageCount: state.createImageCount,
            entryCalls: state.entryCalls,
            progressCalls: state.progressCalls,
            completeCalls: state.completeCalls,
        },
        createdPayload: state.createdPayload,
        ui: await page.evaluate(() => ({
            activeSection: document.querySelector('.content-section.active')?.id || null,
            ticketRows: document.querySelectorAll('#driverTicketTrackingList .inventory-item').length,
            openModalCount: document.querySelectorAll('.modal.active').length,
        })),
    };
}

async function runSupervisorFlow(page, viewportName, artifact) {
    const state = {
        approvalCalls: 0,
    };

    await installLeafletStub(page);
    await mockSupervisorApi(page, state);
    attachMonitors(page, artifact, 'supervisor');

    await page.goto(`${BASE_URL}/dashboard/supervisor/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo('fault-ticket-tracking');
        }
    });

    await expect(page.locator('#fault-ticket-tracking')).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Fault Tickets' })).toBeVisible({ timeout: 10000 });

    const routeCard = page.locator('#supervisorFaultTicketList .inventory-item').filter({ hasText: 'RBD-701' });
    await expect(routeCard).toBeVisible({ timeout: 10000 });
    await routeCard.locator('[data-action="view-ticket"]').click();

    await expect(page.locator('#ticket-details')).toHaveClass(/active/, { timeout: 15000 });
    await expect(page.locator('#ovTicketId')).toContainText('RBD-701', { timeout: 15000 });

    const routeBreakdownImages = page.locator('#routeBreakdownImagesGrid .route-breakdown-image-item');
    if (STAGE === 'after') {
        await expect(routeBreakdownImages).toHaveCount(2, { timeout: 15000 });
        const firstImageHref = await routeBreakdownImages.first().getAttribute('href');
        expect(String(firstImageHref || '')).toContain('/uploads/route-breakdowns/reports/');
    } else {
        const imageCount = await routeBreakdownImages.count();
        expect(imageCount).toBeGreaterThanOrEqual(0);
    }

    await page.screenshot({
        path: path.join(OUT_DIR, `${STAGE}-${viewportName}-supervisor.png`),
        fullPage: true,
    });

    artifact.supervisor = {
        url: page.url(),
        actions: {
            approvalCalls: state.approvalCalls,
        },
        ui: await page.evaluate(() => ({
            activeSection: document.querySelector('.content-section.active')?.id || null,
            ticketRows: document.querySelectorAll('#supervisorFaultTicketList .inventory-item').length,
            routeBreakdownImageCount: document.querySelectorAll('#routeBreakdownImagesGrid .route-breakdown-image-item').length,
            routeBreakdownImagesPanelVisible: (() => {
                const panel = document.getElementById('routeBreakdownImagesPanel');
                if (!panel) {
                    return false;
                }
                return panel.style.display !== 'none';
            })(),
        })),
    };
}

async function runValidation(browser, viewportName, viewport) {
    const artifact = {
        stage: STAGE,
        viewport: viewportName,
        title: null,
        console: [],
        failedRequests: [],
        driver: null,
        supervisor: null,
    };

    const driverContext = await browser.newContext({
        viewport,
        geolocation: {
            latitude: 6.9271,
            longitude: 79.8612,
        },
    });
    await driverContext.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
    const driverPage = await driverContext.newPage();
    await runDriverFlow(driverPage, viewportName, artifact);
    artifact.title = await driverPage.title();
    await driverContext.close();

    const supervisorContext = await browser.newContext({ viewport });
    const supervisorPage = await supervisorContext.newPage();
    await runSupervisorFlow(supervisorPage, viewportName, artifact);
    await supervisorContext.close();

    fs.writeFileSync(
        path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
        JSON.stringify(artifact, null, 2)
    );
}

test('route breakdown garage workflow desktop validation', async ({ browser }) => {
    await runValidation(browser, 'desktop', { width: 1440, height: 900 });
});

test('route breakdown garage workflow mobile validation', async ({ browser }) => {
    await runValidation(browser, 'mobile', { width: 390, height: 844 });
});
