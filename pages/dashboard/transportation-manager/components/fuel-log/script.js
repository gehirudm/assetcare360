class TMFuelLog extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._allLogs = [];
        this._searchQuery = '';
        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    loadStyles() {
        const linkId = 'tm-fuel-log-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/fuel-log/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-gas-pump"></i> Fuel Log</h2>
                <p class="page-subtitle">Track fuel consumption and costs for all vehicles</p>
            </div>

            <div class="search-bar">
                <input type="text" id="fuelSearch" class="search-input" placeholder="Search by vehicle, driver, or fuel station...">
                <button class="btn btn-primary" data-action="add-fuel">
                    <i class="fas fa-plus"></i> Add Entry
                </button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-gas-pump"></i> Fuel Entries</span>
                    <span id="fuelCount" class="status-text status-normal">0 entries</span>
                </div>
                <div id="fuelLogContainer" style="padding: 15px;">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading fuel log...</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');

            if (actionEl) {
                const action = actionEl.dataset.action;
                const logId = actionEl.dataset.logId;

                if (action === 'add-fuel') {
                    this.dispatchEvent(new CustomEvent('tm-fuel-log:add', { bubbles: true }));
                } else if (action === 'view' && logId) {
                    this.dispatchEvent(new CustomEvent('tm-fuel-log:view', { 
                        detail: { logId }, bubbles: true 
                    }));
                }
            }
        });

        // Search input
        const searchInput = this.querySelector('#fuelSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this._searchQuery = e.target.value.toLowerCase();
                this._renderList();
            });
        }
    }

    async refresh() {
        const container = this.querySelector('#fuelLogContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading fuel log...</span>
            </div>
        `;

        try {
            const res = await API.get('/fuel-logs');
            this._allLogs = res.data?.fuel_logs || [];
            this._renderList();
        } catch (error) {
            container.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load fuel log</h3>
                    <p>${error.message || 'Please try again later'}</p>
                </div>
            `;
        }
    }

    _getFiltered() {
        if (!this._searchQuery) return this._allLogs;

        return this._allLogs.filter(log => {
            const searchText = `${log.vehicle_registration || ''} ${log.driver_name || ''} ${log.station_name || ''} ${log.fuel_type || ''}`.toLowerCase();
            return searchText.includes(this._searchQuery);
        });
    }

    _renderList() {
        const container = this.querySelector('#fuelLogContainer');
        const countEl = this.querySelector('#fuelCount');
        const logs = this._getFiltered();

        if (countEl) {
            countEl.textContent = `${logs.length} entr${logs.length !== 1 ? 'ies' : 'y'}`;
        }

        if (!logs.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gas-pump"></i>
                    <h3>No fuel entries yet</h3>
                    <p>Start tracking fuel consumption by adding your first entry</p>
                    <button class="btn btn-primary" data-action="add-fuel">
                        <i class="fas fa-plus"></i> Add Entry
                    </button>
                </div>
            `;
            return;
        }

        const items = logs.map(log => {
            const driverName = log.driver_name || (log.driver_id ? `Driver #${log.driver_id}` : '—');

            return `
                <div class="inventory-item" data-id="${log.fuel_log_id}">
                    <div class="item-details">
                        <strong><i class="fas fa-gas-pump"></i> ${log.fuel_log_id}</strong>
                        <div class="item-meta">
                            <i class="fas fa-truck"></i> ${log.vehicle_registration || '—'} |
                            <i class="fas fa-user"></i> ${driverName}
                        </div>
                        <div class="item-meta">
                            <i class="fas fa-calendar"></i> ${TMUtils.formatDateTime(log.log_datetime)} |
                            <i class="fas fa-map-marker-alt"></i> ${log.station_name || '—'}
                        </div>
                        <div class="item-description">
                            <span class="status-badge badge-blue"><i class="fas fa-fire"></i> ${log.fuel_type || 'N/A'}</span>
                            <span class="status-text status-normal" style="margin-left: 10px;">
                                <i class="fas fa-tachometer-alt"></i> ${TMUtils.formatOdometer(log.odometer_reading)}
                            </span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-small" data-action="view" data-log-id="${log.fuel_log_id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = items;
    }
}

customElements.define('tm-fuel-log', TMFuelLog);
