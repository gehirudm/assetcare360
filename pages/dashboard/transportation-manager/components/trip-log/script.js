class TMTripLog extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._allTrips = [];
        this._filter = 'completed';
        this._searchQuery = '';
        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    loadStyles() {
        const linkId = 'tm-trip-log-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/trip-log/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-history"></i> Trip Log</h2>
                <p class="page-subtitle">View completed and cancelled trip history</p>
            </div>

            <div class="search-bar">
                <input type="text" id="tripLogSearch" class="search-input" placeholder="Search by trip ID, origin, destination, or driver...">
            </div>

            <div class="filter-controls">
                <button class="filter-btn active" data-filter="completed">Completed</button>
                <button class="filter-btn" data-filter="rejected">Rejected</button>
                <button class="filter-btn" data-filter="cancelled">Cancelled</button>
                <button class="filter-btn" data-filter="all">All History</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-history"></i> Trip History</span>
                    <span id="tripLogCount" class="status-text status-normal">0 trips</span>
                </div>
                <div id="tripLogContainer" style="padding: 15px;">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading trip history...</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const filterEl = event.target.closest('[data-filter]');
            const actionEl = event.target.closest('[data-action]');

            if (filterEl) {
                this.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                filterEl.classList.add('active');
                this._filter = filterEl.dataset.filter;
                this._renderList();
                return;
            }

            if (actionEl) {
                const action = actionEl.dataset.action;
                const tripId = actionEl.dataset.tripId;

                if (action === 'view' && tripId) {
                    this.dispatchEvent(new CustomEvent('tm-trip-log:view', { 
                        detail: { tripId }, bubbles: true 
                    }));
                }
            }
        });

        // Search input
        const searchInput = this.querySelector('#tripLogSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this._searchQuery = e.target.value.toLowerCase();
                this._renderList();
            });
        }
    }

    async refresh() {
        const container = this.querySelector('#tripLogContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading trip history...</span>
            </div>
        `;

        try {
            const res = await API.get('/trips');
            this._allTrips = res.data?.trips || [];
            this._renderList();
        } catch (error) {
            container.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load trip log</h3>
                    <p>${error.message || 'Please try again later'}</p>
                </div>
            `;
        }
    }

    _getFiltered() {
        let trips = this._allTrips;
        
        // Apply status filter
        if (this._filter === 'completed') {
            trips = trips.filter(t => t.status === 'Completed');
        } else if (this._filter === 'cancelled') {
            trips = trips.filter(t => t.status === 'Cancelled');
        } else if (this._filter === 'rejected') {
            trips = trips.filter(t => t.status === 'Rejected');
        } else {
            trips = trips.filter(t => t.status === 'Completed' || t.status === 'Cancelled' || t.status === 'Rejected');
        }

        // Apply search filter
        if (this._searchQuery) {
            trips = trips.filter(t => {
                const searchText = `${t.trip_id || ''} ${t.origin || ''} ${t.destination || ''} ${t.driver_name || ''} ${t.vehicle_registration || ''}`.toLowerCase();
                return searchText.includes(this._searchQuery);
            });
        }

        return trips;
    }

    _getStatusClass(status) {
        const statusMap = {
            'Completed': 'completed',
            'Rejected': 'rejected',
            'Cancelled': 'cancelled'
        };
        return statusMap[status] || '';
    }

    _getStatusBadge(status) {
        const info = TMUtils.getStatusInfo(status);
        return `<span class="status-badge ${info.badge}">${info.label}</span>`;
    }

    _renderList() {
        const container = this.querySelector('#tripLogContainer');
        const countEl = this.querySelector('#tripLogCount');
        const trips = this._getFiltered();

        if (countEl) {
            countEl.textContent = `${trips.length} trip${trips.length !== 1 ? 's' : ''}`;
        }

        if (!trips.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No trip history found</h3>
                    <p>There are no completed or cancelled trips to display</p>
                </div>
            `;
            return;
        }

        const items = trips.map(trip => {
            const statusClass = this._getStatusClass(trip.status);
            const driverName = trip.driver_name || (trip.driver_id ? `Driver #${trip.driver_id}` : '—');
            const distance = TMUtils.formatDistance(trip.starting_odometer, trip.final_odometer);
            
            // Show rejection reason for rejected trips
            const rejectionInfo = trip.status === 'Rejected' && trip.rejection_reason
                ? `<div class="item-rejection" style="color: #e74c3c; font-size: 12px; margin-top: 5px;"><i class="fas fa-exclamation-circle"></i> <strong>Rejection Reason:</strong> ${trip.rejection_reason}</div>`
                : '';

            return `
                <div class="inventory-item ${statusClass}" data-id="${trip.trip_id}">
                    <div class="item-details">
                        <strong><i class="fas fa-history"></i> ${trip.trip_id}</strong>
                        <div class="item-meta">
                            <i class="fas fa-map-marker-alt"></i> ${trip.origin || '—'} → ${trip.destination || '—'}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-truck"></i> ${trip.vehicle_registration || '—'} |
                            <i class="fas fa-user"></i> ${driverName}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-road"></i> ${distance} |
                            <i class="fas fa-clock"></i> ${TMUtils.formatDateTime(trip.start_time)}
                        </div>
                        <div class="item-description">
                            ${this._getStatusBadge(trip.status)}
                            ${trip.cargo_description ? `<span class="text-muted" style="margin-left: 10px;"><i class="fas fa-box"></i> ${trip.cargo_description}</span>` : ''}
                        </div>
                        ${rejectionInfo}
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-small" data-action="view" data-trip-id="${trip.trip_id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = items;
    }
}

customElements.define('tm-trip-log', TMTripLog);
