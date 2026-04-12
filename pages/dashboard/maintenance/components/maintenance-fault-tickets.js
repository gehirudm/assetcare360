class MaintenanceFaultTickets extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';

        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Fault Tickets</h1>
                <p class="page-subtitle">Tickets from Drivers/Operators via Supervisors</p>
            </div>

            <div class="filter-controls" id="faultTicketsFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-status="all">All Tickets</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="pending">Pending</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="in-progress">In Progress</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="complete">Completed</button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-ticket-alt"></i> All Fault Tickets</div>

                <div class="ticket-item" data-status="in-progress" data-action="view-ticket" data-ticket-id="TKT-001">
                    <div class="ticket-details">
                        <strong>TKT-001</strong>
                        <div class="ticket-meta"><i class="fas fa-car"></i> Vehicle LKA-1234 | <i class="fas fa-user"></i> Reporter: Driver Kamal | <i class="fas fa-clipboard-list"></i> Via: Supervisor John</div>
                        <div class="ticket-issue">Engine overheating - Temperature gauge showing red zone during highway drive</div>
                        <div class="ticket-meta">Created: Aug 20, 2025 | Assigned: Technical Officer Nimal | Priority: High</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-in-progress">In Progress</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-001">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="pending" data-action="view-ticket" data-ticket-id="TKT-002">
                    <div class="ticket-details">
                        <strong>TKT-002</strong>
                        <div class="ticket-meta"><i class="fas fa-industry"></i> Machine #205 | <i class="fas fa-user"></i> Reporter: Operator Mike | <i class="fas fa-clipboard-list"></i> Via: Supervisor Mike</div>
                        <div class="ticket-issue">Hydraulic leak - Fluid pooling under main cylinder assembly</div>
                        <div class="ticket-meta">Created: Aug 22, 2025 | Status: Awaiting assignment | Priority: Medium</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-pending">Pending</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-002">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="complete" data-action="view-ticket" data-ticket-id="TKT-003">
                    <div class="ticket-details">
                        <strong>TKT-003</strong>
                        <div class="ticket-meta"><i class="fas fa-car"></i> Vehicle LKA-5678 | <i class="fas fa-user"></i> Reporter: Driver Sarah | <i class="fas fa-clipboard-list"></i> Via: Supervisor John</div>
                        <div class="ticket-issue">Brake system malfunction - Reduced braking efficiency, grinding noise</div>
                        <div class="ticket-meta">Completed: Aug 19, 2025 | Duration: 21 hours | Resolved by: Tech Officer Anil</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-complete">Completed</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-003">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="in-progress" data-action="view-ticket" data-ticket-id="TKT-004">
                    <div class="ticket-details">
                        <strong>TKT-004</strong>
                        <div class="ticket-meta"><i class="fas fa-industry"></i> Machine #180 | <i class="fas fa-user"></i> Reporter: Operator Tom | <i class="fas fa-clipboard-list"></i> Via: Supervisor Mike</div>
                        <div class="ticket-issue">Engine smoke - Black smoke from exhaust, power loss</div>
                        <div class="ticket-meta">Created: Aug 23, 2025 | Assigned: Technical Officer Sunil | Priority: High</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-in-progress">In Progress</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-004">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="pending" data-action="view-ticket" data-ticket-id="TKT-005">
                    <div class="ticket-details">
                        <strong>TKT-005</strong>
                        <div class="ticket-meta"><i class="fas fa-car"></i> Vehicle LKA-9012 | <i class="fas fa-user"></i> Reporter: Driver Nimal | <i class="fas fa-clipboard-list"></i> Via: Supervisor Lisa</div>
                        <div class="ticket-issue">Steering wheel vibration - Excessive vibration at high speeds</div>
                        <div class="ticket-meta">Created: Aug 24, 2025 | Status: Awaiting parts | Priority: Medium</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-pending">Pending</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-005">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="pending" data-action="view-ticket" data-ticket-id="TKT-006">
                    <div class="ticket-details">
                        <strong>TKT-006</strong>
                        <div class="ticket-meta"><i class="fas fa-industry"></i> Machine #312 | <i class="fas fa-user"></i> Reporter: Operator Saman | <i class="fas fa-clipboard-list"></i> Via: Supervisor Mike</div>
                        <div class="ticket-issue">Cooling system failure - Engine temperature rising, coolant leak detected</div>
                        <div class="ticket-meta">Created: Aug 25, 2025 | Status: Awaiting assignment | Priority: High</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-urgent">Pending</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-006">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="in-progress" data-action="view-ticket" data-ticket-id="TKT-007">
                    <div class="ticket-details">
                        <strong>TKT-007</strong>
                        <div class="ticket-meta"><i class="fas fa-car"></i> Vehicle LKA-3456 | <i class="fas fa-user"></i> Reporter: Driver Anil | <i class="fas fa-clipboard-list"></i> Via: Supervisor John</div>
                        <div class="ticket-issue">Transmission slipping - Difficulty in gear shifting, delayed engagement</div>
                        <div class="ticket-meta">Created: Aug 25, 2025 | Assigned: Technical Officer Nimal | Priority: Medium</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-in-progress">In Progress</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-007">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="complete" data-action="view-ticket" data-ticket-id="TKT-008">
                    <div class="ticket-details">
                        <strong>TKT-008</strong>
                        <div class="ticket-meta"><i class="fas fa-industry"></i> Machine #150 | <i class="fas fa-user"></i> Reporter: Operator Damindu | <i class="fas fa-clipboard-list"></i> Via: Supervisor Mike</div>
                        <div class="ticket-issue">Gas cylinder valve replacement - Pressure valve malfunction</div>
                        <div class="ticket-meta">Completed: Aug 18, 2025 | Duration: 8 hours | Resolved by: Tech Officer Sunil</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-complete">Completed</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-008">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="pending" data-action="view-ticket" data-ticket-id="TKT-009">
                    <div class="ticket-details">
                        <strong>TKT-009</strong>
                        <div class="ticket-meta"><i class="fas fa-car"></i> Vehicle LKA-7890 | <i class="fas fa-user"></i> Reporter: Driver Sunil | <i class="fas fa-clipboard-list"></i> Via: Supervisor Lisa</div>
                        <div class="ticket-issue">Battery failure - Vehicle won't start, electrical system issues</div>
                        <div class="ticket-meta">Created: Aug 26, 2025 | Status: Parts ordered | Priority: High</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-pending">Pending</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-009">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="in-progress" data-action="view-ticket" data-ticket-id="TKT-010">
                    <div class="ticket-details">
                        <strong>TKT-010</strong>
                        <div class="ticket-meta"><i class="fas fa-industry"></i> Machine #420 | <i class="fas fa-user"></i> Reporter: Operator Pradeep | <i class="fas fa-clipboard-list"></i> Via: Supervisor Mike</div>
                        <div class="ticket-issue">Electrical system fault - Control panel unresponsive, display errors</div>
                        <div class="ticket-meta">Created: Aug 26, 2025 | Assigned: Technical Officer Anil | Priority: Medium</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-in-progress">In Progress</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-010">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="complete" data-action="view-ticket" data-ticket-id="TKT-011">
                    <div class="ticket-details">
                        <strong>TKT-011</strong>
                        <div class="ticket-meta"><i class="fas fa-car"></i> Vehicle LKA-2345 | <i class="fas fa-user"></i> Reporter: Driver Chaminda | <i class="fas fa-clipboard-list"></i> Via: Supervisor John</div>
                        <div class="ticket-issue">Air conditioning failure - No cooling, compressor noise</div>
                        <div class="ticket-meta">Completed: Aug 21, 2025 | Duration: 5 hours | Resolved by: Tech Officer Nimal</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-complete">Completed</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-011">View Details</button>
                    </div>
                </div>

                <div class="ticket-item" data-status="pending" data-action="view-ticket" data-ticket-id="TKT-012">
                    <div class="ticket-details">
                        <strong>TKT-012</strong>
                        <div class="ticket-meta"><i class="fas fa-industry"></i> Machine #505 | <i class="fas fa-user"></i> Reporter: Operator Ruwan | <i class="fas fa-clipboard-list"></i> Via: Supervisor Mike</div>
                        <div class="ticket-issue">Fuel system clogged - Engine sputtering, poor fuel efficiency</div>
                        <div class="ticket-meta">Created: Aug 27, 2025 | Status: Awaiting assignment | Priority: Low</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-pending">Pending</span>
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-ticket" data-ticket-id="TKT-012">View Details</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-bar"></i> Ticket Statistics</div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                    <div class="stats-card stats-active">
                        <div class="stats-number">12</div>
                        <div class="stats-label">Total Tickets</div>
                    </div>
                    <div class="stats-card stats-pending">
                        <div class="stats-number">5</div>
                        <div class="stats-label">Pending Assignment</div>
                    </div>
                    <div class="stats-card" style="background: #fff3e0; border: 1px solid #fed7aa;">
                        <div class="stats-number" style="color: var(--warn);">4</div>
                        <div class="stats-label">In Progress</div>
                    </div>
                    <div class="stats-card" style="background: #f0fdf4; border: 1px solid #bbf7d0;">
                        <div class="stats-number" style="color: #059669;">3</div>
                        <div class="stats-label">Completed</div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) {
                return;
            }

            const action = actionNode.dataset.action;
            if (action === 'set-filter') {
                this.applyFilter(actionNode.dataset.status, actionNode);
                return;
            }

            if (action === 'view-ticket') {
                this.viewTicketDetails(actionNode.dataset.ticketId);
            }
        });
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    setActiveFilterButton(button) {
        this.querySelectorAll('#faultTicketsFilterControls .filter-btn').forEach((item) => {
            item.classList.remove('active');
        });

        if (button) {
            button.classList.add('active');
        }
    }

    applyFilter(status, button) {
        const nextStatus = status || this.currentFilter || 'all';
        this.currentFilter = nextStatus;

        if (button) {
            this.setActiveFilterButton(button);
        } else {
            const activeButton = this.querySelector(`#faultTicketsFilterControls [data-status="${nextStatus}"]`);
            this.setActiveFilterButton(activeButton);
        }

        this.querySelectorAll('.ticket-item[data-status]').forEach((ticket) => {
            const ticketStatus = ticket.dataset.status;
            ticket.style.display = nextStatus === 'all' || ticketStatus === nextStatus ? 'flex' : 'none';
        });
    }

    viewTicketDetails(ticketId) {
        const modal = document.querySelector('maintenance-ticket-details-modal');
        if (!modal || typeof modal.openById !== 'function') {
            this.emitToast('Ticket details modal is unavailable.', 'error');
            return;
        }

        modal.openById(String(ticketId || ''));
    }
}

customElements.define('maintenance-fault-tickets', MaintenanceFaultTickets);
