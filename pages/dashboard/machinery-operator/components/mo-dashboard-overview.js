class MODashboardOverview extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        this.renderAssignedMachines();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-chart-line"></i> Dashboard Overview</h2>
                <p class="page-subtitle">Welcome! Here's your machinery operations summary</p>
            </div>

            <div class="grid">
                <div class="summary-card clickable" data-action="navigate" data-section="fault-reporting">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Fault Reports</div>
                            <div class="summary-number">2</div>
                            <div class="summary-description">active fault tickets</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="condition-updates">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Weekly Check Reports</div>
                            <div class="summary-number" data-summary="pending-weekly-checks">1</div>
                            <div class="summary-description">pending supervisor review</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-action="navigate" data-section="notifications">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-bell"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Notifications</div>
                            <div class="summary-number">3</div>
                            <div class="summary-description">new notifications</div>
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
                            <div class="activity-title">Fault Report Submitted</div>
                            <div class="activity-meta">Excavator #045 | Hydraulic Issue | 1 hour ago</div>
                            <div class="activity-description">Reported hydraulic pressure drop during operation</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-pending">PENDING</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Weekly Check Reviewed</div>
                            <div class="activity-meta">Loader #128 | Supervisor Approved | 3 hours ago</div>
                            <div class="activity-description">Weekly check report approved by supervisor</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-approved">APPROVED</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Repair Completed</div>
                            <div class="activity-meta">Truck #203 | Engine Maintenance | 1 day ago</div>
                            <div class="activity-description">Engine oil change completed, machine ready for operation</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-completed">COMPLETED</span>
                        </div>
                    </div>

                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">Service Reminder</div>
                            <div class="activity-meta">Excavator #045 | 100 Hour Service Due | 2 days ago</div>
                            <div class="activity-description">Scheduled maintenance approaching in 15 operating hours</div>
                        </div>
                        <div class="activity-status">
                            <span class="status-text status-pending">REMINDER</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="recent-activities">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-cogs"></i> Assigned Machines
                    </h3>
                </div>
                <div class="activities-list" id="assignedMachinesList"></div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            if (action === 'navigate') {
                this.navigateToSection(actionEl.dataset.section);
                return;
            }

            if (action === 'view-machine') {
                document.dispatchEvent(new CustomEvent('mo:open-machine-details', {
                    detail: { machineId: actionEl.dataset.machineId },
                }));
            }
        });
    }

    navigateToSection(sectionId) {
        const layout = document.querySelector('ac-layout');
        if (layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo(sectionId);
        }
    }

    renderAssignedMachines() {
        const machines = [
            {
                id: 'EXC-045',
                name: 'Excavator #045',
                meta: 'Current Hours: 1,847 | Next Service: 1,900 hours',
                description: 'Status: Operational | Last update: 2 hours ago',
                statusLabel: 'OPERATIONAL',
                statusClass: 'status-operational',
            },
            {
                id: 'LOD-128',
                name: 'Loader #128',
                meta: 'Current Hours: 2,341 | Next Service: 2,500 hours',
                description: 'Status: Operational | Last update: 5 hours ago',
                statusLabel: 'OPERATIONAL',
                statusClass: 'status-operational',
            },
            {
                id: 'TRK-203',
                name: 'Truck #203',
                meta: 'Current Hours: 3,012 | Next Service: 3,100 hours',
                description: 'Status: Under Maintenance | Hydraulic repair in progress',
                statusLabel: 'MAINTENANCE',
                statusClass: 'status-under-repair',
            },
        ];

        const container = this.querySelector('#assignedMachinesList');
        if (!container) {
            return;
        }

        container.innerHTML = machines.map((machine) => `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">${machine.name}</div>
                    <div class="activity-meta">${machine.meta}</div>
                    <div class="activity-description">${machine.description}</div>
                </div>
                <div class="item-actions" style="display:flex; align-items:center; gap:10px;">
                    <span class="status-text ${machine.statusClass}">${machine.statusLabel}</span>
                    <button class="btn btn-secondary btn-small" type="button" data-action="view-machine" data-machine-id="${machine.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </div>
        `).join('');
    }

    async refresh() {
        const summaryNumber = this.querySelector('[data-summary="pending-weekly-checks"]');
        if (!summaryNumber || typeof API === 'undefined') {
            return;
        }

        try {
            const response = await API.get('/machine-weekly-checks?status=pending');
            if (response && response.status === 'success' && response.data) {
                summaryNumber.textContent = String(response.data.count || 0);
            }
        } catch (error) {
            console.error('Error loading dashboard summary:', error);
        }
    }
}

customElements.define('mo-dashboard-overview', MODashboardOverview);
