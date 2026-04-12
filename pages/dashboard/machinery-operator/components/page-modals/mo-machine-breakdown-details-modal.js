class MOMachineBreakdownDetailsModal extends HTMLElement {
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
            <div id="machineBreakdownModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-info-circle"></i> Machine Breakdown Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="machineBreakdownDetailsContent"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target.id === 'machineBreakdownModal' || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });
    }

    async open(breakdownId) {
        if (!breakdownId || typeof API === 'undefined') {
            return;
        }

        const content = this.querySelector('#machineBreakdownDetailsContent');
        if (!content) {
            return;
        }

        content.innerHTML = '<div style="padding: 20px; text-align:center; color: var(--stone-500);">Loading breakdown details...</div>';
        this.querySelector('#machineBreakdownModal')?.classList.add('active');

        try {
            const response = await API.get(`/machine-breakdowns/${breakdownId}`);
            if (response?.status !== 'success' || !response.data) {
                content.innerHTML = '<div style="padding: 20px; color: var(--danger);">Failed to load breakdown details.</div>';
                return;
            }

            const breakdown = response.data;
            const assignments = Array.isArray(breakdown.assignments) ? breakdown.assignments : [];
            const workUpdates = Array.isArray(breakdown.work_updates) ? breakdown.work_updates : [];
            const isFinished = ['Resolved', 'Finished', 'Completed', 'Closed'].includes(breakdown.status)
                || ['Resolved', 'Finished', 'Completed', 'Closed'].includes(breakdown.ticket_status);

            const assignmentsHtml = assignments.length
                ? `
                    <div class="form-section">
                        <h5><i class="fas fa-user-cog"></i> Assigned Technicians</h5>
                        ${assignments.map((item) => `<p><strong>${item.technician_name || 'Technician'}</strong> - Assigned: ${window.MOUtils.formatDate(item.assigned_date)}</p>`).join('')}
                    </div>
                `
                : '';

            const workUpdatesHtml = isFinished && workUpdates.length
                ? `
                    <div class="form-section">
                        <h5><i class="fas fa-check-circle" style="color: #27ae60;"></i> Work Completed - Finishing Details</h5>
                        ${workUpdates.map((update) => `
                            <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60; margin-bottom: 10px;">
                                <p style="margin: 0 0 8px 0; font-weight: 600; color: #27ae60;"><i class="fas fa-user-cog"></i> ${update.technician_name || 'Technical Officer'}</p>
                                <p style="margin: 0 0 8px 0; color: #333;"><strong>Work Description:</strong> ${update.machine_description || 'N/A'}</p>
                                <p style="margin: 0 0 8px 0; color: #333;"><strong>Parts Used:</strong> ${update.parts_used || 'None'}</p>
                                <p style="margin: 0 0 8px 0; color: #333;"><strong>Time Spent:</strong> ${update.time_spent ? `${update.time_spent} hours` : 'N/A'}</p>
                                <p style="margin: 0; color: #666; font-size: 0.9em;"><i class="fas fa-calendar-check"></i> Updated: ${window.MOUtils.formatDate(update.created_at)}</p>
                            </div>
                        `).join('')}
                    </div>
                `
                : '';

            content.innerHTML = `
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Breakdown Information</h5>
                    <p><strong>Breakdown ID:</strong> ${breakdown.breakdown_id || 'N/A'}</p>
                    <p><strong>Date:</strong> ${window.MOUtils.formatDate(breakdown.breakdown_date)}</p>
                    <p><strong>Status:</strong> ${breakdown.status || 'Pending'}</p>
                    <p><strong>Severity:</strong> ${breakdown.severity || 'N/A'}</p>
                    <p><strong>Breakdown Type:</strong> ${breakdown.breakdown_type || 'General Fault'}</p>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-cogs"></i> Machine Information</h5>
                    <p><strong>Machine:</strong> ${breakdown.machine_model || breakdown.machine_name || `Machine #${breakdown.machine_id}`}</p>
                    ${breakdown.serial_number ? `<p><strong>Serial Number:</strong> ${breakdown.serial_number}</p>` : ''}
                    <p><strong>Operator:</strong> ${breakdown.operator_name || 'N/A'}</p>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-file-alt"></i> Description</h5>
                    <p>${breakdown.description || 'No description provided'}</p>
                </div>

                ${breakdown.fault_ticket_number ? `
                    <div class="form-section">
                        <h5><i class="fas fa-ticket-alt"></i> Fault Ticket</h5>
                        <p><strong>Ticket Number:</strong> ${breakdown.fault_ticket_number}</p>
                    </div>
                ` : ''}

                ${assignmentsHtml}
                ${workUpdatesHtml}

                <button class="btn btn-secondary" type="button" data-action="close-modal">
                    <i class="fas fa-times"></i> Close
                </button>
            `;
        } catch (error) {
            console.error('Error loading breakdown details:', error);
            content.innerHTML = '<div style="padding: 20px; color: var(--danger);">Error loading breakdown details.</div>';
        }
    }

    close() {
        this.querySelector('#machineBreakdownModal')?.classList.remove('active');
    }
}

customElements.define('mo-machine-breakdown-details-modal', MOMachineBreakdownDetailsModal);
