class DriverTripLog extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.trips = [];
        this.render();
        this.bindEvents();
        this.refresh();

        this._onTripsChanged = () => this.refresh();
        DriverUtils.on('driver:data-trips-changed', this._onTripsChanged);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-route"></i> Trip Log</h2>
                <p class="page-subtitle">Record and track your trips with details</p>
            </div>

            <div style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                <button id="startNewTripBtn" class="btn btn-primary" type="button" data-action="open-start-trip-modal">
                    <i class="fas fa-plus"></i> Start New Trip
                </button>
                <button class="btn btn-secondary" type="button" data-action="refresh-trips">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>

            <div id="activeTripWarning" style="display: none; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 15px; color: #856404;">
                <i class="fas fa-info-circle"></i> You have an active trip. Please complete it before starting a new one.
            </div>

            <div class="filter-controls" id="tripFilters">
                <button class="filter-btn active" type="button" data-action="set-trip-filter" data-filter="all">All</button>
                <button class="filter-btn" type="button" data-action="set-trip-filter" data-filter="ready">Ready</button>
                <button class="filter-btn" type="button" data-action="set-trip-filter" data-filter="in-progress">In Progress</button>
                <button class="filter-btn" type="button" data-action="set-trip-filter" data-filter="completed">Completed</button>
            </div>

            <div id="driverTripsList"></div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            if (action === 'open-start-trip-modal') {
                if (this.hasActiveTrip()) {
                    DriverUtils.showToast('Please complete your active trip before starting a new one.', 'warning');
                    return;
                }

                DriverUtils.openModal('startTripModal');
                return;
            }

            if (action === 'refresh-trips') {
                this.refresh();
                return;
            }

            if (action === 'set-trip-filter') {
                this.applyFilter(actionEl.dataset.filter);
                return;
            }

            const tripId = actionEl.dataset.tripId;
            const trip = this.trips.find((item) => item.trip_id === tripId) || null;

            if (action === 'view-trip' && trip) {
                DriverUtils.openModal('viewTripModal', { trip });
                return;
            }

            if (action === 'edit-trip' && trip) {
                DriverUtils.openModal('editTripModal', { trip });
                return;
            }

            if (action === 'start-trip' && tripId) {
                this.startTrip(tripId);
                return;
            }

            if (action === 'end-trip' && trip) {
                DriverUtils.openModal('endTripModal', {
                    trip,
                    minimumOdometer: Number.parseInt(trip.starting_odometer || 0, 10),
                });
            }
        });
    }

    async startTrip(tripId) {
        try {
            const response = await DriverUtils.apiPost(`/trips/${encodeURIComponent(tripId)}/start`, {});
            if (response && (response.success || response.status === 'success')) {
                DriverUtils.showToast(`Trip ${tripId} started successfully.`);
                DriverUtils.emit('driver:data-trips-changed');
                return;
            }

            DriverUtils.showToast(response?.message || `Failed to start trip ${tripId}.`, 'error');
        } catch (error) {
            console.error('Failed to start trip:', error);
            DriverUtils.showToast('Failed to start trip. Please try again.', 'error');
        }
    }

    applyFilter(filter) {
        this.currentFilter = filter || 'all';

        this.querySelectorAll('[data-action="set-trip-filter"]').forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });

        this.renderTrips();
    }

    async refresh() {
        const loadingContainer = this.querySelector('#driverTripsList');
        loadingContainer.innerHTML = '<div style="padding: 20px; color: var(--muted);">Loading trips...</div>';

        try {
            const response = await DriverUtils.apiGet('/trips');
            const trips = DriverUtils.normalizeApiList(response, 'trips');

            this.trips = (trips.length > 0 ? trips : this.getFallbackTrips()).map((trip) => {
                const tripId = trip.trip_id || trip.id;
                return {
                    ...trip,
                    trip_id: tripId,
                    route: trip.route || `${trip.origin || 'N/A'} → ${trip.destination || 'N/A'}`,
                    status: DriverUtils.getTripDisplayStatus(trip.status),
                };
            });

            DriverUtils.store.trips = new Map(this.trips.map((trip) => [trip.trip_id, trip]));
            this.renderTrips();
        } catch (error) {
            console.error('Failed to load trips:', error);
            this.trips = this.getFallbackTrips();
            DriverUtils.store.trips = new Map(this.trips.map((trip) => [trip.trip_id, trip]));
            this.renderTrips();
            DriverUtils.showToast('Unable to load trips from server. Showing local data.', 'warning');
        }
    }

    renderTrips() {
        const container = this.querySelector('#driverTripsList');
        const filteredTrips = this.trips.filter((trip) => {
            if (this.currentFilter === 'all') {
                return true;
            }

            return DriverUtils.getTripFilterStatus(trip.status) === this.currentFilter;
        });

        if (filteredTrips.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--muted);">No trips found for the selected filter.</div>';
            this.updateStartButtonState();
            DriverUtils.emit('driver:data-summary-updated');
            return;
        }

        container.innerHTML = filteredTrips.map((trip) => this.renderTripItem(trip)).join('');
        this.updateStartButtonState();
        DriverUtils.emit('driver:data-summary-updated');
    }

    renderTripItem(trip) {
        const filterStatus = DriverUtils.getTripFilterStatus(trip.status);
        const statusColor = DriverUtils.getStatusColor(trip.status);
        const odometer = trip.final_odometer || trip.finalOdometer || trip.starting_odometer || trip.odometer || 'N/A';
        const tripDate = DriverUtils.formatDate(trip.created_at || trip.date);
        const route = `${trip.origin || 'N/A'} → ${trip.destination || 'N/A'}`;

        let actions = `
            <button class="btn btn-small btn-primary" type="button" data-action="view-trip" data-trip-id="${trip.trip_id}">
                <i class="fas fa-eye"></i> VIEW
            </button>
        `;

        if (filterStatus === 'ready') {
            actions = `
                <button class="btn btn-small btn-success" type="button" data-action="start-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-play"></i> START
                </button>
                <button class="btn btn-small btn-primary" type="button" data-action="view-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-eye"></i> VIEW
                </button>
                <button class="btn btn-small btn-secondary" type="button" data-action="edit-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-edit"></i> EDIT
                </button>
            `;
        }

        if (filterStatus === 'in-progress') {
            actions = `
                <button class="btn btn-small btn-danger" type="button" data-action="end-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-flag-checkered"></i> END
                </button>
                <button class="btn btn-small btn-primary" type="button" data-action="view-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-eye"></i> VIEW
                </button>
            `;
        }

        return `
            <div class="inventory-item" data-id="${trip.trip_id}" data-status="${filterStatus}">
                <div class="item-details">
                    <strong><i class="fas fa-route"></i> ${trip.trip_id}</strong>
                    <div class="item-meta">
                        <i class="fas fa-map-marker-alt"></i> ${route} | <i class="fas fa-calendar"></i> ${tripDate}
                    </div>
                    <div class="item-description">
                        <span class="status-text" style="color: ${statusColor};">${trip.status}</span> | <i class="fas fa-tachometer-alt"></i> ${odometer} km
                    </div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">${actions}</div>
                </div>
            </div>
        `;
    }

    hasActiveTrip() {
        return this.trips.some((trip) => {
            const status = DriverUtils.getTripFilterStatus(trip.status);
            return status === 'ready' || status === 'in-progress';
        });
    }

    updateStartButtonState() {
        const button = this.querySelector('#startNewTripBtn');
        const warning = this.querySelector('#activeTripWarning');
        const hasActive = this.hasActiveTrip();

        if (button) {
            button.disabled = hasActive;
            button.style.opacity = hasActive ? '0.5' : '1';
            button.style.cursor = hasActive ? 'not-allowed' : 'pointer';
        }

        if (warning) {
            warning.style.display = hasActive ? 'block' : 'none';
        }
    }

    getFallbackTrips() {
        return [
            {
                trip_id: 'TRP-001',
                origin: 'Colombo',
                destination: 'Kandy',
                status: 'Completed',
                starting_odometer: 45100,
                final_odometer: 45220,
                cargo_description: 'Spare parts crates',
                created_at: '2026-04-10T08:00:00Z',
            },
            {
                trip_id: 'TRP-002',
                origin: 'Kandy',
                destination: 'Galle',
                status: 'In Progress',
                starting_odometer: 45220,
                final_odometer: null,
                cargo_description: 'Machinery components',
                created_at: '2026-04-11T09:10:00Z',
            },
        ];
    }
}

customElements.define('driver-trip-log', DriverTripLog);
