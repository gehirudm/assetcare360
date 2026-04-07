class SupervisorDashboardOverview extends HTMLElement {
    constructor() {
        super();
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;
        this.render();
        this.addEventListener('click', this._onRootClick);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
    }

    _onRootClick(event) {
        const navCard = event.target.closest('[data-section-nav]');
        if (!navCard || !this.contains(navCard)) return;

        const section = navCard.dataset.sectionNav;
        if (!section) return;

        this.dispatchEvent(new CustomEvent('supervisor-dashboard-overview:navigate', {
            bubbles: true,
            detail: { section }
        }));
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-chart-line"></i> Dashboard Overview</h2>
                <p class="page-subtitle">Welcome! Here's your operational summary</p>
            </div>

            <div class="grid">
                <div class="summary-card clickable" data-section-nav="daily-check-reports">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Pending Reports</div>
                            <div class="summary-number">8</div>
                            <div class="summary-description">weekly check reports awaiting review</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="fault-tickets">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Assigned Tickets</div>
                            <div class="summary-number">13</div>
                            <div class="summary-description">fault tickets in progress</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="repair-management">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-tools"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Repairs Pending</div>
                            <div class="summary-number">5</div>
                            <div class="summary-description">repairs awaiting approval</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="budget-approval">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Budget Requests</div>
                            <div class="summary-number">3</div>
                            <div class="summary-description">budget approvals needed</div>
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

                <div class="activities-list" id="activitiesList">
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Weekly Check Approved</div>
                            <div class="activity-meta">Driver: John Doe | Vehicle: V-101 | 2 hours ago</div>
                            <div class="activity-description">All checks passed, vehicle cleared for operation
                            </div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-approved">APPROVED</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Ticket Assigned</div>
                            <div class="activity-meta">Ticket: TKT-045 | Assigned to: Tech Mike | 3 hours ago
                            </div>
                            <div class="activity-description">Hydraulic system leak - High priority</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-assigned">ASSIGNED</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Repair Completed</div>
                            <div class="activity-meta">Ticket: TKT-038 | Technician: Tech Sarah | 5 hours ago
                            </div>
                            <div class="activity-description">Brake system repair completed and verified</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-completed">COMPLETED</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('supervisor-dashboard-overview')) {
    customElements.define('supervisor-dashboard-overview', SupervisorDashboardOverview);
}
