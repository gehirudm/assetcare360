class MaintenanceAddServiceRecordModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
        this.setDefaultDates();
    }

    render() {
        this.innerHTML = `
            <div id="addServiceModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4><i class="fas fa-plus-circle"></i> Add Service Record</h4>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>
                    <form id="addServiceForm">
                        <div class="form-section">
                            <h5><i class="fas fa-calendar-alt"></i> Service Schedule Information</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Equipment ID</label>
                                    <input type="text" class="form-input" name="equipmentId" placeholder="Enter equipment ID" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Equipment Type</label>
                                    <select class="form-select" name="equipmentType" required>
                                        <option value="">Select Type</option>
                                        <option value="vehicle">Vehicle</option>
                                        <option value="machinery">Machinery</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Insurance Expiry Date</label>
                                    <input type="date" class="form-input" name="insuranceExpiry" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Next Service Due</label>
                                    <input type="date" class="form-input" name="nextServiceDue" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Service Type</label>
                                <select class="form-select" name="serviceType" required>
                                    <option value="">Select Service Type</option>
                                    <option value="Preventive Maintenance">Preventive Maintenance</option>
                                    <option value="Major Service">Major Service</option>
                                    <option value="Routine Check">Routine Check</option>
                                    <option value="Inspection">Inspection</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notes</label>
                                <textarea class="form-textarea" name="notes" placeholder="Additional notes or special requirements..."></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Add Service Record</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const form = this.querySelector('#addServiceForm');

        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'addServiceModal') {
                this.close();
            }
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const equipmentValue = String(formData.get('equipmentId') || '').trim();
            if (!equipmentValue) {
                return;
            }

            const equipmentType = String(formData.get('equipmentType') || '').trim();
            const normalizedId = this.buildNormalizedId(equipmentValue, equipmentType);

            this.dispatchEvent(new CustomEvent('maintenance-service:add-record', {
                bubbles: true,
                detail: {
                    record: {
                        id: normalizedId,
                        equipment: equipmentValue,
                        equipmentType,
                        insuranceExpiry: String(formData.get('insuranceExpiry') || '').trim(),
                        nextServiceDue: String(formData.get('nextServiceDue') || '').trim(),
                        serviceType: String(formData.get('serviceType') || '').trim(),
                        notes: String(formData.get('notes') || '').trim() || 'No additional notes',
                    },
                },
            }));

            form.reset();
            this.setDefaultDates();
            this.close();
        });
    }

    buildNormalizedId(equipmentValue, equipmentType) {
        const value = String(equipmentValue || '').trim();
        const compact = value.replace(/\s+/g, '').toUpperCase();
        const digits = compact.replace(/[^0-9]/g, '');

        if (compact.startsWith('VH') || compact.startsWith('MC')) {
            return compact;
        }

        if (digits) {
            const prefix = equipmentType === 'machinery' ? 'MC' : 'VH';
            return `${prefix}${digits}`;
        }

        return compact;
    }

    setDefaultDates() {
        const insuranceInput = this.querySelector('input[name="insuranceExpiry"]');
        const dueInput = this.querySelector('input[name="nextServiceDue"]');

        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

        if (dueInput && !dueInput.value) {
            dueInput.value = nextWeek.toISOString().split('T')[0];
        }

        if (insuranceInput && !insuranceInput.value) {
            insuranceInput.value = nextMonth.toISOString().split('T')[0];
        }
    }

    normalizeEquipmentLabel(value) {
        const input = String(value || '').trim();
        if (!input) {
            return '';
        }

        const vehicleMatch = input.match(/^VH(\d+)$/i);
        if (vehicleMatch) {
            return `Vehicle #${vehicleMatch[1]}`;
        }

        const machineMatch = input.match(/^MC(\d+)$/i);
        if (machineMatch) {
            return `Machine #${machineMatch[1]}`;
        }

        return input;
    }

    open(prefill = {}) {
        const form = this.querySelector('#addServiceForm');
        if (form) {
            form.reset();
        }

        const equipmentInput = this.querySelector('input[name="equipmentId"]');
        const equipmentTypeSelect = this.querySelector('select[name="equipmentType"]');
        const insuranceInput = this.querySelector('input[name="insuranceExpiry"]');
        const dueInput = this.querySelector('input[name="nextServiceDue"]');
        const serviceTypeSelect = this.querySelector('select[name="serviceType"]');
        const notesInput = this.querySelector('textarea[name="notes"]');

        if (equipmentInput) {
            equipmentInput.value = this.normalizeEquipmentLabel(prefill.equipmentId || '');
        }

        if (equipmentTypeSelect && prefill.equipmentType) {
            equipmentTypeSelect.value = String(prefill.equipmentType);
        }

        if (insuranceInput && prefill.insuranceExpiry) {
            insuranceInput.value = String(prefill.insuranceExpiry);
        }

        if (dueInput && prefill.nextServiceDue) {
            dueInput.value = String(prefill.nextServiceDue);
        }

        if (serviceTypeSelect && prefill.serviceType) {
            serviceTypeSelect.value = String(prefill.serviceType);
        }

        if (notesInput && prefill.notes) {
            notesInput.value = String(prefill.notes);
        }

        this.setDefaultDates();

        if (typeof window.openModal === 'function') {
            window.openModal('addServiceModal');
            return;
        }

        const modal = this.querySelector('#addServiceModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('addServiceModal');
            return;
        }

        const modal = this.querySelector('#addServiceModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
    }
}

customElements.define('maintenance-add-service-record-modal', MaintenanceAddServiceRecordModal);
