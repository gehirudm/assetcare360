class DriverFuelMileageModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        DriverUtils.ensureTodayDefaults(this);

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'fuelMileageModal') {
                this.open();
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'fuelMileageModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="fuelMileageModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-gas-pump"></i> Log Fuel & Mileage</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="fuelMileageForm">
                        <div class="form-section">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Fuel Volume (L) *</label>
                                    <input type="number" class="form-input" id="fuelVolume" min="0" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Total Cost (LKR) *</label>
                                    <input type="number" class="form-input" id="fuelCost" min="0" step="0.01" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Current Odometer (km) *</label>
                                    <input type="number" class="form-input" id="fuelOdometer" min="0" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Date & Time *</label>
                                    <input type="datetime-local" class="form-input" id="fuelDateTime" required>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Save Fuel Log</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#fuelMileageModal');
        const form = this.querySelector('#fuelMileageForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            DriverUtils.showToast('Fuel and mileage data logged successfully.');
            this.close();
            form.reset();
            DriverUtils.ensureTodayDefaults(form);
        });
    }

    open() {
        DriverUtils.setModalState(this.querySelector('#fuelMileageModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#fuelMileageModal'), false);
    }
}

customElements.define('driver-fuel-mileage-modal', DriverFuelMileageModal);
