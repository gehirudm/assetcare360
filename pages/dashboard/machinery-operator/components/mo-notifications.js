class MONotifications extends HTMLElement {
    constructor() {
        super();
        this._mounted = false;
        this._requestCounter = 0;
        this.notifications = [];
        this.filters = this.getDefaultFilters();
        this._onRootClick = this._onRootClick.bind(this);
        this._onRootChange = this._onRootChange.bind(this);
        this._onRootInput = this._onRootInput.bind(this);
    }

    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.addEventListener('click', this._onRootClick);
        this.addEventListener('change', this._onRootChange);
        this.addEventListener('input', this._onRootInput);
        this.syncFilterControls();
        this.refresh();
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

    syncFilterControls() {
        const readStatusFilter = this.querySelector('#operatorNotifReadStatusFilter');
        const typeFilter = this.querySelector('#operatorNotifTypeFilter');
        const sortFilter = this.querySelector('#operatorNotifSortFilter');
        const searchInput = this.querySelector('#operatorNotifSearchInput');

        if (readStatusFilter) readStatusFilter.value = this.filters.readStatus;
        if (typeFilter) typeFilter.value = this.filters.type;
        if (sortFilter) sortFilter.value = this.filters.sort;
        if (searchInput) searchInput.value = this.filters.search;
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Notifications</h1>
                    <p class="page-subtitle">Fault-ticket and workflow updates for your attention</p>
                </div>
            </div>

            <div class="mo-notifications-toolbar">
                <div class="to-notifications-actions">
                    <button class="btn btn-secondary btn-small" data-action="mark-all-read">Mark All Read</button>
                </div>

                <div class="mo-notifications-filters">
                    <div class="mo-notifications-filters-head">
                        <h3 class="mo-notifications-filters-title"><i class="fas fa-filter"></i> Filter Notifications</h3>
                        <button class="btn btn-secondary btn-small" data-action="clear-filters">Reset Filters</button>
                    </div>

                    <div class="mo-notifications-filter-grid">
                        <label class="notifications-filter-field" for="operatorNotifReadStatusFilter">
                            <span>Read Status</span>
                            <select class="notifications-filter-select" id="operatorNotifReadStatusFilter" data-filter="readStatus">
                                <option value="all">All</option>
                                <option value="unread">Unread</option>
                                <option value="read">Read</option>
                            </select>
                        </label>

                        <label class="notifications-filter-field" for="operatorNotifTypeFilter">
                            <span>Notification Type</span>
                            <select class="notifications-filter-select" id="operatorNotifTypeFilter" data-filter="type">
                                <option value="all">All</option>
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="success">Success</option>
                                <option value="error">Error</option>
                            </select>
                        </label>

                        <label class="notifications-filter-field" for="operatorNotifSortFilter">
                            <span>Sort By</span>
                            <select class="notifications-filter-select" id="operatorNotifSortFilter" data-filter="sort">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </label>

                        <label class="notifications-filter-field notifications-filter-search" for="operatorNotifSearchInput">
                            <span>Search</span>
                            <input
                                class="notifications-filter-input"
                                id="operatorNotifSearchInput"
                                data-filter="search"
                                type="search"
                                placeholder="Search title, message, ticket ID"
                                autocomplete="off"
                            />
                        </label>
                    </div>

                    <p class="mo-notifications-filter-summary" id="operatorNotificationsFilterSummary">No notifications available</p>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-bell"></i> Recent Notifications</div>
                <div class="mo-notifications-list" id="operatorNotificationsList">
                    <div class="empty-state mo-notifications-empty" id="operatorNotificationsEmpty" style="display:none; margin: 12px;">
                        <i class="fas fa-check-circle"></i>
                        <p id="operatorNotificationsEmptyText">You're all caught up. No pending notifications.</p>
                    </div>
                </div>
            </div>
        `;
    }

    async refresh() {
        await this.loadNotifications();
    }

    async loadNotifications() {
        const list = this.querySelector('#operatorNotificationsList');
        const markAllButton = this.querySelector('button[data-action="mark-all-read"]');

        if (!list || !markAllButton || !window.API) {
            return;
        }

        const requestId = ++this._requestCounter;

        try {
            const response = await window.API.get('/notifications?limit=50');
            if (requestId !== this._requestCounter) {
                return;
            }

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to load notifications');
            }

            const notifications = Array.isArray(response?.data?.notifications)
                ? response.data.notifications
                : [];
            const unreadRaw = Number(response?.data?.unread_count);
            const unreadCount = Number.isFinite(unreadRaw)
                ? unreadRaw
                : notifications.filter((row) => Number(row?.is_read) !== 1).length;

            this.notifications = notifications;
            this.dispatchCount(unreadCount);
            this.setMarkAllDisabled(markAllButton, unreadCount <= 0);
            this.applyCurrentFilters();
        } catch (error) {
            console.error('mo-notifications load error:', error);
            this.notifications = [];
            this.dispatchCount(0);
            this.setMarkAllDisabled(markAllButton, true);
            this.renderNotifications([], 0, 'Failed to load notifications');

            const empty = this.querySelector('#operatorNotificationsEmpty');
            if (empty) {
                empty.style.display = 'none';
            }

            list.appendChild(this.createErrorCard());
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
            filtered = filtered.filter((notification) => this.normalizeNotificationTypeForFilter(notification?.type) === type);
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
        const list = this.querySelector('#operatorNotificationsList');
        const empty = this.querySelector('#operatorNotificationsEmpty');
        const emptyText = this.querySelector('#operatorNotificationsEmptyText');

        if (!list || !empty || !emptyText) {
            return;
        }

        list.querySelectorAll('.item-card').forEach((element) => element.remove());
        empty.style.display = 'none';

        this.updateFilterSummary(notifications.length, totalNotifications, summaryOverride);

        if (totalNotifications === 0) {
            emptyText.textContent = "You're all caught up. No pending notifications.";
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
        const summary = this.querySelector('#operatorNotificationsFilterSummary');
        if (!summary) {
            return;
        }

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
        const type = this.normalizeNotificationType(notification?.type);
        const readClass = Number(notification?.is_read) === 1 ? 'mo-notification-read' : '';
        const title = this.escapeHtml(notification?.title || 'Notification');
        const message = this.escapeHtml(notification?.message || 'No details available.');
        const notificationId = String(notification?.notification_id || '').trim();
        const createdAt = this.formatTimestamp(notification?.created_at);
        const icon = this.resolveIcon(type);

        card.className = `item-card mo-notification-card mo-notification-${type} ${readClass}`.trim();
        card.innerHTML = `
            <div class="mo-notification-icon"><i class="fas ${icon}"></i></div>
            <div class="mo-notification-body">
                <div class="mo-notification-title">${title}</div>
                <div class="mo-notification-desc">${message}</div>
                ${createdAt ? `<div class="mo-notification-meta">${this.escapeHtml(createdAt)}</div>` : ''}
                <div class="mo-notification-action">
                    ${Number(notification?.is_read) === 1
                        ? '<span class="mo-notification-read-pill">Read</span>'
                        : `<button class="btn btn-small btn-secondary" data-notification-id="${this.escapeHtml(notificationId)}">Mark as Read</button>`}
                </div>
            </div>
        `;

        return card;
    }

    createErrorCard() {
        const card = document.createElement('div');
        card.className = 'item-card mo-notification-card mo-notification-error';
        card.innerHTML = `
            <div class="mo-notification-icon"><i class="fas fa-exclamation-circle"></i></div>
            <div class="mo-notification-body">
                <div class="mo-notification-title">Failed to load notifications</div>
                <div class="mo-notification-desc">Please refresh and try again.</div>
            </div>
        `;

        return card;
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
        if (!markButton) {
            return;
        }

        const notificationId = String(markButton.dataset.notificationId || '').trim();
        if (notificationId !== '') {
            await this.markAsRead(notificationId, markButton);
        }
    }

    _onRootChange(event) {
        const filterElement = event.target.closest('[data-filter]');
        if (!filterElement) {
            return;
        }

        const key = String(filterElement.dataset.filter || '');
        if (key === '' || key === 'search') {
            return;
        }

        this.filters[key] = String(filterElement.value || '');
        this.applyCurrentFilters();
    }

    _onRootInput(event) {
        const searchInput = event.target.closest('[data-filter="search"]');
        if (!searchInput) {
            return;
        }

        this.filters.search = String(searchInput.value || '');
        this.applyCurrentFilters();
    }

    resetFilters() {
        this.filters = this.getDefaultFilters();
        this.syncFilterControls();
        this.applyCurrentFilters();
    }

    async markAsRead(notificationId, buttonElement) {
        const originalText = buttonElement ? buttonElement.textContent : 'Mark as Read';

        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.textContent = 'Updating...';
        }

        try {
            const response = await window.API.post('/notifications/read', {
                notification_id: notificationId,
            });

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to update notification');
            }

            await this.loadNotifications();
        } catch (error) {
            console.error('mo-notifications markAsRead error:', error);
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.textContent = originalText;
            }
        }
    }

    async markAllAsRead(buttonElement) {
        const originalText = buttonElement ? buttonElement.textContent : 'Mark All Read';

        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.textContent = 'Updating...';
        }

        try {
            const response = await window.API.post('/notifications/read', {
                mark_all: true,
            });

            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to update notifications');
            }

            await this.loadNotifications();
        } catch (error) {
            console.error('mo-notifications markAllAsRead error:', error);
            this.setMarkAllDisabled(buttonElement, false, originalText);
        }
    }

    setMarkAllDisabled(buttonElement, disabled, label = 'Mark All Read') {
        if (!buttonElement) {
            return;
        }

        buttonElement.disabled = Boolean(disabled);
        buttonElement.textContent = label;
    }

    dispatchCount(count) {
        const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
        document.dispatchEvent(new CustomEvent('mo:notifications-count', {
            detail: { count: safeCount },
        }));
    }

    normalizeNotificationType(type) {
        return this.normalizeNotificationTypeForFilter(type);
    }

    normalizeNotificationTypeForFilter(type) {
        const normalized = String(type || '').trim().toLowerCase();
        if (normalized === 'success') return 'success';
        if (normalized === 'warning') return 'warning';
        if (normalized === 'error' || normalized === 'danger') return 'error';
        return 'info';
    }

    resolveIcon(type) {
        if (type === 'success') return 'fa-check-circle';
        if (type === 'warning') return 'fa-exclamation-triangle';
        if (type === 'error') return 'fa-times-circle';
        return 'fa-bell';
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

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

customElements.define('mo-notifications', MONotifications);
