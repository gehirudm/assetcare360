class SAAddServiceIntervalModal extends HTMLElement {
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
            <div id="addServiceIntervalModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Add Service Interval</h2>
                    <form id="addServiceIntervalForm">
                        <div class="form-section">
                            <h5><i class="fas fa-cog"></i> Service Configuration</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Vehicle/Machine Type</label>
                                    <select class="form-select" required>
                                        <option value="">Select Type</option>
                                        <option value="light-vehicle">Light Vehicle</option>
                                        <option value="heavy-vehicle">Heavy Vehicle</option>
                                        <option value="excavator">Excavator</option>
                                        <option value="loader">Loader</option>
                                        <option value="all">All Vehicles/Machines</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Service Type</label>
                                    <input type="text" class="form-input" placeholder="e.g., Oil Change" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Distance Interval (km/hours)</label>
                                    <input type="number" class="form-input" placeholder="e.g., 5000" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Time Interval (months)</label>
                                    <input type="number" class="form-input" placeholder="e.g., 6" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <textarea class="form-textarea" placeholder="Additional details about this service interval"></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Add Service Interval</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#addServiceIntervalModal');
        const form = this.querySelector('#addServiceIntervalForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.emitToast('Service interval added successfully.', 'success');
            this.close();
        });
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('addServiceIntervalModal');
            return;
        }

        const modal = this.querySelector('#addServiceIntervalModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-add-service-interval-modal', SAAddServiceIntervalModal);
