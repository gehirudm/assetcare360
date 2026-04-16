class TMTrips extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._allTrips = [];
        this._filter = 'active';
        this._searchQuery = '';
        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
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
                <p class="page-subtitle">Manage and track all transportation trips</p>
            </div>

            <div class="search-bar">
                <input type="text" id="tripsSearch" class="search-input" placeholder="Search by trip ID, origin, destination, or driver...">
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

            // Close any open menus when clicking outside
            if (!event.target.closest('.actions-dropdown')) {
                this._closeAllMenus();
            }

            if (filterEl) {
                this.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                filterEl.classList.add('active');
                this._filter = filterEl.dataset.filter;
                this._renderList();
                return;
            }

            if (!actionEl) return;

            const action = actionEl.dataset.action;
            const tripId = actionEl.dataset.tripId;

            switch (action) {
                case 'assign-trip':
                    this.dispatchEvent(new CustomEvent('tm-trips:assign', { bubbles: true }));
                    break;
                case 'start':
                    this.dispatchEvent(new CustomEvent('tm-trips:start', { 
                        detail: { tripId }, bubbles: true 
                    }));
                    break;
                case 'end':
                    this.dispatchEvent(new CustomEvent('tm-trips:end', { 
                        detail: { tripId }, bubbles: true 
                    }));
                    break;
                case 'cancel':
                    this.dispatchEvent(new CustomEvent('tm-trips:cancel', { 
                        detail: { tripId }, bubbles: true 
                    }));
                    break;
                case 'view':
                    this.dispatchEvent(new CustomEvent('tm-trips:view', { 
                        detail: { tripId }, bubbles: true 
                    }));
                    break;
                case 'toggle-menu':
                    event.stopPropagation();
                    this._toggleMenu(tripId);
                    break;
                case 'edit':
                    this._closeAllMenus();
                    this.dispatchEvent(new CustomEvent('tm-trips:edit', { 
                        detail: { tripId }, bubbles: true 
                    }));
                    break;
                case 'delete':
                    this._closeAllMenus();
                    this._confirmDelete(tripId);
                    break;
            }
        });

        // Search input
        const searchInput = this.querySelector('#tripsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this._searchQuery = e.target.value.toLowerCase();
                this._renderList();
            });
        }

        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.actions-dropdown')) {
                this._closeAllMenus();
            }
        });
    }

    _toggleMenu(tripId) {
        const menu = this.querySelector(`#menu-${tripId}`);
        const wasActive = menu?.classList.contains('active');
        
        // Close all menus first
        this._closeAllMenus();
        
        // Toggle the clicked menu
        if (menu && !wasActive) {
            menu.classList.add('active');
        }
    }

    _closeAllMenus() {
        this.querySelectorAll('.actions-menu.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }

    async _confirmDelete(tripId) {
        const confirmed = confirm(`Are you sure you want to delete trip ${tripId}? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            await API.delete(`/trips/${tripId}`);
            TMUtils.emitToast('Trip deleted successfully', 'success');
            this.refresh();
        } catch (error) {
            TMUtils.emitToast(error.message || 'Failed to delete trip', 'error');
        }
    }

    async refresh() {
        const container = this.querySelector('#tripsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading trips...</span>
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
                    <h3>Failed to load trips</h3>
                    <p>${error.message || 'Please try again later'}</p>
                </div>
            `;
        }
    }

    _getFiltered() {
        let trips = this._allTrips;
        
        // Apply status filter
        if (this._filter === 'pending') {
            trips = trips.filter(t => t.status === 'Pending');
        } else if (this._filter === 'accepted') {
            trips = trips.filter(t => t.status === 'Accepted');
        } else if (this._filter === 'rejected') {
            trips = trips.filter(t => t.status === 'Rejected');
        } else if (this._filter === 'active') {
            trips = trips.filter(t => t.status === 'Pending' || t.status === 'Accepted' || t.status === 'In Progress');
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
            'Pending': 'pending',
            'Accepted': 'accepted',
            'Rejected': 'rejected',
            'In Progress': 'in-progress',
            'Completed': 'completed',
            'Cancelled': 'cancelled'
        };
        return statusMap[status] || '';
    }

    _getStatusBadge(status) {
        const info = TMUtils.getStatusInfo(status);
        return `<span class="status-badge ${info.badge}">${info.label}</span>`;
    }

    _renderList() {
        const container = this.querySelector('#tripsContainer');
        const countEl = this.querySelector('#tripsCount');
        const trips = this._getFiltered();

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

        const items = trips.map(trip => {
            const statusClass = this._getStatusClass(trip.status);
            const driverName = trip.driver_name || (trip.driver_id ? `Driver #${trip.driver_id}` : '—');
            
            // Show rejection reason for rejected trips
            const rejectionInfo = trip.status === 'Rejected' && trip.rejection_reason
                ? `<div class="item-rejection" style="color: #e74c3c; font-size: 12px; margin-top: 5px;"><i class="fas fa-exclamation-circle"></i> <strong>Rejection Reason:</strong> ${trip.rejection_reason}</div>`
                : '';
            
            // Show assistant driver info if present
            const assistantInfo = trip.assistant_driver_name
                ? `<span class="text-muted" style="margin-left: 10px;"><i class="fas fa-user-friends"></i> ${trip.assistant_driver_name}</span>`
                : '';

            return `
                <div class="inventory-item ${statusClass}" data-id="${trip.trip_id}">
                    <div class="item-details">
                        <strong><i class="fas fa-route"></i> ${trip.trip_id}</strong>
                        <div class="item-meta">
                            <i class="fas fa-map-marker-alt"></i> ${trip.origin || '—'} → ${trip.destination || '—'}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-truck"></i> ${trip.vehicle_registration || '—'} |
                            <i class="fas fa-user"></i> ${driverName}
                        </div>
                        <div class="item-description">
                            ${this._getStatusBadge(trip.status)}
                            ${trip.starting_odometer ? `<span class="text-muted" style="margin-left: 10px;"><i class="fas fa-tachometer-alt"></i> ${TMUtils.formatOdometer(trip.starting_odometer)}</span>` : ''}
                            ${assistantInfo}
                        </div>
                        ${rejectionInfo}
                    </div>
                    <div class="item-actions">
                        ${this._buildActions(trip)}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = items;
    }

    _buildActions(trip) {
        const viewBtn = `
            <button class="btn btn-primary btn-small" data-action="view" data-trip-id="${trip.trip_id}">
                <i class="fas fa-eye"></i> View
            </button>
        `;

        // Three-dot menu for edit/delete (only for Pending trips)
        const actionsMenu = trip.status === 'Pending' ? `
            <div class="actions-dropdown">
                <button class="btn btn-icon btn-small actions-trigger" data-action="toggle-menu" data-trip-id="${trip.trip_id}">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="actions-menu" id="menu-${trip.trip_id}">
                    <button class="actions-menu-item" data-action="edit" data-trip-id="${trip.trip_id}">
                        <i class="fas fa-edit"></i> Edit Trip
                    </button>
                    <button class="actions-menu-item danger" data-action="delete" data-trip-id="${trip.trip_id}">
                        <i class="fas fa-trash"></i> Delete Trip
                    </button>
                </div>
            </div>
        ` : '';

        if (trip.status === 'Pending') {
            return `
                <div class="btn-group">
                    ${viewBtn}
                    ${actionsMenu}
                </div>
            `;
        }
        if (trip.status === 'Accepted') {
            return `
                <div class="btn-group">
                    ${viewBtn}
                </div>
            `;
        }
        if (trip.status === 'In Progress') {
            return `
                <div class="btn-group">
                    ${viewBtn}
                </div>
            `;
        }
        return viewBtn;
    }
}

customElements.define('tm-trips', TMTrips);
