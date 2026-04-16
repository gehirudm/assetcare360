class TMViewVehicleModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) return;
        this._mounted = true;
        this._vehicleData = null;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="viewVehicleModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-truck"></i> Vehicle Details</h2>
                        <button class="btn-close" type="button" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="viewVehicleContent">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Loading vehicle details...</span>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" data-action="close">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            
            if (event.target.id === 'viewVehicleModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
            }
        });
    }

    async open(vehicleId) {
        const modal = this.querySelector('#viewVehicleModal');
        const content = this.querySelector('#viewVehicleContent');
        
        if (!modal) return;
        
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        content.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading vehicle details...</span>
            </div>
        `;

        try {
            const res = await API.get(`/vehicles/${vehicleId}`);
            this._vehicleData = res.data?.vehicle || res.data;
            this._renderDetails();
        } catch (error) {
            content.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load vehicle details</h3>
                    <p>${error.message || 'Please try again later'}</p>
                </div>
            `;
        }
    }

    _renderDetails() {
        const content = this.querySelector('#viewVehicleContent');
        const vehicle = this._vehicleData;

        if (!vehicle) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-truck"></i>
                    <h3>No vehicle data available</h3>
                </div>
            `;
            return;
        }

        const statusInfo = TMUtils.getStatusInfo(vehicle.status);
        const numberPlate = vehicle.number_plate || vehicle.vehicle_registration || '—';

        content.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <span class="id-badge" style="font-size: 1.2rem;">${numberPlate}</span>
                    <span class="status-badge ${statusInfo.badge}">${statusInfo.label}</span>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-car"></i> Vehicle Information</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Vehicle Name</span>
                            <span class="detail-value">${vehicle.vehicle_name || vehicle.make || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Vehicle Type</span>
                            <span class="detail-value">${vehicle.vehicle_type || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Number Plate</span>
                            <span class="detail-value" style="font-weight: 700;">${numberPlate}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Model</span>
                            <span class="detail-value">${vehicle.model || '—'}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-tachometer-alt"></i> Mileage & Performance</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Current Mileage</span>
                            <span class="detail-value" style="font-size: 1.3rem; font-weight: 700; color: var(--tang-blue);">${TMUtils.formatOdometer(vehicle.current_mileage)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Fuel Capacity</span>
                            <span class="detail-value">${vehicle.fuel_capacity ? vehicle.fuel_capacity + ' L' : '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Average Fuel Efficiency</span>
                            <span class="detail-value">${vehicle.avg_fuel_efficiency ? vehicle.avg_fuel_efficiency + ' km/L' : '—'}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-cog"></i> Technical Details</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Engine Number</span>
                            <span class="detail-value">${vehicle.engine_number || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Chassis Number</span>
                            <span class="detail-value">${vehicle.chassis_number || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Year of Manufacture</span>
                            <span class="detail-value">${vehicle.year || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Color</span>
                            <span class="detail-value">${vehicle.color || '—'}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-file-alt"></i> Registration & Insurance</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Registration Date</span>
                            <span class="detail-value">${vehicle.registration_date ? TMUtils.formatDate(vehicle.registration_date) : '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Insurance Expiry</span>
                            <span class="detail-value">${vehicle.insurance_expiry ? TMUtils.formatDate(vehicle.insurance_expiry) : '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Last Service Date</span>
                            <span class="detail-value">${vehicle.last_service_date ? TMUtils.formatDate(vehicle.last_service_date) : '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Next Service Due</span>
                            <span class="detail-value">${vehicle.next_service_due ? TMUtils.formatDate(vehicle.next_service_due) : '—'}</span>
                        </div>
                    </div>
                </div>

                ${vehicle.notes || vehicle.description ? `
                <div class="form-section">
                    <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                    <p class="detail-text">${vehicle.notes || vehicle.description}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    close() {
        const modal = this.querySelector('#viewVehicleModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
        this._vehicleData = null;
    }
}

customElements.define('tm-view-vehicle-modal', TMViewVehicleModal);
