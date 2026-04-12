class DriverDailyCheckModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.resubmitCheckId = null;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'dailyCheckModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'dailyCheckModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="dailyCheckModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="dailyCheckTitle"><i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="dailyCheckForm">
                        <div id="rejectionReasonBanner" style="display:none;"></div>
                        <div class="form-section">
                            <h5><i class="fas fa-truck"></i> Vehicle & Inspection Details</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Current Odometer Reading (km) *</label>
                                    <input type="number" class="form-input" id="weeklyCheckOdometer" min="0" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Week Ending Date *</label>
                                    <input type="date" class="form-input" id="weekEndingDate" required>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-check-square"></i> Weekly Inspection Checklist</h5>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                ${['engineOil', 'brakes', 'lights', 'tires', 'coolant', 'wipers'].map((name) => `
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                        <input type="checkbox" name="${name}" style="width: 18px; height: 18px;" required>
                                        <span>${this.getLabel(name)}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-sticky-note"></i> Additional Notes</h5>
                            <textarea id="weeklyCheckNotes" class="form-textarea" placeholder="Optional notes or observations about vehicle condition..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Weekly Check</button>
                    </form>
                </div>
            </div>
        `;
    }

    getLabel(key) {
        const map = {
            engineOil: 'Engine Oil Level',
            brakes: 'Brake System',
            lights: 'All Lights & Indicators',
            tires: 'Tire Pressure & Condition',
            coolant: 'Coolant Level',
            wipers: 'Wipers & Washers',
        };

        return map[key] || key;
    }

    bindEvents() {
        const modal = this.querySelector('#dailyCheckModal');
        const form = this.querySelector('#dailyCheckForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const requiredChecks = ['engineOil', 'brakes', 'lights', 'tires', 'coolant', 'wipers'];
            const hasAllChecked = requiredChecks.every((name) => form.elements[name]?.checked);
            if (!hasAllChecked) {
                window.alert('All checklist items must be checked before submission.');
                return;
            }

            const payload = {
                vehicle_registration: 'LKA-1234',
                driver_id: DriverUtils.store.currentUser?.id || 1,
                odometer_reading: Number.parseInt(form.querySelector('#weeklyCheckOdometer').value, 10),
                week_end_date: form.querySelector('#weekEndingDate').value,
                engine_oil: true,
                brakes: true,
                lights: true,
                tires: true,
                coolant: true,
                wipers: true,
                notes: form.querySelector('#weeklyCheckNotes').value.trim(),
                resubmitted_from_check_id: this.resubmitCheckId,
            };

            try {
                const response = await DriverUtils.apiPost('/vehicle-checks', payload);
                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast('Weekly vehicle check submitted successfully.');
                    this.close();
                    form.reset();
                    this.resubmitCheckId = null;
                    DriverUtils.emit('driver:data-checks-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to submit weekly check.', 'error');
            } catch (error) {
                console.error('Failed to submit weekly check:', error);
                DriverUtils.showToast('Failed to submit weekly check. Please try again.', 'error');
            }
        });
    }

    open(payload) {
        const form = this.querySelector('#dailyCheckForm');
        const title = this.querySelector('#dailyCheckTitle');
        const rejectionBanner = this.querySelector('#rejectionReasonBanner');

        form.reset();
        this.resubmitCheckId = null;

        const sunday = new Date();
        const day = sunday.getDay();
        if (day !== 0) {
            sunday.setDate(sunday.getDate() + (7 - day));
        }
        sunday.setHours(0, 0, 0, 0);
        form.querySelector('#weekEndingDate').value = sunday.toISOString().split('T')[0];

        if (payload?.resubmitCheck) {
            const check = payload.resubmitCheck;
            this.resubmitCheckId = check.check_id;
            title.innerHTML = '<i class="fas fa-redo"></i> Resubmit Weekly Vehicle Check';
            form.querySelector('#weeklyCheckOdometer').value = check.odometer_reading || '';
            form.querySelector('#weekEndingDate').value = check.week_end_date || form.querySelector('#weekEndingDate').value;
            rejectionBanner.style.display = 'block';
            rejectionBanner.innerHTML = `
                <div style="margin-bottom: 15px; padding: 12px 16px; background: #fdecea; border-left: 4px solid #e74c3c; border-radius: 4px;">
                    <strong style="color: #c0392b;">Rejected Reason:</strong>
                    <p style="margin: 8px 0 0 0; color: #555;">${check.rejection_reason || 'No reason provided'}</p>
                </div>
            `;
        } else {
            title.innerHTML = '<i class="fas fa-clipboard-check"></i> Submit Weekly Vehicle Check';
            rejectionBanner.style.display = 'none';
            rejectionBanner.innerHTML = '';
        }

        DriverUtils.setModalState(this.querySelector('#dailyCheckModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#dailyCheckModal'), false);
    }
}

customElements.define('driver-daily-check-modal', DriverDailyCheckModal);
