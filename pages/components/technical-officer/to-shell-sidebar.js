/**
 * to-shell-sidebar.js
 * Defines the <to-shell-sidebar> web component.
 *
 * Renders the Technical Officer dashboard sidebar navigation into light DOM.
 *
 * Attributes:
 *   active-section  — section key to highlight (default: 'dashboard')
 *   mode            — 'spa' (default) or 'subpage'
 *                     spa:     nav items use data-section; the SPA router handles clicks
 *                     subpage: nav items use onclick href links back to the dashboard
 *   base-path       — relative path to dashboard root, used in subpage mode (e.g. '../')
 *
 * Usage:
 *   <!-- SPA dashboard -->
 *   <to-shell-sidebar active-section="dashboard"></to-shell-sidebar>
 *
 *   <!-- Detail / sub-page -->
 *   <to-shell-sidebar mode="subpage" active-section="tickets" base-path="../"></to-shell-sidebar>
 *
 * Public methods:
 *   setNotifBadge(count) — update the notification badge count
 */

const TO_SIDEBAR_NAV_ITEMS = [
    { section: 'dashboard',        icon: 'fas fa-chart-line',  label: 'Dashboard' },
    { section: 'tickets',          icon: 'fas fa-ticket-alt',  label: 'Fault &amp; Repair Tickets' },
    { section: 'spare-parts',      icon: 'fas fa-tools',       label: 'Spare Part Management' },
    { section: 'inventory',        icon: 'fas fa-warehouse',   label: 'Inventory Management' },
    { section: 'service-warranty', icon: 'fas fa-shield-alt',  label: 'Service &amp; Warranty' },
    { section: 'feedback',         icon: 'fas fa-comments',    label: 'Asset Feedback' },
    { section: 'notifications',    icon: 'fas fa-bell',        label: 'Notifications', badge: true },
];

class TOShellSidebar extends HTMLElement {
    static get observedAttributes() {
        return ['active-section', 'mode', 'base-path'];
    }

    connectedCallback() {
        this.classList.add('sidebar');
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) this.render();
    }

    get activeSection() { return this.getAttribute('active-section') || 'dashboard'; }
    get mode()          { return this.getAttribute('mode')           || 'spa'; }
    get basePath()      { return this.getAttribute('base-path')      || ''; }

    render() {
        const isSubpage = this.mode === 'subpage';
        const base      = this.basePath;

        const items = TO_SIDEBAR_NAV_ITEMS.map(item => {
            const active      = item.section === this.activeSection ? ' active' : '';
            const badge       = item.badge
                ? `<span class="nav-badge" id="notifBadge" style="display:none;">0</span>`
                : '';
            const clickAttr   = isSubpage
                ? `onclick="window.location.href='${base}?section=${item.section}'"`
                : `data-section="${item.section}"`;

            return `<div class="nav-item${active}" ${clickAttr}>
                <i class="nav-icon ${item.icon}"></i>
                <span>${item.label}</span>${badge}
            </div>`;
        }).join('\n            ');

        this.innerHTML = `<nav>\n            ${items}\n        </nav>`;
    }

    /**
     * Push a notification count into the badge.
     * Call this from the page script after computing the count —
     * the component never fetches data itself.
     */
    setNotifBadge(count) {
        const badge = this.querySelector('#notifBadge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent    = count;
            badge.style.display  = 'inline-flex';
        } else {
            badge.style.display  = 'none';
        }
    }
}

customElements.define('to-shell-sidebar', TOShellSidebar);
