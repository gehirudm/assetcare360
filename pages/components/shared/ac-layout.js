/**
 * <ac-layout> — Unified dashboard layout shell (light DOM)
 *
 * Composes <ac-header> + <ac-sidebar> + a main content area and wires up
 * SPA-style section navigation automatically.
 *
 * Attributes:
 *   title          — passed through to <ac-header>
 *   icon           — passed through to <ac-header>
 *   nav            — passed through to <ac-sidebar> (JSON nav array)
 *   active-section — initial section to show (default: first item in nav)
 *   header-tag     — optional custom header tag (default: ac-header)
 *   sidebar-tag    — optional custom sidebar tag (default: ac-sidebar)
 *
 * Slot usage:
 *   Place <section class="content-section" id="sectionName"> elements
 *   directly inside <ac-layout>. The component moves them into the
 *   managed <main class="main-content"> area automatically.
 *
 *   <ac-layout title="Supervisor Dashboard" icon="fa-user-tie" nav='[...]'>
 *     <section class="content-section" id="dashboard">...</section>
 *     <section class="content-section" id="fault-tickets">...</section>
 *   </ac-layout>
 *
 * Public methods:
 *   navigateTo(sectionId)      — switch to a section programmatically
 *
 * Events dispatched on the element:
 *   section-change             — detail: { section: string }
 *                                Fired after every section switch.
 *                                Page scripts listen to this instead of
 *                                duplicating nav-item click handlers.
 *
 *   Example:
 *     document.querySelector('ac-layout')
 *       .addEventListener('section-change', e => loadSectionData(e.detail.section));
 *
 * Page-script upgrade path:
 *   Replace:
 *     document.querySelectorAll('.nav-item').forEach(item => { ... });
 *     function navigateTo(sectionId) { ... }
 *   With:
 *     document.querySelector('ac-layout')
 *       .addEventListener('section-change', e => loadSectionData(e.detail.section));
 *
 *   navigateTo(id) still works as a global function — <ac-layout> registers
 *   window.navigateTo and window.navigateToSection pointing to its own method,
 *   so existing onclick="navigateTo('section')" attributes continue to work.
 */
