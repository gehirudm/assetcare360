class MONotifications extends HTMLElement {
    constructor() {
        super();
        this._mounted = false;
        this._requestCounter = 0;
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.addEventListener('click', this._onRootClick);
        this.refresh();
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Notifications</h1>
                    <p class="page-subtitle">Fault-ticket and workflow updates for your attention</p>
                </div>
                <div class="to-notifications-actions">
                    <button class="btn btn-secondary btn-small" data-action="mark-all-read">Mark All Read</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-bell"></i> Recent Notifications</div>
                <div id="operatorNotificationsList"></div>
                <div class="empty-state" id="operatorNotificationsEmpty" style="display:none; margin: 12px;">
                    <i class="fas fa-check-circle" style="margin-right: 6px;"></i>
                    You're all caught up. No pending notifications.
                </div>
            </div>
        `;
    }

    async refresh() {
        await this.loadNotifications();
    }

    async loadNotifications() {
        const list = this.querySelector('#operatorNotificationsList');
        const empty = this.querySelector('#operatorNotificationsEmpty');
        const markAllButton = this.querySelector('button[data-action="mark-all-read"]');

        if (!list || !empty || !markAllButton || !window.API) {
            return;
        }

        const requestId = ++this._requestCounter;
        list.innerHTML = '';
        empty.style.display = 'none';

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

            this.dispatchCount(unreadCount);
            markAllButton.disabled = unreadCount <= 0;

            if (notifications.length === 0) {
                empty.style.display = 'block';
                return;
            }

            notifications.forEach((notification) => {
                const type = this.normalizeType(notification?.type);
                const icon = this.resolveIcon(type);
                const title = this.escapeHtml(notification?.title || 'Notification');
                const message = this.escapeHtml(notification?.message || 'No details available.');
                const notificationId = String(notification?.notification_id || '').trim();
                const createdAt = this.formatTimestamp(notification?.created_at);
                const isRead = Number(notification?.is_read) === 1;

                const card = document.createElement('div');
                card.className = `item-card mo-notification-card mo-notification-${type} ${isRead ? 'mo-notification-read' : ''}`.trim();
                card.innerHTML = `
                    <div class="item-details">
                        <strong>
                            <i class="fas ${icon}"></i>
                            ${title}
                        </strong>
                        <div class="item-description">${message}</div>
                        ${createdAt ? `<div class="item-meta">${this.escapeHtml(createdAt)}</div>` : ''}
                        <div class="item-meta" style="margin-top: 8px;">
                            ${isRead
                                ? '<span class="badge" style="background:#eef2ff; color:#1e3a8a;">Read</span>'
                                : `<button class="btn btn-small btn-secondary" data-notification-id="${this.escapeHtml(notificationId)}">Mark as Read</button>`}
                        </div>
                    </div>
                `;

                list.appendChild(card);
            });
        } catch (error) {
            console.error('mo-notifications load error:', error);
            this.dispatchCount(0);
            markAllButton.disabled = true;

            list.innerHTML = `
                <div class="item-card mo-notification-card mo-notification-error">
                    <div class="item-details">
                        <strong><i class="fas fa-exclamation-circle"></i> Failed to load notifications</strong>
                        <div class="item-description">Please refresh and try again.</div>
                    </div>
                </div>
            `;
            empty.style.display = 'none';
        }
    }

    async _onRootClick(event) {
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
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.textContent = originalText;
            }
        }
    }

    dispatchCount(count) {
        const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
        document.dispatchEvent(new CustomEvent('mo:notifications-count', {
            detail: { count: safeCount },
        }));
    }

    normalizeType(type) {
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
