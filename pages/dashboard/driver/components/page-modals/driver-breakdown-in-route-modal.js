class DriverBreakdownInRouteModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.editingId = null;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'breakdownInRouteModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'breakdownInRouteModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="breakdownInRouteModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="routeBreakdownTitle"><i class="fas fa-road"></i> Report Breakdown in Route</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="breakdownInRouteForm">
                        <div class="form-section">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Vehicle Registration *</label>
                                    <input type="text" id="routeBreakdownVehicle" class="form-input" value="LKA-1234" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Urgency Level *</label>
                                    <select id="routeBreakdownSeverity" class="form-select" required>
                                        <option value="">Select Urgency</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Current Location *</label>
                                    <input type="text" id="routeBreakdownLocation" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Incident Time *</label>
                                    <input type="datetime-local" id="routeBreakdownDatetime" class="form-input" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Problem Category *</label>
                                <select id="routeBreakdownType" class="form-select" required>
                                    <option value="">Select Category</option>
                                    <option value="engine">Engine</option>
                                    <option value="transmission">Transmission</option>
                                    <option value="brakes">Brakes</option>
                                    <option value="electrical">Electrical</option>
                                    <option value="cooling">Cooling</option>
                                    <option value="tires">Tires</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <label class="form-label">Problem Description *</label>
                            <textarea id="routeBreakdownDescription" class="form-textarea" required></textarea>
                        </div>

                        <button type="submit" class="btn btn-danger" id="routeBreakdownSubmit">Submit Breakdown in Route Report</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#breakdownInRouteModal');
        const form = this.querySelector('#breakdownInRouteForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const payload = {
                vehicle_id: 1,
                severity: form.querySelector('#routeBreakdownSeverity').value,
                breakdown_type: form.querySelector('#routeBreakdownType').value,
                breakdown_location: form.querySelector('#routeBreakdownLocation').value.trim(),
                breakdown_datetime: form.querySelector('#routeBreakdownDatetime').value,
                description: form.querySelector('#routeBreakdownDescription').value.trim(),
            };

            try {
                const response = this.editingId
                    ? await DriverUtils.apiPut(`/route-breakdowns/${encodeURIComponent(this.editingId)}`, payload)
                    : await DriverUtils.apiPost('/route-breakdowns', payload);

                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast(this.editingId ? 'Route breakdown updated.' : 'Route breakdown submitted.');
                    this.close();
                    form.reset();
                    this.editingId = null;
                    DriverUtils.emit('driver:data-breakdowns-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to submit route breakdown report.', 'error');
            } catch (error) {
                console.error('Failed to submit route breakdown report:', error);
                DriverUtils.showToast('Failed to submit route breakdown report. Please try again.', 'error');
            }
        });
    }

    open(payload) {
        const form = this.querySelector('#breakdownInRouteForm');
        const title = this.querySelector('#routeBreakdownTitle');
        const submit = this.querySelector('#routeBreakdownSubmit');
        const editItem = payload?.editItem || null;

        form.reset();
        DriverUtils.ensureTodayDefaults(form);

        if (editItem) {
            this.editingId = editItem.id;
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Route Breakdown Report';
            submit.textContent = 'Update Route Breakdown Report';
            form.querySelector('#routeBreakdownSeverity').value = editItem.severity || '';
            form.querySelector('#routeBreakdownType').value = editItem.category || editItem.breakdown_type || '';
            form.querySelector('#routeBreakdownLocation').value = editItem.breakdown_location || '';
            form.querySelector('#routeBreakdownDescription').value = editItem.description || '';
            if (editItem.breakdown_datetime) {
                const date = new Date(editItem.breakdown_datetime);
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                form.querySelector('#routeBreakdownDatetime').value = date.toISOString().slice(0, 16);
            }
        } else {
            this.editingId = null;
            title.innerHTML = '<i class="fas fa-road"></i> Report Breakdown in Route';
            submit.textContent = 'Submit Breakdown in Route Report';
        }

        DriverUtils.setModalState(this.querySelector('#breakdownInRouteModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#breakdownInRouteModal'), false);
    }
}

customElements.define('driver-breakdown-in-route-modal', DriverBreakdownInRouteModal);
