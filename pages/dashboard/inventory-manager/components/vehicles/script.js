/**
 * inventory-vehicles.js
 * Component for Inventory Manager Vehicles Management section
 */

class InventoryVehicles extends HTMLElement {
    constructor() {
        super();
        this.vehicles = [];
        this.currentFilter = 'all';
        this.currentSort = 'created-desc';
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
                <div class="list-sort-controls">
                    <label class="sort-label" for="vehicleCreatedSort">Sort</label>
                    <select id="vehicleCreatedSort" class="form-select" aria-label="Sort vehicles by created date">
                        <option value="created-desc">Created Date: Newest First</option>
                        <option value="created-asc">Created Date: Oldest First</option>
                    </select>
                </div>
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

        // Sort input
        const sortInput = this.querySelector('#vehicleCreatedSort');
        if (sortInput) {
            sortInput.addEventListener('change', () => {
                this.currentSort = sortInput.value || 'created-desc';
                this.applyFilters();
            });
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
            this.applyFilters();
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
            const numberPlate = (vehicle.number_plate || vehicle.registration_number || '').toLowerCase();

            // Status filter
            const matchesStatus = this.currentFilter === 'all' || vehicle.status === this.currentFilter;

            // Search filter
            const matchesSearch = !searchValue ||
                (vehicle.vehicle_name || '').toLowerCase().includes(searchValue) ||
                (vehicle.model_number || '').toLowerCase().includes(searchValue) ||
                (vehicle.vehicle_id || '').toLowerCase().includes(searchValue) ||
                numberPlate.includes(searchValue) ||
                (vehicle.insurance_provider || '').toLowerCase().includes(searchValue) ||
                (vehicle.insurance_type || '').toLowerCase().includes(searchValue);

            return matchesStatus && matchesSearch;
        });

        this.displayVehicles(this.sortByCreatedDate(filtered));
    }

    sortByCreatedDate(vehicleList) {
        const direction = this.currentSort === 'created-asc' ? 1 : -1;

        return [...vehicleList].sort((a, b) => {
            const createdAtDifference = this.getCreatedTimestamp(a) - this.getCreatedTimestamp(b);
            if (createdAtDifference !== 0) {
                return direction === 1 ? createdAtDifference : -createdAtDifference;
            }

            const aId = Number.parseInt(a?.id, 10);
            const bId = Number.parseInt(b?.id, 10);
            if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
                const idDifference = aId - bId;
                return direction === 1 ? idDifference : -idDifference;
            }

            return 0;
        });
    }

    getCreatedTimestamp(vehicle) {
        const rawDate = vehicle?.created_at || vehicle?.createdAt || vehicle?.date_created;
        const timestamp = Date.parse(rawDate || '');
        return Number.isFinite(timestamp) ? timestamp : 0;
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
            const numberPlate = vehicle.number_plate || vehicle.registration_number || 'N/A';
            const currentMileageRaw = Number(vehicle.current_mileage);
            const fallbackMileageRaw = Number(vehicle.mileage);
            const currentMileage = Number.isFinite(currentMileageRaw)
                ? currentMileageRaw
                : (Number.isFinite(fallbackMileageRaw) ? fallbackMileageRaw : 0);
            const insuranceType = vehicle.insurance_type || 'N/A';
            const insuranceProvider = vehicle.insurance_provider || 'N/A';
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
                            <i class="fas fa-id-card"></i> ${numberPlate}
                        </div>
                        <div class="item-description">
                            <span class="status-text ${this.getStatusClass(vehicle.status)}">${vehicle.status}</span> |
                            <i class="fas fa-tachometer-alt"></i> ${currentMileage} km
                        </div>
                        <div class="item-description">
                            <i class="fas fa-shield-alt"></i> ${insuranceType} |
                            <i class="fas fa-building"></i> ${insuranceProvider}
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
