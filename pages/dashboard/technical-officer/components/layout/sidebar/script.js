const TO_SIDEBAR_DEFAULT_NAV = [
    { section: 'dashboard', icon: 'fas fa-chart-line', label: 'Dashboard' },
    { section: 'tickets', icon: 'fas fa-ticket-alt', label: 'Fault & Repair Tickets' },
    { section: 'spare-parts', icon: 'fas fa-boxes', label: 'Spare Part Management' },
    { section: 'inventory', icon: 'fas fa-warehouse', label: 'Inventory Management' },
    { section: 'service-warranty', icon: 'fas fa-shield-alt', label: 'Service & Warranty' },
    { section: 'feedback', icon: 'fas fa-comment-dots', label: 'Asset Feedback' },
    { section: 'notifications', icon: 'fas fa-bell', label: 'Notifications', badge: true }
];

class TOShellSidebar extends HTMLElement {
    static get observedAttributes() {
        return ['active-section', 'mode', 'base-path', 'nav', 'poll-interval'];
    }

    constructor() {
        super();
        this._onRootClick = this._onRootClick.bind(this);
        this._badgeTimer = null;
    }

    connectedCallback() {
        this.style.display = 'contents';
        this.render();
        this.addEventListener('click', this._onRootClick);
        this._startBadgePolling();
        this.refreshNotificationBadge();
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        if (this._badgeTimer) {
            clearInterval(this._badgeTimer);
            this._badgeTimer = null;
        }
    }

    attributeChangedCallback(name) {
        if (!this.isConnected) return;

        if (name === 'active-section') {
            this.setActive(this.activeSection);
            return;
        }

        this.render();

        if (name === 'poll-interval') {
            this._startBadgePolling();
        }
    }

    get activeSection() {
        return this.getAttribute('active-section') || 'dashboard';
    }

    get mode() {
        return this.getAttribute('mode') || 'spa';
    }

    get basePath() {
        return this.getAttribute('base-path') || '';
    }

    get pollIntervalMs() {
        const value = Number(this.getAttribute('poll-interval'));
        if (Number.isFinite(value) && value >= 10000) {
            return value;
        }
        return 60000;
    }

    get navItems() {
        const raw = this.getAttribute('nav');
        if (!raw) {
            return TO_SIDEBAR_DEFAULT_NAV;
        }

        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : TO_SIDEBAR_DEFAULT_NAV;
        } catch (error) {
            console.warn('to-shell-sidebar: invalid nav JSON, using default nav.', error);
            return TO_SIDEBAR_DEFAULT_NAV;
        }
    }

    get sidebar() {
        return this.querySelector('ac-sidebar');
    }

    render() {
        const nav = JSON.stringify(this.navItems).replace(/'/g, '&apos;');
        this.innerHTML = `<ac-sidebar nav='${nav}'></ac-sidebar>`;
        this.setActive(this.activeSection);
    }

    setActive(section) {
        const sidebar = this.sidebar;
        if (sidebar && typeof sidebar.setActive === 'function') {
            sidebar.setActive(section);
        }
    }

    setNotifBadge(count) {
        const sidebar = this.sidebar;
        if (!sidebar || typeof sidebar.setNotifBadge !== 'function') return;

        const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
        sidebar.setNotifBadge(safeCount);
    }

    _startBadgePolling() {
        if (this._badgeTimer) {
            clearInterval(this._badgeTimer);
        }

        this._badgeTimer = setInterval(() => {
            this.refreshNotificationBadge();
        }, this.pollIntervalMs);
    }

    async refreshNotificationBadge() {
        if (!window.API || typeof window.API.get !== 'function') {
            return;
        }

        try {
            const response = await window.API.get('/notifications?limit=50');
            if (!response || response.status !== 'success') {
                throw new Error(response?.message || 'Failed to fetch notifications');
            }

            const unreadCount = Number(response?.data?.unread_count);
            if (Number.isFinite(unreadCount)) {
                this.setNotifBadge(unreadCount);
                return;
            }

            const notifications = Array.isArray(response?.data?.notifications)
                ? response.data.notifications
                : [];
            const computedUnread = notifications.filter(item => Number(item?.is_read) !== 1).length;
            this.setNotifBadge(computedUnread);
        } catch (error) {
            console.error('to-shell-sidebar badge refresh failed:', error);
            this.setNotifBadge(0);
        }
    }

    _onRootClick(event) {
        const navItem = event.target.closest('.nav-item[data-section]');
        if (!navItem || !this.contains(navItem)) return;

        const section = navItem.dataset.section;
        if (!section) return;

        if (this.mode === 'subpage') {
            event.preventDefault();
            event.stopPropagation();
            const basePath = this.basePath || '../';
            window.location.href = `${basePath}?section=${encodeURIComponent(section)}`;
            return;
        }

        this.setAttribute('active-section', section);
    }
}

if (!customElements.get('to-shell-sidebar')) {
    customElements.define('to-shell-sidebar', TOShellSidebar);
}
