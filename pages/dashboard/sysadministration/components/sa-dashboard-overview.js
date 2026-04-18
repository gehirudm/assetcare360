class SADashboardOverview extends HTMLElement {
    constructor() {
        super();
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        this.render();
        this.addEventListener('click', this._onRootClick);
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
    }

    _onRootClick(event) {
        const navCard = event.target.closest('[data-section-nav]');
        if (!navCard || !this.contains(navCard)) return;

        const section = navCard.dataset.sectionNav;
        if (!section) return;

        this.dispatchEvent(new CustomEvent('sa-dashboard-overview:navigate', {
            bubbles: true,
            detail: { section }
        }));
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-chart-line"></i> Dashboard Overview</h2>
                <p class="page-subtitle">System health, user activity, and quick actions</p>
            </div>

            <div class="grid">
                <div class="summary-card clickable" data-section-nav="user-accounts">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">User Accounts</div>
                            <div class="summary-number">45</div>
                            <div class="summary-description">total users in the system</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="permissions">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-lock"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Permissions</div>
                            <div class="summary-number">8</div>
                            <div class="summary-description">active roles configured</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="system-logs">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">System Events</div>
                            <div class="summary-number">256</div>
                            <div class="summary-description">logged events (24 hours)</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="service-config">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-cogs"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Service Config</div>
                            <div class="summary-number">12</div>
                            <div class="summary-description">service intervals configured</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div class="recent-activities">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-chart-line"></i> Recent Activities
                    </h3>
                </div>

                <div class="activities-list">
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">User Login</div>
                            <div class="activity-meta">Supervisor John | IP: 192.168.1.45 | 2 minutes ago</div>
                            <div class="activity-description">Successful login from authorized location</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-approved">SUCCESS</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Account Created</div>
                            <div class="activity-meta">Admin | New Technical Officer | 15 minutes ago</div>
                            <div class="activity-description">New user account created successfully</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-completed">CREATED</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Permission Changed</div>
                            <div class="activity-meta">Admin | Inventory Manager Role | 1 hour ago</div>
                            <div class="activity-description">Updated role with new access rights</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-pending">UPDATED</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Failed Login</div>
                            <div class="activity-meta">User: driver_05 | 3 attempts | 2 hours ago</div>
                            <div class="activity-description">Multiple failed login attempts detected</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-rejected">FAILED</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="recent-activities">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-exclamation-triangle"></i> System Alerts
                    </h3>
                </div>

                <div class="activities-list">
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Authentication Alert</div>
                            <div class="activity-meta">User: driver_05 | Repeated failed logins</div>
                            <div class="activity-description">Multiple failed login attempts detected and monitored</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-critical">CRITICAL</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Backup Reminder</div>
                            <div class="activity-meta">System Maintenance | Scheduled</div>
                            <div class="activity-description">Manual backup recommended for critical data</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-pending">PENDING</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('sa-dashboard-overview', SADashboardOverview);
