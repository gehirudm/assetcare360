class TONotifications extends HTMLElement {
    constructor() {
        super();
        this.currentUser = null;
        this.notifications = [];
        this.filters = this.getDefaultFilters();
        this._requestCounter = 0;
        this._initialized = false;
        this._onRootClick = this._onRootClick.bind(this);
        this._onRootChange = this._onRootChange.bind(this);
        this._onRootInput = this._onRootInput.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this.addEventListener('change', this._onRootChange);
        this.addEventListener('input', this._onRootInput);
        this.syncFilterControls();
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        this.removeEventListener('change', this._onRootChange);
        this.removeEventListener('input', this._onRootInput);
    }

    getDefaultFilters() {
        return {
            readStatus: 'all',
            type: 'all',
            sort: 'newest',
            search: '',
        };
    }

    setCurrentUser(user) {
        this.currentUser = user || null;
    }

    async refresh() {
        await this.loadNotifications();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <div>
                    <h2 class="page-title"><i class="fas fa-bell"></i> Notifications</h2>
                    <p class="page-subtitle">Tickets and updates that require your attention</p>
                </div>

            </div>

            <div class="to-notifications-toolbar">
                <div class="to-notifications-actions">
                    <button class="btn btn-secondary btn-small" data-action="mark-all-read">Mark All Read</button>
                </div>

                <div class="to-notifications-filters">
                    <div class="to-notifications-filters-head">
                        <h3 class="to-notifications-filters-title"><i class="fas fa-filter"></i> Filter Notifications</h3>
                        <button class="btn btn-secondary btn-small" data-action="clear-filters">Reset Filters</button>
                    </div>

                    <div class="to-notifications-filter-grid">
                        <label class="notifications-filter-field" for="toNotifReadStatusFilter">
                            <span>Read Status</span>
                            <select class="notifications-filter-select" id="toNotifReadStatusFilter" data-filter="readStatus">
                                <option value="all">All</option>
                                <option value="unread">Unread</option>
                                <option value="read">Read</option>
                            </select>
                        </label>

                        <label class="notifications-filter-field" for="toNotifTypeFilter">
                            <span>Notification Type</span>
                            <select class="notifications-filter-select" id="toNotifTypeFilter" data-filter="type">
                                <option value="all">All</option>
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="success">Success</option>
                                <option value="error">Error</option>
                            </select>
                        </label>

                        <label class="notifications-filter-field" for="toNotifSortFilter">
                            <span>Sort By</span>
                            <select class="notifications-filter-select" id="toNotifSortFilter" data-filter="sort">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </label>

                        <label class="notifications-filter-field notifications-filter-search" for="toNotifSearchInput">
                            <span>Search</span>
                            <input
                                class="notifications-filter-input"
                                id="toNotifSearchInput"
                                data-filter="search"
                                type="search"
                                placeholder="Search title, message, ticket ID"
                                autocomplete="off"
                            />
                        </label>
                    </div>

                    <p class="to-notifications-filter-summary" id="toNotificationsFilterSummary">No notifications available</p>
                </div>
            </div>

            <div class="to-notifications-list" id="toNotificationsList">
                <div class="notif-empty" id="toNotificationsEmpty" style="display:none;">
                    <i class="fas fa-check-circle"></i>
                    <p id="toNotificationsEmptyText">You're all caught up! No pending notifications.</p>
                </div>
            </div>
        `;
    }

    syncFilterControls() {
        const readStatusFilter = this.querySelector('#toNotifReadStatusFilter');
        const typeFilter = this.querySelector('#toNotifTypeFilter');
        const sortFilter = this.querySelector('#toNotifSortFilter');
        const searchInput = this.querySelector('#toNotifSearchInput');

        if (readStatusFilter) readStatusFilter.value = this.filters.readStatus;
        if (typeFilter) typeFilter.value = this.filters.type;
        if (sortFilter) sortFilter.value = this.filters.sort;
        if (searchInput) searchInput.value = this.filters.search;
    }

    async loadNotifications() {
        const markAllButton = this.querySelector('button[data-action="mark-all-read"]');

        if (!markAllButton) return;

        const requestId = ++this._requestCounter;

        const resolvedUser = this.currentUser
            || (window.Auth && typeof window.Auth.getCurrentUser === 'function' ? window.Auth.getCurrentUser() : null);
        if (resolvedUser) {
            this.currentUser = resolvedUser;
        }

        try {
            const response = await API.get('/notifications?limit=50');
            if (requestId !== this._requestCounter) {
                return;
            }

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to load notifications');
            }

            const notifications = Array.isArray(response?.data?.notifications)
                ? response.data.notifications
                : [];
            const unreadCountRaw = Number(response?.data?.unread_count);
            const unreadCount = Number.isFinite(unreadCountRaw)
                ? unreadCountRaw
                : notifications.filter((notification) => Number(notification?.is_read) !== 1).length;

            this.notifications = notifications;
            this.updateBadge(unreadCount);
            this.setMarkAllDisabled(markAllButton, unreadCount <= 0);
            this.applyCurrentFilters();
        } catch (error) {
            console.error('to-notifications load error:', error);
            this.notifications = [];
            this.updateBadge(0);
            this.setMarkAllDisabled(markAllButton, true);
            this.renderNotifications([], 0, 'Failed to load notifications');

            const list = this.querySelector('#toNotificationsList');
            if (!list) return;
            const errEl = document.createElement('div');
            errEl.className = 'notif-card notif-danger';
            errEl.innerHTML = `
                <div class="notif-icon"><i class="fas fa-exclamation-circle"></i></div>
                <div class="notif-body">
                    <div class="notif-title">Failed to load notifications</div>
                    <div class="notif-desc">Please refresh the page and try again.</div>
                </div>
            `;

            list.appendChild(errEl);
        }
    }

    applyCurrentFilters() {
        const filteredNotifications = this.getFilteredNotifications(this.notifications);
        this.renderNotifications(filteredNotifications, this.notifications.length);
    }

    getFilteredNotifications(notifications) {
        const source = Array.isArray(notifications) ? [...notifications] : [];
        const readStatus = this.filters.readStatus;
        const type = this.filters.type;
        const sort = this.filters.sort;
        const search = this.filters.search.trim().toLowerCase();

        let filtered = source;

        if (readStatus === 'read') {
            filtered = filtered.filter((notification) => Number(notification?.is_read) === 1);
        } else if (readStatus === 'unread') {
            filtered = filtered.filter((notification) => Number(notification?.is_read) !== 1);
        }

        if (type !== 'all') {
            filtered = filtered.filter((notification) => this.normalizeTypeForFilter(notification?.type) === type);
        }

        if (search !== '') {
            filtered = filtered.filter((notification) => {
                const searchable = [
                    notification?.title,
                    notification?.message,
                    notification?.source_event_id,
                    notification?.source_event,
                ]
                    .map((value) => String(value || '').toLowerCase())
                    .join(' ');

                return searchable.includes(search);
            });
        }

        filtered.sort((left, right) => {
            const leftTime = this.parseNotificationTimestamp(left?.created_at);
            const rightTime = this.parseNotificationTimestamp(right?.created_at);

            if (sort === 'oldest') {
                return leftTime - rightTime;
            }

            return rightTime - leftTime;
        });

        return filtered;
    }

    renderNotifications(notifications, totalNotifications, summaryOverride = '') {
        const list = this.querySelector('#toNotificationsList');
        const empty = this.querySelector('#toNotificationsEmpty');
        const emptyText = this.querySelector('#toNotificationsEmptyText');

        if (!list || !empty || !emptyText) return;

        list.querySelectorAll('.notif-card').forEach((element) => element.remove());
        empty.style.display = 'none';

        this.updateFilterSummary(notifications.length, totalNotifications, summaryOverride);

        if (totalNotifications === 0) {
            emptyText.textContent = "You're all caught up! No pending notifications.";
            empty.style.display = 'block';
            return;
        }

        if (notifications.length === 0) {
            emptyText.textContent = 'No notifications match the selected filters.';
            empty.style.display = 'block';
            return;
        }

        notifications.forEach((notification) => {
            list.appendChild(this.createNotificationCard(notification));
        });
    }

    updateFilterSummary(visibleCount, totalCount, overrideText = '') {
        const summary = this.querySelector('#toNotificationsFilterSummary');
        if (!summary) return;

        if (overrideText) {
            summary.textContent = overrideText;
            return;
        }

        if (totalCount === 0) {
            summary.textContent = 'No notifications available';
            return;
        }

        if (visibleCount === totalCount) {
            summary.textContent = `Showing all ${totalCount} notifications`;
            return;
        }

        summary.textContent = `Showing ${visibleCount} of ${totalCount} notifications`;
    }

    createNotificationCard(notification) {
        const card = document.createElement('div');
        const typeClass = this.normalizeType(notification?.type);
        const readClass = Number(notification?.is_read) === 1 ? 'notif-read' : '';
        const icon = this.resolveIcon(typeClass);
        const title = this.escapeHtml(notification?.title || 'Notification');
        const desc = this.escapeHtml(notification?.message || 'No details available.');
        const notificationId = String(notification?.notification_id || '').trim();
        const action = this.resolveAction(notification);
        const timestamp = this.formatTimestamp(notification?.created_at);

        card.className = `notif-card notif-${typeClass} ${readClass}`.trim();
        card.innerHTML = `
            <div class="notif-icon"><i class="fas ${icon}"></i></div>
            <div class="notif-body">
                <div class="notif-title">${title}</div>
                <div class="notif-desc">${desc}</div>
                ${timestamp ? `<div class="notif-meta">${this.escapeHtml(timestamp)}</div>` : ''}
                <div class="notif-action">
                    ${Number(notification?.is_read) === 1
                        ? '<span class="notif-read-pill">Read</span>'
                        : `<button class="btn btn-small btn-secondary" data-notification-id="${this.escapeHtml(notificationId)}">Mark as Read</button>`}
                </div>
                ${action ? `
                    <div class="notif-action">
                        <button
                            class="btn btn-small btn-primary"
                            data-action-section="${this.escapeHtml(action.section)}">
                            ${this.escapeHtml(action.label)}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    updateBadge(count) {
        const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;

        const shellSidebar = document.querySelector('to-shell-sidebar');
        if (shellSidebar && typeof shellSidebar.setNotifBadge === 'function') {
            shellSidebar.setNotifBadge(safeCount);
            return;
        }

        const sharedSidebar = document.querySelector('ac-layout ac-sidebar');
        if (sharedSidebar && typeof sharedSidebar.setNotifBadge === 'function') {
            sharedSidebar.setNotifBadge(safeCount);
            return;
        }
    }

    async _onRootClick(event) {
        const clearFiltersButton = event.target.closest('button[data-action="clear-filters"]');
        if (clearFiltersButton) {
            this.resetFilters();
            return;
        }

        const markAllButton = event.target.closest('button[data-action="mark-all-read"]');
        if (markAllButton) {
            await this.markAllAsRead(markAllButton);
            return;
        }

        const markButton = event.target.closest('button[data-notification-id]');
        if (markButton) {
            const notificationId = String(markButton.dataset.notificationId || '').trim();
            if (notificationId !== '') {
                await this.markAsRead(notificationId, markButton);
            }
            return;
        }

        const actionButton = event.target.closest('button[data-action-section]');
        if (!actionButton) return;

        const section = actionButton.dataset.actionSection;
        if (!section) return;

        this.dispatchEvent(new CustomEvent('technical-officer-notifications:navigate', {
            bubbles: true,
            detail: { section }
        }));
    }

    _onRootChange(event) {
        const filterElement = event.target.closest('[data-filter]');
        if (!filterElement) return;

        const key = String(filterElement.dataset.filter || '');
        if (key === '' || key === 'search') {
            return;
        }

        this.filters[key] = String(filterElement.value || '');
        this.applyCurrentFilters();
    }

    _onRootInput(event) {
        const searchInput = event.target.closest('[data-filter="search"]');
        if (!searchInput) return;

        this.filters.search = String(searchInput.value || '');
        this.applyCurrentFilters();
    }

    resetFilters() {
        this.filters = this.getDefaultFilters();
        this.syncFilterControls();
        this.applyCurrentFilters();
    }

    normalizeType(type) {
        const normalized = this.normalizeTypeForFilter(type);

        if (normalized === 'error') return 'danger';
        if (normalized === 'success') return 'success';
        if (normalized === 'warning') return 'warning';
        return 'info';
    }

    normalizeTypeForFilter(type) {
        const normalized = String(type || '').toLowerCase();

        if (normalized === 'danger' || normalized === 'error') return 'error';
        if (normalized === 'success') return 'success';
        if (normalized === 'warning') return 'warning';
        return 'info';
    }

    resolveIcon(typeClass) {
        if (typeClass === 'success') return 'fa-check-circle';
        if (typeClass === 'warning') return 'fa-exclamation-triangle';
        if (typeClass === 'danger') return 'fa-times-circle';
        return 'fa-bell';
    }

    resolveAction(notification) {
        const sourceEvent = String(notification?.source_event || '').toUpperCase();

        if (sourceEvent === 'FAULT_TICKET_ASSIGNED') {
            return { label: 'Open My Tickets', section: 'tickets' };
        }

        if (sourceEvent === 'SERVICE_TICKET_ASSIGNED') {
            return { label: 'Open Service Tickets', section: 'service-tickets' };
        }

        if (sourceEvent === 'SPARE_PART_REQUEST_APPROVED' || sourceEvent === 'SPARE_PART_REQUEST_REJECTED') {
            return { label: 'Open My Tickets', section: 'tickets' };
        }

        if (sourceEvent === 'BUDGET_REPORT_REVIEWED') {
            return { label: 'Open My Tickets', section: 'tickets' };
        }

        return null;
    }

    async markAsRead(notificationId, buttonElement) {
        const originalText = buttonElement ? buttonElement.textContent : '';

        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.textContent = 'Updating...';
        }

        try {
            const response = await API.post('/notifications/read', {
                notification_id: notificationId,
            });

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to update notification');
            }

            await this.loadNotifications();
        } catch (error) {
            console.error('to-notifications markAsRead error:', error);

            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.textContent = originalText || 'Mark as Read';
            }

            this.dispatchToast('Failed to mark notification as read', 'error');
        }
    }

    async markAllAsRead(buttonElement) {
        this.setMarkAllDisabled(buttonElement, true, 'Updating...');

        try {
            const response = await API.post('/notifications/read', {
                mark_all: true,
            });

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to update notifications');
            }

            await this.loadNotifications();
        } catch (error) {
            console.error('to-notifications markAllAsRead error:', error);
            this.setMarkAllDisabled(buttonElement, false, 'Mark All Read');
            this.dispatchToast('Failed to mark notifications as read', 'error');
        }
    }

    formatTimestamp(value) {
        if (!value) return '';

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';

        return parsed.toLocaleString();
    }

    parseNotificationTimestamp(value) {
        const parsed = new Date(value || '');
        const timestamp = parsed.getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    setMarkAllDisabled(buttonElement, disabled, label = 'Mark All Read') {
        if (!buttonElement) return;

        buttonElement.disabled = Boolean(disabled);
        buttonElement.textContent = label;
    }

    dispatchToast(message, type = 'info') {
        if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(message, type);
            return;
        }

        this.dispatchEvent(new CustomEvent('technical-officer-notifications:toast', {
            bubbles: true,
            detail: {
                message,
                type,
            },
        }));
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

if (!customElements.get('to-notifications')) {
    customElements.define('to-notifications', TONotifications);
}
