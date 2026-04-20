class TMCargoItemModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="cargoItemModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-plus-circle"></i> Add Cargo Item</h2>
                        <button class="btn-close" type="button" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="cargoItemForm">
                        <div id="cargoItemErrors" class="form-errors" style="display: none;"></div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="cargoItemName">Cargo Name *</label>
                                <input type="text" class="form-input" id="cargoItemName" name="name" placeholder="e.g. Industrial Solvent Drums" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="cargoItemUnit">Unit *</label>
                                <input type="text" class="form-input" id="cargoItemUnit" name="unit" placeholder="e.g. drums" value="units" required>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label" for="cargoItemDescription">Description</label>
                            <textarea class="form-textarea" id="cargoItemDescription" name="description" placeholder="Optional cargo description"></textarea>
                        </div>

                        <div class="form-group full-width cargo-checkbox-field">
                            <label class="cargo-checkbox-label" for="cargoItemDangerous">
                                <input class="cargo-checkbox-input" type="checkbox" id="cargoItemDangerous" name="is_dangerous">
                                <span>Mark as dangerous cargo</span>
                            </label>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary" id="cargoItemSubmitBtn">
                                <i class="fas fa-save"></i> Save Cargo Item
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="close">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');

            if (event.target.id === 'cargoItemModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
            }
        });

        const form = this.querySelector('#cargoItemForm');
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.submit();
            });
        }
    }

    open() {
        const modal = this.querySelector('#cargoItemModal');
        const form = this.querySelector('#cargoItemForm');

        form?.reset();
        const unitInput = this.querySelector('#cargoItemUnit');
        if (unitInput) {
            unitInput.value = 'units';
        }

        this._hideErrors();
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    close() {
        const modal = this.querySelector('#cargoItemModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }

        this._hideErrors();
    }

    async submit() {
        const nameInput = this.querySelector('#cargoItemName');
        const unitInput = this.querySelector('#cargoItemUnit');
        const descriptionInput = this.querySelector('#cargoItemDescription');
        const dangerousInput = this.querySelector('#cargoItemDangerous');
        const submitBtn = this.querySelector('#cargoItemSubmitBtn');

        const name = String(nameInput?.value || '').trim();
        const unit = String(unitInput?.value || '').trim();
        const description = String(descriptionInput?.value || '').trim();
        const isDangerous = !!dangerousInput?.checked;

        if (!name) {
            this._showError('Cargo item name is required.');
            return;
        }

        if (!unit) {
            this._showError('Cargo unit is required.');
            return;
        }

        const payload = {
            name,
            unit,
            description,
            is_dangerous: isDangerous,
        };

        const originalHtml = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const response = await API.post('/trips/cargo-items', payload);
            this._assertSuccess(response, 'Failed to create cargo item');

            const cargoItem = response.data?.cargo_item || null;
            TMUtils.emitToast('Cargo item created successfully', 'success');

            document.dispatchEvent(new CustomEvent('tm-modal:cargo-item-saved', {
                detail: {
                    cargoItem,
                },
            }));

            this.close();
        } catch (error) {
            const message = error.message || 'Failed to create cargo item';
            this._showError(message);
            TMUtils.emitToast(message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml || '<i class="fas fa-save"></i> Save Cargo Item';
            }
        }
    }

    _showError(message) {
        const errorBox = this.querySelector('#cargoItemErrors');
        if (!errorBox) {
            return;
        }

        errorBox.textContent = message;
        errorBox.style.display = 'block';
    }

    _hideErrors() {
        const errorBox = this.querySelector('#cargoItemErrors');
        if (!errorBox) {
            return;
        }

        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }

    _assertSuccess(response, fallbackMessage) {
        if (response && (response.success === true || response.status === 'success')) {
            return;
        }

        const message = response?.message || fallbackMessage;
        throw new Error(message);
    }
}

customElements.define('tm-cargo-item-modal', TMCargoItemModal);
