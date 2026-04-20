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

    disconnectedCallback() {
        if (this._boundOutsideClick) {
            document.removeEventListener('click', this._boundOutsideClick);
        }
    }

    setCurrentUser(user) {
        this.currentUser = user || null;
    }

    normalizeCheckStatus(status) {
        const value = String(status || '').trim().toLowerCase();
        if (value === 'approved') {
            return 'approved';
        }
        if (value === 'rejected') {
            return 'rejected';
        }
        return 'pending';
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
                return;
            }

            if (action === 'toggle-dropdown') {
                event.stopPropagation();
                this.toggleDropdown(actionEl.dataset.menuId);
                return;
            }

            if (action === 'edit-weekly-check') {
                this.closeDropdownMenus();

                const checkId = actionEl.dataset.checkId;
                const check = this.weeklyChecksMap.get(checkId) || null;
                const normalizedStatus = this.normalizeCheckStatus(check?.status);
                if (!check || normalizedStatus !== 'pending') {
                    window.MOUtils.emitToast(`Edit is only available while the weekly check is Pending. Current status: ${check?.status || 'Unknown'}.`, 'warning');
                    return;
                }

                document.dispatchEvent(new CustomEvent('mo:open-weekly-check-edit', {
                    detail: { checkId, check },
                }));
            }
        });

        this._boundOutsideClick = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                this.closeDropdownMenus();
            }
        };

        document.addEventListener('click', this._boundOutsideClick);
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
        const normalizedStatus = this.normalizeCheckStatus(check.status);
        const submittedDate = window.MOUtils.formatDate(check.submitted_date);
        const conditionLabel = check.overall_condition
            ? `${check.overall_condition.charAt(0).toUpperCase()}${check.overall_condition.slice(1)}`
            : 'N/A';

        let statusLabel = 'Pending';
        let statusClass = 'status-pending';
        if (normalizedStatus === 'approved') {
            statusLabel = 'Approved';
            statusClass = 'status-approved';
        } else if (normalizedStatus === 'rejected') {
            statusLabel = 'Rejected';
            statusClass = 'status-rejected';
        }

        const isEditable = normalizedStatus === 'pending';
        const safeStatusLabel = String(check.status || 'pending').replace(/"/g, '&quot;');

        return `
            <div class="inventory-item" data-status="${normalizedStatus}">
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
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" type="button" data-action="view-weekly-check" data-check-id="${check.check_id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        <div class="dropdown-container">
                            <button class="btn btn-small btn-secondary dropdown-trigger" type="button" data-action="toggle-dropdown" data-menu-id="weekly-check-menu-${check.check_id}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu" id="weekly-check-menu-${check.check_id}">
                                <button class="dropdown-item" type="button" data-action="edit-weekly-check" data-check-id="${check.check_id}" data-editable="${isEditable ? 'true' : 'false'}" data-check-status="${safeStatusLabel}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    applyFilter(filter) {
        this.currentFilter = filter || 'all';
        this.closeDropdownMenus();

        this.querySelectorAll('#weeklyCheckReportsList .inventory-item').forEach((item) => {
            const status = item.dataset.status || 'pending';
            item.style.display = this.currentFilter === 'all' || status === this.currentFilter ? 'flex' : 'none';
        });

        this.querySelectorAll('#weeklyCheckFilterControls .filter-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    toggleDropdown(menuId) {
        const menu = this.querySelector(`#${menuId}`);
        if (!menu) {
            return;
        }

        const isActive = menu.classList.contains('active');
        this.closeDropdownMenus();

        if (!isActive) {
            menu.classList.add('active');
            menu.style.display = 'block';
        }
    }

    closeDropdownMenus() {
        this.querySelectorAll('.dropdown-menu').forEach((menu) => {
            menu.classList.remove('active', 'show');
            menu.style.display = 'none';
        });
    }

    updateSummary(checks) {
        const summary = this.querySelector('[data-weekly-summary]');
        if (!summary) {
            return;
        }

        const pendingCount = checks.filter((item) => this.normalizeCheckStatus(item.status) === 'pending').length;
        summary.textContent = `${pendingCount} pending review`;
    }
}

customElements.define('mo-condition-updates', MOConditionUpdates);