class ACLayout extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'icon', 'nav', 'active-section', 'header-tag', 'sidebar-tag'];
    }

    constructor() {
        super();
        this._mountRetryFrame = null;
        this._isMounted = false;
    }

    connectedCallback() {
        this.classList.add('container');
        this._mount();
    }

    disconnectedCallback() {
        if (this._mountRetryFrame !== null) {
            cancelAnimationFrame(this._mountRetryFrame);
            this._mountRetryFrame = null;
        }
    }

    attributeChangedCallback(name) {
        if (!this.isConnected || !this._isMounted) return;

        if (name === 'header-tag' || name === 'sidebar-tag') {
            const sections = Array.from(this.querySelectorAll('#acMainContent > section.content-section'));
            const activeSection =
                this.querySelector('#acMainContent > section.content-section.active')?.id ||
                this.getAttribute('active-section') ||
                this._firstSection();

            this._render(sections);
            this._wireNav();

            if (activeSection) {
                this.navigateTo(activeSection);
            }
            return;
        }

        if (name === 'title' || name === 'icon') {
            const header = this._headerElement();
            if (header) {
                header.setAttribute('title', this.getAttribute('title') || '');
                header.setAttribute('icon',  this.getAttribute('icon')  || '');
            }
        }

        if (name === 'nav') {
            const sidebar = this._sidebarElement();
            if (sidebar) {
                sidebar.setAttribute('nav', this.getAttribute('nav') || '[]');
                this._wireNav();
            }
        }
    }

    get _title()         { return this.getAttribute('title')          || 'Dashboard'; }
    get _icon()          { return this.getAttribute('icon')           || 'fa-chart-line'; }
    get _nav()           { return this.getAttribute('nav')            || '[]'; }
    get _activeSection() { return this.getAttribute('active-section') || ''; }
    get _headerTag()     { return this._safeTagName(this.getAttribute('header-tag'), 'ac-header'); }
    get _sidebarTag()    { return this._safeTagName(this.getAttribute('sidebar-tag'), 'ac-sidebar'); }

    _safeTagName(value, fallback) {
        const normalized = String(value || '').trim().toLowerCase();
        if (/^[a-z][a-z0-9-]*-[a-z0-9-]+$/.test(normalized)) {
            return normalized;
        }
        return fallback;
    }

    _headerElement() {
        return this.querySelector(this._headerTag) || this.querySelector('ac-header');
    }

    _sidebarElement() {
        return this.querySelector(this._sidebarTag) || this.querySelector('ac-sidebar');
    }

    _firstSection() {
        try {
            const items = JSON.parse(this._nav);
            return items[0]?.section || '';
        } catch { return ''; }
    }

    _collectSections() {
        const renderedMain = this.querySelector('#acMainContent');
        if (renderedMain) {
            return Array.from(renderedMain.querySelectorAll(':scope > section.content-section'));
        }

        return Array.from(this.children).filter(node =>
            node.matches && node.matches('section.content-section')
        );
    }

    _mount(retryCount = 0) {
        const sections = this._collectSections();
        const hasMain = Boolean(this.querySelector('#acMainContent'));

        // Some browsers can upgrade custom elements before child parsing completes.
        // Retry initial mount briefly so section children can be captured reliably.
        if (!hasMain && sections.length === 0 && retryCount < 5) {
            this._mountRetryFrame = requestAnimationFrame(() => {
                this._mountRetryFrame = null;
                this._mount(retryCount + 1);
            });
            return;
        }

        this._render(sections);
        this._wireNav();
        this._isMounted = true;

        // Register global navigateTo / navigateToSection so legacy onclick attrs keep working.
        window.navigateTo = id => this.navigateTo(id);
        window.navigateToSection = id => this.navigateTo(id);

        // Show initial section
        const initial = this.getAttribute('active-section') || this._firstSection();
        if (initial) this.navigateTo(initial);
    }

    _render(sections) {
        const headerTag = this._headerTag;
        const sidebarTag = this._sidebarTag;

        // Build the standard layout shell
        this.innerHTML = `
            <${headerTag} title="${this._title}" icon="${this._icon}"></${headerTag}>
            <div class="main-wrapper">
                <${sidebarTag} nav='${this._nav}'></${sidebarTag}>
                <main class="main-content" id="acMainContent"></main>
            </div>`;

        // Re-inject the user's <section> elements into the managed <main>
        const main = this.querySelector('#acMainContent');
        sections.forEach(s => {
            s.classList.remove('active'); // reset — navigateTo() sets one active
            main.appendChild(s);
        });
    }

    _wireNav() {
        // Delegate click on any .nav-item inside this component's sidebar
        const sidebar = this._sidebarElement();
        if (!sidebar) return;

        // Remove old listener if re-wiring
        if (this._navHandler) {
            sidebar.removeEventListener('click', this._navHandler);
        }

        this._navHandler = e => {
            const item = e.target.closest('.nav-item[data-section]');
            if (!item) return;
            this.navigateTo(item.dataset.section);
        };

        sidebar.addEventListener('click', this._navHandler);
    }

    /**
     * Switch to a section by ID.
     * Updates active nav item, shows the matching <section>, and fires
     * a 'section-change' event for page scripts to react to.
     *
     * @param {string} sectionId
     */
    navigateTo(sectionId) {
        const main = this.querySelector('#acMainContent');
        if (!main) return;

        // Toggle section visibility
        main.querySelectorAll('.content-section').forEach(s => {
            s.classList.toggle('active', s.id === sectionId);
        });

        // Sync sidebar highlight
        const sidebar = this._sidebarElement();
        if (sidebar) sidebar.setActive(sectionId);

        // Fire event for page scripts
        this.dispatchEvent(new CustomEvent('section-change', {
            bubbles: true,
            detail: { section: sectionId },
        }));
    }
}

customElements.define('ac-layout', ACLayout);
