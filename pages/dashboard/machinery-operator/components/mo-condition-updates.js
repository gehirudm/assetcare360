class MOConditionUpdates extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.weeklyChecksMap = new Map();
        this.render();
        this.bindEvents();
        this.refresh();
    }

    setCurrentUser(user) {
        this.currentUser = user || null;
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Weekly Check Reports</h1>
                <p class="page-subtitle">Enter usage hours and observed conditions</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-weekly-check-modal">
                    <i class="fas fa-plus"></i> Submit Weekly Check Report
                </button>
            </div>

            <div class="filter-controls" id="weeklyCheckFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-filter="all">All Updates</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="pending">Pending</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="approved">Approved</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-filter="rejected">Rejected</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-edit"></i> Recent Weekly Check Reports</span>
                    <span class="status-text status-pending" data-weekly-summary>Loading...</span>
                </div>
                <div id="weeklyCheckReportsList" class="inventory-list"></div>
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
            if (action === 'open-weekly-check-modal') {
                document.dispatchEvent(new CustomEvent('mo:open-condition-update-modal'));
                return;
            }

            if (action === 'set-filter') {
                this.applyFilter(actionEl.dataset.filter);
                return;
            }

            if (action === 'view-weekly-check') {
                const checkId = actionEl.dataset.checkId;
                const check = this.weeklyChecksMap.get(checkId) || null;
                document.dispatchEvent(new CustomEvent('mo:open-weekly-check-details', {
                    detail: { checkId, check },
                }));
            }
        });
    }

    async refresh() {
        const list = this.querySelector('#weeklyCheckReportsList');
        if (!list || typeof API === 'undefined') {
            return;
        }

        list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">Loading weekly check reports...</div>';

        try {
            const response = await API.get('/machine-weekly-checks');
            const checks = response?.status === 'success' && response.data?.checks ? response.data.checks : [];
            this.weeklyChecksMap.clear();

            if (!checks.length) {
                list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--stone-400);">No weekly check reports found</div>';
                this.updateSummary([]);
                return;
            }

            list.innerHTML = checks.map((check) => {
                this.weeklyChecksMap.set(check.check_id, check);
                return this.renderCheckCard(check);
            }).join('');

            this.applyFilter(this.currentFilter);
            this.updateSummary(checks);
        } catch (error) {
            console.error('Error loading weekly check reports:', error);
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error loading weekly check reports</div>';
        }
    }

    renderCheckCard(check) {
        const submittedDate = window.MOUtils.formatDate(check.submitted_date);
        const conditionLabel = check.overall_condition
            ? `${check.overall_condition.charAt(0).toUpperCase()}${check.overall_condition.slice(1)}`
            : 'N/A';

        let statusLabel = 'Pending';
        let statusClass = 'status-pending';
        if (check.status === 'approved') {
            statusLabel = 'Approved';
            statusClass = 'status-approved';
        } else if (check.status === 'rejected') {
            statusLabel = 'Rejected';
            statusClass = 'status-rejected';
        }

        return `
            <div class="inventory-item" data-status="${check.status || 'pending'}">
                <div class="item-details">
                    <strong><i class="fas fa-clipboard-check"></i> ${check.check_id}</strong>
                    <div class="item-meta">
                        <i class="fas fa-cogs"></i> ${check.machine_name || `Machine ID: ${check.machine_id}`} |
                        <i class="fas fa-calendar"></i> ${submittedDate}
                    </div>
                    <div class="item-description">
                        <span class="status-text ${statusClass}">${statusLabel}</span> |
                        Condition: ${conditionLabel}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary btn-small" type="button" data-action="view-weekly-check" data-check-id="${check.check_id}">
                        <i class="fas fa-eye"></i> VIEW
                    </button>
                </div>
            </div>
        `;
    }

    applyFilter(filter) {
        this.currentFilter = filter || 'all';

        this.querySelectorAll('#weeklyCheckReportsList .inventory-item').forEach((item) => {
            const status = item.dataset.status || 'pending';
            item.style.display = this.currentFilter === 'all' || status === this.currentFilter ? 'flex' : 'none';
        });

        this.querySelectorAll('#weeklyCheckFilterControls .filter-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    updateSummary(checks) {
        const summary = this.querySelector('[data-weekly-summary]');
        if (!summary) {
            return;
        }

        const pendingCount = checks.filter((item) => item.status === 'pending').length;
        summary.textContent = `${pendingCount} pending review`;
    }
}

customElements.define('mo-condition-updates', MOConditionUpdates);
