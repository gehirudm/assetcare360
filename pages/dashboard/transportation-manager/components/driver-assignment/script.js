/**
 * TM Driver Assignment Component
 * Allows Transportation Manager to assign/reassign drivers to vehicles
 */
class TMDriverAssignment extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._vehicles = [];
        this._searchQuery = '';
        this._filter = 'all';
        this._assignedTripLocks = new Set();
        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    loadStyles() {
        const linkId = 'tm-driver-assignment-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/driver-assignment/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-user-cog"></i> Driver Assignment</h2>
                <p class="page-subtitle">Assign drivers to vehicles for trip management</p>
            </div>

            <div class="search-bar">
                <input type="text" id="driverAssignmentSearch" class="search-input" 
                       placeholder="Search by vehicle name, plate, or driver name...">
            </div>

            <div class="filter-controls">
                <button class="filter-btn active" data-filter="all">All Vehicles</button>
                <button class="filter-btn" data-filter="assigned">Assigned</button>
                <button class="filter-btn" data-filter="unassigned">Unassigned</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-truck"></i> Vehicle - Driver Assignments</span>
                    <span id="assignmentCount" class="status-text status-normal">0 vehicles</span>
                </div>
                <div id="assignmentContainer" style="padding: 15px;">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading assignments...</span>
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
                const numberPlate = actionEl.dataset.numberPlate;
                const vehicle = vehicleId ? this._vehicles.find(v => v.id == vehicleId) : null;

                if ((action === 'change' || action === 'unassign') && this._hasAssignedTripLock(vehicle)) {
                    return;
                }

                if (action === 'assign' || action === 'change') {
                    if (vehicle) {
                        this.dispatchEvent(new CustomEvent('tm-driver-assignment:assign', {
                            detail: { vehicle },
                            bubbles: true
                        }));
                    }
                }

                if (action === 'unassign' && vehicleId) {
                    this.dispatchEvent(new CustomEvent('tm-driver-assignment:unassign', {
                        detail: { vehicleId, numberPlate },
                        bubbles: true
                    }));
                }
            }
        });

        // Search input
        const searchInput = this.querySelector('#driverAssignmentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this._searchQuery = e.target.value.toLowerCase();
                this._renderList();
            });
        }
    }

    async refresh() {
        const container = this.querySelector('#assignmentContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading assignments...</span>
            </div>
        `;

        try {
            const vehiclesRes = await API.get('/vehicles/with-drivers');
            this._vehicles = vehiclesRes.data?.vehicles || [];

            let trips = [];
            try {
                const tripsRes = await API.get('/trips');
                trips = tripsRes.data?.trips || [];
            } catch (tripError) {
                console.warn('TM driver-assignment: unable to load trips for lock state checks', tripError);
            }

            this._buildAssignedTripLocks(trips);
            this._renderList();
        } catch (error) {
            container.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load assignments</h3>
                    <p>${error.message || 'Please try again later'}</p>
                </div>
            `;
        }
    }

    _normalizeVehicleRegistration(value) {
        return String(value || '').trim().toLowerCase();
    }

    _normalizeTripStatus(value) {
        return String(value || '').trim().toLowerCase();
    }

    _isAssignedTripStatus(status) {
        return status === 'assigned' || status === 'pending' || status === 'accepted' || status === 'in progress';
    }

    _buildAssignedTripLocks(trips) {
        const locks = new Set();
        const entries = Array.isArray(trips) ? trips : [];

        entries.forEach((trip) => {
            const status = this._normalizeTripStatus(trip?.status);
            if (!this._isAssignedTripStatus(status)) {
                return;
            }

            const driverId = Number(trip?.driver_id || trip?.driver_user_id || trip?.assigned_driver_id || 0);
            const vehicleRegistration = this._normalizeVehicleRegistration(
                trip?.vehicle_registration || trip?.number_plate
            );

            if (driverId <= 0 || vehicleRegistration === '') {
                return;
            }

            locks.add(`${driverId}:${vehicleRegistration}`);
        });

        this._assignedTripLocks = locks;
    }

    _hasAssignedTripLock(vehicle) {
        if (!vehicle || !vehicle.assigned_driver_id) {
            return false;
        }

        const driverId = Number(vehicle.assigned_driver_id || 0);
        const vehicleRegistration = this._normalizeVehicleRegistration(vehicle.number_plate);
        if (driverId <= 0 || vehicleRegistration === '') {
            return false;
        }

        return this._assignedTripLocks.has(`${driverId}:${vehicleRegistration}`);
    }

    _getFiltered() {
        let vehicles = this._vehicles;

        // Apply assignment filter
        if (this._filter === 'assigned') {
            vehicles = vehicles.filter(v => v.assigned_driver_id);
        } else if (this._filter === 'unassigned') {
            vehicles = vehicles.filter(v => !v.assigned_driver_id);
        }

        // Apply search filter
        if (this._searchQuery) {
            vehicles = vehicles.filter(v => {
                const searchText = `${v.number_plate || ''} ${v.vehicle_name || ''} ${v.driver_name || ''} ${v.driver_employee_id || ''}`.toLowerCase();
                return searchText.includes(this._searchQuery);
            });
        }

        return vehicles;
    }

    _renderList() {
        const container = this.querySelector('#assignmentContainer');
        const countEl = this.querySelector('#assignmentCount');
        const vehicles = this._getFiltered();

        if (countEl) {
            const assignedCount = vehicles.filter(v => v.assigned_driver_id).length;
            countEl.textContent = `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''} (${assignedCount} assigned)`;
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
            const hasDriver = !!vehicle.assigned_driver_id;
            const hasAssignedTripLock = hasDriver && this._hasAssignedTripLock(vehicle);
            const statusClass = hasDriver ? 'completed' : 'pending';
            const numberPlate = vehicle.number_plate || '—';
            const vehicleName = vehicle.vehicle_name || '—';

            const driverInfo = hasDriver
                ? `<div class="driver-assigned">
                       <i class="fas fa-user-check"></i>
                       <span class="driver-name">${vehicle.driver_name || 'Unknown'}</span>
                       <span class="driver-id">(${vehicle.driver_employee_id || 'N/A'})</span>
                   </div>`
                : `<div class="driver-unassigned">
                       <i class="fas fa-user-slash"></i>
                       <span>No driver assigned</span>
                   </div>`;

            const actionButton = hasDriver
                ? (hasAssignedTripLock
                    ? `<span class="status-text status-assigned" data-driver-trip-lock-message="true">
                           <i class="fas fa-lock"></i> Driver already has a trip assigned
                       </span>`
                    : `<button class="btn btn-secondary btn-small" data-action="change" data-vehicle-id="${vehicle.id}" data-number-plate="${numberPlate}">
                           <i class="fas fa-exchange-alt"></i> Change
                       </button>
                       <button class="btn btn-danger btn-small" data-action="unassign" data-vehicle-id="${vehicle.id}" data-number-plate="${numberPlate}">
                           <i class="fas fa-user-minus"></i> Unassign
                       </button>`)
                : `<button class="btn btn-primary btn-small" data-action="assign" data-vehicle-id="${vehicle.id}" data-number-plate="${numberPlate}">
                       <i class="fas fa-user-plus"></i> Assign Driver
                   </button>`;

            return `
                <div class="inventory-item ${statusClass}" data-id="${vehicle.id}" ${hasAssignedTripLock ? 'data-driver-assignment-locked="true"' : ''}>
                    <div class="item-details">
                        <strong><i class="fas fa-truck"></i> ${numberPlate}</strong>
                        <div class="item-meta">
                            <i class="fas fa-car"></i> ${vehicleName}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-tag"></i> ${vehicle.vehicle_type || '—'}
                        </div>
                        <div class="item-description">
                            ${driverInfo}
                        </div>
                        ${hasAssignedTripLock ? `<div class="item-meta"><span class="status-text status-assigned" data-driver-trip-lock-badge="true"><i class="fas fa-lock"></i> Trip assigned to this driver</span></div>` : ''}
                    </div>
                    <div class="item-actions">
                        ${actionButton}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = items;
    }
}

customElements.define('tm-driver-assignment', TMDriverAssignment);
