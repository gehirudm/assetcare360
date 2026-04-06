/**
 * <confirm-dialog> — Shared confirmation/alert modal.
 *
 * Uses shadow DOM + Constructable Stylesheets (adoptedStyleSheets) for full
 * style encapsulation. CSS custom properties defined in the host page's :root
 * are inherited across the shadow boundary automatically, so theming works
 * without any extra wiring.
 *
 * Depends on (load before this file):
 *   pages/components/styles/buttons.js  → window._ACStyles.buttons
 *   pages/components/styles/icons.js    → window._ACStyles.icons
 *
 * Usage:
 *   <!-- Once per page, near end of <body> -->
 *   <confirm-dialog></confirm-dialog>
 *
 *   // Via dashboard-init.js thin wrapper (all existing call sites work unchanged):
 *   createConfirmationDialog(title, message, onConfirmFn, type);
 *
 *   // Or directly:
 *   document.querySelector('confirm-dialog').show({
 *       title    : 'Delete item?',
 *       message  : 'This cannot be undone.',
 *       type     : 'danger',   // 'danger' | 'warning' | 'primary' | 'info'
 *       onConfirm: () => doDelete(),
 *   });
 *
 * Public methods:
 *   show(options)  — opens the dialog
 *   close()        — closes the dialog
 *
 * CSS variable hooks (set on the host element or any ancestor):
 *   --card          card background  (default: #fff)
 *   --radius        border radius    (default: 15px)
 *   --text-700      body text colour (default: #374151)
 *   --stone-200     divider colour   (default: #e2e8f0)
 *   --gradient-blue primary header gradient
 *   --danger, --warn, --royal-blue  type colours
 */

(function () {
    // -----------------------------------------------------------------------
    // Module-level stylesheet — created ONCE, reused by every instance.
    // This is the key advantage of Constructable Stylesheets: no per-instance
    // string parsing; all instances share the same parsed CSSOM object.
    // -----------------------------------------------------------------------
    const dialogSheet = new CSSStyleSheet();
    dialogSheet.replaceSync(`
        /* Host element IS the overlay backdrop */
        :host {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 16px;
        }
        :host(.active) {
            display: flex;
        }

        /* Dialog card */
        .cd-content {
            background: var(--card, #fff);
            width: 100%;
            max-width: 460px;
            border-radius: var(--radius, 15px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        /* Coloured header strip */
        .cd-header {
            padding: 25px 30px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .cd-header.danger  { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; }
        .cd-header.warning { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
        .cd-header.primary { background: var(--gradient-blue, linear-gradient(135deg, #2563eb, #1d4ed8)); color: white; }
        .cd-header.info    { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
        .cd-header h4 { margin: 0; font-size: 1.3rem; }
        .cd-header i  { font-size: 1.5rem; }

        /* Body */
        .cd-body {
            padding: 30px;
            color: var(--text-700, #374151);
            line-height: 1.6;
        }
        .cd-body p { margin: 0; font-size: 1rem; }

        /* Action row */
        .cd-actions {
            padding: 20px 30px;
            border-top: 1px solid var(--stone-200, #e2e8f0);
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
    `);

    const ICONS = {
        danger  : 'exclamation-triangle',
        warning : 'exclamation-triangle',
        primary : 'question-circle',
        info    : 'question-circle',
    };

    class ConfirmDialog extends HTMLElement {
        constructor() {
            super();
            this._onConfirm = null;
            this._onEsc = this._onEsc.bind(this);

            // Attach shadow root and adopt stylesheets.
            // Shared sheets (buttons, icons) come first so dialog rules can
            // override them if needed. All three are shared CSSOM objects —
            // no duplication even with multiple instances on a page.
            const root = this.attachShadow({ mode: 'open' });
            root.adoptedStyleSheets = [
                ...(window._ACStyles?.buttons ? [window._ACStyles.buttons] : []),
                ...(window._ACStyles?.icons   ? [window._ACStyles.icons]   : []),
                dialogSheet,
            ];
        }

        connectedCallback() {
            this._render();
            this._setupEvents();
        }

        _render() {
            this.shadowRoot.innerHTML = `
                <div class="cd-content">
                    <div class="cd-header danger" id="cdHeader">
                        <i class="fas fa-exclamation-triangle" id="cdIcon"></i>
                        <h4 id="cdTitle"></h4>
                    </div>
                    <div class="cd-body">
                        <p id="cdMessage"></p>
                    </div>
                    <div class="cd-actions">
                        <button class="btn btn-secondary" id="cdCancel">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn btn-danger" id="cdConfirm">
                            <i class="fas fa-check"></i> Confirm
                        </button>
                    </div>
                </div>
            `;
        }

        _setupEvents() {
            const root = this.shadowRoot;
            root.querySelector('#cdCancel').addEventListener('click', () => this.close());
            root.querySelector('#cdConfirm').addEventListener('click', () => this._confirm());
            // Close when clicking the backdrop (the host element itself)
            this.addEventListener('click', (e) => {
                if (e.target === this) this.close();
            });
        }

        _onEsc(e) {
            if (e.key === 'Escape') this.close();
        }

        /**
         * Open the dialog.
         * @param {{ title: string, message: string, type?: string, onConfirm: Function }} options
         *   type — 'danger' | 'warning' | 'primary' | 'info'  (default: 'danger')
         */
        show({ title, message, type = 'danger', onConfirm }) {
            this._onConfirm = onConfirm;

            const root = this.shadowRoot;
            root.querySelector('#cdHeader').className  = `cd-header ${type}`;
            root.querySelector('#cdIcon').className    = `fas fa-${ICONS[type] || 'question-circle'}`;
            root.querySelector('#cdTitle').textContent = title;
            root.querySelector('#cdMessage').innerHTML = message;
            root.querySelector('#cdConfirm').className = `btn btn-${type}`;

            document.addEventListener('keydown', this._onEsc);
            setTimeout(() => this.classList.add('active'), 10);
        }

        close() {
            this.classList.remove('active');
            this._onConfirm = null;
            document.removeEventListener('keydown', this._onEsc);
        }

        async _confirm() {
            if (this._onConfirm) {
                await this._onConfirm();
            }
            this.close();
        }
    }

    customElements.define('confirm-dialog', ConfirmDialog);
})();
