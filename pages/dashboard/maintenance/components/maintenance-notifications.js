class MaintenanceNotifications extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';

        this.render();
        this.bindEvents();
        this.applyFilter('all');
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Notifications</h1>
                <p class="page-subtitle">Categorized alerts and notifications</p>
            </div>

            <div class="filter-controls" id="notificationsFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-category="all">All Notifications</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-category="cost">Cost Approvals</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-category="service">Service</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-category="inventory">Inventory</button>
            </div>

            <div class="card" data-notification-category="critical">
                <div class="card-header"><i class="fas fa-exclamation-circle"></i> Critical Alerts</div>
                <div class="notification-item danger">
                    <span class="notification-icon"><i class="fas fa-clock"></i></span>
                    <div>
                        <strong>Warranty Expiring:</strong> Vehicle #089 brake system warranty expires in 2 days
                        <div style="margin-top: 5px;">
                            <button class="btn btn-secondary btn-small" type="button" data-action="check-warranty" data-warranty-id="VH089-BRK">Check Warranty</button>
                        </div>
                    </div>
                </div>
                <div class="notification-item danger">
                    <span class="notification-icon"><i class="fas fa-clipboard-list"></i></span>
                    <div>
                        <strong>Overdue Service:</strong> Vehicle #089 routine check is 1 day overdue
                        <div style="margin-top: 5px;">
                            <button class="btn btn-primary btn-small" type="button" data-action="schedule-service" data-equipment-id="VH089">Schedule Now</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" data-notification-category="warranty">
                <div class="card-header"><i class="fas fa-shield-alt"></i> Warranty Notifications</div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-clock"></i></span>
                    <div>
                        <strong>Warranty Expiring:</strong> Vehicle #089 brake system warranty expires on Sep 30, 2025
                    </div>
                </div>
                <div class="notification-item danger">
                    <span class="notification-icon"><i class="fas fa-times-circle"></i></span>
                    <div>
                        <strong>Warranty Expired:</strong> Machine #205 hydraulic pump warranty expired on Aug 10, 2025
                    </div>
                </div>
                <div class="notification-item info">
                    <span class="notification-icon"><i class="fas fa-check-circle"></i></span>
                    <div>
                        <strong>Warranty Active:</strong> Vehicle #101 engine warranty valid until Dec 15, 2025
                    </div>
                </div>
            </div>

            <div class="card" data-notification-category="cost">
                <div class="card-header"><i class="fas fa-money-bill-wave"></i> Cost Approval Notifications</div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-money-bill-wave"></i></span>
                    <div>
                        <strong>High Cost Approval:</strong> Engine repair cost LKR 45,000 awaiting approval (CA-001)
                        <div style="margin-top: 5px;">
                            <button class="btn btn-success btn-small" type="button" data-action="approve-cost" data-request-id="CA-001">Approve</button>
                            <button class="btn btn-danger btn-small" type="button" data-action="reject-cost" data-request-id="CA-001">Reject</button>
                        </div>
                    </div>
                </div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-money-bill-wave"></i></span>
                    <div>
                        <strong>Cost Approval Pending:</strong> Hydraulic pump replacement LKR 32,000 (CA-002)
                        <div style="margin-top: 5px;">
                            <button class="btn btn-success btn-small" type="button" data-action="approve-cost" data-request-id="CA-002">Approve</button>
                            <button class="btn btn-danger btn-small" type="button" data-action="reject-cost" data-request-id="CA-002">Reject</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" data-notification-category="service">
                <div class="card-header"><i class="fas fa-wrench"></i> Service Notifications</div>
                <div class="notification-item info">
                    <span class="notification-icon"><i class="fas fa-clipboard-list"></i></span>
                    <div>
                        <strong>Service Report Submitted:</strong> Technical Officer uploaded report for Machine #203
                        <div style="margin-top: 5px;">
                            <button class="btn btn-primary btn-small" type="button" data-action="review-report" data-report-id="SR-002">Review Report</button>
                        </div>
                    </div>
                </div>
                <div class="notification-item success">
                    <span class="notification-icon"><i class="fas fa-check-circle"></i></span>
                    <div>
                        <strong>Service Completed:</strong> Vehicle #089 brake system repair completed successfully
                    </div>
                </div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-calendar-alt"></i></span>
                    <div>
                        <strong>Service Due:</strong> Vehicle #101 preventive maintenance due on Sep 28, 2025
                    </div>
                </div>
            </div>

            <div class="card" data-notification-category="inventory">
                <div class="card-header"><i class="fas fa-box"></i> Inventory Notifications</div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-box"></i></span>
                    <div>
                        <strong>Low Stock Alert:</strong> Brake pad stock running low (from Inventory Manager)
                    </div>
                </div>
                <div class="notification-item info">
                    <span class="notification-icon"><i class="fas fa-sync"></i></span>
                    <div>
                        <strong>Stock Update:</strong> Hydraulic oil restocked - 50 units added
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-bar"></i> Notification Summary</div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                    <div class="stats-card stats-urgent">
                        <div class="stats-number">4</div>
                        <div class="stats-label">Critical Alerts</div>
                    </div>
                    <div class="stats-card stats-pending">
                        <div class="stats-number">7</div>
                        <div class="stats-label">Pending Actions</div>
                    </div>
                    <div class="stats-card stats-active">
                        <div class="stats-number">15</div>
                        <div class="stats-label">Today's Notifications</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--royal-blue);">92%</div>
                        <div style="color: var(--muted);">Response Rate</div>
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
                this.applyFilter(actionNode.dataset.category, actionNode);
                return;
            }

            if (action === 'check-warranty') {
                this.checkWarranty(actionNode.dataset.warrantyId);
                return;
            }

            if (action === 'approve-cost') {
                this.approveCost(actionNode.dataset.requestId);
                return;
            }

            if (action === 'reject-cost') {
                this.rejectCost(actionNode.dataset.requestId);
                return;
            }

            if (action === 'review-report') {
                this.reviewReport(actionNode.dataset.reportId);
                return;
            }

            if (action === 'schedule-service') {
                this.scheduleService(actionNode.dataset.equipmentId);
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
        this.querySelectorAll('#notificationsFilterControls .filter-btn').forEach((item) => {
            item.classList.remove('active');
        });

        if (button) {
            button.classList.add('active');
        }
    }

    applyFilter(category, button) {
        const nextCategory = category || this.currentFilter || 'all';
        this.currentFilter = nextCategory;

        if (button) {
            this.setActiveFilterButton(button);
        } else {
            const activeButton = this.querySelector(`#notificationsFilterControls [data-category="${nextCategory}"]`);
            this.setActiveFilterButton(activeButton);
        }

        this.querySelectorAll('[data-notification-category]').forEach((card) => {
            const cardCategory = card.dataset.notificationCategory;
            card.style.display = nextCategory === 'all' || cardCategory === nextCategory ? 'block' : 'none';
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

    checkWarranty(warrantyId) {
        const warrantyModal = document.querySelector('maintenance-warranty-details-modal');
        if (!warrantyModal || typeof warrantyModal.openById !== 'function') {
            this.emitToast('Warranty details modal is unavailable.', 'error');
            return;
        }

        warrantyModal.openById(String(warrantyId || ''));
    }

    approveCost(requestId) {
        const costApprovals = document.querySelector('maintenance-cost-approvals');
        if (!costApprovals || typeof costApprovals.openApproveModal !== 'function') {
            this.emitToast(`Approve flow for ${requestId} is unavailable right now.`, 'error');
            return;
        }

        this.navigateToSection('cost-approvals');
        costApprovals.openApproveModal(String(requestId || ''));
    }

    rejectCost(requestId) {
        const costApprovals = document.querySelector('maintenance-cost-approvals');
        if (!costApprovals || typeof costApprovals.openRejectModal !== 'function') {
            this.emitToast(`Reject flow for ${requestId} is unavailable right now.`, 'error');
            return;
        }

        this.navigateToSection('cost-approvals');
        costApprovals.openRejectModal(String(requestId || ''));
    }

    reviewReport(reportId) {
        const reportComponent = document.querySelector('maintenance-service-reports');
        if (!reportComponent || typeof reportComponent.reviewReport !== 'function') {
            this.emitToast(`Review flow for service report ${reportId} is unavailable right now.`, 'error');
            return;
        }

        this.navigateToSection('service-reports');
        reportComponent.reviewReport(String(reportId || ''));
    }

    scheduleService(equipmentId) {
        const serviceWarranty = document.querySelector('maintenance-service-warranty');
        if (!serviceWarranty || typeof serviceWarranty.scheduleService !== 'function') {
            this.emitToast(`Scheduling flow for ${equipmentId} is unavailable right now.`, 'error');
            return;
        }

        this.navigateToSection('warranty-management');
        serviceWarranty.scheduleService(String(equipmentId || ''));
    }
}

customElements.define('maintenance-notifications', MaintenanceNotifications);
