class DriverFuelMileage extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        this.loadLogs();

        DriverUtils.on('driver:data-fuel-changed', () => this.loadLogs());
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-gas-pump"></i> Fuel & Mileage</h2>
                <p class="page-subtitle">Track fuel consumption and vehicle efficiency</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-fuel-modal">Log Fuel & Mileage</button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-gas-pump"></i> Recent Fuel Logs</div>
                <div id="fuelLogsList">
                    <div class="loading-state" style="padding: 20px; text-align: center;">
                        <i class="fas fa-spinner fa-spin"></i> Loading fuel logs...
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            if (actionEl.dataset.action === 'open-fuel-modal') {
                DriverUtils.openModal('fuelMileageModal');
            }
        });
    }

    async loadLogs() {
        const list = this.querySelector('#fuelLogsList');
        if (!list) return;

        list.innerHTML = `<div class="loading-state" style="padding: 20px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>`;

        try {
            // Filter by current driver's ID so only their logs are shown
            const driverId = DriverUtils.store.currentUser?.id;
            const query = driverId ? `?driver_id=${driverId}` : '';
            const response = await DriverUtils.apiGet(`/fuel-logs${query}`);
            const logs = response?.data?.fuel_logs || response?.data || [];

            if (!logs.length) {
                list.innerHTML = `
                    <div class="empty-state" style="padding: 30px; text-align: center; color: #888;">
                        <i class="fas fa-gas-pump" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>No fuel logs found. Add your first entry!</p>
                    </div>`;
                return;
            }

            list.innerHTML = logs.map(log => {
                const date = log.log_datetime ? DriverUtils.formatDateTime(log.log_datetime) : '—';
                const station = log.station_name ? `<i class="fas fa-map-marker-alt"></i> ${log.station_name}` : '';
                const efficiency = log.fuel_efficiency ? ` | Efficiency: ${log.fuel_efficiency} km/L` : '';
                const source = (log.fuel_source || 'external').toLowerCase() === 'internal' ? 'Internal' : 'External';
                const totalCostText = log.total_cost !== null && log.total_cost !== undefined && log.total_cost !== ''
                    ? `Rs ${parseFloat(log.total_cost).toLocaleString()}`
                    : 'N/A (Internal)';
                return `
                    <div class="inventory-item">
                        <div class="item-details">
                            <strong><i class="fas fa-gas-pump"></i> ${log.fuel_log_id}</strong>
                            <div class="item-meta"><i class="fas fa-calendar"></i> ${date}${station ? ' | ' + station : ''}</div>
                            <div class="item-description">
                                <i class="fas fa-industry"></i> ${source} |
                                <i class="fas fa-fill-drip"></i> ${parseFloat(log.fuel_volume).toFixed(1)} L |
                                <i class="fas fa-money-bill-wave"></i> ${totalCostText} |
                                <i class="fas fa-tachometer-alt"></i> ${parseInt(log.odometer_reading).toLocaleString()} km${efficiency}
                            </div>
                        </div>
                    </div>`;
            }).join('');
        } catch (error) {
            console.error('Failed to load fuel logs:', error);
            list.innerHTML = `
                <div class="empty-state" style="padding: 30px; text-align: center; color: #888;">
                    <i class="fas fa-exclamation-circle"></i> Failed to load fuel logs.
                </div>`;
        }
    }

    refresh() {
        this.loadLogs();
    }
}

customElements.define('driver-fuel-mileage', DriverFuelMileage);
