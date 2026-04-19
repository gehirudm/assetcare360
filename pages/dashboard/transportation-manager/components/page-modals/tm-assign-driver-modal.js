/**
 * TM Assign Driver Modal
 * Modal to select and assign a driver to a vehicle
 */
class TMAssignDriverModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._vehicle = null;
        this._selectedDriverId = null;
        this._drivers = [];
        this._vehiclesWithDrivers = [];
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="assignDriverModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-user-plus"></i> Assign Driver to Vehicle</h2>
                        <button class="btn-close" type="button" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="assignDriverForm">
                        <div id="assignDriverErrors" class="form-errors" style="display: none;"></div>

                        <div class="form-section">
                            <h5><i class="fas fa-truck"></i> Vehicle Information</h5>
                            <div id="vehicleInfo" class="vehicle-info-card">
                                <p>Loading vehicle...</p>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-user"></i> Select Driver</h5>
                            <small class="assignment-hint">
                                Drivers are sorted by lowest current workload. 
                                If a driver is already assigned to another vehicle, they will be unassigned from it.
                            </small>
                            <div id="driversListAssign" class="checkbox-list"></div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary" id="assignDriverSubmit">
                                <i class="fas fa-check"></i> Assign Driver
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="close">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            
            if (event.target.id === 'assignDriverModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
            }
        });

        const form = this.querySelector('#assignDriverForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submit();
            });
        }

        // Handle radio button changes for driver selection
        this.addEventListener('change', (event) => {
            if (event.target.matches('input[name="assign_driver"]')) {
                this._selectedDriverId = event.target.value;
            }
        });
    }

    async open(vehicle) {
        this._vehicle = vehicle;
        this._selectedDriverId = null;
        
        const modal = this.querySelector('#assignDriverModal');
        const form = this.querySelector('#assignDriverForm');
        
        if (form) form.reset();
        this._hideErrors();
        
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }

        this._renderVehicleInfo();
        await this._loadDrivers();
    }

    close() {
        const modal = this.querySelector('#assignDriverModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
        this._vehicle = null;
        this._selectedDriverId = null;
    }

    _renderVehicleInfo() {
        const vehicleInfoEl = this.querySelector('#vehicleInfo');
        if (!vehicleInfoEl || !this._vehicle) return;

        const v = this._vehicle;
        const currentDriver = v.driver_name 
            ? `<div class="current-driver">
                   <i class="fas fa-user"></i> Currently assigned: <strong>${v.driver_name}</strong> (${v.driver_employee_id || 'N/A'})
               </div>`
            : '<div class="no-driver"><i class="fas fa-user-slash"></i> No driver currently assigned</div>';

        vehicleInfoEl.innerHTML = `
            <div class="vehicle-card">
                <div class="vehicle-header">
                    <i class="fas fa-truck"></i>
                    <span class="vehicle-plate">${v.number_plate || '—'}</span>
                </div>
                <div class="vehicle-details">
                    <div><i class="fas fa-car"></i> ${v.vehicle_name || '—'}</div>
                    <div><i class="fas fa-tag"></i> ${v.vehicle_type || '—'}</div>
                </div>
                ${currentDriver}
            </div>
        `;
    }

    async _loadDrivers() {
        const driversList = this.querySelector('#driversListAssign');
        if (!driversList) return;

        driversList.innerHTML = `
            <div class="loading-state" style="padding: 20px; text-align: center;">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading drivers...</span>
            </div>
        `;
        
        try {
            // Load drivers and current vehicle assignments in parallel
            const [driversRes, vehiclesRes] = await Promise.all([
                API.get('/drivers'),
                API.get('/vehicles/with-drivers')
            ]);
            
            this._drivers = (driversRes.data?.users || driversRes.data || [])
                .map(driver => ({
                    ...driver,
                    active_trip_count: Number(driver.active_trip_count || 0)
                }))
                .sort((a, b) => {
                    if (a.active_trip_count !== b.active_trip_count) {
                        return a.active_trip_count - b.active_trip_count;
                    }
                    return (a.full_name || '').localeCompare(b.full_name || '');
                });
                
            this._vehiclesWithDrivers = vehiclesRes.data?.vehicles || [];

            if (this._drivers.length === 0) {
                driversList.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--muted);">
                        <i class="fas fa-user-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <p>No active drivers available in the system.</p>
                        <p style="font-size: 0.9em;">Contact system administrator to add drivers.</p>
                    </div>
                `;
                return;
            }

            this._renderDriversList();
        } catch (error) {
            driversList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--danger);">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load drivers: ${error.message || 'Unknown error'}</p>
                </div>
            `;
        }
    }

    _renderDriversList() {
        const driversList = this.querySelector('#driversListAssign');
        if (!driversList) return;

        // Build a map of which drivers are assigned to which vehicles
        const driverAssignments = {};
        for (const v of this._vehiclesWithDrivers) {
            if (v.assigned_driver_id && v.id !== this._vehicle?.id) {
                driverAssignments[v.assigned_driver_id] = {
                    vehicle_name: v.vehicle_name,
                    number_plate: v.number_plate
                };
            }
        }

        driversList.innerHTML = this._drivers.map(driver => {
            const activeTrips = Number(driver.active_trip_count || 0);
            const name = driver.full_name || driver.username || `Driver #${driver.id}`;
            
            // Check if this driver is the current assigned driver for this vehicle
            const isCurrentDriver = this._vehicle?.assigned_driver_id == driver.id;
            
            // Check if driver is assigned to another vehicle
            const otherAssignment = driverAssignments[driver.id];
            const hasActiveTrips = activeTrips > 0;
            const isAssignedElsewhere = Boolean(otherAssignment);

            let workloadClass = 'available';
            let workloadText = 'Available';

            if (hasActiveTrips) {
                workloadClass = activeTrips <= 2 ? 'busy' : 'heavy';
                workloadText = `${activeTrips} active trip${activeTrips === 1 ? '' : 's'}`;
            }

            if (isAssignedElsewhere) {
                const assignedVehicleLabel = otherAssignment.number_plate || otherAssignment.vehicle_name || 'another vehicle';
                workloadClass = hasActiveTrips && activeTrips > 2 ? 'heavy' : 'busy';
                workloadText = hasActiveTrips
                    ? `${activeTrips} active trip${activeTrips === 1 ? '' : 's'} + assigned`
                    : `Assigned to ${assignedVehicleLabel}`;
            }

            const currentBadge = isCurrentDriver 
                ? '<span class="current-assignment-badge"><i class="fas fa-check"></i> Current</span>'
                : '';

            return `
                <label class="checkbox-item ${isCurrentDriver ? 'current-driver-item' : ''}">
                    <input type="radio" name="assign_driver" value="${driver.id}" 
                           ${isCurrentDriver ? 'checked' : ''}>
                    <span class="technician-details">
                        <span class="technician-name">${name} ${currentBadge}</span>
                        <span class="technician-expertise"><i class="fas fa-id-badge"></i> ${driver.employee_id || 'N/A'}</span>
                    </span>
                    <span class="technician-workload ${workloadClass}">${workloadText}</span>
                </label>
            `;
        }).join('');
    }

    async submit() {
        if (!this._selectedDriverId) {
            this._showErrors(['Please select a driver']);
            return;
        }

        if (!this._vehicle) {
            this._showErrors(['No vehicle selected']);
            return;
        }

        const submitBtn = this.querySelector('#assignDriverSubmit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';
        }

        try {
            const res = await API.post(`/vehicles/${this._vehicle.id}/assign-driver`, {
                driver_id: parseInt(this._selectedDriverId)
            });

            this.dispatchEvent(new CustomEvent('tm-driver-assignment:assigned', {
                detail: { 
                    vehicle: res.data?.vehicle,
                    previousVehicle: res.data?.previous_vehicle
                },
                bubbles: true
            }));

            this.close();
        } catch (error) {
            this._showErrors([error.message || 'Failed to assign driver']);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Assign Driver';
            }
        }
    }

    _showErrors(errors) {
        const errorsEl = this.querySelector('#assignDriverErrors');
        if (errorsEl) {
            errorsEl.innerHTML = errors.map(e => `<div class="form-error">${e}</div>`).join('');
            errorsEl.style.display = 'block';
        }
    }

    _hideErrors() {
        const errorsEl = this.querySelector('#assignDriverErrors');
        if (errorsEl) {
            errorsEl.style.display = 'none';
            errorsEl.innerHTML = '';
        }
    }
}

customElements.define('tm-assign-driver-modal', TMAssignDriverModal);
