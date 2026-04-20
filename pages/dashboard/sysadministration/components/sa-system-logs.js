class SASystemLogs extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.logs = [];
        this.visibleLogs = [];
        this.loading = false;
        this.currentLogTypeFilter = 'all';
        this.render();
        this.bindEvents();
        this.loadLogs();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">System Logs</h1>
                <p class="page-subtitle">View system events and activities</p>
            </div>

            <div style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-secondary" type="button" data-action="export-logs">
                    <i class="fas fa-download"></i> Export Logs
                </button>
                <button class="btn btn-danger" type="button" data-action="clear-logs">
                    <i class="fas fa-trash"></i> Clear Old Logs
                </button>
            </div>

            <div class="filter-controls" id="logFilterTabs" data-filter-group="log-type">
                <button class="filter-btn active" type="button" data-filter="all">All Logs</button>
                <button class="filter-btn" type="button" data-filter="login">Login Events</button>
                <button class="filter-btn" type="button" data-filter="config">Configuration Changes</button>
                <button class="filter-btn" type="button" data-filter="user">User Management</button>
                <button class="filter-btn" type="button" data-filter="permission">Permission Changes</button>
                <button class="filter-btn" type="button" data-filter="error">Errors</button>
            </div>

            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Search logs by user, action, or module..." id="logSearch">
                <select class="filter-select" id="logDateFilter">
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            <div class="card">
                <div class="card-header">
                    <span><i class="fas fa-clipboard-list"></i> System Event Logs</span>
                    <span id="logCount" class="status-text status-normal">Loading...</span>
                </div>

                <div id="logsList">
                    <div class="log-entry">
                        <div class="log-timestamp">Loading system logs...</div>
                        <div>Please wait while we fetch the latest tracked events.</div>
                    </div>
                </div>

                <div id="noLogsMessage" style="display: none; text-align: center; color: var(--muted); padding: 20px;">
                    No logs found for this filter
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            if (button.dataset.filter) {
                this.currentLogTypeFilter = button.dataset.filter;
                this.setActiveFilterButton(button.closest('[data-filter-group]'), button);
                this.applyLogFilters();
                return;
            }

            if (button.dataset.action === 'export-logs') {
                this.exportLogs();
                return;
            }

            if (button.dataset.action === 'clear-logs') {
                this.clearLogs();
            }
        });

        this.querySelector('#logSearch')?.addEventListener('input', () => {
            this.applyLogFilters();
        });

        this.querySelector('#logDateFilter')?.addEventListener('change', () => {
            this.loadLogs();
        });
    }

    async loadLogs() {
        const period = this.querySelector('#logDateFilter')?.value || 'today';
        this.setLoadingState(true);

        try {
            const response = await API.get(`/logs?period=${encodeURIComponent(period)}&limit=500`);
            const logs = this.extractLogs(response);

            this.logs = logs;
            this.applyLogFilters();
        } catch (error) {
            console.error('Failed to load system logs:', error);
            this.logs = [];
            this.visibleLogs = [];
            this.renderLogs();
            this.emitToast('Failed to load system logs.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    extractLogs(response) {
        if (!response || response.status !== 'success') {
            return [];
        }

        const logs = response.data?.logs;
        return Array.isArray(logs) ? logs : [];
    }

    setLoadingState(isLoading) {
        this.loading = isLoading;

        const logCount = this.querySelector('#logCount');
        if (logCount && isLoading) {
            logCount.textContent = 'Loading...';
        }

        if (isLoading) {
            const logsList = this.querySelector('#logsList');
            if (logsList) {
                logsList.style.display = 'block';
                logsList.innerHTML = `
                    <div class="log-entry">
                        <div class="log-timestamp">Loading system logs...</div>
                        <div>Please wait while we fetch the latest tracked events.</div>
                    </div>
                `;
            }
        }
    }

    applyLogFilters() {
        const searchValue = (this.querySelector('#logSearch')?.value || '').toLowerCase().trim();

        this.visibleLogs = this.logs.filter((log) => {
            const typeMatch = this.matchesTypeFilter(log);
            const searchMatch = this.matchesSearch(log, searchValue);
            return typeMatch && searchMatch;
        });

        this.renderLogs();
    }

    matchesTypeFilter(log) {
        const type = this.resolveLogType(log);
        return this.currentLogTypeFilter === 'all' || this.currentLogTypeFilter === type;
    }

    matchesSearch(log, searchValue) {
        if (!searchValue) {
            return true;
        }

        const haystack = [
            log.action,
            log.category,
            log.endpoint,
            log.method,
            log.user_name,
            log.employee_id,
            log.user_role,
            log.ip_address,
        ]
            .map((value) => String(value || '').toLowerCase())
            .join(' ');

        return haystack.includes(searchValue);
    }

    resolveLogType(log) {
        const action = String(log.action || '').toLowerCase();
        const category = String(log.category || '').toLowerCase();
        const endpoint = String(log.endpoint || '').toLowerCase();
        const responseCode = Number.parseInt(log.response_code, 10);

        if (Number.isFinite(responseCode) && responseCode >= 400) {
            return 'error';
        }

        if (action.includes('login') || endpoint.includes('/auth')) {
            return 'login';
        }

        if (action.includes('permission') || action.includes('role')) {
            return 'permission';
        }

        if (category.includes('user management')) {
            return 'user';
        }

        if (
            action.includes('config') ||
            category.includes('system administration') ||
            endpoint.includes('/system-settings')
        ) {
            return 'config';
        }

        return 'all';
    }

    renderLogs() {
        const logsListDiv = this.querySelector('#logsList');
        const noLogsMessage = this.querySelector('#noLogsMessage');

        if (!logsListDiv || !noLogsMessage) {
            return;
        }

        if (this.visibleLogs.length === 0) {
            logsListDiv.innerHTML = '';
            logsListDiv.style.display = 'none';
            noLogsMessage.style.display = this.loading ? 'none' : 'block';
            this.updateLogCount(0);
            return;
        }

        noLogsMessage.style.display = 'none';
        logsListDiv.style.display = 'block';
        logsListDiv.innerHTML = this.visibleLogs
            .sort((a, b) => this.parseDate(b.created_at) - this.parseDate(a.created_at))
            .map((log) => this.renderLog(log))
            .join('');

        this.updateLogCount(this.visibleLogs.length);
    }

    renderLog(log) {
        const responseCode = Number.parseInt(log.response_code, 10);
        let extraClass = '';

        if (Number.isFinite(responseCode) && responseCode >= 500) {
            extraClass = 'error';
        } else if (Number.isFinite(responseCode) && responseCode >= 400) {
            extraClass = 'warning';
        }

        const className = extraClass ? `log-entry ${extraClass}` : 'log-entry';
        const event = log.action || `${log.method || 'API'} ${log.endpoint || ''}`;
        const user = this.getUserLabel(log);
        const details = this.buildDetails(log);
        const module = log.category || 'Uncategorized';

        return `
            <div class="${className}" data-type="${this.escapeHtml(this.resolveLogType(log))}" data-module="${this.escapeHtml(module)}">
                <div class="log-timestamp">${this.escapeHtml(this.formatTimestamp(log.created_at))}</div>
                <div><strong>Event:</strong> ${this.escapeHtml(event)}</div>
                <div><strong>User:</strong> ${this.escapeHtml(user)}</div>
                <div><strong>Details:</strong> ${this.escapeHtml(details)}</div>
                <div><strong>Module:</strong> ${this.escapeHtml(module)}</div>
            </div>
        `;
    }

    buildDetails(log) {
        const method = log.method || 'N/A';
        const endpoint = log.endpoint || 'N/A';
        const responseCode = Number.parseInt(log.response_code, 10);
        const codeLabel = Number.isFinite(responseCode) ? responseCode : '-';

        return `${method} ${endpoint} · HTTP ${codeLabel}`;
    }

    getUserLabel(log) {
        const userName = String(log.user_name || '').trim();
        const employeeId = String(log.employee_id || '').trim();

        if (userName && employeeId) {
            return `${userName} (${employeeId})`;
        }

        if (userName) {
            return userName;
        }

        if (employeeId) {
            return employeeId;
        }

        return 'System';
    }

    parseDate(value) {
        const parsed = new Date(value || 0);
        const timestamp = parsed.getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    formatTimestamp(value) {
        const timestamp = this.parseDate(value);
        if (!timestamp) {
            return 'Unknown time';
        }

        return new Date(timestamp).toLocaleString();
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    setActiveFilterButton(group, activeButton) {
        if (!group) {
            return;
        }

        group.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
        activeButton.classList.add('active');
    }

    updateLogCount(overrideCount) {
        const count = Number.isInteger(overrideCount)
            ? overrideCount
            : Array.from(this.querySelectorAll('#logsList .log-entry')).filter((entry) => entry.style.display !== 'none').length;

        const logCount = this.querySelector('#logCount');
        if (logCount) {
            logCount.textContent = `${count} log${count !== 1 ? 's' : ''}`;
        }
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    exportLogs() {
        try {
            const logs = this.visibleLogs;

            if (logs.length === 0) {
                this.emitToast('No logs to export. Please adjust your filters.', 'warning');
                return;
            }

            let csvContent = 'Timestamp,Event,User,Details,Module,ResponseCode\n';

            logs.forEach((log) => {
                const timestamp = this.formatTimestamp(log.created_at);
                const eventValue = log.action || `${log.method || 'API'} ${log.endpoint || ''}`;
                const userValue = this.getUserLabel(log);
                const detailsValue = this.buildDetails(log);
                const moduleValue = log.category || 'Uncategorized';
                const responseCode = Number.parseInt(log.response_code, 10);
                const responseCodeValue = Number.isFinite(responseCode) ? String(responseCode) : '';

                const escapeCsv = (value) => {
                    if (/[",\n]/.test(value)) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                };

                csvContent += `${escapeCsv(timestamp)},${escapeCsv(eventValue)},${escapeCsv(userValue)},${escapeCsv(detailsValue)},${escapeCsv(moduleValue)},${escapeCsv(responseCodeValue)}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            const filterType = this.currentLogTypeFilter === 'all' ? 'all' : this.currentLogTypeFilter;
            const period = this.querySelector('#logDateFilter')?.value || 'today';

            link.href = url;
            link.download = `system_logs_${period}_${filterType}_${dateStr}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            this.emitToast(`${logs.length} log entries exported successfully!`, 'success');
        } catch (error) {
            console.error('Error exporting logs:', error);
            this.emitToast('Error exporting logs. Please try again.', 'error');
        }
    }

    clearLogs() {
        const confirmed = window.confirm('Are you sure you want to clear old logs? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        this.emitToast('Clear logs endpoint is not configured yet. Tracking and filtering remain available.', 'info');
    }
}

customElements.define('sa-system-logs', SASystemLogs);
