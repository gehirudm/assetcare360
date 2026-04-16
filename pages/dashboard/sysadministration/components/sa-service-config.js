class SAServiceConfig extends HTMLElement {
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
            <div class="page-header">
                <h1 class="page-title">Service Interval Configuration</h1>
                <p class="page-subtitle">Manage vehicle and machine service schedules</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-add-interval">
                    <i class="fas fa-plus"></i> Add Service Interval
                </button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-cog"></i> Service Interval Settings</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Vehicle/Machine Type</th>
                            <th>Service Type</th>
                            <th>Interval (km/hours)</th>
                            <th>Time-based (months)</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr data-interval-id="SI-001">
                            <td>Light Vehicle</td>
                            <td>Oil Change</td>
                            <td>5,000 km</td>
                            <td>6 months</td>
                            <td><span class="status-text status-active">Active</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" type="button" data-action="edit-interval" data-interval-id="SI-001">Edit</button>
                                <button class="btn btn-danger btn-small" type="button" data-action="delete-interval" data-interval-id="SI-001">Delete</button>
                            </td>
                        </tr>
                        <tr data-interval-id="SI-002">
                            <td>Heavy Vehicle</td>
                            <td>Major Service</td>
                            <td>10,000 km</td>
                            <td>12 months</td>
                            <td><span class="status-text status-active">Active</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" type="button" data-action="edit-interval" data-interval-id="SI-002">Edit</button>
                                <button class="btn btn-danger btn-small" type="button" data-action="delete-interval" data-interval-id="SI-002">Delete</button>
                            </td>
                        </tr>
                        <tr data-interval-id="SI-003">
                            <td>Excavator</td>
                            <td>Hydraulic System Check</td>
                            <td>500 hours</td>
                            <td>3 months</td>
                            <td><span class="status-text status-active">Active</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" type="button" data-action="edit-interval" data-interval-id="SI-003">Edit</button>
                                <button class="btn btn-danger btn-small" type="button" data-action="delete-interval" data-interval-id="SI-003">Delete</button>
                            </td>
                        </tr>
                        <tr data-interval-id="SI-004">
                            <td>All Vehicles</td>
                            <td>Brake Inspection</td>
                            <td>15,000 km</td>
                            <td>12 months</td>
                            <td><span class="status-text status-active">Active</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" type="button" data-action="edit-interval" data-interval-id="SI-004">Edit</button>
                                <button class="btn btn-danger btn-small" type="button" data-action="delete-interval" data-interval-id="SI-004">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-exclamation-circle"></i> Overdue Service Alerts</div>
                <div class="notification-item danger">
                    <span class="notification-icon"><i class="fas fa-exclamation-triangle"></i></span>
                    <div>
                        <strong>Vehicle #045:</strong> Oil change overdue by 15 days (Last service: Sep 20, 2025)
                        <div style="margin-top: 5px;">
                            <button class="btn btn-primary btn-small" type="button" data-action="schedule-service" data-asset-id="VEH-045">Schedule Service</button>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-vehicle" data-asset-id="VEH-045">View Details</button>
                        </div>
                    </div>
                </div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-clock"></i></span>
                    <div>
                        <strong>Machine #078:</strong> Hydraulic check due in 3 days (Last service: Jul 18, 2025)
                        <div style="margin-top: 5px;">
                            <button class="btn btn-primary btn-small" type="button" data-action="schedule-service" data-asset-id="MAC-078">Schedule Service</button>
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-machine" data-asset-id="MAC-078">View Details</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            const action = button.dataset.action;

            if (action === 'open-add-interval') {
                this.openModal('addServiceIntervalModal');
                return;
            }

            if (action === 'edit-interval') {
                this.openEditInterval(button.dataset.intervalId);
                return;
            }

            if (action === 'delete-interval') {
                this.deleteInterval(button.dataset.intervalId);
                return;
            }

            if (action === 'schedule-service') {
                this.emitToast(`Schedule Service for ${button.dataset.assetId} - Feature coming soon!`, 'info');
                return;
            }

            if (action === 'view-vehicle') {
                this.emitToast(`View Vehicle Details ${button.dataset.assetId} - Feature coming soon!`, 'info');
                return;
            }

            if (action === 'view-machine') {
                this.emitToast(`View Machine Details ${button.dataset.assetId} - Feature coming soon!`, 'info');
                return;
            }

            if (action === 'close-details') {
                this.closeModal('detailsModal');
            }
        });
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    openModal(modalId) {
        if (typeof window.openModal === 'function') {
            window.openModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        if (typeof window.closeModal === 'function') {
            window.closeModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    openDetailsModal(titleText, contentHtml, onReady) {
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');

        if (!title || !content) {
            return;
        }

        title.textContent = titleText;
        content.innerHTML = contentHtml;

        if (typeof onReady === 'function') {
            onReady(content);
        }

        this.openModal('detailsModal');
    }

    openEditInterval(intervalId) {
        const intervalData = {
            'SI-001': { type: 'light-vehicle', service: 'Oil Change', km: 5000, months: 6 },
            'SI-002': { type: 'heavy-vehicle', service: 'Major Service', km: 10000, months: 12 },
            'SI-003': { type: 'excavator', service: 'Hydraulic System Check', km: 500, months: 3 },
            'SI-004': { type: 'loader', service: 'Engine Service', km: 1000, months: 4 },
        };

        const data = intervalData[intervalId] || { type: '', service: '', km: '', months: '' };

        this.openDetailsModal(
            `Edit Service Interval: ${intervalId}`,
            `
                <form id="editServiceIntervalForm">
                    <div class="form-section">
                        <h5>Service Configuration</h5>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Vehicle/Machine Type</label>
                                <select class="form-select" required>
                                    <option value="">Select Type</option>
                                    <option value="light-vehicle" ${data.type === 'light-vehicle' ? 'selected' : ''}>Light Vehicle</option>
                                    <option value="heavy-vehicle" ${data.type === 'heavy-vehicle' ? 'selected' : ''}>Heavy Vehicle</option>
                                    <option value="excavator" ${data.type === 'excavator' ? 'selected' : ''}>Excavator</option>
                                    <option value="loader" ${data.type === 'loader' ? 'selected' : ''}>Loader</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Service Type</label>
                                <input type="text" class="form-input" value="${data.service}" required>
                            </div>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Distance Interval (km/hours)</label>
                                <input type="number" class="form-input" value="${data.km}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Time Interval (months)</label>
                                <input type="number" class="form-input" value="${data.months}" required>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary" data-action="close-details">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `,
            (content) => {
                content.querySelector('#editServiceIntervalForm')?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.emitToast(`Service Interval ${intervalId} updated successfully!`, 'success');
                    this.closeModal('detailsModal');
                });
            }
        );
    }

    deleteInterval(intervalId) {
        const confirmed = window.confirm(`Delete Service Interval\n\nAre you sure you want to delete service interval ${intervalId}?\n\nThis action cannot be undone.`);
        if (!confirmed) {
            return;
        }

        const row = this.querySelector(`tr[data-interval-id="${intervalId}"]`);
        if (row) {
            row.remove();
        }

        this.emitToast(`Service Interval ${intervalId} deleted successfully!`, 'success');
    }
}

customElements.define('sa-service-config', SAServiceConfig);
