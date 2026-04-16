/**
 * inventory-vehicles.js
 * Component for Inventory Manager Vehicles Management section
 */

class InventoryVehicles extends HTMLElement {
    constructor() {
        super();
        this.vehicles = [];
        this.currentFilter = 'all';
    }

    connectedCallback() {
        this.loadStyles();
        this.render();
        this.bindEvents();
    }

    loadStyles() {
        const linkId = 'inventory-vehicles-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/vehicles/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-truck"></i> Vehicle Management</h2>
                <p class="page-subtitle">Manage company vehicles and fleet</p>
            </div>

            <div class="search-bar">
                <input type="text" id="vehicleSearch" class="search-input" placeholder="Search vehicles...">
                <button class="btn btn-primary" id="addVehicleBtn">
                    <i class="fas fa-plus"></i> Add New Vehicle
                </button>
            </div>

            <div class="filter-controls" id="vehicleFilters">
                <button class="filter-btn active" data-status="all">All</button>
                <button class="filter-btn" data-status="Active">Active</button>
                <button class="filter-btn" data-status="Under Maintenance">Under Maintenance</button>
                <button class="filter-btn" data-status="Inactive">Inactive</button>
            </div>

            <div id="vehiclesList">
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2em; margin-bottom: 10px;"></i>
                    <p>Loading vehicles...</p>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Filter buttons
        this.querySelectorAll('#vehicleFilters .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                this.filterByStatus(status);
            });
        });

        // Search input
        const searchInput = this.querySelector('#vehicleSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Add button
        const addBtn = this.querySelector('#addVehicleBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('inventory-vehicles:add', { bubbles: true }));
            });
        }

    }

    async loadVehicles() {
        try {
            const response = await API.get('/vehicles');
            this.vehicles = response.data?.vehicles || [];
            this.displayVehicles(this.vehicles);
        } catch (error) {
            console.error('Failed to load vehicles:', error);
            Utils.showToast('Failed to load vehicles', 'error');
            this.vehicles = [];
            this.displayVehicles([]);
        }
    }

    filterByStatus(status) {
        this.currentFilter = status;

        // Update active button
        this.querySelectorAll('#vehicleFilters .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === status);
        });

        this.applyFilters();
    }

    applyFilters() {
        const searchValue = (this.querySelector('#vehicleSearch')?.value || '').toLowerCase();

        const filtered = this.vehicles.filter(vehicle => {
            // Status filter
            const matchesStatus = this.currentFilter === 'all' || vehicle.status === this.currentFilter;

            // Search filter
            const matchesSearch = !searchValue ||
                (vehicle.vehicle_name || '').toLowerCase().includes(searchValue) ||
                (vehicle.model_number || '').toLowerCase().includes(searchValue) ||
                (vehicle.vehicle_id || '').toLowerCase().includes(searchValue) ||
                (vehicle.registration_number || '').toLowerCase().includes(searchValue);

            return matchesStatus && matchesSearch;
        });

        this.displayVehicles(filtered);
    }

    displayVehicles(vehicleList) {
        const vehiclesList = this.querySelector('#vehiclesList');
        if (!vehiclesList) return;

        if (vehicleList.length === 0) {
            vehiclesList.innerHTML = `
                <div class="card">
                    <p style="text-align: center; color: var(--muted); padding: 40px;">
                        <i class="fas fa-truck" style="font-size: 3rem; display: block; margin-bottom: 15px;"></i>
                        No vehicles found.
                    </p>
                </div>
            `;
            return;
        }

        vehiclesList.innerHTML = vehicleList.map(vehicle => {
            const isForAuction = vehicle.status === 'For Auction';
            const auctionActionHtml = isForAuction
                ? `<button type="button" class="dropdown-item" data-action="remove-auction" data-id="${vehicle.id}"><i class="fas fa-undo"></i> Remove from Auction</button>`
                : `<button type="button" class="dropdown-item" data-action="mark-auction" data-id="${vehicle.id}"><i class="fas fa-gavel"></i> Mark for Auction</button>`;

            return `
                <div class="inventory-item" data-id="${vehicle.id}" data-status="${vehicle.status}">
                    <div class="item-details">
                        <strong><i class="fas fa-truck"></i> ${vehicle.vehicle_name}</strong>
                        <div class="item-meta">
                            <i class="fas fa-hashtag"></i> ${vehicle.model_number} |
                            <i class="fas fa-barcode"></i> ${vehicle.vehicle_id} |
                            <i class="fas fa-id-card"></i> ${vehicle.registration_number}
                        </div>
                        <div class="item-description">
                            <span class="status-text ${this.getStatusClass(vehicle.status)}">${vehicle.status}</span> |
                            <i class="fas fa-tachometer-alt"></i> ${vehicle.mileage || 0} km
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button type="button" class="btn btn-small btn-primary" data-action="view" data-id="${vehicle.id}">
                                <i class="fas fa-eye"></i> VIEW
                            </button>
                            <div class="dropdown-container">
                                <button type="button" class="btn btn-small btn-secondary dropdown-trigger" data-action="toggle-menu" data-id="${vehicle.id}" aria-label="Open vehicle actions">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdown-vehicle-${vehicle.id}">
                                    <button type="button" class="dropdown-item" data-action="edit" data-id="${vehicle.id}">
                                        <i class="fas fa-edit"></i> Edit Vehicle
                                    </button>
                                    ${auctionActionHtml}
                                    <button type="button" class="dropdown-item danger" data-action="delete" data-id="${vehicle.id}">
                                        <i class="fas fa-trash"></i> Delete Vehicle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind action buttons
        vehiclesList.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                const action = btn.dataset.action;
                const vehicleId = Number.parseInt(btn.dataset.id, 10);
                if (!Number.isFinite(vehicleId)) return;

                switch (action) {
                    case 'view':
                        this.dispatchEvent(new CustomEvent('inventory-vehicles:view', {
                            bubbles: true,
                            detail: { vehicleId }
                        }));
                        break;
                    case 'edit':
                        this.dispatchEvent(new CustomEvent('inventory-vehicles:edit', {
                            bubbles: true,
                            detail: { vehicleId }
                        }));
                        break;
                    case 'toggle-menu':
                        this.toggleActionMenu(vehicleId);
                        break;
                    case 'mark-auction':
                        this.closeAllActionMenus();
                        this.dispatchEvent(new CustomEvent('inventory-vehicles:mark-auction', {
                            bubbles: true,
                            detail: { vehicleId }
                        }));
                        break;
                    case 'remove-auction':
                        this.closeAllActionMenus();
                        this.dispatchEvent(new CustomEvent('inventory-vehicles:remove-auction', {
                            bubbles: true,
                            detail: { vehicleId }
                        }));
                        break;
                    case 'delete':
                        this.closeAllActionMenus();
                        this.dispatchEvent(new CustomEvent('inventory-vehicles:delete', {
                            bubbles: true,
                            detail: { vehicleId }
                        }));
                        break;
                    default:
                        break;
                }
            });
        });
    }

    toggleActionMenu(vehicleId) {
        const menu = this.querySelector(`#dropdown-vehicle-${vehicleId}`);
        if (!menu) return;

        const shouldOpen = !menu.classList.contains('active');
        this.closeAllActionMenus();
        if (shouldOpen) {
            menu.classList.add('active');
        }
    }

    closeAllActionMenus() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('active');
        });
    }

    getStatusClass(status) {
        switch (status) {
            case 'Active': return 'status-in-stock';
            case 'Under Maintenance': return 'status-low-stock';
            case 'Inactive': return 'status-out-of-stock';
            case 'Decommissioned': return 'status-rejected';
            case 'For Auction': return 'status-auction';
            default: return 'status-normal';
        }
    }

    // Public method for parent to trigger refresh
    refresh() {
        return this.loadVehicles();
    }
}

customElements.define('inventory-vehicles', InventoryVehicles);
