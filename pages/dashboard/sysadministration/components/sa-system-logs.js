class SASystemLogs extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentLogTypeFilter = 'all';
        this.render();
        this.bindEvents();
        this.updateLogCount();
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
                    <span id="logCount" class="status-text status-normal">0 logs</span>
                </div>

                <div id="logsList">
                    ${this.renderLog('Oct 18, 2025 - 11:45 AM', 'User Login', 'john.smith@company.com (EMP-001)', 'Successful login from IP 192.168.1.45', 'Authentication', 'login')}
                    ${this.renderLog('Oct 18, 2025 - 11:30 AM', 'Permission Updated', 'System Admin (SA-001)', 'Modified access rights for Technical Officer role', 'User Management', 'permission')}
                    ${this.renderLog('Oct 18, 2025 - 10:15 AM', 'Failed Login Attempt', 'robert.williams@company.com (EMP-004)', 'Account suspended - login denied from IP 192.168.1.78', 'Authentication', 'error', 'error')}
                    ${this.renderLog('Oct 18, 2025 - 9:20 AM', 'Configuration Change', 'System Admin (SA-001)', 'Updated petty cash limit for Supervisor role from LKR 400 to LKR 500', 'System Configuration', 'config')}
                    ${this.renderLog('Oct 18, 2025 - 8:45 AM', 'User Account Created', 'System Admin (SA-001)', 'New Technical Officer account created (EMP-015)', 'User Management', 'user')}
                    ${this.renderLog('Oct 18, 2025 - 7:30 AM', 'System Backup', 'Automated System', 'Daily backup completed - 2.3 GB backed up successfully', 'System Maintenance', 'error', 'warning')}
                </div>

                <div id="noLogsMessage" style="display: none; text-align: center; color: var(--muted); padding: 20px;">
                    No logs found for this filter
                </div>
            </div>
        `;
    }

    renderLog(timestamp, event, user, details, module, type, extraClass = '') {
        const className = extraClass ? `log-entry ${extraClass}` : 'log-entry';
        return `
            <div class="${className}" data-type="${type}" data-module="${module}">
                <div class="log-timestamp">${timestamp}</div>
                <div><strong>Event:</strong> ${event}</div>
                <div><strong>User:</strong> ${user}</div>
                <div><strong>Details:</strong> ${details}</div>
                <div><strong>Module:</strong> ${module}</div>
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
            this.applyLogFilters();
        });
    }

    setActiveFilterButton(group, activeButton) {
        if (!group) {
            return;
        }

        group.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
        activeButton.classList.add('active');
    }

    applyLogFilters() {
        const logs = this.querySelectorAll('#logsList .log-entry');
        const noLogsMessage = this.querySelector('#noLogsMessage');
        const logsListDiv = this.querySelector('#logsList');
        const searchValue = (this.querySelector('#logSearch')?.value || '').toLowerCase();

        let visibleCount = 0;

        logs.forEach((log) => {
            const typeMatch = this.currentLogTypeFilter === 'all' || log.dataset.type === this.currentLogTypeFilter;
            const searchMatch = !searchValue || log.textContent.toLowerCase().includes(searchValue);
            const show = typeMatch && searchMatch;

            log.style.display = show ? '' : 'none';
            if (show) {
                visibleCount += 1;
            }
        });

        if (logsListDiv) {
            logsListDiv.style.display = visibleCount === 0 ? 'none' : 'block';
        }

        if (noLogsMessage) {
            noLogsMessage.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        this.updateLogCount(visibleCount);
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
            const logs = Array.from(this.querySelectorAll('#logsList .log-entry'))
                .filter((entry) => entry.style.display !== 'none');

            if (logs.length === 0) {
                this.emitToast('No logs to export. Please adjust your filters.', 'warning');
                return;
            }

            let csvContent = 'Timestamp,Event,User,Details,Module\n';

            logs.forEach((log) => {
                const timestamp = log.querySelector('.log-timestamp')?.textContent?.trim() || '';
                const text = log.textContent || '';
                const eventMatch = text.match(/Event:\s*([^\n]+)/);
                const userMatch = text.match(/User:\s*([^\n]+)/);
                const detailsMatch = text.match(/Details:\s*([^\n]+)/);
                const moduleMatch = text.match(/Module:\s*([^\n]+)/);

                const escapeCsv = (value) => {
                    if (/[",\n]/.test(value)) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                };

                csvContent += `${escapeCsv(timestamp)},${escapeCsv(eventMatch ? eventMatch[1].trim() : '')},${escapeCsv(userMatch ? userMatch[1].trim() : '')},${escapeCsv(detailsMatch ? detailsMatch[1].trim() : '')},${escapeCsv(moduleMatch ? moduleMatch[1].trim() : '')}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            const filterType = this.currentLogTypeFilter === 'all' ? 'all' : this.currentLogTypeFilter;

            link.href = url;
            link.download = `system_logs_${filterType}_${dateStr}.csv`;
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

        this.emitToast('Clear logs functionality will be implemented with backend integration.', 'info');
    }
}

customElements.define('sa-system-logs', SASystemLogs);
