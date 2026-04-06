/**
 * <ac-modal>
 * Shared modal shell for dashboard forms.
 *
 * This component uses shadow DOM + Constructable Stylesheets so modal styling
 * is self-contained and not coupled to page-level CSS.
 *
 * Attributes:
 *   title       - modal heading text
 *   icon        - Font Awesome icon class without the "fas" prefix (e.g., "fa-ticket-alt")
 *   max-width   - optional CSS max-width value for the modal content (default: 800px)
 *
 * Public methods:
 *   open()      - shows the modal
 *   close()     - hides the modal
 */

const acModalSheet = new CSSStyleSheet();
acModalSheet.replaceSync(`
    :host {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 1000;
        align-items: center;
        justify-content: center;
        padding: 16px;
    }

    :host(.active) {
        display: flex;
    }

    .acm-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
    }

    .acm-content {
        position: relative;
        z-index: 1;
        background: var(--card, #ffffff);
        width: 90%;
        max-width: var(--acm-max-width, 800px);
        max-height: 90vh;
        border-radius: 15px;
        padding: 30px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow-y: auto;
    }

    .acm-close {
        position: absolute;
        right: 15px;
        top: 15px;
        width: 35px;
        height: 35px;
        border: none;
        border-radius: 50%;
        background: var(--royal-blue, #2563eb);
        color: #fff;
        font-size: 28px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .acm-close:hover {
        background: var(--tang-blue, #1d4ed8);
    }

    .acm-title {
        margin: 0 0 20px;
        color: var(--tang-blue, #1d4ed8);
        font-size: 1.5rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .acm-title i {
        font-size: 1.2rem;
    }

    .acm-slot {
        display: block;
    }

    .acm-slot::slotted(form) {
        display: block;
    }
`);

class ACModal extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'icon', 'max-width'];
    }

    constructor() {
        super();
        this._onHostClick = this._onHostClick.bind(this);
        this._onKeydown = this._onKeydown.bind(this);

        const root = this.attachShadow({ mode: 'open' });
        root.adoptedStyleSheets = [acModalSheet];
    }

    connectedCallback() {
        if (!this._initialized) {
            this._render();
            this._initialized = true;
        }

        this.addEventListener('click', this._onHostClick);
        this._renderHeader();
        this._syncMaxWidth();
        this.setAttribute('role', 'dialog');
        this.setAttribute('aria-modal', 'true');
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onHostClick);
        document.removeEventListener('keydown', this._onKeydown);
    }

    attributeChangedCallback(name) {
        if (!this._initialized) return;

        if (name === 'title' || name === 'icon') {
            this._renderHeader();
        }

        if (name === 'max-width') {
            this._syncMaxWidth();
        }
    }

    _render() {
        this.shadowRoot.innerHTML = `
            <div class="acm-backdrop" aria-hidden="true"></div>
            <div class="acm-content" id="acmContent">
                <button type="button" class="acm-close" id="acmClose" aria-label="Close modal">&times;</button>
                <h2 class="acm-title" id="acmTitle"></h2>
                <slot class="acm-slot"></slot>
            </div>
        `;

        this._content = this.shadowRoot.getElementById('acmContent');
        this.shadowRoot.getElementById('acmClose').addEventListener('click', () => this.close());
    }

    _renderHeader() {
        const title = this.getAttribute('title') || 'Modal';
        const icon = this.getAttribute('icon');
        const titleEl = this.shadowRoot.getElementById('acmTitle');

        titleEl.innerHTML = icon
            ? `<i class="fas ${icon}" aria-hidden="true"></i><span>${title}</span>`
            : `<span>${title}</span>`;
    }

    _syncMaxWidth() {
        const maxWidth = this.getAttribute('max-width') || '800px';
        this.style.setProperty('--acm-max-width', maxWidth);
    }

    _onHostClick(event) {
        if (!this.classList.contains('active')) return;

        const clickPath = event.composedPath();
        if (clickPath.includes(this._content)) return;

        this.close();
    }

    _onKeydown(event) {
        if (event.key === 'Escape') {
            this.close();
        }
    }

    open() {
        this.classList.add('active');
        document.addEventListener('keydown', this._onKeydown);
        this.dispatchEvent(new CustomEvent('ac-modal-opened', { bubbles: true }));
    }

    close() {
        this.classList.remove('active');
        document.removeEventListener('keydown', this._onKeydown);
        this.dispatchEvent(new CustomEvent('ac-modal-closed', { bubbles: true }));
    }
}

if (!customElements.get('ac-modal')) {
    customElements.define('ac-modal', ACModal);
}
