class TOInventory extends HTMLElement {
    constructor() {
        super();
        this.allInventory = [];
        this.currentFilter = 'all';
        this._activeModal = null;

        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        this.closeDetailsModal();
    }

    async refresh() {
        await this.loadInventory();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Inventory Management</h1>
                <p class="page-subtitle">Manage and view vehicles and machines</p>
            </div>

            <div class="filter-controls" data-role="filters">
                <button type="button" class="filter-btn active" data-filter-type="all">All Assets</button>
                <button type="button" class="filter-btn" data-filter-type="vehicle">Vehicles</button>
                <button type="button" class="filter-btn" data-filter-type="machine">Machines</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-warehouse"></i> Assets Inventory</span>
                    <span class="status-badge status-normal" data-role="count">Loading...</span>
                </div>
                <div class="inventory-list" data-role="list"></div>
                <div data-role="empty" style="display: none; text-align: center; color: var(--muted); padding: 20px;">
                    No inventory items found for this filter
                </div>
            </div>
        `;
    }

    async loadInventory() {
        const list = this.querySelector('[data-role="list"]');
        if (!list) return;

        list.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--muted);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 15px;">Loading inventory...</p></div>';

        try {
            const [vehiclesResponse, machinesResponse] = await Promise.all([
                API.get('/vehicles'),
                API.get('/machines')
            ]);

            const vehicles = this.extractCollection(vehiclesResponse, 'vehicles').map(vehicle => {
                const vehicleId = String(vehicle.vehicle_id || vehicle.id || '');
                return {
                    key: `vehicle:${vehicleId}`,
                    type: 'vehicle',
                    name: vehicle.vehicle_name || vehicle.number_plate || vehicleId || 'Unknown Vehicle',
                    identifier: vehicle.number_plate || vehicle.vehicle_id || vehicle.chassis_number || 'N/A',
                    manufacturer: vehicle.supplier_name || 'N/A',
                    model: vehicle.model_number || 'N/A',
                    status: vehicle.status || 'Active',
                    raw: vehicle
                };
            });

            const machines = this.extractCollection(machinesResponse, 'machines').map(machine => {
                const machineId = String(machine.machine_id || machine.id || '');
                return {
                    key: `machine:${machineId}`,
                    type: 'machine',
                    name: machine.machine_name || machine.model_number || machineId || 'Unknown Machine',
                    identifier: machine.machine_id || machine.serial_number || machineId || 'N/A',
                    manufacturer: machine.supplier_name || machine.manufacturer || 'N/A',
                    model: machine.model_number || 'N/A',
                    status: machine.status || 'Active',
                    raw: machine
                };
            });

            this.allInventory = [...vehicles, ...machines];
            this.applyFilter(this.currentFilter);
        } catch (error) {
            console.error('to-inventory load error:', error);
            this.allInventory = [];
            this.setCount(0);
            this.setEmptyState(false, '');
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--danger);"><i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i><p>Failed to load inventory. Please try again.</p></div>';
            this.dispatchError('Failed to load inventory. Please try again.');
        }
    }

    extractCollection(response, key) {
        if (!response || response.status !== 'success') {
            return [];
        }

        const payload = response.data;
        if (Array.isArray(payload?.[key])) {
            return payload[key];
        }

        if (Array.isArray(payload)) {
            return payload;
        }

        return [];
    }

    applyFilter(type) {
        this.currentFilter = type;
        this.updateFilterButtons();

        const filteredItems = type === 'all'
            ? this.allInventory
            : this.allInventory.filter(item => item.type === type);

        this.renderInventoryItems(filteredItems);
        this.setCount(filteredItems.length);

        if (this.allInventory.length === 0) {
            this.setEmptyState(true, 'No inventory items found');
            return;
        }

        this.setEmptyState(filteredItems.length === 0, 'No inventory items found for this filter');
    }

    renderInventoryItems(items) {
        const list = this.querySelector('[data-role="list"]');
        if (!list) return;

        if (items.length === 0) {
            list.innerHTML = '';
            return;
        }

        list.innerHTML = items.map(item => {
            const icon = item.type === 'vehicle' ? 'fa-car' : 'fa-cogs';
            const typeLabel = item.type === 'vehicle' ? 'Vehicle' : 'Machine';
            const statusClass = this.toStatusClass(item.status);

            return `
                <div class="inventory-item" data-type="${this.escapeHtml(item.type)}">
                    <div class="item-details">
                        <strong><i class="fas ${icon}"></i> ${this.escapeHtml(item.name)}</strong>
                        <div class="item-meta">
                            <i class="fas fa-hashtag"></i> ${this.escapeHtml(item.identifier)} |
                            <i class="fas fa-tag"></i> ${typeLabel} |
                            <i class="fas fa-industry"></i> ${this.escapeHtml(item.manufacturer)}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-cubes"></i> Model: ${this.escapeHtml(item.model)} |
                            <span class="status-badge status-${statusClass}">${this.escapeHtml(item.status)}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <div class="action-buttons">
                            <button type="button" class="btn btn-primary btn-small" data-item-key="${this.escapeHtml(item.key)}">
                                <i class="fas fa-eye"></i> VIEW
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateFilterButtons() {
        this.querySelectorAll('button[data-filter-type]').forEach(button => {
            button.classList.toggle('active', button.dataset.filterType === this.currentFilter);
        });
    }

    setCount(count) {
        const countElement = this.querySelector('[data-role="count"]');
        if (!countElement) return;

        countElement.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }

    setEmptyState(visible, message) {
        const empty = this.querySelector('[data-role="empty"]');
        if (!empty) return;

        empty.style.display = visible ? 'block' : 'none';
        if (message) {
            empty.textContent = message;
        }
    }

    _onRootClick(event) {
        const filterButton = event.target.closest('button[data-filter-type]');
        if (filterButton) {
            this.applyFilter(filterButton.dataset.filterType || 'all');
            return;
        }

        const viewButton = event.target.closest('button[data-item-key]');
        if (viewButton) {
            this.viewInventoryItem(viewButton.dataset.itemKey);
            return;
        }

        const closeButton = event.target.closest('button[data-close-inventory-modal]');
        if (closeButton) {
            this.closeDetailsModal();
            return;
        }

        if (event.target.classList.contains('modal') && event.target.dataset.inventoryModal === 'true') {
            this.closeDetailsModal();
        }
    }

    viewInventoryItem(itemKey) {
        const item = this.allInventory.find(entry => entry.key === itemKey);
        if (!item) {
            this.dispatchError('Inventory item not found.');
            return;
        }

        this.openDetailsModal(item);
    }

    openDetailsModal(item) {
        this.closeDetailsModal();

        const isVehicle = item.type === 'vehicle';
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.dataset.inventoryModal = 'true';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <button type="button" class="close" data-close-inventory-modal>&times;</button>
                <h2 style="margin-bottom: 20px; color: var(--tang-blue);">
                    <i class="fas fa-info-circle"></i> ${isVehicle ? 'Vehicle Details' : 'Machine Details'}
                </h2>
                ${this.buildDetailsMarkup(item)}
            </div>
        `;

        document.body.appendChild(modal);
        this._activeModal = modal;
    }

    closeDetailsModal() {
        if (!this._activeModal) return;
        this._activeModal.remove();
        this._activeModal = null;
    }

    buildDetailsMarkup(item) {
        if (item.type === 'vehicle') {
            return this.buildVehicleDetails(item.raw);
        }

        return this.buildMachineDetails(item.raw);
    }

    buildVehicleDetails(vehicle) {
        return `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                ${this.detailRow('Vehicle ID', vehicle.vehicle_id)}
                ${this.detailRow('Vehicle Name', vehicle.vehicle_name)}
                ${this.detailRow('Number Plate', vehicle.number_plate || vehicle.registration_number)}
                ${this.detailRow('Chassis Number', vehicle.chassis_number)}
                ${this.detailRow('Vehicle Type', vehicle.vehicle_type)}
                ${this.detailRow('Fuel Type', vehicle.fuel_type)}
                ${this.detailRow('Current Mileage', vehicle.current_mileage ? `${vehicle.current_mileage} km` : 'N/A')}
                ${this.detailRow('Status', vehicle.status || 'Active')}
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Supplier Information</h5>
                ${this.detailRow('Supplier', vehicle.supplier_name)}
                ${this.detailRow('Contact', vehicle.supplier_contact)}
            </div>
            <div class="form-section">
                <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
                ${this.detailRow('Last Service', this.formatDate(vehicle.last_service_date))}
                ${this.detailRow('Next Service', this.formatDate(vehicle.next_service_date))}
                ${this.detailRow('Warranty Expiry', this.formatDate(vehicle.warranty_expiry))}
                ${this.detailRow('Warranty Provider', vehicle.warranty_provider)}
            </div>
            ${vehicle.notes ? `
                <div class="form-section">
                    <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                    <p>${this.escapeHtml(vehicle.notes)}</p>
                </div>
            ` : ''}
        `;
    }

    buildMachineDetails(machine) {
        return `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                ${this.detailRow('Machine ID', machine.machine_id)}
                ${this.detailRow('Machine Name', machine.machine_name)}
                ${this.detailRow('Model Number', machine.model_number)}
                ${this.detailRow('Serial Number', machine.serial_number)}
                ${this.detailRow('Location', machine.location)}
                ${this.detailRow('Status', machine.status || 'Active')}
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Supplier Information</h5>
                ${this.detailRow('Supplier', machine.supplier_name)}
                ${this.detailRow('Contact', machine.supplier_contact)}
            </div>
            <div class="form-section">
                <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
                ${this.detailRow('Last Service', this.formatDate(machine.last_service_date))}
                ${this.detailRow('Next Service', this.formatDate(machine.next_service_date))}
                ${this.detailRow('Warranty Expiry', this.formatDate(machine.warranty_expiry))}
                ${this.detailRow('Warranty Provider', machine.warranty_provider)}
            </div>
            ${machine.notes ? `
                <div class="form-section">
                    <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                    <p>${this.escapeHtml(machine.notes)}</p>
                </div>
            ` : ''}
        `;
    }

    detailRow(label, value) {
        const safeValue = value === null || value === undefined || value === '' ? 'N/A' : String(value);
        return `<p><strong>${this.escapeHtml(label)}:</strong> ${this.escapeHtml(safeValue)}</p>`;
    }

    formatDate(value) {
        if (!value) return 'N/A';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleDateString();
    }

    toStatusClass(status) {
        return String(status || 'active')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    dispatchError(message) {
        this.dispatchEvent(new CustomEvent('technical-officer-inventory:error', {
            bubbles: true,
            detail: { message }
        }));
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

if (!customElements.get('to-inventory')) {
    customElements.define('to-inventory', TOInventory);
}
