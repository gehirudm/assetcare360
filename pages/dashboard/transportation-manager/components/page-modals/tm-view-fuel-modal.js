class TMViewFuelModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) return;
        this._mounted = true;
        this._logData = null;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="viewFuelModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-gas-pump"></i> Fuel Entry Details</h2>
                        <button class="btn-close" type="button" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="viewFuelContent">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Loading fuel entry details...</span>
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
            
            if (event.target.id === 'viewFuelModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'open-bill') {
                const imageUrl = actionEl.dataset.imageUrl;
                if (imageUrl) {
                    window.open(imageUrl, '_blank', 'noopener');
                }
            }
        });
    }

    async open(logId) {
        const modal = this.querySelector('#viewFuelModal');
        const content = this.querySelector('#viewFuelContent');
        
        if (!modal) return;
        
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        content.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading fuel entry details...</span>
            </div>
        `;

        try {
            const res = await API.get(`/fuel-logs/${logId}`);
            this._logData = res.data?.fuel_log || res.data;
            this._renderDetails();
        } catch (error) {
            content.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load fuel entry details</h3>
                    <p>${error.message || 'Please try again later'}</p>
                </div>
            `;
        }
    }

    _renderDetails() {
        const content = this.querySelector('#viewFuelContent');
        const log = this._logData;

        if (!log) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gas-pump"></i>
                    <h3>No fuel entry data available</h3>
                </div>
            `;
            return;
        }

        const driverName = log.driver_name || (log.driver_id ? `Driver #${log.driver_id}` : '—');
        const fuelSource = (log.fuel_source || 'external').toLowerCase();
        const sourceLabel = fuelSource === 'internal' ? 'Internal Depot' : 'External Station';
        const costPerL = log.total_cost && parseFloat(log.fuel_volume) > 0
            ? (parseFloat(log.total_cost) / parseFloat(log.fuel_volume)).toFixed(2)
            : '—';
        const billImageUrl = this.resolveImageUrl(log.bill_image);

        content.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <span class="id-badge" style="font-size: 1.2rem;">${log.fuel_log_id}</span>
                    <span class="status-badge badge-blue"><i class="fas fa-fire"></i> ${log.fuel_type || 'N/A'}</span>
                    <span class="status-badge ${fuelSource === 'internal' ? 'badge-ok' : 'badge-warn'}" style="margin-left: 8px;">${sourceLabel}</span>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-truck"></i> Vehicle & Driver</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Vehicle Registration</span>
                            <span class="detail-value">${log.vehicle_registration || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Driver</span>
                            <span class="detail-value">${driverName}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-gas-pump"></i> Fuel Information</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Fuel Type</span>
                            <span class="detail-value">${log.fuel_type || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Volume</span>
                            <span class="detail-value" style="font-weight: 700;">${TMUtils.formatVolume(log.fuel_volume)}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-money-bill-wave"></i> Cost Details</h5>
                    ${fuelSource === 'external' ? `
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Total Cost</span>
                            <span class="detail-value" style="font-size: 1.3rem; font-weight: 700; color: var(--tang-blue);">${TMUtils.formatCurrency(log.total_cost)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Cost per Litre</span>
                            <span class="detail-value">Rs ${costPerL}</span>
                        </div>
                    </div>
                    ` : `
                    <p class="detail-text" style="margin: 0;">This entry was recorded as internal fueling. Cost and receipt are not required.</p>
                    `}
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-tachometer-alt"></i> Odometer & Efficiency</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Odometer Reading</span>
                            <span class="detail-value">${TMUtils.formatOdometer(log.odometer_reading)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Distance Since Last Fill</span>
                            <span class="detail-value">${log.distance_since_last ? log.distance_since_last + ' km' : '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Fuel Efficiency</span>
                            <span class="detail-value">${log.fuel_efficiency ? log.fuel_efficiency + ' km/L' : '—'}</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-map-marker-alt"></i> Station & Time</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Station Name</span>
                            <span class="detail-value">${log.station_name || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Date & Time</span>
                            <span class="detail-value">${TMUtils.formatDateTime(log.log_datetime)}</span>
                        </div>
                    </div>
                </div>

                ${log.notes ? `
                <div class="form-section">
                    <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                    <p class="detail-text">${log.notes}</p>
                </div>
                ` : ''}

                ${billImageUrl ? `
                <div class="form-section">
                    <h5><i class="fas fa-receipt"></i> Bill/Receipt</h5>
                    <div style="text-align: center;">
                        <button type="button" class="btn btn-secondary btn-small" data-action="open-bill" data-image-url="${billImageUrl}" style="margin-bottom: 10px;">
                            <i class="fas fa-up-right-from-square"></i> Open Full Image
                        </button>
                        <img src="${billImageUrl}" alt="Fuel Bill" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                        <p style="margin-top: 8px; color: #666; font-size: 0.85rem;">Use the button above to open the full-size image.</p>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    resolveImageUrl(imagePath) {
        if (!imagePath || typeof imagePath !== 'string') {
            return null;
        }

        if (/^https?:\/\//i.test(imagePath)) {
            return imagePath;
        }

        const normalizedPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        const apiBaseUrl = String(CONFIG?.API_BASE_URL || '').replace(/\/+$/, '');
        if (!apiBaseUrl) {
            return `/${normalizedPath}`;
        }

        return `${apiBaseUrl}/${normalizedPath}`;
    }

    close() {
        const modal = this.querySelector('#viewFuelModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
        this._logData = null;
    }
}

customElements.define('tm-view-fuel-modal', TMViewFuelModal);
