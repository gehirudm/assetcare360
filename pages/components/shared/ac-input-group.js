/**
 * <ac-input-group>
 * Shared form-group wrapper with standard label and helper text.
 *
 * Uses shadow DOM + Constructable Stylesheets to keep spacing/typography
 * local to the component.
 *
 * Attributes:
 *   label     - field label text
 *   required  - if present, appends " *" to label text
 *   help      - optional helper text under the control
 */

const acInputGroupSheet = new CSSStyleSheet();
acInputGroupSheet.replaceSync(`
    :host {
        display: block;
        margin-bottom: 20px;
    }

    .aig-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 700;
        color: var(--text-700, #374151);
        cursor: pointer;
    }

    .aig-required {
        color: var(--danger, #d93025);
    }

    .aig-control {
        display: block;
    }

    .aig-help {
        display: block;
        margin-top: 6px;
        color: var(--muted, #6b7280);
        font-size: 0.82rem;
    }

    .aig-control ::slotted(*) {
        display: block;
        width: 100%;
    }
`);

class ACInputGroup extends HTMLElement {
    static get observedAttributes() {
        return ['label', 'required', 'help'];
    }

    constructor() {
        super();
        this._onLabelClick = this._onLabelClick.bind(this);

        const root = this.attachShadow({ mode: 'open' });
        root.adoptedStyleSheets = [acInputGroupSheet];
    }

    connectedCallback() {
        if (!this._initialized) {
            this._render();
            this._initialized = true;
        }
        this._syncFromAttributes();
    }

    attributeChangedCallback() {
        if (!this._initialized) return;
        this._syncFromAttributes();
    }

    _render() {
        this.shadowRoot.innerHTML = `
            <label class="aig-label" id="aigLabel"></label>
            <div class="aig-control">
                <slot id="aigSlot"></slot>
            </div>
            <small class="aig-help" id="aigHelp"></small>
        `;

        this._labelEl = this.shadowRoot.getElementById('aigLabel');
        this._helpEl = this.shadowRoot.getElementById('aigHelp');
        this._slotEl = this.shadowRoot.getElementById('aigSlot');
        this._labelEl.addEventListener('click', this._onLabelClick);
    }

    _syncFromAttributes() {
        const labelText = this.getAttribute('label') || '';
        const helpText = this.getAttribute('help') || '';
        const isRequired = this.hasAttribute('required');

        if (labelText) {
            this._labelEl.style.display = 'block';
            this._labelEl.innerHTML = isRequired
                ? `${labelText} <span class="aig-required">*</span>`
                : labelText;
        } else {
            this._labelEl.style.display = 'none';
            this._labelEl.textContent = '';
        }

        if (helpText) {
            this._helpEl.style.display = 'block';
            this._helpEl.textContent = helpText;
        } else {
            this._helpEl.style.display = 'none';
            this._helpEl.textContent = '';
        }
    }

    _onLabelClick() {
        const assigned = this._slotEl.assignedElements({ flatten: true });
        if (!assigned.length) return;

        const first = assigned[0];
        if (typeof first.focus === 'function') {
            first.focus();
            return;
        }

        const nestedControl = first.querySelector?.('input, select, textarea');
        if (nestedControl && typeof nestedControl.focus === 'function') {
            nestedControl.focus();
        }
    }
}

if (!customElements.get('ac-input-group')) {
    customElements.define('ac-input-group', ACInputGroup);
}
