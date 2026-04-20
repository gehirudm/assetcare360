class SADashboardOverview extends HTMLElement {
    constructor() {
        super();
        this._onRootClick = this._onRootClick.bind(this);
        this._mounted = false;
        this._loading = false;
        this._overview = this.createEmptyOverview();
    }

    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.addEventListener('click', this._onRootClick);
        this.loadOverviewData();
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        this._mounted = false;
    }

    createEmptyOverview() {
        return {
            totalUsers: 0,
            activeRoles: 0,
            systemEvents24h: 0,
            serviceConfigTouches24h: 0,
            recentActivities: [],
            alerts: [],
        };
    }

    _onRootClick(event) {
        const navCard = event.target.closest('[data-section-nav]');
        if (!navCard || !this.contains(navCard)) return;

        const section = navCard.dataset.sectionNav;
        if (!section) return;

        this.dispatchEvent(new CustomEvent('sa-dashboard-overview:navigate', {
            bubbles: true,
            detail: { section }
        }));
    }

    async loadOverviewData() {
        this.setLoadingState(true);

        try {
            const [usersResult, logsResult] = await Promise.allSettled([
                API.get('/users?limit=200'),
                API.get('/logs?period=today&limit=200'),
            ]);

            const usersPayload = usersResult.status === 'fulfilled' ? usersResult.value : null;
            const logsPayload = logsResult.status === 'fulfilled' ? logsResult.value : null;

            const users = this.extractUsers(usersPayload);
            const totalUsers = this.extractTotalUsers(usersPayload, users);
            const logs = this.extractLogs(logsPayload);

            this._overview = {
                totalUsers,
                activeRoles: this.countActiveRoles(users),
                systemEvents24h: logs.length,
                serviceConfigTouches24h: this.countServiceConfigTouches(logs),
                recentActivities: this.buildRecentActivities(logs),
                alerts: this.buildAlerts(logs),
            };

            const failedSources = [];
            if (usersResult.status !== 'fulfilled' || !this.isSuccessResponse(usersPayload)) {
                failedSources.push('users');
            }
            if (logsResult.status !== 'fulfilled' || !this.isSuccessResponse(logsPayload)) {
                failedSources.push('logs');
            }

            if (failedSources.length > 0) {
                this.emitToast(`Some overview data could not be loaded (${failedSources.join(', ')}).`, 'warning');
            }
        } catch (error) {
            console.error('Failed to load sysadmin overview data:', error);
            this._overview = this.createEmptyOverview();
            this.emitToast('Failed to load dashboard overview data.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        this._loading = isLoading;
        this.render();
    }

    isSuccessResponse(payload) {
        return Boolean(payload && payload.status === 'success' && payload.data);
    }

    extractUsers(payload) {
        if (!this.isSuccessResponse(payload)) {
            return [];
        }

        const users = payload.data.users;
        return Array.isArray(users) ? users : [];
    }

    extractTotalUsers(payload, users) {
        if (!this.isSuccessResponse(payload)) {
            return users.length;
        }

        const totalFromPagination = Number.parseInt(payload.data?.pagination?.total, 10);
        if (Number.isFinite(totalFromPagination) && totalFromPagination >= 0) {
            return totalFromPagination;
        }

        return users.length;
    }

    extractLogs(payload) {
        if (!this.isSuccessResponse(payload)) {
            return [];
        }

        const logs = payload.data.logs;
        return Array.isArray(logs) ? logs : [];
    }

    countActiveRoles(users) {
        if (!Array.isArray(users) || users.length === 0) {
            return 0;
        }

        const uniqueRoles = new Set(
            users
                .filter((user) => Number.parseInt(user.is_active, 10) === 1)
                .map((user) => (user.role || '').trim())
                .filter((role) => role !== '')
        );

        return uniqueRoles.size;
    }

    countServiceConfigTouches(logs) {
        return logs.filter((log) => {
            const action = (log.action || '').toLowerCase();
            const category = (log.category || '').toLowerCase();
            const endpoint = (log.endpoint || '').toLowerCase();

            return (
                action.includes('service') ||
                action.includes('config') ||
                category.includes('system administration') ||
                endpoint.includes('/system-settings')
            );
        }).length;
    }

    buildRecentActivities(logs) {
        const sorted = [...logs].sort((a, b) => this.parseDate(b.created_at) - this.parseDate(a.created_at));
        return sorted.slice(0, 4).map((log) => {
            const responseCode = Number.parseInt(log.response_code, 10);
            const isFailure = Number.isFinite(responseCode) && responseCode >= 400;

            return {
                title: log.action || `${log.method || 'API'} ${log.endpoint || ''}`,
                meta: `${this.getUserLabel(log)} | ${this.formatRelativeTime(log.created_at)}`,
                description: `HTTP ${Number.isFinite(responseCode) ? responseCode : '-'} · ${log.method || ''} ${log.endpoint || ''}`.trim(),
                statusLabel: isFailure ? 'FAILED' : 'SUCCESS',
                statusClass: isFailure ? 'status-rejected' : 'status-approved',
            };
        });
    }

    buildAlerts(logs) {
        const failedLoginLogs = logs.filter((log) => {
            const responseCode = Number.parseInt(log.response_code, 10);
            const action = (log.action || '').toLowerCase();
            const endpoint = (log.endpoint || '').toLowerCase();
            const loginEvent = action.includes('login') || endpoint.includes('/auth/login');
            return loginEvent && Number.isFinite(responseCode) && responseCode >= 400;
        });

        const serverErrorLogs = logs.filter((log) => {
            const responseCode = Number.parseInt(log.response_code, 10);
            return Number.isFinite(responseCode) && responseCode >= 500;
        });

        const alerts = [];

        if (failedLoginLogs.length > 0) {
            alerts.push({
                title: 'Authentication Alert',
                meta: `${failedLoginLogs.length} failed login attempts in the last 24 hours`,
                description: `Most recent: ${this.getUserLabel(failedLoginLogs[0])} · ${this.formatRelativeTime(failedLoginLogs[0].created_at)}`,
                statusLabel: 'CRITICAL',
                statusClass: 'status-critical',
            });
        }

        if (serverErrorLogs.length > 0) {
            alerts.push({
                title: 'Server Error Activity',
                meta: `${serverErrorLogs.length} server-side errors detected`,
                description: `Latest endpoint: ${serverErrorLogs[0].method || ''} ${serverErrorLogs[0].endpoint || ''}`.trim(),
                statusLabel: 'WARNING',
                statusClass: 'status-pending',
            });
        }

        if (alerts.length === 0) {
            alerts.push({
                title: 'System Health',
                meta: 'No critical alerts detected in the last 24 hours',
                description: 'Authentication and API operations look stable.',
                statusLabel: 'STABLE',
                statusClass: 'status-approved',
            });
        }

        return alerts.slice(0, 3);
    }

    parseDate(value) {
        const parsed = new Date(value || 0);
        const timestamp = parsed.getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    getUserLabel(log) {
        const userName = (log.user_name || '').trim();
        const employeeId = (log.employee_id || '').trim();

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

    formatRelativeTime(value) {
        const timestamp = this.parseDate(value);
        if (!timestamp) {
            return 'Unknown time';
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

    formatNumber(value) {
        const numeric = Number.parseInt(value, 10);
        if (!Number.isFinite(numeric)) {
            return '0';
        }

        return new Intl.NumberFormat().format(numeric);
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    renderActivityItem(activity) {
        return `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">${this.escapeHtml(activity.title)}</div>
                    <div class="activity-meta">${this.escapeHtml(activity.meta)}</div>
                    <div class="activity-description">${this.escapeHtml(activity.description)}</div>
                </div>
                <div class="activity-status">
                    <span class="status-text ${this.escapeHtml(activity.statusClass)}">${this.escapeHtml(activity.statusLabel)}</span>
                </div>
            </div>
        `;
    }

    renderAlertItem(alert) {
        return this.renderActivityItem(alert);
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    render() {
        const overview = this._overview;
        const loadingText = this._loading ? 'Loading...' : null;

        const recentActivityMarkup = this._loading
            ? `
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-title">Loading recent activities...</div>
                    </div>
                </div>
            `
            : (overview.recentActivities.length > 0
                ? overview.recentActivities.map((activity) => this.renderActivityItem(activity)).join('')
                : `
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">No recent activity</div>
                            <div class="activity-description">No system events were recorded in the selected window.</div>
                        </div>
                    </div>
                `);

        const alertsMarkup = this._loading
            ? `
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-title">Loading system alerts...</div>
                    </div>
                </div>
            `
            : overview.alerts.map((alert) => this.renderAlertItem(alert)).join('');

        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-chart-line"></i> Dashboard Overview</h2>
                <p class="page-subtitle">System health, user activity, and quick actions</p>
            </div>

            <div class="grid">
                <div class="summary-card clickable" data-section-nav="user-accounts">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">User Accounts</div>
                            <div class="summary-number">${loadingText || this.formatNumber(overview.totalUsers)}</div>
                            <div class="summary-description">total users in the system</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="user-accounts">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-lock"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Permissions</div>
                            <div class="summary-number">${loadingText || this.formatNumber(overview.activeRoles)}</div>
                            <div class="summary-description">active roles configured</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="system-logs">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">System Events</div>
                            <div class="summary-number">${loadingText || this.formatNumber(overview.systemEvents24h)}</div>
                            <div class="summary-description">logged events (24 hours)</div>
                        </div>
                    </div>
                    <div class="summary-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="summary-card clickable" data-section-nav="service-config">
                    <div class="summary-card-content">
                        <div class="summary-icon">
                            <i class="fas fa-cogs"></i>
                        </div>
                        <div class="summary-details">
                            <div class="summary-title">Service Config</div>
                            <div class="summary-number">${loadingText || this.formatNumber(overview.serviceConfigTouches24h)}</div>
                            <div class="summary-description">service/config actions logged (24h)</div>
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
                    ${recentActivityMarkup}
                </div>
            </div>

            <div class="recent-activities">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-exclamation-triangle"></i> System Alerts
                    </h3>
                </div>

                <div class="activities-list">
                    ${alertsMarkup}
                </div>
            </div>
        `;
    }
}

customElements.define('sa-dashboard-overview', SADashboardOverview);
