class DriverDashboardOverview extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        this.refresh();

        DriverUtils.on('driver:data-trips-changed', () => this.refresh());
        DriverUtils.on('driver:data-checks-changed', () => this.refresh());
        DriverUtils.on('driver:data-breakdowns-changed', () => this.refresh());
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-tachometer-alt"></i> Dashboard Overview</h2>
                <p class="page-subtitle">Welcome! Here's your daily summary</p>
            </div>

            <div class="grid">
                <div class="summary-card clickable" data-action="navigate" data-section="trip-log">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-route"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Today's Trips</div>
                            <div class="summary-number" data-summary="trip-count">0</div>
                            <div class="summary-description">trips scheduled today</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="vehicle-check">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-clipboard-check"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Weekly Checks</div>
                            <div class="summary-number" data-summary="check-count">0</div>
                            <div class="summary-description">check records available</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="fuel-mileage">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-gas-pump"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Distance Today</div>
                            <div class="summary-number" data-summary="distance-count">0 KM</div>
                            <div class="summary-description">total distance covered</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="breakdown">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-exclamation-triangle"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Breakdown Reports</div>
                            <div class="summary-number" data-summary="breakdown-count">0</div>
                            <div class="summary-description">active breakdown report</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>
            </div>

            <div class="recent-activities">
                <div class="section-header">
                    <h3 class="section-title"><i class="fas fa-chart-line"></i> Recent Activities</h3>
                </div>
                <div class="activities-list">
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Daily Check Approved</div>
                            <div class="activity-meta">Vehicle: LKA-1234 | 2 hours ago</div>
                            <div class="activity-description">All safety checks passed successfully</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-approved">APPROVED</span></div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Trip Completed</div>
                            <div class="activity-meta">TRP-001 | Galle to Colombo | 3 hours ago</div>
                            <div class="activity-description">Successfully completed cargo delivery</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-completed">COMPLETED</span></div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Service Due Alert</div>
                            <div class="activity-meta">Vehicle: LKA-1234 | Due in 250 KM</div>
                            <div class="activity-description">Regular maintenance service required soon</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-pending">PENDING</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action="navigate"]');
            if (!actionEl) {
                return;
            }

            DriverUtils.navigateTo(actionEl.dataset.section);
        });
    }

    refresh() {
        const trips = Array.from(DriverUtils.store.trips.values());
        const checks = Array.from(DriverUtils.store.checks.values());
        const allBreakdowns = [
            ...DriverUtils.store.breakdowns.reports,
            ...DriverUtils.store.breakdowns.routeBreakdowns,
        ];

        const unresolvedBreakdowns = allBreakdowns.filter((item) => {
            const status = String(item.ticket_status || item.status || '').toLowerCase();
            return !(status.includes('resolved') || status.includes('completed') || status.includes('closed'));
        }).length;

        const totalDistance = trips.reduce((sum, trip) => {
            const start = Number.parseInt(trip.starting_odometer || trip.odometer || 0, 10);
            const end = Number.parseInt(trip.final_odometer || trip.finalOdometer || 0, 10);
            if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                return sum + (end - start);
            }
            return sum;
        }, 0);

        this.querySelector('[data-summary="trip-count"]').textContent = String(trips.length);
        this.querySelector('[data-summary="check-count"]').textContent = String(checks.length);
        this.querySelector('[data-summary="distance-count"]').textContent = `${totalDistance} KM`;
        this.querySelector('[data-summary="breakdown-count"]').textContent = String(unresolvedBreakdowns);
    }
}

customElements.define('driver-dashboard-overview', DriverDashboardOverview);
