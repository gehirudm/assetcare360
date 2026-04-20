class TMDashboardOverview extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._stats = { active: 0, pending: 0, total: 0, fuelEntries: 0 };
        this.loadStyles();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    loadStyles() {
        const linkId = 'tm-dashboard-overview-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/dashboard-overview/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-chart-line"></i> Dashboard Overview</h2>
                <p class="page-subtitle">Welcome! Here's your transportation operations summary</p>
            </div>

            <div class="grid">
                <div class="summary-card clickable" data-action="navigate" data-section="trips">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-play-circle"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Active Trips</div>
                            <div class="summary-number" data-stat="active">0</div>
                            <div class="summary-description">trips in progress</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="trips">
                    <div class="summary-card-content">
                        <div class="summary-icon pending">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Pending Trips</div>
                            <div class="summary-number" data-stat="pending">0</div>
                            <div class="summary-description">awaiting departure</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="trips">
                    <div class="summary-card-content">
                        <div class="summary-icon total">
                            <i class="fas fa-route"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Total Trips</div>
                            <div class="summary-number" data-stat="total">0</div>
                            <div class="summary-description">all-time trips</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="fuel-log">
                    <div class="summary-card-content">
                        <div class="summary-icon fuel">
                            <i class="fas fa-gas-pump"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Fuel Entries</div>
                            <div class="summary-number" data-stat="fuelEntries">0</div>
                            <div class="summary-description">fuel log records</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div class="quick-actions-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-bolt"></i> Quick Actions
                    </h3>
                </div>
                <div class="quick-actions-grid">
                    <button class="quick-action-btn primary" data-action="assign-trip">
                        <i class="fas fa-plus-circle"></i>
                        <span>Assign Trip</span>
                    </button>
                    <button class="quick-action-btn" data-action="add-fuel">
                        <i class="fas fa-gas-pump"></i>
                        <span>Log Fuel</span>
                    </button>
                    <button class="quick-action-btn" data-action="navigate" data-section="trips">
                        <i class="fas fa-route"></i>
                        <span>View Trips</span>
                    </button>
                    <button class="quick-action-btn" data-action="navigate" data-section="fleet">
                        <i class="fas fa-truck"></i>
                        <span>Fleet Overview</span>
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.action;

            if (action === 'navigate') {
                const section = actionEl.dataset.section;
                if (section) {
                    this.dispatchEvent(new CustomEvent('tm-overview:navigate', {
                        detail: { section },
                        bubbles: true,
                    }));
                }
            } else if (action === 'assign-trip') {
                this.dispatchEvent(new CustomEvent('tm-overview:assign-trip', { bubbles: true }));
            } else if (action === 'add-fuel') {
                this.dispatchEvent(new CustomEvent('tm-overview:add-fuel', { bubbles: true }));
            }
        });
    }

    async refresh() {
        try {
            const [tripsRes, fuelRes] = await Promise.all([
                API.get('/trips'),
                API.get('/fuel-logs'),
            ]);

            const trips = tripsRes.data?.trips || [];
            const fuels = fuelRes.data?.fuel_logs || [];

            this._stats = {
                active: trips.filter(t => t.status === 'In Progress').length,
                pending: trips.filter(t => t.status === 'Pending').length,
                total: trips.length,
                fuelEntries: fuels.length,
            };

            this._updateStats();
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }

    _updateStats() {
        const statElements = {
            active: this.querySelector('[data-stat="active"]'),
            pending: this.querySelector('[data-stat="pending"]'),
            total: this.querySelector('[data-stat="total"]'),
            fuelEntries: this.querySelector('[data-stat="fuelEntries"]'),
        };

        for (const [key, element] of Object.entries(statElements)) {
            if (element) {
                element.textContent = this._stats[key] || 0;
            }
        }
    }
}

customElements.define('tm-dashboard-overview', TMDashboardOverview);
