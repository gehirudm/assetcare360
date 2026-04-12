class MaintenanceDashboardOverview extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Dashboard</h1>
                <p class="page-subtitle">Maintenance Manager Overview</p>
            </div>

            <div class="grid">
                <div class="stats-card stats-urgent">
                    <div class="stats-number">5</div>
                    <div class="stats-label">Pending Cost Approvals</div>
                </div>
                <div class="stats-card stats-pending">
                    <div class="stats-number">23</div>
                    <div class="stats-label">Active Fault Tickets</div>
                </div>
                <div class="stats-card stats-active">
                    <div class="stats-number">3</div>
                    <div class="stats-label">Reports Under Review</div>
                </div>
            </div>

            <div class="grid">
                <div class="card">
                    <div class="card-header"><i class="fas fa-ticket-alt"></i> Recent Fault Tickets</div>
                    <div class="ticket-item" data-action="navigate-section" data-section="fault-tickets">
                        <div class="ticket-details">
                            <strong>TKT-001</strong>
                            <div class="ticket-meta">Vehicle #101 | Reporter: John Driver</div>
                            <div class="ticket-issue">Engine overheating</div>
                        </div>
                        <div class="ticket-actions">
                            <span class="status-badge status-in-progress">In Progress</span>
                        </div>
                    </div>
                    <div class="ticket-item" data-action="navigate-section" data-section="fault-tickets">
                        <div class="ticket-details">
                            <strong>TKT-002</strong>
                            <div class="ticket-meta">Machine #205 | Reporter: Mike Operator</div>
                            <div class="ticket-issue">Hydraulic leak</div>
                        </div>
                        <div class="ticket-actions">
                            <span class="status-badge status-pending">Pending</span>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-small" type="button" data-action="navigate-section" data-section="fault-tickets" style="width: 100%; margin-top: 10px;">View All Tickets</button>
                </div>

                <div class="card">
                    <div class="card-header"><i class="fas fa-money-bill-wave"></i> Pending Cost Approvals</div>
                    <div class="request-item" data-action="navigate-section" data-section="cost-approvals">
                        <div class="ticket-details">
                            <strong>CA-001</strong>
                            <div class="ticket-meta">Engine overhaul - Vehicle #101</div>
                            <div class="ticket-meta">Amount: LKR 45,000</div>
                        </div>
                        <div class="ticket-actions">
                            <span class="status-badge status-pending">Pending</span>
                        </div>
                    </div>
                    <div class="request-item" data-action="navigate-section" data-section="cost-approvals">
                        <div class="ticket-details">
                            <strong>CA-002</strong>
                            <div class="ticket-meta">Hydraulic pump - Machine #205</div>
                            <div class="ticket-meta">Amount: LKR 32,000</div>
                        </div>
                        <div class="ticket-actions">
                            <span class="status-badge status-pending">Pending</span>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-small" type="button" data-action="navigate-section" data-section="cost-approvals" style="width: 100%; margin-top: 10px;">Review All Approvals</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-exclamation-circle"></i> Critical Notifications</div>
                <div class="notification-item danger">
                    <span class="notification-icon"><i class="fas fa-clock"></i></span>
                    <div>
                        <strong>Warranty Expiring:</strong> 3 warranty claims expire this week
                    </div>
                </div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-money-bill-wave"></i></span>
                    <div>
                        <strong>Cost Approval:</strong> Engine repair cost LKR 45,000 pending approval
                    </div>
                </div>
                <div class="notification-item info">
                    <span class="notification-icon"><i class="fas fa-clipboard-list"></i></span>
                    <div>
                        <strong>Service Reports:</strong> 3 reports pending review
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-file-alt"></i> Recent Activities</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Activity</th>
                            <th>User</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>10:30 AM</td>
                            <td>Cost approval request - Engine repair</td>
                            <td>Supervisor John</td>
                            <td><span class="status-badge status-pending">Pending</span></td>
                        </tr>
                        <tr>
                            <td>09:15 AM</td>
                            <td>Service report uploaded - Vehicle #089</td>
                            <td>Technical Officer</td>
                            <td><span class="status-badge status-under-review">Under Review</span></td>
                        </tr>
                        <tr>
                            <td>08:45 AM</td>
                            <td>Fault ticket created - Machine #205</td>
                            <td>Operator Mike</td>
                            <td><span class="status-badge status-in-progress">Active</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action="navigate-section"]');
            if (!actionNode) {
                return;
            }

            const section = actionNode.dataset.section;
            if (!section) {
                return;
            }

            this.navigateToSection(section);
        });
    }

    navigateToSection(section) {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo(section);
            return;
        }

        if (typeof window.navigateToSection === 'function') {
            window.navigateToSection(section);
        }
    }
}

customElements.define('maintenance-dashboard-overview', MaintenanceDashboardOverview);
