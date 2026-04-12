class DriverVehicleCheck extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.checks = [];
        this.render();
        this.bindEvents();
        this.refresh();

        this._onChecksChanged = () => this.refresh();
        DriverUtils.on('driver:data-checks-changed', this._onChecksChanged);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-clipboard-check"></i> Weekly Vehicle Check</h2>
                <p class="page-subtitle">Submit weekly vehicle inspection reports</p>
            </div>

            <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                <button class="btn btn-primary" id="weeklyCheckBtn" type="button" data-action="open-weekly-check">
                    <i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check
                </button>
                <span id="weeklyCheckStatus" style="font-size: 14px; color: #27ae60; display: none;">
                    <i class="fas fa-check-circle"></i> This week's check submitted
                </span>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-clipboard-list"></i> My Weekly Check History
                    <div class="filter-controls">
                        <button class="filter-btn active" type="button" data-action="set-check-filter" data-filter="all">All</button>
                        <button class="filter-btn" type="button" data-action="set-check-filter" data-filter="approved">Approved</button>
                        <button class="filter-btn" type="button" data-action="set-check-filter" data-filter="rejected">Rejected</button>
                        <button class="filter-btn" type="button" data-action="set-check-filter" data-filter="pending">Pending</button>
                    </div>
                </div>
                <div id="driverChecksList"></div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-check-square"></i> Weekly Inspection Checklist Items</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 8px;"><strong>✓</strong> Engine Oil Level</div>
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 8px;"><strong>✓</strong> Brake System</div>
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 8px;"><strong>✓</strong> All Lights & Indicators</div>
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 8px;"><strong>✓</strong> Tire Pressure & Condition</div>
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 8px;"><strong>✓</strong> Coolant Level</div>
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 8px;"><strong>✓</strong> Wipers & Washers</div>
                </div>
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

            if (action === 'open-weekly-check') {
                DriverUtils.openModal('dailyCheckModal');
                return;
            }

            if (action === 'set-check-filter') {
                this.applyFilter(actionEl.dataset.filter);
                return;
            }

            const checkId = actionEl.dataset.checkId;
            const check = this.checks.find((item) => item.check_id === checkId) || null;

            if (action === 'view-check' && check) {
                DriverUtils.openModal('checkDetailsModal', { check });
                return;
            }

            if (action === 'resubmit-check' && check) {
                DriverUtils.openModal('dailyCheckModal', { resubmitCheck: check });
                return;
            }

            if (action === 'print-check' && checkId) {
                DriverUtils.showToast(`Preparing check ${checkId} for printing.`);
                return;
            }

            if (action === 'export-check' && checkId) {
                DriverUtils.showToast(`Exporting check ${checkId}.`);
            }
        });
    }

    applyFilter(filter) {
        this.currentFilter = filter || 'all';
        this.querySelectorAll('[data-action="set-check-filter"]').forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });
        this.renderChecks();
    }

    async refresh() {
        const container = this.querySelector('#driverChecksList');
        container.innerHTML = '<div style="padding: 20px; color: var(--muted);">Loading weekly checks...</div>';

        try {
            const response = await DriverUtils.apiGet('/vehicle-checks?vehicle_registration=LKA-1234');
            const checks = DriverUtils.normalizeApiList(response, 'checks');

            this.checks = (checks.length > 0 ? checks : this.getFallbackChecks()).map((check) => ({
                ...check,
                check_id: check.check_id || check.id,
                status: String(check.status || 'pending').toLowerCase(),
            }));

            DriverUtils.store.checks = new Map(this.checks.map((check) => [check.check_id, check]));
            this.renderChecks();
            this.updateSubmissionStatus();
        } catch (error) {
            console.error('Failed to load vehicle checks:', error);
            this.checks = this.getFallbackChecks();
            DriverUtils.store.checks = new Map(this.checks.map((check) => [check.check_id, check]));
            this.renderChecks();
            this.updateSubmissionStatus();
            DriverUtils.showToast('Unable to load checks from server. Showing local data.', 'warning');
        }
    }

    renderChecks() {
        const container = this.querySelector('#driverChecksList');
        const filtered = this.checks.filter((check) => {
            if (this.currentFilter === 'all') {
                return true;
            }
            return check.status === this.currentFilter;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--muted);">No checks found for the selected filter.</div>';
            DriverUtils.emit('driver:data-summary-updated');
            return;
        }

        container.innerHTML = filtered.map((check) => this.renderCheckItem(check)).join('');
        DriverUtils.emit('driver:data-summary-updated');
    }

    renderCheckItem(check) {
        const statusText = check.status === 'approved' ? 'APPROVED' : check.status === 'rejected' ? 'REJECTED' : 'PENDING REVIEW';
        const statusColor = DriverUtils.getStatusColor(check.status);

        const weekStart = new Date(check.week_start_date || check.week_end_date || Date.now());
        const weekEnd = new Date(check.week_end_date || check.week_start_date || Date.now());
        const weekLabel = `Week of ${DriverUtils.formatDate(weekStart)} - ${DriverUtils.formatDate(weekEnd)}`;

        return `
            <div class="inventory-item" data-check-id="${check.check_id}" data-status="${check.status}">
                <div class="item-details">
                    <strong><i class="fas fa-clipboard-check"></i> ${check.check_id}</strong>
                    <div class="item-meta"><i class="fas fa-car"></i> Vehicle: ${check.vehicle_registration || 'LKA-1234'} | <i class="fas fa-calendar-week"></i> ${weekLabel}</div>
                    <div class="item-description"><span class="status-text" style="color: ${statusColor};">${statusText}</span> | <i class="fas fa-tachometer-alt"></i> Odometer: ${(check.odometer_reading || 0).toLocaleString()} km</div>
                </div>
                <div class="item-actions">
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" type="button" data-action="view-check" data-check-id="${check.check_id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        ${check.status === 'rejected' ? `
                            <button class="btn btn-small" style="background:#e74c3c;color:#fff;" type="button" data-action="resubmit-check" data-check-id="${check.check_id}">
                                <i class="fas fa-redo"></i> RESUBMIT
                            </button>
                        ` : ''}
                        <button class="btn btn-small btn-secondary" type="button" data-action="print-check" data-check-id="${check.check_id}">
                            <i class="fas fa-print"></i> PRINT
                        </button>
                        <button class="btn btn-small btn-secondary" type="button" data-action="export-check" data-check-id="${check.check_id}">
                            <i class="fas fa-download"></i> EXPORT
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    updateSubmissionStatus() {
        const sunday = this.getCurrentWeekEnding();
        const weekEnd = sunday.toISOString().split('T')[0];

        const hasSubmitted = this.checks.some((check) => {
            return check.week_end_date === weekEnd && check.status !== 'rejected';
        });

        const statusLabel = this.querySelector('#weeklyCheckStatus');
        const button = this.querySelector('#weeklyCheckBtn');

        if (!statusLabel || !button) {
            return;
        }

        statusLabel.style.display = hasSubmitted ? 'inline' : 'none';
        button.disabled = hasSubmitted;
        button.classList.toggle('btn-secondary', hasSubmitted);
        button.classList.toggle('btn-primary', !hasSubmitted);
        button.style.opacity = hasSubmitted ? '0.7' : '1';
        button.style.cursor = hasSubmitted ? 'not-allowed' : 'pointer';

        if (hasSubmitted) {
            button.innerHTML = '<i class="fas fa-check-circle"></i> Week Check Submitted';
        } else {
            button.innerHTML = '<i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check';
        }
    }

    getCurrentWeekEnding() {
        const now = new Date();
        const day = now.getDay();
        const sunday = new Date(now);

        if (day !== 0) {
            sunday.setDate(now.getDate() + (7 - day));
        }

        sunday.setHours(0, 0, 0, 0);
        return sunday;
    }

    getFallbackChecks() {
        return [
            {
                check_id: 'CHK-001',
                vehicle_registration: 'LKA-1234',
                status: 'approved',
                odometer_reading: 45100,
                week_start_date: '2026-04-01',
                week_end_date: '2026-04-07',
                notes: 'All checks passed',
            },
            {
                check_id: 'CHK-002',
                vehicle_registration: 'LKA-1234',
                status: 'pending',
                odometer_reading: 45220,
                week_start_date: '2026-04-08',
                week_end_date: '2026-04-14',
                notes: 'Awaiting supervisor review',
            },
        ];
    }
}

customElements.define('driver-vehicle-check', DriverVehicleCheck);
