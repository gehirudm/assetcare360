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
                <p class="page-subtitle">Maintenance Manager quick actions with live operational counts</p>
            </div>

            <div class="summary-grid">
                <button class="summary-card clickable" type="button" data-action="navigate-section" data-section="fault-tickets" aria-label="Open Fault Tickets section">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-ticket-alt"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Active Fault Tickets</div>
                            <div class="summary-number" id="summaryActiveFaultTickets">—</div>
                            <div class="summary-description">Open fault workflows requiring action</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </button>

                <button class="summary-card clickable" type="button" data-action="navigate-section" data-section="service-tickets" aria-label="Open Service Management section">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-tools"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Active Service Tickets</div>
                            <div class="summary-number" id="summaryActiveServiceTickets">—</div>
                            <div class="summary-description">Assigned and in-progress service operations</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </button>

                <button class="summary-card clickable" type="button" data-action="navigate-section" data-section="cost-approvals" aria-label="Open Cost Approvals section">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-money-bill-wave"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Pending Cost Approvals</div>
                            <div class="summary-number" id="summaryPendingApprovals">—</div>
                            <div class="summary-description">Budget approvals waiting for review</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </button>

                <button class="summary-card clickable" type="button" data-action="navigate-section" data-section="service-reports" aria-label="Open Service Report Management section">
                    <div class="summary-card-content">
                        <div class="summary-icon"><i class="fas fa-clipboard-check"></i></div>
                        <div class="summary-details">
                            <div class="summary-title">Completed Service Reports</div>
                            <div class="summary-number" id="summaryCompletedServiceReports">—</div>
                            <div class="summary-description">Reports submitted and ready for audit</div>
                        </div>
                    </div>
                    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
                </button>
            </div>
        `;
    }

    async refresh() {
        try {
            const [faultTicketsRes, serviceTicketsRes, approvalsRes] = await Promise.all([
                API.get('/fault-tickets'),
                API.get('/service-tickets'),
                API.get('/budget-reports/pending'),
            ]);

            const faultTickets = this.extractList(faultTicketsRes, 'tickets');
            const serviceTickets = this.extractList(serviceTicketsRes, 'tickets');
            const approvalReports = this.extractList(approvalsRes, 'reports');

            const activeFaultCount = faultTickets.filter((ticket) => {
                const status = String(ticket?.status || '').trim().toLowerCase();
                return status !== 'resolved' && status !== 'closed';
            }).length;

            const activeServiceCount = serviceTickets.filter((ticket) => {
                const status = String(ticket?.status || '').trim().toLowerCase();
                return status !== 'completed' && status !== 'cancelled' && status !== 'canceled';
            }).length;

            const completedServiceReports = serviceTickets.filter((ticket) => {
                const status = String(ticket?.status || '').trim().toLowerCase();
                return status === 'completed';
            }).length;

            const setNum = (id, val) => {
                const el = this.querySelector(`#${id}`);
                if (el) {
                    el.textContent = val;
                }
            };

            setNum('summaryActiveFaultTickets', activeFaultCount);
            setNum('summaryActiveServiceTickets', activeServiceCount);
            setNum('summaryPendingApprovals', approvalReports.length);
            setNum('summaryCompletedServiceReports', completedServiceReports);
        } catch (err) {
            // Non-critical: quick-action counters remain as placeholders.
        }
    }

    extractList(response, key) {
        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (response.data && Array.isArray(response.data[key])) {
            return response.data[key];
        }

        if (Array.isArray(response[key])) {
            return response[key];
        }

        return [];
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
