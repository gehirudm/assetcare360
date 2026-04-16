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
                <p class="page-subtitle">View and manage your assigned trips</p>
            </div>

            <div class="filter-section" style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-small active" data-action="set-trip-filter" data-filter="all">All</button>
                <button class="btn btn-small" data-action="set-trip-filter" data-filter="pending">Pending</button>
                <button class="btn btn-small" data-action="set-trip-filter" data-filter="accepted">Accepted</button>
                <button class="btn btn-small" data-action="set-trip-filter" data-filter="in-progress">In Progress</button>
                <button class="btn btn-small" data-action="set-trip-filter" data-filter="completed">Completed</button>
            </div>

            <div id="driverTripsList" class="inventory-list"></div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', async (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            const tripId = actionEl.dataset.tripId;

            if (action === 'set-trip-filter') {
                this.applyFilter(actionEl.dataset.filter);
                return;
            }

            if (action === 'accept-trip') {
                await this.acceptTrip(tripId);
                return;
            }

            if (action === 'reject-trip') {
                this.openRejectModal(tripId);
                return;
            }

            if (action === 'start-trip') {
                this.openStartTripModal(tripId);
                return;
            }

            if (action === 'end-trip') {
                const trip = this.trips.find((t) => t.trip_id === tripId);
                DriverUtils.emit('driver:modal-open', { id: 'endTripModal', payload: { trip } });
                return;
            }

            if (action === 'view-trip') {
                const trip = this.trips.find((t) => t.trip_id === tripId);
                DriverUtils.emit('driver:modal-open', { id: 'viewTripModal', payload: { trip } });
                return;
            }
        });
    }

    async acceptTrip(tripId) {
        try {
            const response = await DriverUtils.apiPost(`/trips/${encodeURIComponent(tripId)}/accept`, {});
            if (response && (response.success || response.status === 'success')) {
                DriverUtils.showToast(`Trip ${tripId} accepted successfully.`);
                DriverUtils.emit('driver:data-trips-changed');
                return;
            }

            DriverUtils.showToast(response?.message || `Failed to accept trip ${tripId}.`, 'error');
        } catch (error) {
            console.error('Failed to accept trip:', error);
            DriverUtils.showToast('Failed to accept trip. Please try again.', 'error');
        }
    }

    openRejectModal(tripId) {
        DriverUtils.emit('driver:modal-open', { id: 'rejectTripModal', tripId });
    }

    openStartTripModal(tripId) {
        const trip = this.trips.find((t) => t.trip_id === tripId);
        DriverUtils.emit('driver:modal-open', { id: 'startAcceptedTripModal', tripId, trip });
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

            // Filter trips for current driver only
            const currentDriverId = DriverUtils.store.currentUser?.id;
            this.trips = trips.filter((trip) => {
                return !currentDriverId || trip.driver_id == currentDriverId;
            }).map((trip) => {
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
            this.trips = [];
            this.renderTrips();
            DriverUtils.showToast('Unable to load trips from server.', 'warning');
        }
    }

    renderTrips() {
        const container = this.querySelector('#driverTripsList');
        
        const filtered = this.trips.filter((trip) => {
            if (this.currentFilter === 'all') {
                return true;
            }
            return DriverUtils.getTripFilterStatus(trip.status) === this.currentFilter;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: var(--muted);">
                    <i class="fas fa-route" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No trips found${this.currentFilter !== 'all' ? ' for this filter' : ''}.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map((trip) => this.renderTripItem(trip)).join('');
        DriverUtils.emit('driver:data-summary-updated');
    }

    renderTripItem(trip) {
        const filterStatus = DriverUtils.getTripFilterStatus(trip.status);
        const statusColor = DriverUtils.getStatusColor(trip.status);
        const tripDate = DriverUtils.formatDate(trip.created_at || trip.date);
        const route = `${trip.origin || 'N/A'} → ${trip.destination || 'N/A'}`;

        let actions = '';

        // Pending trips: Accept or Reject
        if (filterStatus === 'pending') {
            actions = `
                <button class="btn btn-small btn-success" type="button" data-action="accept-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn btn-small btn-danger" type="button" data-action="reject-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="btn btn-small btn-primary" type="button" data-action="view-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
        }

        // Accepted trips: Start
        if (filterStatus === 'accepted') {
            actions = `
                <button class="btn btn-small btn-success" type="button" data-action="start-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-play"></i> Start
                </button>
                <button class="btn btn-small btn-primary" type="button" data-action="view-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
        }

        // In Progress trips: End
        if (filterStatus === 'in-progress') {
            actions = `
                <button class="btn btn-small btn-danger" type="button" data-action="end-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-flag-checkered"></i> End
                </button>
                <button class="btn btn-small btn-primary" type="button" data-action="view-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
        }

        // Completed/Cancelled/Rejected: View only
        if (filterStatus === 'completed' || filterStatus === 'cancelled' || filterStatus === 'rejected') {
            actions = `
                <button class="btn btn-small btn-primary" type="button" data-action="view-trip" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
        }

        // Show rejection reason if rejected
        const rejectionInfo = filterStatus === 'rejected' && trip.rejection_reason
            ? `<div class="item-rejection" style="color: #e74c3c; font-size: 12px; margin-top: 4px;"><i class="fas fa-exclamation-circle"></i> Reason: ${trip.rejection_reason}</div>`
            : '';

        return `
            <div class="inventory-item" data-id="${trip.trip_id}" data-status="${filterStatus}">
                <div class="item-details">
                    <strong><i class="fas fa-route"></i> ${trip.trip_id}</strong>
                    <div class="item-meta">
                        <i class="fas fa-map-marker-alt"></i> ${route} | <i class="fas fa-calendar"></i> ${tripDate}
                    </div>
                    <div class="item-meta">
                        <i class="fas fa-truck"></i> ${trip.vehicle_registration || 'No vehicle assigned'}
                    </div>
                    <div class="item-description">
                        <span class="status-badge" style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${trip.status}</span>
                        ${trip.cargo_description ? ` | <i class="fas fa-box"></i> ${trip.cargo_description}` : ''}
                    </div>
                    ${rejectionInfo}
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
            return status === 'pending' || status === 'accepted' || status === 'in-progress';
        });
    }
}

customElements.define('driver-trip-log', DriverTripLog);
