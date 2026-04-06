/**
 * <ac-form-control>
 * Shared control factory for input/select/textarea fields.
 *
 * Uses shadow DOM + Constructable Stylesheets for styling, while keeping the
 * native input/select/textarea in light DOM so browser form validation/reset
 * and existing JS access patterns continue to work.
 *
 * Attributes:
 *   control      - input | select | textarea (default: input)
 *   control-id   - ID for JS lookups (assigned to host custom element)
 *   type         - native input type (default: text)
 *   options      - JSON array for select options
 *   placeholder  - placeholder text (also used as first select option label)
 *   value        - initial value
 *   rows         - textarea rows
 *   required, readonly, disabled, min, max, step, minlength, maxlength,
 *   autocomplete, name, onchange, oninput
 */

const acFormControlSheet = new CSSStyleSheet();
acFormControlSheet.replaceSync(`
    :host {
        display: block;
        width: 100%;
    }

    .afc-slot {
        display: block;
        width: 100%;
    }

    .afc-slot::slotted(.acfc-control) {
        width: 100%;
        padding: 12px 15px;
        border: 1px solid var(--stone-200, #eef1f4);
        border-radius: 10px;
        font-size: 14px;
        color: var(--text-900, #111827);
        background: var(--card, #fff);
        outline: none;
        transition: all 0.2s ease;
        font-family: inherit;
    }

    .afc-slot::slotted(textarea.acfc-control) {
        resize: vertical;
        min-height: 100px;
        line-height: 1.5;
    }

    .afc-slot::slotted(.acfc-control:focus) {
        box-shadow: var(--ring, 0 0 0 3px rgba(59, 130, 246, 0.2));
        border-color: var(--royal-blue, #2563eb);
    }

    .afc-slot::slotted(.acfc-control:disabled) {
        background: #f3f4f6;
        color: #6b7280;
        cursor: not-allowed;
    }
`);

class ACFormControl extends HTMLElement {
    static get observedAttributes() {
        return [
            'control', 'control-id', 'type', 'options', 'placeholder', 'value',
            'rows', 'required', 'readonly', 'disabled', 'min', 'max', 'step',
            'minlength', 'maxlength', 'autocomplete', 'name', 'onchange', 'oninput'
        ];
    }

    constructor() {
        super();
        const root = this.attachShadow({ mode: 'open' });
        root.adoptedStyleSheets = [acFormControlSheet];
    }

    connectedCallback() {
        if (!this._initialized) {
            this.shadowRoot.innerHTML = '<slot class="afc-slot"></slot>';
            this._initialized = true;
        }

        this._ensureControl();
        this._syncHostId();
        this._syncControl();
    }

    attributeChangedCallback(name) {
        if (!this._initialized) return;

        if (name === 'control') {
            this._ensureControl(true);
        }

        this._syncHostId();
        this._syncControl();
    }

    get formControl() {
        return this._control;
    }

    get value() {
        return this._control ? this._control.value : '';
    }

    set value(nextValue) {
        if (!this._control) return;
        this._control.value = nextValue ?? '';
    }

    focus() {
        this._control?.focus();
    }

    checkValidity() {
        return this._control?.checkValidity?.() ?? true;
    }

    reportValidity() {
        return this._control?.reportValidity?.() ?? true;
    }

    setCustomValidity(message) {
        this._control?.setCustomValidity?.(message);
    }

    _ensureControl(forceRecreate = false) {
        const controlType = (this.getAttribute('control') || 'input').toLowerCase();
        const tagName = controlType === 'select'
            ? 'SELECT'
            : controlType === 'textarea'
                ? 'TEXTAREA'
                : 'INPUT';

        if (!forceRecreate && this._control && this._control.tagName === tagName) {
            return;
        }

        this._control = document.createElement(tagName.toLowerCase());
        this._control.className = 'acfc-control';
        this.replaceChildren(this._control);
    }

    _syncHostId() {
        const controlId = this.getAttribute('control-id');
        if (!controlId) return;

        if (!this.id || this.id === this._generatedId) {
            this.id = controlId;
            this._generatedId = controlId;
        }
    }

    _syncControl() {
        if (!this._control) return;

        const isInput = this._control.tagName === 'INPUT';
        const isSelect = this._control.tagName === 'SELECT';
        const isTextArea = this._control.tagName === 'TEXTAREA';

        this._syncCommonAttributes();

        if (isInput) {
            this._control.type = this.getAttribute('type') || 'text';
            this._syncOptionalAttribute(this._control, 'placeholder');
            this._syncOptionalAttribute(this._control, 'min');
            this._syncOptionalAttribute(this._control, 'max');
            this._syncOptionalAttribute(this._control, 'step');
            this._syncOptionalAttribute(this._control, 'minlength');
            this._syncOptionalAttribute(this._control, 'maxlength');
            this._syncOptionalAttribute(this._control, 'autocomplete');
        }

        if (isTextArea) {
            this._syncOptionalAttribute(this._control, 'placeholder');
            this._syncOptionalAttribute(this._control, 'rows');
            this._syncOptionalAttribute(this._control, 'minlength');
            this._syncOptionalAttribute(this._control, 'maxlength');
        }

        if (isSelect) {
            const previousValue = this._control.value;
            this._syncSelectOptions();

            const explicitValue = this.getAttribute('value');
            if (explicitValue !== null) {
                this._control.value = explicitValue;
            } else if (previousValue) {
                this._control.value = previousValue;
            }
        }

        // Only force value when explicitly provided as an attribute.
        const explicitValue = this.getAttribute('value');
        if (explicitValue !== null && !isSelect) {
            this._control.value = explicitValue;
        }
    }

    _syncCommonAttributes() {
        this._syncOptionalAttribute(this._control, 'name');
        this._syncOptionalAttribute(this._control, 'onchange');
        this._syncOptionalAttribute(this._control, 'oninput');

        this._control.required = this.hasAttribute('required');
        this._control.disabled = this.hasAttribute('disabled');

        if ('readOnly' in this._control) {
            this._control.readOnly = this.hasAttribute('readonly');
        }
    }

    _syncSelectOptions() {
        if (this._control.tagName !== 'SELECT') return;

        this._control.innerHTML = '';

        const placeholder = this.getAttribute('placeholder');
        if (placeholder !== null) {
            const first = document.createElement('option');
            first.value = '';
            first.textContent = placeholder;
            this._control.appendChild(first);
        }

        const optionsJson = this.getAttribute('options');
        if (!optionsJson) return;

        try {
            const options = JSON.parse(optionsJson);
            if (!Array.isArray(options)) return;

            options.forEach(option => {
                const optionEl = document.createElement('option');

                if (typeof option === 'string') {
                    optionEl.value = option;
                    optionEl.textContent = option;
                } else if (option && typeof option === 'object') {
                    optionEl.value = option.value ?? '';
                    optionEl.textContent = option.label ?? String(option.value ?? '');
                    optionEl.disabled = Boolean(option.disabled);
                    optionEl.selected = Boolean(option.selected);
                }

                this._control.appendChild(optionEl);
            });
        } catch (error) {
            console.error('Invalid ac-form-control options JSON:', error);
        }
    }

    _syncOptionalAttribute(element, attrName) {
        if (this.hasAttribute(attrName)) {
            element.setAttribute(attrName, this.getAttribute(attrName));
        } else {
            element.removeAttribute(attrName);
        }
    }
}

if (!customElements.get('ac-form-control')) {
    customElements.define('ac-form-control', ACFormControl);
}
