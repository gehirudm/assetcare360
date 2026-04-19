class SAActivityTracking extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.loading = false;
        this.currentRoleFilter = 'all';
        this.activityLogs = [];
        this.todayLogs = [];
        this.users = [];
        this.activeUsers = [];
        this.userActivitySummaries = [];
        this.inactiveUsers = [];
        this.activeUsersByEmployeeId = new Map();
        this.activitySummariesByEmployeeId = new Map();

        this.render();
        this.bindEvents();
        this.loadActivityData();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">User Activity Tracking</h1>
                <p class="page-subtitle">Monitor real-time user activity and generate reports</p>
            </div>

            <div class="filter-controls" id="activityFilterTabs" data-filter-group="activity-role">
                <button class="filter-btn active" type="button" data-role-filter="all">All Users</button>
                <button class="filter-btn" type="button" data-role-filter="Admin">Admin</button>
                <button class="filter-btn" type="button" data-role-filter="Supervisor">Supervisor</button>
                <button class="filter-btn" type="button" data-role-filter="Inventory Manager">Inventory Manager</button>
                <button class="filter-btn" type="button" data-role-filter="Technical Officer">Technical Officer</button>
                <button class="filter-btn" type="button" data-role-filter="Driver">Driver</button>
                <button class="filter-btn" type="button" data-role-filter="Machinery Operator">Machinery Operator</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span>🟢 Currently Active Users</span>
                    <span id="activeUserCount" class="status-text status-normal">Loading...</span>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Login Time</th>
                            <th>IP Address</th>
                            <th>Current Activity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="activeUsersList">
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--muted);">Loading active user sessions...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-bar"></i> Activity Summary (Last 24 Hours)</div>
                <div class="grid">
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--kelly-green);" id="summaryUniqueLogins">0</div>
                        <div class="stat-label">Unique Logins</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--royal-blue);" id="summaryTotalActions">0</div>
                        <div class="stat-label">Total Actions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--danger);" id="summaryFailedLogins">0</div>
                        <div class="stat-label">Failed Login Attempts</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-line"></i> Detailed User Activity</div>
                <div class="search-bar">
                    <input type="text" class="search-input" placeholder="Search by user name or employee ID..." id="activityUserSearch">
                    <select class="filter-select" id="activityDateFilter">
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>

                <div id="detailedActivityList">
                    <div class="notification-item info">
                        <span class="notification-icon"><i class="fas fa-spinner"></i></span>
                        <div>Loading detailed user activity...</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-exclamation-triangle"></i> User Inactivity Report</div>
                <div id="inactiveUsersList">
                    <div class="notification-item info">
                        <span class="notification-icon"><i class="fas fa-spinner"></i></span>
                        <div>Loading inactivity report...</div>
                    </div>
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

            if (button.dataset.roleFilter) {
                this.currentRoleFilter = button.dataset.roleFilter;
                this.setActiveFilterButton(button.closest('[data-filter-group]'), button);
                this.applyFilters();
                return;
            }

            const action = button.dataset.action;
            const employeeId = button.dataset.employeeId;

            if (action === 'view-session') {
                this.openUserSession(employeeId);
                return;
            }

            if (action === 'force-logout') {
                this.forceLogout(employeeId);
                return;
            }

            if (action === 'full-log') {
                this.openFullActivityLog(employeeId);
                return;
            }

            if (action === 'generate-report') {
                this.downloadUserActivityReport(employeeId);
                return;
            }

            if (action === 'send-reminder') {
                this.emitToast(`Inactivity reminder sent to ${employeeId}`, 'success');
                return;
            }

            if (action === 'view-user') {
                if (typeof window.viewUserDetails === 'function') {
                    window.viewUserDetails(employeeId);
                } else {
                    this.emitToast(`Viewing user details for ${employeeId}`, 'info');
                }
                return;
            }

            if (action === 'close-details') {
                this.closeModal('detailsModal');
            }
        });

        this.querySelector('#activityUserSearch')?.addEventListener('input', () => {
            this.applyFilters();
        });

        this.querySelector('#activityDateFilter')?.addEventListener('change', () => {
            this.loadActivityData();
        });
    }

    async loadActivityData() {
        this.setLoadingState(true);
        const period = this.querySelector('#activityDateFilter')?.value || 'today';

        try {
            const [periodLogsResult, todayLogsResult, usersResult] = await Promise.allSettled([
                API.get(`/logs?period=${encodeURIComponent(period)}&limit=1000`),
                API.get('/logs?period=today&limit=1000'),
                API.get('/users?limit=200'),
            ]);

            this.activityLogs = this.extractLogs(periodLogsResult);
            this.todayLogs = this.extractLogs(todayLogsResult);
            this.users = this.extractUsers(usersResult);

            this.activeUsers = this.buildActiveUsers(this.todayLogs);
            this.userActivitySummaries = this.buildUserActivitySummaries(this.activityLogs);
            this.inactiveUsers = this.buildInactiveUsers(this.users, this.activityLogs);

            this.renderSummaryCards();
            this.applyFilters();

            const failedSources = [];
            if (periodLogsResult.status !== 'fulfilled') {
                failedSources.push('activity logs');
            }
            if (todayLogsResult.status !== 'fulfilled') {
                failedSources.push('active sessions');
            }
            if (usersResult.status !== 'fulfilled') {
                failedSources.push('users');
            }

            if (failedSources.length > 0) {
                this.emitToast(`Some activity data failed to load (${failedSources.join(', ')}).`, 'warning');
            }
        } catch (error) {
            console.error('Failed to load activity tracking data:', error);
            this.activityLogs = [];
            this.todayLogs = [];
            this.users = [];
            this.activeUsers = [];
            this.userActivitySummaries = [];
            this.inactiveUsers = [];
            this.renderSummaryCards();
            this.applyFilters();
            this.emitToast('Failed to load user activity tracking data.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        this.loading = isLoading;

        if (isLoading) {
            const countNode = this.querySelector('#activeUserCount');
            if (countNode) {
                countNode.textContent = 'Loading...';
            }
        }
    }

    extractLogs(result) {
        if (result.status !== 'fulfilled') {
            return [];
        }

        const response = result.value;
        if (!response || response.status !== 'success') {
            return [];
        }

        const logs = response.data?.logs;
        return Array.isArray(logs) ? logs : [];
    }

    extractUsers(result) {
        if (result.status !== 'fulfilled') {
            return [];
        }

        const response = result.value;
        if (!response || response.status !== 'success') {
            return [];
        }

        const users = response.data?.users;
        return Array.isArray(users) ? users : [];
    }

    parseDate(value) {
        const parsed = new Date(value || 0);
        const timestamp = parsed.getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    normalizeRole(role) {
        return String(role || '')
            .toLowerCase()
            .replace(/machinary/g, 'machinery')
            .replace(/\s+/g, ' ')
            .trim();
    }

    isRoleMatch(role) {
        if (this.currentRoleFilter === 'all') {
            return true;
        }

        return this.normalizeRole(role) === this.normalizeRole(this.currentRoleFilter);
    }

    isLoginEvent(log) {
        const action = String(log.action || '').toLowerCase();
        const endpoint = String(log.endpoint || '').toLowerCase();
        return action.includes('login') || endpoint.includes('/auth/login');
    }

    isSuccessfulResponse(responseCode) {
        const code = Number.parseInt(responseCode, 10);
        return Number.isFinite(code) && code < 400;
    }

    getUserKey(log) {
        if (log.user_id !== null && log.user_id !== undefined && String(log.user_id) !== '') {
            return `id:${log.user_id}`;
        }

        if (log.employee_id) {
            return `emp:${log.employee_id}`;
        }

        if (log.user_name) {
            return `name:${log.user_name}`;
        }

        return null;
    }

    buildUserReference(log) {
        const userId = log.user_id !== null && log.user_id !== undefined ? String(log.user_id) : '';
        const employeeId = (log.employee_id && String(log.employee_id).trim()) || (userId ? `USER-${userId}` : 'UNKNOWN');
        const name = (log.user_name && String(log.user_name).trim()) || employeeId;
        const role = (log.user_role && String(log.user_role).trim()) || 'Unknown';

        return { userId, employeeId, name, role };
    }

    toDisplayAction(log) {
        if (log.action) {
            return String(log.action);
        }

        const method = log.method || 'API';
        const endpoint = log.endpoint || '';
        return `${method} ${endpoint}`.trim();
    }

    formatDateTime(value) {
        const timestamp = this.parseDate(value);
        if (!timestamp) {
            return 'Unknown time';
        }

        return new Date(timestamp).toLocaleString();
    }

    formatRelativeTime(value) {
        const timestamp = this.parseDate(value);
        if (!timestamp) {
            return 'Unknown';
        }

        const diffMs = Date.now() - timestamp;
        const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

        if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        }

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    formatDurationSince(value) {
        const timestamp = this.parseDate(value);
        if (!timestamp) {
            return '-';
        }

        const diffMs = Math.max(0, Date.now() - timestamp);
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours <= 0) {
            return `${minutes}m`;
        }

        return `${hours}h ${minutes}m`;
    }

    getRoleStatusClass(role) {
        const normalized = this.normalizeRole(role);
        const mapping = {
            admin: 'status-admin',
            supervisor: 'status-supervisor',
            'inventory manager': 'status-inventory-manager',
            'maintenance manager': 'status-pending',
            'technical officer': 'status-approved',
            'transportation manager': 'status-normal',
            driver: 'status-normal',
            'machinery operator': 'status-active',
            'auction officer': 'status-inactive',
        };

        return mapping[normalized] || 'status-normal';
    }

    buildActiveUsers(logs) {
        const grouped = new Map();

        logs.forEach((log) => {
            const key = this.getUserKey(log);
            if (!key) {
                return;
            }

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }

            grouped.get(key).push(log);
        });

        const thresholdMs = 30 * 60 * 1000;
        const now = Date.now();

        const active = Array.from(grouped.values())
            .map((userLogs) => {
                const sortedLogs = [...userLogs].sort((a, b) => this.parseDate(b.created_at) - this.parseDate(a.created_at));
                const latestLog = sortedLogs[0];
                const latestTimestamp = this.parseDate(latestLog.created_at);

                if (!latestTimestamp || now - latestTimestamp > thresholdMs) {
                    return null;
                }

                const reference = this.buildUserReference(latestLog);
                const loginLog = sortedLogs.find((log) => this.isLoginEvent(log) && this.isSuccessfulResponse(log.response_code));
                const loginTimestamp = loginLog ? this.parseDate(loginLog.created_at) : latestTimestamp;

                return {
                    employeeId: reference.employeeId,
                    name: reference.name,
                    role: reference.role,
                    loginAt: loginTimestamp,
                    latestAt: latestTimestamp,
                    ipAddress: latestLog.ip_address || '-',
                    currentActivity: this.toDisplayAction(latestLog),
                    logs: sortedLogs,
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.latestAt - a.latestAt);

        this.activeUsersByEmployeeId = new Map(active.map((entry) => [entry.employeeId, entry]));
        return active;
    }

    buildUserActivitySummaries(logs) {
        const grouped = new Map();

        logs.forEach((log) => {
            const key = this.getUserKey(log);
            if (!key) {
                return;
            }

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }

            grouped.get(key).push(log);
        });

        const summaries = Array.from(grouped.values())
            .map((userLogs) => {
                const sortedLogs = [...userLogs].sort((a, b) => this.parseDate(b.created_at) - this.parseDate(a.created_at));
                const latestLog = sortedLogs[0];
                const reference = this.buildUserReference(latestLog);

                const timeline = sortedLogs.slice(0, 3).map((log) => ({
                    timestamp: log.created_at,
                    action: this.toDisplayAction(log),
                    category: log.category || 'General',
                    status: Number.parseInt(log.response_code, 10),
                }));

                return {
                    employeeId: reference.employeeId,
                    name: reference.name,
                    role: reference.role,
                    totalActions: sortedLogs.length,
                    failedActions: sortedLogs.filter((log) => Number.parseInt(log.response_code, 10) >= 400).length,
                    lastActivityAt: this.parseDate(latestLog.created_at),
                    timeline,
                    logs: sortedLogs,
                };
            })
            .sort((a, b) => b.lastActivityAt - a.lastActivityAt);

        this.activitySummariesByEmployeeId = new Map(summaries.map((summary) => [summary.employeeId, summary]));
        return summaries;
    }

    buildInactiveUsers(users, logs) {
        const activeUserIds = new Set();
        const activeEmployeeIds = new Set();

        logs.forEach((log) => {
            if (log.user_id !== null && log.user_id !== undefined && String(log.user_id) !== '') {
                activeUserIds.add(String(log.user_id));
            }
            if (log.employee_id) {
                activeEmployeeIds.add(String(log.employee_id));
            }
        });

        return users
            .filter((user) => Number.parseInt(user.is_active, 10) === 1)
            .filter((user) => {
                const userId = String(user.id ?? '');
                const employeeId = String(user.employee_id ?? '');
                return !activeUserIds.has(userId) && !activeEmployeeIds.has(employeeId);
            })
            .slice(0, 5)
            .map((user) => ({
                employeeId: user.employee_id,
                name: user.full_name || user.employee_id,
                role: user.role || 'Unknown',
                lastActivityLabel: 'No activity in selected window',
            }));
    }

    renderSummaryCards() {
        const uniqueLogins = new Set(
            this.activityLogs
                .filter((log) => this.isLoginEvent(log) && this.isSuccessfulResponse(log.response_code))
                .map((log) => this.getUserKey(log))
                .filter(Boolean)
        ).size;

        const failedLogins = this.activityLogs.filter((log) => this.isLoginEvent(log) && Number.parseInt(log.response_code, 10) >= 400).length;
        const totalActions = this.activityLogs.length;

        const uniqueLoginsNode = this.querySelector('#summaryUniqueLogins');
        const totalActionsNode = this.querySelector('#summaryTotalActions');
        const failedLoginsNode = this.querySelector('#summaryFailedLogins');

        if (uniqueLoginsNode) {
            uniqueLoginsNode.textContent = String(uniqueLogins);
        }
        if (totalActionsNode) {
            totalActionsNode.textContent = String(totalActions);
        }
        if (failedLoginsNode) {
            failedLoginsNode.textContent = String(failedLogins);
        }
    }

    applyFilters() {
        const searchValue = (this.querySelector('#activityUserSearch')?.value || '').toLowerCase().trim();

        const activeUsers = this.activeUsers.filter((user) => {
            const roleMatch = this.isRoleMatch(user.role);
            const searchMatch = !searchValue || `${user.name} ${user.employeeId}`.toLowerCase().includes(searchValue);
            return roleMatch && searchMatch;
        });

        const detailedUsers = this.userActivitySummaries.filter((summary) => {
            const roleMatch = this.isRoleMatch(summary.role);
            const searchMatch = !searchValue || `${summary.name} ${summary.employeeId}`.toLowerCase().includes(searchValue);
            return roleMatch && searchMatch;
        });

        const inactiveUsers = this.inactiveUsers.filter((user) => {
            const roleMatch = this.isRoleMatch(user.role);
            const searchMatch = !searchValue || `${user.name} ${user.employeeId}`.toLowerCase().includes(searchValue);
            return roleMatch && searchMatch;
        });

        this.renderActiveUsers(activeUsers);
        this.renderDetailedActivities(detailedUsers);
        this.renderInactiveUsers(inactiveUsers);
        this.updateActiveUserCount(activeUsers.length);
    }

    renderActiveUsers(rows) {
        const tbody = this.querySelector('#activeUsersList');
        if (!tbody) {
            return;
        }

        if (rows.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--muted);">No active users match the selected filters.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = rows.map((row) => this.renderActiveUserRow(row)).join('');
    }

    renderDetailedActivities(summaries) {
        const container = this.querySelector('#detailedActivityList');
        if (!container) {
            return;
        }

        if (summaries.length === 0) {
            container.innerHTML = `
                <div class="notification-item info">
                    <span class="notification-icon"><i class="fas fa-info-circle"></i></span>
                    <div>No detailed activity found for the selected filters.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = summaries.map((summary) => this.renderDetailedActivity(summary)).join('');
    }

    renderInactiveUsers(users) {
        const container = this.querySelector('#inactiveUsersList');
        if (!container) {
            return;
        }

        if (users.length === 0) {
            container.innerHTML = `
                <div class="notification-item success">
                    <span class="notification-icon"><i class="fas fa-check-circle"></i></span>
                    <div>All active users have activity in the selected period.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = users.map((user) => `
            <div class="notification-item warning">
                <span class="notification-icon"><i class="fas fa-clock"></i></span>
                <div>
                    <strong>No Recent Activity:</strong> ${this.escapeHtml(user.name)} (${this.escapeHtml(user.employeeId)})
                    <div style="margin-top: 3px; color: var(--muted); font-size: 0.9rem;">${this.escapeHtml(user.lastActivityLabel)}</div>
                    <div style="margin-top: 5px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-small" type="button" data-action="view-user" data-employee-id="${this.escapeHtml(user.employeeId)}">View User</button>
                        <button class="btn btn-warning btn-small" type="button" data-action="send-reminder" data-employee-id="${this.escapeHtml(user.employeeId)}">Send Reminder</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderActiveUserRow(user) {
        return `
            <tr data-role="${this.escapeHtml(user.role)}">
                <td>${this.escapeHtml(user.name)} (${this.escapeHtml(user.employeeId)})</td>
                <td><span class="status-text ${this.getRoleStatusClass(user.role)}">${this.escapeHtml(user.role)}</span></td>
                <td>${this.escapeHtml(this.formatDateTime(user.loginAt))} (${this.escapeHtml(this.formatDurationSince(user.loginAt))})</td>
                <td>${this.escapeHtml(user.ipAddress)}</td>
                <td>${this.escapeHtml(user.currentActivity)}</td>
                <td>
                    <button class="btn btn-secondary btn-small" type="button" data-action="view-session" data-employee-id="${this.escapeHtml(user.employeeId)}">View Session</button>
                    <button class="btn btn-danger btn-small" type="button" data-action="force-logout" data-employee-id="${this.escapeHtml(user.employeeId)}">Force Logout</button>
                </td>
            </tr>
        `;
    }

    renderDetailedActivity(summary) {
        const timelineMarkup = summary.timeline.map((entry) => {
            const code = Number.isFinite(entry.status) ? `HTTP ${entry.status}` : 'HTTP -';
            return `• ${this.escapeHtml(this.formatDateTime(entry.timestamp))} - ${this.escapeHtml(entry.action)} (${this.escapeHtml(entry.category)} · ${this.escapeHtml(code)})`;
        }).join('<br>');

        return `
            <div class="user-item">
                <div class="user-details">
                    <strong>${this.escapeHtml(summary.name)} (${this.escapeHtml(summary.employeeId)})</strong>
                    <div class="user-meta">Role: ${this.escapeHtml(summary.role)}</div>
                    <div class="user-meta">Total Actions: ${this.escapeHtml(summary.totalActions)} | Failed: ${this.escapeHtml(summary.failedActions)} | Last Activity: ${this.escapeHtml(this.formatRelativeTime(summary.lastActivityAt))}</div>
                    <div class="user-meta" style="margin-top: 5px;">
                        <strong>Activity Timeline:</strong><br>
                        ${timelineMarkup || 'No timeline entries available'}
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary btn-small" type="button" data-action="full-log" data-employee-id="${this.escapeHtml(summary.employeeId)}">Full Log</button>
                    <button class="btn btn-primary btn-small" type="button" data-action="generate-report" data-employee-id="${this.escapeHtml(summary.employeeId)}">Generate Report</button>
                </div>
            </div>
        `;
    }

    setActiveFilterButton(group, activeButton) {
        if (!group) {
            return;
        }

        group.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
        activeButton.classList.add('active');
    }

    updateActiveUserCount(overrideCount) {
        const count = Number.isInteger(overrideCount)
            ? overrideCount
            : Array.from(this.querySelectorAll('#activeUsersList tr')).filter((row) => row.style.display !== 'none').length;

        const countNode = this.querySelector('#activeUserCount');
        if (countNode) {
            countNode.textContent = `${count} active`;
        }
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    openModal(modalId) {
        if (typeof window.openModal === 'function') {
            window.openModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        if (typeof window.closeModal === 'function') {
            window.closeModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    openDetailsModal(titleText, contentHtml, onReady) {
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');

        if (!title || !content) {
            return;
        }

        title.textContent = titleText;
        content.innerHTML = contentHtml;

        if (typeof onReady === 'function') {
            onReady(content);
        }

        this.openModal('detailsModal');
    }

    openUserSession(employeeId) {
        const session = this.activeUsersByEmployeeId.get(employeeId);

        this.openDetailsModal(
            `Active Session Details: ${employeeId}`,
            `
                <div class="form-section">
                    <h5>User Information</h5>
                    <div style="background: var(--light-bg); padding: 15px; border-radius: 8px; margin-top: 10px;">
                        <strong>Name:</strong> ${this.escapeHtml(session?.name || employeeId)}<br>
                        <strong>Employee ID:</strong> ${this.escapeHtml(employeeId)}<br>
                        <strong>Role:</strong> ${this.escapeHtml(session?.role || 'Unknown')}<br>
                        <strong>Session Started:</strong> ${this.escapeHtml(this.formatDateTime(session?.loginAt))}<br>
                        <strong>Last Activity:</strong> ${this.escapeHtml(this.formatDateTime(session?.latestAt))}<br>
                        <strong>Current Activity:</strong> ${this.escapeHtml(session?.currentActivity || '-')}
                    </div>
                </div>
                <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn btn-secondary" data-action="close-details">Close</button>
                    <button type="button" class="btn btn-danger" data-action="force-logout" data-employee-id="${this.escapeHtml(employeeId)}">Force Logout</button>
                </div>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });
                content.querySelector('[data-action="force-logout"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                    this.forceLogout(employeeId);
                });
            }
        );
    }

    forceLogout(employeeId) {
        const confirmed = window.confirm(
            `Force Logout\n\nAre you sure you want to force logout ${employeeId}?\n\nThis will immediately terminate their active session.`
        );

        if (!confirmed) {
            return;
        }

        this.emitToast(`${employeeId} has been logged out successfully!`, 'success');
    }

    openFullActivityLog(employeeId) {
        const summary = this.activitySummariesByEmployeeId.get(employeeId);
        const logs = Array.isArray(summary?.logs) ? summary.logs : [];

        const rowsMarkup = logs.length > 0
            ? logs.slice(0, 50).map((log) => {
                const responseCode = Number.parseInt(log.response_code, 10);
                const code = Number.isFinite(responseCode) ? responseCode : '-';
                return `
                    <tr>
                        <td>${this.escapeHtml(this.formatDateTime(log.created_at))}</td>
                        <td>${this.escapeHtml(this.toDisplayAction(log))}</td>
                        <td>${this.escapeHtml(log.category || 'General')}</td>
                        <td>${this.escapeHtml(`HTTP ${code} · ${log.method || ''} ${log.endpoint || ''}`.trim())}</td>
                    </tr>
                `;
            }).join('')
            : `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--muted);">No activity available for this user in the selected period.</td>
                </tr>
            `;

        this.openDetailsModal(
            `Complete Activity Log: ${employeeId}`,
            `
                <div class="form-section">
                    <h5>User Activity History</h5>
                    <table class="table" style="margin-top: 10px;">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Action</th>
                                <th>Module</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsMarkup}
                        </tbody>
                    </table>
                </div>
                <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn btn-secondary" data-action="close-details">Close</button>
                    <button type="button" class="btn btn-primary" data-action="export-activity" data-employee-id="${this.escapeHtml(employeeId)}">Export to CSV</button>
                </div>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });
                content.querySelector('[data-action="export-activity"]')?.addEventListener('click', () => {
                    this.downloadUserActivityReport(employeeId);
                });
            }
        );
    }

    downloadUserActivityReport(employeeId) {
        const summary = this.activitySummariesByEmployeeId.get(employeeId);
        const logs = Array.isArray(summary?.logs) ? summary.logs : [];

        if (logs.length === 0) {
            this.emitToast(`No activity found to export for ${employeeId}.`, 'warning');
            return;
        }

        const rows = ['Timestamp,Action,Category,Method,Endpoint,ResponseCode'];

        logs.forEach((log) => {
            const responseCode = Number.parseInt(log.response_code, 10);
            const code = Number.isFinite(responseCode) ? String(responseCode) : '';
            const values = [
                this.formatDateTime(log.created_at),
                this.toDisplayAction(log),
                log.category || '',
                log.method || '',
                log.endpoint || '',
                code,
            ].map((value) => this.escapeCsv(value));

            rows.push(values.join(','));
        });

        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `user_activity_${employeeId}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.emitToast(`Activity report exported for ${employeeId}.`, 'success');
    }

    escapeCsv(value) {
        const normalized = String(value ?? '');
        if (/[",\n]/.test(normalized)) {
            return `"${normalized.replace(/"/g, '""')}"`;
        }

        return normalized;
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('sa-activity-tracking', SAActivityTracking);