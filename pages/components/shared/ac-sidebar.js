/**
 * <ac-sidebar> — Unified dashboard sidebar (light DOM)
 *
 * Attributes:
 *   nav    — JSON array of nav item definitions (required)
 *            Each item: { section, icon, label, badge? }
 *            badge:true items get a hidden count badge (#notifBadge)
 *
 * Usage (SPA dashboard — nav item clicks handled by <ac-layout>):
 *   <ac-sidebar nav='[
 *     { "section": "dashboard",    "icon": "fas fa-chart-line", "label": "Dashboard" },
 *     { "section": "fault-tickets","icon": "fas fa-tools",      "label": "Fault Tickets" },
 *     { "section": "notifications","icon": "fas fa-bell",       "label": "Notifications", "badge": true }
 *   ]'></ac-sidebar>
 *
 * Public methods:
 *   setActive(section)         — highlight the given nav item
 *   setNotifBadge(count)       — show/hide the badge on the item with badge:true
 */
const AC_SIDEBAR_STYLE_ID = 'ac-sidebar-shared-badge-styles';

const AC_SIDEBAR_SHARED_STYLES = `
ac-sidebar .nav-badge {
    margin-left: auto;
    background: #ef4444;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}
`;

class ACSidebar extends HTMLElement {
    static get observedAttributes() {
        return ['nav'];
    }

    connectedCallback() {
        this._ensureSharedStyles();
        this.classList.add('sidebar');
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) this.render();
    }

    get navItems() {
        try {
            return JSON.parse(this.getAttribute('nav') || '[]');
        } catch {
            console.warn('<ac-sidebar>: invalid JSON in nav attribute');
            return [];
        }
    }

    render() {
        const items = this.navItems.map(item => this._renderItem(item)).join('\n');
        this.innerHTML = `<nav>${items}\n</nav>`;
    }

    _renderItem(item) {
        const badge = item.badge
            ? `<span class="nav-badge" id="notifBadge" style="display:none;">0</span>`
            : '';
        return `
        <div class="nav-item" data-section="${item.section}">
            <i class="nav-icon ${item.icon}"></i>
            <span>${item.label}</span>${badge}
        </div>`;
    }

    /**
     * Highlight the given section in the sidebar.
     * Called by <ac-layout> on section change and on initial render.
     * @param {string} section
     */
    setActive(section) {
        this.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.section === section);
        });
    }

    /**
     * Push a notification count into the badge.
     * The component never fetches data itself — page scripts call this.
     * @param {number} count
     */
    setNotifBadge(count) {
        const badge = this.querySelector('#notifBadge');
        if (!badge) return;
        badge.textContent   = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    _ensureSharedStyles() {
        if (document.getElementById(AC_SIDEBAR_STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = AC_SIDEBAR_STYLE_ID;
        style.textContent = AC_SIDEBAR_SHARED_STYLES;
        document.head.appendChild(style);
    }
}

customElements.define('ac-sidebar', ACSidebar);
