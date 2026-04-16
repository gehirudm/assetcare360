class MaintenanceDashboardOverview extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Dashboard</h1>
                <p class="page-subtitle">Maintenance Manager Overview</p>
            </div>

            <div class="summary-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:30px;">
                <div class="summary-card clickable" data-action="navigate-section" data-section="cost-approvals">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-money-bill-wave"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Pending Approvals</div>
                            <div class="summary-number" id="summaryPendingApprovals">—</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>
                <div class="summary-card clickable" data-action="navigate-section" data-section="fault-tickets">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-ticket-alt"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Active Fault Tickets</div>
                            <div class="summary-number" id="summaryActiveFaultTickets">—</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>
                <div class="summary-card clickable" data-action="navigate-section" data-section="service-reports">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-clipboard-list"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Reports Under Review</div>
                            <div class="summary-number" id="summaryReportsUnderReview">—</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>
                <div class="summary-card clickable" data-action="navigate-section" data-section="fault-tickets">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-check-double"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Resolved Tickets</div>
                            <div class="summary-number" id="summaryResolvedTickets">—</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
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

            <div class="recent-activities">
                <div class="section-header">
                    <h2 class="section-title"><i class="fas fa-history"></i> Recent Activities</h2>
                </div>
                <div class="activities-list">
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Cost Approval Request — Engine Repair</div>
                            <div class="activity-meta">10:30 AM &nbsp;·&nbsp; Supervisor John</div>
                            <div class="activity-description">Engine repair cost LKR 45,000 submitted for approval</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-pending">Pending</span></div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Service Report Uploaded — Vehicle #089</div>
                            <div class="activity-meta">09:15 AM &nbsp;·&nbsp; Technical Officer</div>
                            <div class="activity-description">Routine service report submitted for manager review</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-under-review">Under Review</span></div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Fault Ticket Created — Machine #205</div>
                            <div class="activity-meta">08:45 AM &nbsp;·&nbsp; Operator Mike</div>
                            <div class="activity-description">Hydraulic leak reported and ticket assigned to technical officer</div>
                        </div>
                        <div class="activity-status"><span class="status-badge status-in-progress">Active</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    async refresh() {
        try {
            const [ticketsRes, approvalsRes] = await Promise.all([
                API.get('/fault-tickets'),
                API.get('/budget-reports/pending'),
            ]);

            const tickets = (ticketsRes && ticketsRes.tickets) ? ticketsRes.tickets : [];
            const RESOLVED_STATUSES = ['Resolved', 'Closed'];
            const activeCount = tickets.filter(t => !RESOLVED_STATUSES.includes(t.status)).length;
            const resolvedCount = tickets.filter(t => RESOLVED_STATUSES.includes(t.status)).length;
            const pendingCount = (approvalsRes && Array.isArray(approvalsRes.reports))
                ? approvalsRes.reports.length
                : (approvalsRes && typeof approvalsRes.count === 'number' ? approvalsRes.count : '—');

            const setNum = (id, val) => {
                const el = this.querySelector(`#${id}`);
                if (el) {
                    el.textContent = val;
                }
            };

            setNum('summaryPendingApprovals', pendingCount);
            setNum('summaryActiveFaultTickets', activeCount);
            setNum('summaryReportsUnderReview', '—');
            setNum('summaryResolvedTickets', resolvedCount);
        } catch (err) {
            // Non-critical — stat cards remain showing '—'
        }
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
