class TMFleet extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._vehicles = [];
        this._searchQuery = '';
        this._filter = 'all';
        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    loadStyles() {
        const linkId = 'tm-fleet-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/fleet/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-truck"></i> Fleet Overview</h2>
                <p class="page-subtitle">View all vehicles in your transportation fleet</p>
            </div>

            <div class="search-bar">
                <input type="text" id="fleetSearch" class="search-input" placeholder="Search by number plate, name, or type...">
            </div>

            <div class="filter-controls">
                <button class="filter-btn active" data-filter="all">All Vehicles</button>
                <button class="filter-btn" data-filter="Available">Available</button>
                <button class="filter-btn" data-filter="In Use">In Use</button>
                <button class="filter-btn" data-filter="Under Maintenance">Under Maintenance</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-truck"></i> Fleet</span>
                    <span id="fleetCount" class="status-text status-normal">0 vehicles</span>
                </div>
                <div id="fleetContainer" style="padding: 15px;">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading fleet...</span>
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
                const vehicleId = actionEl.dataset.vehicleId;

                if (action === 'view' && vehicleId) {
                    this.dispatchEvent(new CustomEvent('tm-fleet:view', { 
                        detail: { vehicleId }, bubbles: true 
                    }));
                }
            }
        });

        // Search input
        const searchInput = this.querySelector('#fleetSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this._searchQuery = e.target.value.toLowerCase();
                this._renderList();
            });
        }
    }

    async refresh() {
        const container = this.querySelector('#fleetContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading fleet...</span>
            </div>
        `;

        try {
            const res = await API.get('/vehicles');
            this._vehicles = res.data?.vehicles || res.data || [];
            this._renderList();
        } catch (error) {
            container.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load fleet</h3>
                    <p>${error.message || 'Please try again later'}</p>
                </div>
            `;
        }
    }

    _getFiltered() {
        let vehicles = this._vehicles;

        // Apply status filter
        if (this._filter !== 'all') {
            vehicles = vehicles.filter(v => v.status === this._filter);
        }

        // Apply search filter
        if (this._searchQuery) {
            vehicles = vehicles.filter(v => {
                const searchText = `${v.number_plate || ''} ${v.vehicle_registration || ''} ${v.vehicle_name || ''} ${v.make || ''} ${v.vehicle_type || ''}`.toLowerCase();
                return searchText.includes(this._searchQuery);
            });
        }

        return vehicles;
    }

    _getStatusClass(status) {
        const statusMap = {
            'Available': 'completed',
            'In Use': 'in-progress',
            'Under Maintenance': 'pending'
        };
        return statusMap[status] || '';
    }

    _getStatusBadge(status) {
        const info = TMUtils.getStatusInfo(status);
        return `<span class="status-badge ${info.badge}">${info.label}</span>`;
    }

    _renderList() {
        const container = this.querySelector('#fleetContainer');
        const countEl = this.querySelector('#fleetCount');
        const vehicles = this._getFiltered();

        if (countEl) {
            countEl.textContent = `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`;
        }

        if (!vehicles.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-truck"></i>
                    <h3>No vehicles found</h3>
                    <p>There are no vehicles matching your criteria</p>
                </div>
            `;
            return;
        }

        const items = vehicles.map(vehicle => {
            const statusClass = this._getStatusClass(vehicle.status);
            const numberPlate = vehicle.number_plate || vehicle.vehicle_registration || '—';
            const vehicleName = vehicle.vehicle_name || vehicle.make || '—';
            const vehicleId = vehicle.id || vehicle.vehicle_id;

            return `
                <div class="inventory-item ${statusClass}" data-id="${vehicleId}">
                    <div class="item-details">
                        <strong><i class="fas fa-truck"></i> ${numberPlate}</strong>
                        <div class="item-meta">
                            <i class="fas fa-car"></i> ${vehicleName}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-tag"></i> ${vehicle.vehicle_type || '—'}
                        </div>
                        <div class="item-description">
                            ${this._getStatusBadge(vehicle.status)}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-small" data-action="view" data-vehicle-id="${vehicleId}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = items;
    }
}

customElements.define('tm-fleet', TMFleet);
