class MOWeeklyCheckDetailsModal extends HTMLElement {
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
            <div id="detailsModal_weeklyCheck" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-info-circle"></i> Weekly Check Report Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="form-section" id="weeklyCheckDetailsContent"></div>
                    <button class="btn btn-secondary" type="button" data-action="close-modal"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target.id === 'detailsModal_weeklyCheck' || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });
    }

    async open(detail) {
        let check = detail?.check || null;
        const checkId = detail?.checkId;

        if (!check && checkId && typeof API !== 'undefined') {
            try {
                const response = await API.get(`/machine-weekly-checks?id=${encodeURIComponent(checkId)}`);
                if (response?.status === 'success' && response.data?.check) {
                    check = response.data.check;
                }
            } catch (error) {
                console.error('Error loading weekly check details:', error);
            }
        }

        if (!check) {
            window.MOUtils.emitToast('Failed to load weekly check report details', 'error');
            return;
        }

        const submittedDate = check.submitted_date ? new Date(check.submitted_date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'N/A';

        const weekStart = check.week_start_date ? new Date(check.week_start_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }) : 'N/A';

        const weekEnd = check.week_end_date ? new Date(check.week_end_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }) : 'N/A';

        let statusLabel = 'Pending Review';
        let statusClass = 'status-pending';
        if (check.status === 'approved') {
            statusLabel = 'Approved';
            statusClass = 'status-approved';
        } else if (check.status === 'rejected') {
            statusLabel = 'Rejected';
            statusClass = 'status-rejected';
        }

        const content = this.querySelector('#weeklyCheckDetailsContent');
        if (!content) {
            return;
        }

        content.innerHTML = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                <p><strong>Check ID:</strong> ${check.check_id}</p>
                <p><strong>Machine:</strong> ${check.machine_name || `Machine ID: ${check.machine_id}`}</p>
                <p><strong>Week Period:</strong> ${weekStart} - ${weekEnd}</p>
                <p><strong>Submitted:</strong> ${submittedDate}</p>
                <p><strong>Status:</strong> <span class="status-text ${statusClass}">${statusLabel}</span></p>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-chart-bar"></i> Overall Condition</h5>
                <p><strong>Overall Assessment:</strong> ${check.overall_condition ? `${check.overall_condition.charAt(0).toUpperCase()}${check.overall_condition.slice(1)}` : 'N/A'}</p>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-cogs"></i> System Status</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <p><strong>Engine:</strong> ${check.engine_status ? 'Normal operation' : 'Issues observed'}</p>
                    <p><strong>Hydraulic System:</strong> ${check.hydraulics ? 'Normal operation' : 'Issues observed'}</p>
                    <p><strong>Electrical System:</strong> ${check.electrical_system ? 'Normal operation' : 'Issues observed'}</p>
                    <p><strong>Safety Equipment:</strong> ${check.safety_equipment ? 'Normal operation' : 'Issues observed'}</p>
                    <p><strong>Controls:</strong> ${check.controls ? 'Normal operation' : 'Issues observed'}</p>
                    <p><strong>Lubrication:</strong> ${check.lubrication ? 'Normal operation' : 'Issues observed'}</p>
                    <p><strong>Cooling System:</strong> ${check.cooling_system ? 'Normal operation' : 'Issues observed'}</p>
                    <p><strong>Filters:</strong> ${check.filters ? 'Normal operation' : 'Issues observed'}</p>
                </div>
            </div>

            ${check.notes ? `
                <div class="form-section">
                    <h5><i class="fas fa-clipboard-list"></i> Observations</h5>
                    <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${check.notes}</p>
                </div>
            ` : ''}

            ${check.issues_found ? `
                <div class="form-section">
                    <h5><i class="fas fa-exclamation-triangle"></i> Issues Found</h5>
                    <p style="white-space: pre-wrap; border-left: none; padding: 12px; background: var(--background); border-radius: 6px;">${check.issues_found}</p>
                </div>
            ` : ''}
        `;

        this.querySelector('#detailsModal_weeklyCheck')?.classList.add('active');
    }

    close() {
        this.querySelector('#detailsModal_weeklyCheck')?.classList.remove('active');
    }
}

customElements.define('mo-weekly-check-details-modal', MOWeeklyCheckDetailsModal);
