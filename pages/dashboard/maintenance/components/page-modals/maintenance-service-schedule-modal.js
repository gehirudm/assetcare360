class MaintenanceServiceScheduleModal extends HTMLElement {
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
            <div id="serviceScheduleModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4><i class="fas fa-calendar-alt"></i> Service Schedule Details</h4>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>
                    <div style="padding: 30px;">
                    <div id="serviceScheduleContent"></div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'serviceScheduleModal') {
                this.close();
            }
        });
    }

    open(schedule) {
        const detailsContainer = this.querySelector('#serviceScheduleContent');
        if (detailsContainer) {
            detailsContainer.innerHTML = this.renderContent(schedule || {});
        }

        if (typeof window.openModal === 'function') {
            window.openModal('serviceScheduleModal');
            return;
        }

        const modal = this.querySelector('#serviceScheduleModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('serviceScheduleModal');
            return;
        }

        const modal = this.querySelector('#serviceScheduleModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
    }

    renderContent(schedule) {
        return `
            <div class="form-section">
                <h5><i class="fas fa-calendar-alt"></i> Service Schedule Information</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><strong>Equipment:</strong> ${schedule.equipment || 'N/A'}</div>
                    <div><strong>Service Type:</strong> ${schedule.serviceType || 'N/A'}</div>
                    <div><strong>Technical Officer:</strong> ${schedule.technicalOfficer || 'N/A'}</div>
                    <div><strong>Service Interval:</strong> ${schedule.serviceInterval || 'N/A'}</div>
                    <div><strong>Last Service:</strong> ${schedule.lastService || 'N/A'}</div>
                    <div><strong>Next Due:</strong> ${schedule.nextServiceDue || 'N/A'}</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Insurance Details:</strong><br>
                    Provider: ${schedule.insuranceProvider || 'N/A'}<br>
                    Policy: ${schedule.insurancePolicy || 'N/A'}<br>
                    Expiry: ${schedule.insuranceExpiry || 'N/A'}
                </div>
                <div>
                    <strong>Notes:</strong><br>
                    ${schedule.notes || 'No notes available'}
                </div>
            </div>
        `;
    }
}

customElements.define('maintenance-service-schedule-modal', MaintenanceServiceScheduleModal);
