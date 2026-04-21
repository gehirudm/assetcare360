class TMViewTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) return;
        this._mounted = true;
        this._tripData = null;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="viewTripModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-route"></i> Trip Details</h2>
                        <button class="btn-close" type="button" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="viewTripContent">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Loading trip details...</span>
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
            
            if (event.target.id === 'viewTripModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
            }
        });
    }

    async open(tripId) {
        const modal = this.querySelector('#viewTripModal');
        const content = this.querySelector('#viewTripContent');
        
        if (!modal) return;
        
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        content.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading trip details...</span>
            </div>
        `;

        try {
            const res = await API.get(`/trips/${tripId}`);
            this._tripData = res.data?.trip || res.data;
            this._renderDetails();
        } catch (error) {
            content.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load trip details</h3>
                    <p>${error.message || 'Please try again later'}</p>
                </div>
            `;
        }
    }

    _renderDetails() {
        const content = this.querySelector('#viewTripContent');
        const trip = this._tripData;

        if (!trip) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-route"></i>
                    <h3>No trip data available</h3>
                </div>
            `;
            return;
        }

        const statusInfo = TMUtils.getStatusInfo(trip.status);
        const driverName = trip.driver_name || (trip.driver_id ? `Driver #${trip.driver_id}` : '—');
        const distance = TMUtils.formatDistance(trip.starting_odometer, trip.final_odometer);
        const cargoItems = Array.isArray(trip.cargo_items) ? trip.cargo_items : [];
        const cargoSummary = TMUtils.buildCargoSummary(trip);
        const hasDangerousCargo = TMUtils.hasDangerousCargo(trip);
        const totalCargoQuantity = TMUtils.formatQuantity(trip.total_cargo_quantity || 0);
        const dangerousCargoQuantity = TMUtils.formatQuantity(trip.dangerous_cargo_quantity || 0);

        const cargoItemsSection = cargoItems.length
            ? `
                <div class="detail-grid" style="margin-top: 10px;">
                    ${cargoItems.map((item) => {
                        const name = TMUtils.escapeHtml(item.name || item.cargo_item_id || 'Cargo Item');
                        const quantity = TMUtils.formatQuantity(item.quantity || 0);
                        const unit = TMUtils.escapeHtml(TMUtils.formatCargoUnit(item.unit || 'units'));
                        const capacity = TMUtils.escapeHtml(TMUtils.formatCargoCapacity(item.capacity));
                        const notes = item.notes ? `<div class="detail-item"><span class="detail-label">Notes</span><span class="detail-value">${TMUtils.escapeHtml(item.notes)}</span></div>` : '';
                        const isDangerous = Number(item.is_dangerous) === 1;

                        return `
                            <div class="detail-item" style="border: 1px solid var(--stone-200); border-radius: 8px; padding: 10px; background: #fff;">
                                <span class="detail-label">${name}</span>
                                <span class="detail-value">${quantity} ${unit}</span>
                                <div class="detail-item" style="padding: 0; margin-top: 6px; border: none;">
                                    <span class="detail-label">Capacity (weight kg)</span>
                                    <span class="detail-value">${capacity}</span>
                                </div>
                                ${isDangerous ? '<span class="status-badge badge-danger" style="margin-top: 8px; width: fit-content;"><i class="fas fa-radiation"></i> Dangerous</span>' : ''}
                                ${notes}
                            </div>
                        `;
                    }).join('')}
                </div>
            `
            : '';

        content.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <span class="id-badge" style="font-size: 1.2rem;">${TMUtils.escapeHtml(trip.trip_id || 'N/A')}</span>
                    <span class="status-badge ${statusInfo.badge}">${TMUtils.escapeHtml(statusInfo.label)}</span>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-map-marker-alt"></i> Route Information</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Origin</span>
                            <span class="detail-value">${TMUtils.escapeHtml(trip.origin || '—')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Destination</span>
                            <span class="detail-value">${TMUtils.escapeHtml(trip.destination || '—')}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-truck"></i> Assignment Details</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Vehicle</span>
                            <span class="detail-value">${TMUtils.escapeHtml(trip.vehicle_registration || '—')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Driver</span>
                            <span class="detail-value">${TMUtils.escapeHtml(driverName)}</span>
                        </div>
                        ${trip.assistant_driver_name ? `
                        <div class="detail-item">
                            <span class="detail-label">Assistant Driver</span>
                            <span class="detail-value">${TMUtils.escapeHtml(trip.assistant_driver_name)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${trip.status === 'Rejected' && trip.rejection_reason ? `
                <div class="form-section" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px;">
                    <h5 style="color: #dc2626;"><i class="fas fa-times-circle"></i> Rejection Information</h5>
                    <p class="detail-text" style="color: #dc2626;">${TMUtils.escapeHtml(trip.rejection_reason)}</p>
                </div>
                ` : ''}

                <div class="form-section">
                    <h5><i class="fas fa-tachometer-alt"></i> Odometer & Distance</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Starting Odometer</span>
                            <span class="detail-value">${TMUtils.formatOdometer(trip.starting_odometer)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Final Odometer</span>
                            <span class="detail-value">${TMUtils.formatOdometer(trip.final_odometer)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Total Distance</span>
                            <span class="detail-value" style="font-weight: 700; color: var(--tang-blue);">${distance}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-clock"></i> Timeline</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Start Time</span>
                            <span class="detail-value">${TMUtils.formatDateTime(trip.start_time)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">End Time</span>
                            <span class="detail-value">${TMUtils.formatDateTime(trip.end_time)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Created At</span>
                            <span class="detail-value">${TMUtils.formatDateTime(trip.created_at)}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-boxes-stacked"></i> Cargo Information</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Cargo Summary</span>
                            <span class="detail-value">${TMUtils.escapeHtml(cargoSummary || 'No cargo summary provided')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Total Quantity</span>
                            <span class="detail-value">${totalCargoQuantity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Dangerous Quantity</span>
                            <span class="detail-value">${dangerousCargoQuantity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Dangerous Cargo</span>
                            <span class="detail-value">${hasDangerousCargo ? '<span class="status-badge badge-danger"><i class="fas fa-radiation"></i> Yes</span>' : '<span class="status-badge badge-ok">No</span>'}</span>
                        </div>
                    </div>
                    ${cargoItemsSection}
                </div>

                ${trip.completion_notes ? `
                <div class="form-section">
                    <h5><i class="fas fa-sticky-note"></i> Completion Notes</h5>
                    <p class="detail-text">${TMUtils.escapeHtml(trip.completion_notes)}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    close() {
        const modal = this.querySelector('#viewTripModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
        this._tripData = null;
    }
}

customElements.define('tm-view-trip-modal', TMViewTripModal);
