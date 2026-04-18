class TMTrips extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._allTrips = [];
        this._filter = 'active';
        this._searchQuery = '';
        this._boundDocumentClickHandler = (event) => {
            if (!this.contains(event.target)) {
                this._closeAllMenus();
            }
        };

        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    disconnectedCallback() {
        this._mounted = false;
        document.removeEventListener('click', this._boundDocumentClickHandler);
    }

    loadStyles() {
        const linkId = 'tm-trips-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/trips/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-route"></i> Trips Management</h2>
                <p class="page-subtitle">Manage transportation trips and monitor active trip operations</p>
            </div>

            <div class="search-bar">
                <input type="text" id="tripsSearch" class="search-input" placeholder="Search by trip ID, origin, destination, driver, vehicle, or cargo summary...">
                <button class="btn btn-primary" data-action="assign-trip">
                    <i class="fas fa-plus"></i> Assign Trip
                </button>
            </div>

            <div class="filter-controls">
                <button class="filter-btn active" data-filter="active">Active</button>
                <button class="filter-btn" data-filter="pending">Pending</button>
                <button class="filter-btn" data-filter="accepted">Accepted</button>
                <button class="filter-btn" data-filter="rejected">Rejected</button>
                <button class="filter-btn" data-filter="all">All Trips</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-route"></i> Trips</span>
                    <span id="tripsCount" class="status-text status-normal">0 trips</span>
                </div>
                <div id="tripsContainer" style="padding: 15px;">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading trips...</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            const filterEl = event.target.closest('[data-filter]');

            if (!event.target.closest('.actions-dropdown')) {
                this._closeAllMenus();
            }

            if (filterEl) {
                this.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
                filterEl.classList.add('active');
                this._filter = filterEl.dataset.filter;
                this._renderList();
                return;
            }

            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            const tripId = actionEl.dataset.tripId;

            switch (action) {
                case 'assign-trip':
                    this.dispatchEvent(new CustomEvent('tm-trips:assign', { bubbles: true }));
                    break;
                case 'start':
                    this.dispatchEvent(new CustomEvent('tm-trips:start', {
                        detail: { tripId }, bubbles: true,
                    }));
                    break;
                case 'end':
                    this.dispatchEvent(new CustomEvent('tm-trips:end', {
                        detail: { tripId }, bubbles: true,
                    }));
                    break;
                case 'cancel':
                    this.dispatchEvent(new CustomEvent('tm-trips:cancel', {
                        detail: { tripId }, bubbles: true,
                    }));
                    break;
                case 'view':
                    this.dispatchEvent(new CustomEvent('tm-trips:view', {
                        detail: { tripId }, bubbles: true,
                    }));
                    break;
                case 'toggle-menu':
                    event.stopPropagation();
                    this._toggleMenu(tripId);
                    break;
                case 'edit':
                    this._closeAllMenus();
                    this.dispatchEvent(new CustomEvent('tm-trips:edit', {
                        detail: { tripId }, bubbles: true,
                    }));
                    break;
                case 'delete':
                    this._closeAllMenus();
                    this._confirmDelete(tripId);
                    break;
            }
        });

        const searchInput = this.querySelector('#tripsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this._searchQuery = String(event.target.value || '').toLowerCase();
                this._renderList();
            });
        }

        document.addEventListener('click', this._boundDocumentClickHandler);
    }

    async refresh() {
        const tripsContainer = this.querySelector('#tripsContainer');
        if (tripsContainer) {
            tripsContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading trips...</span>
                </div>
            `;
        }

        try {
            await this._loadTrips();
            this._renderList();
        } catch (error) {
            this._renderTripsLoadError(error);
        }
    }

    async _loadTrips() {
        const response = await API.get('/trips');
        this._assertSuccess(response, 'Failed to load trips');
        this._allTrips = response.data?.trips || [];
    }

    _renderTripsLoadError(error) {
        const container = this.querySelector('#tripsContainer');
        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to load trips</h3>
                <p>${TMUtils.escapeHtml(error?.message || 'Please try again later')}</p>
            </div>
        `;
    }

    _getFilteredTrips() {
        let trips = this._allTrips;

        if (this._filter === 'pending') {
            trips = trips.filter((trip) => trip.status === 'Pending');
        } else if (this._filter === 'accepted') {
            trips = trips.filter((trip) => trip.status === 'Accepted');
        } else if (this._filter === 'rejected') {
            trips = trips.filter((trip) => trip.status === 'Rejected');
        } else if (this._filter === 'active') {
            trips = trips.filter((trip) => ['Pending', 'Accepted', 'In Progress'].includes(trip.status));
        }

        if (this._searchQuery) {
            trips = trips.filter((trip) => {
                const searchText = [
                    trip.trip_id,
                    trip.origin,
                    trip.destination,
                    trip.driver_name,
                    trip.vehicle_registration,
                    trip.cargo_description,
                    trip.cargo_summary,
                ].join(' ').toLowerCase();

                return searchText.includes(this._searchQuery);
            });
        }

        return trips;
    }

    _getStatusClass(status) {
        const statusMap = {
            Pending: 'pending',
            Accepted: 'accepted',
            Rejected: 'rejected',
            'In Progress': 'in-progress',
            Completed: 'completed',
            Cancelled: 'cancelled',
        };

        return statusMap[status] || '';
    }

    _getStatusBadge(status) {
        const info = TMUtils.getStatusInfo(status);
        return `<span class="status-badge ${info.badge}">${TMUtils.escapeHtml(info.label)}</span>`;
    }

    _renderTripCargoMeta(trip) {
        const cargoSummary = TMUtils.buildCargoSummary(trip);
        const summaryPreview = cargoSummary ? this._truncateText(cargoSummary, 170) : '';
        const hasDangerousCargo = TMUtils.hasDangerousCargo(trip);

        if (!summaryPreview && !hasDangerousCargo) {
            return '';
        }

        const dangerousBadge = hasDangerousCargo
            ? `<span class="status-badge badge-danger"><i class="fas fa-radiation"></i> Dangerous Cargo</span>`
            : '';

        const summaryHtml = summaryPreview
            ? `<span class="cargo-summary-inline"><i class="fas fa-boxes-stacked"></i> ${TMUtils.escapeHtml(summaryPreview)}</span>`
            : '';

        return `
            <div class="item-meta cargo-trip-meta">
                ${dangerousBadge}
                ${summaryHtml}
            </div>
        `;
    }

    _renderList() {
        const container = this.querySelector('#tripsContainer');
        const countEl = this.querySelector('#tripsCount');
        if (!container) {
            return;
        }

        const trips = this._getFilteredTrips();

        if (countEl) {
            countEl.textContent = `${trips.length} trip${trips.length !== 1 ? 's' : ''}`;
        }

        if (!trips.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-route"></i>
                    <h3>No trips found</h3>
                    <p>There are no trips matching your filter criteria</p>
                </div>
            `;
            return;
        }

        container.innerHTML = trips.map((trip) => {
            const statusClass = this._getStatusClass(trip.status);
            const driverName = trip.driver_name || (trip.driver_id ? `Driver #${trip.driver_id}` : '—');

            const rejectionInfo = trip.status === 'Rejected' && trip.rejection_reason
                ? `<div class="item-rejection" style="color: #e74c3c; font-size: 12px; margin-top: 5px;"><i class="fas fa-exclamation-circle"></i> <strong>Rejection Reason:</strong> ${TMUtils.escapeHtml(trip.rejection_reason)}</div>`
                : '';

            const assistantInfo = trip.assistant_driver_name
                ? `<span class="text-muted" style="margin-left: 10px;"><i class="fas fa-user-friends"></i> ${TMUtils.escapeHtml(trip.assistant_driver_name)}</span>`
                : '';

            return `
                <div class="inventory-item ${statusClass}" data-id="${TMUtils.escapeHtml(trip.trip_id)}">
                    <div class="item-details">
                        <strong><i class="fas fa-route"></i> ${TMUtils.escapeHtml(trip.trip_id)}</strong>
                        <div class="item-meta">
                            <i class="fas fa-map-marker-alt"></i> ${TMUtils.escapeHtml(trip.origin || '—')} → ${TMUtils.escapeHtml(trip.destination || '—')}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-truck"></i> ${TMUtils.escapeHtml(trip.vehicle_registration || '—')} |
                            <i class="fas fa-user"></i> ${TMUtils.escapeHtml(driverName)}
                        </div>
                        <div class="item-description">
                            ${this._getStatusBadge(trip.status)}
                            ${trip.starting_odometer ? `<span class="text-muted" style="margin-left: 10px;"><i class="fas fa-tachometer-alt"></i> ${TMUtils.formatOdometer(trip.starting_odometer)}</span>` : ''}
                            ${assistantInfo}
                        </div>
                        ${this._renderTripCargoMeta(trip)}
                        ${rejectionInfo}
                    </div>
                    <div class="item-actions">
                        ${this._buildActions(trip)}
                    </div>
                </div>
            `;
        }).join('');
    }

    _buildActions(trip) {
        const safeTripId = TMUtils.escapeHtml(trip.trip_id);

        const viewBtn = `
            <button class="btn btn-primary btn-small" data-action="view" data-trip-id="${safeTripId}">
                <i class="fas fa-eye"></i> View
            </button>
        `;

        const actionsMenu = trip.status === 'Pending' ? `
            <div class="actions-dropdown">
                <button class="btn btn-icon btn-small actions-trigger" data-action="toggle-menu" data-trip-id="${safeTripId}">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="actions-menu" id="menu-${safeTripId}">
                    <button class="actions-menu-item" data-action="edit" data-trip-id="${safeTripId}">
                        <i class="fas fa-edit"></i> Edit Trip
                    </button>
                    <button class="actions-menu-item danger" data-action="delete" data-trip-id="${safeTripId}">
                        <i class="fas fa-trash"></i> Delete Trip
                    </button>
                </div>
            </div>
        ` : '';

        if (trip.status === 'Pending') {
            return `<div class="btn-group">${viewBtn}${actionsMenu}</div>`;
        }

        if (trip.status === 'Accepted' || trip.status === 'In Progress') {
            return `<div class="btn-group">${viewBtn}</div>`;
        }

        return viewBtn;
    }

    async _confirmDelete(tripId) {
        const confirmed = confirm(`Are you sure you want to delete trip ${tripId}? This action cannot be undone.`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await API.delete(`/trips/${tripId}`);
            this._assertSuccess(response, 'Failed to delete trip');
            TMUtils.emitToast('Trip deleted successfully', 'success');
            await this.refresh();
        } catch (error) {
            TMUtils.emitToast(error.message || 'Failed to delete trip', 'error');
        }
    }

    _toggleMenu(tripId) {
        const menu = this.querySelector(`#menu-${tripId}`);
        const wasActive = menu?.classList.contains('active');

        this._closeAllMenus();

        if (menu && !wasActive) {
            menu.classList.add('active');
        }
    }

    _closeAllMenus() {
        this.querySelectorAll('.actions-menu.active').forEach((menu) => {
            menu.classList.remove('active');
        });
    }

    _assertSuccess(response, fallbackMessage) {
        if (response && (response.success === true || response.status === 'success')) {
            return;
        }

        const message = response?.message || fallbackMessage;
        throw new Error(message);
    }

    _truncateText(value, maxLength) {
        const text = String(value || '');
        if (text.length <= maxLength) {
            return text;
        }

        return `${text.slice(0, maxLength - 1)}…`;
    }
}

customElements.define('tm-trips', TMTrips);
