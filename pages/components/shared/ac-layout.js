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
        return ['title', 'icon', 'nav', 'active-section'];
    }

    connectedCallback() {
        // Capture the user-provided <section> children BEFORE replacing innerHTML.
        // querySelectorAll returns a static NodeList so collecting to an array is safe.
        const sections = Array.from(this.querySelectorAll(':scope > section.content-section'));

        this.classList.add('container');
        this._render(sections);
        this._wireNav();

        // Register global navigateTo / navigateToSection so legacy onclick attrs keep working.
        window.navigateTo        = id => this.navigateTo(id);
        window.navigateToSection = id => this.navigateTo(id);

        // Show initial section
        const initial = this.getAttribute('active-section') || this._firstSection();
        if (initial) this.navigateTo(initial);
    }

    attributeChangedCallback(name) {
        if (!this.isConnected) return;

        if (name === 'title' || name === 'icon') {
            const header = this.querySelector('ac-header');
            if (header) {
                header.setAttribute('title', this.getAttribute('title') || '');
                header.setAttribute('icon',  this.getAttribute('icon')  || '');
            }
        }

        if (name === 'nav') {
            const sidebar = this.querySelector('ac-sidebar');
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

    _firstSection() {
        try {
            const items = JSON.parse(this._nav);
            return items[0]?.section || '';
        } catch { return ''; }
    }

    _render(sections) {
        // Build the standard layout shell
        this.innerHTML = `
            <ac-header title="${this._title}" icon="${this._icon}"></ac-header>
            <div class="main-wrapper">
                <ac-sidebar nav='${this._nav}'></ac-sidebar>
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
        const sidebar = this.querySelector('ac-sidebar');
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
        const sidebar = this.querySelector('ac-sidebar');
        if (sidebar) sidebar.setActive(sectionId);

        // Fire event for page scripts
        this.dispatchEvent(new CustomEvent('section-change', {
            bubbles: true,
            detail: { section: sectionId },
        }));
    }
}

customElements.define('ac-layout', ACLayout);
