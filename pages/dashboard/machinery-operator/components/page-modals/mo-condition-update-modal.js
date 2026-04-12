class MOConditionUpdateModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentUser = null;
        this.render();
        this.bindEvents();
    }

    setCurrentUser(user) {
        this.currentUser = user || null;
    }

    render() {
        this.innerHTML = `
            <div id="conditionUpdateModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-clipboard-check"></i> Machine Weekly Check Report</h2>
                        <button class="btn-close" type="button" data-action="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="conditionUpdateForm">
                        <div class="form-section">
                            <h5><i class="fas fa-cogs"></i> Machine Information</h5>
                            <div class="form-group">
                                <label class="form-label">Machine</label>
                                <select class="form-select" id="updateMachine" required>
                                    <option value="">Select Machine</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Overall Condition</label>
                                <select class="form-select" id="updateCondition" required>
                                    <option value="">Select Condition</option>
                                    <option value="Excellent">Excellent</option>
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-clipboard-list"></i> System Status</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Engine Performance</label>
                                    <select class="form-select" id="updateEngine" required>
                                        <option value="Normal operation">Normal operation</option>
                                        <option value="Minor issues observed">Minor issues observed</option>
                                        <option value="Significant issues">Significant issues</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Hydraulic System</label>
                                    <select class="form-select" id="updateHydraulic" required>
                                        <option value="Normal operation">Normal operation</option>
                                        <option value="Minor issues observed">Minor issues observed</option>
                                        <option value="Significant issues">Significant issues</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Detailed Observations</label>
                                <textarea class="form-textarea" id="updateObservations" required placeholder="Describe any unusual sounds, vibrations, or performance issues..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Maintenance Recommendations</label>
                                <textarea class="form-textarea" id="updateRecommendations" placeholder="Suggest any maintenance actions needed..."></textarea>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-check"></i> Submit Update
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="close-modal">
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
            if (event.target.id === 'conditionUpdateModal' || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        this.querySelector('#conditionUpdateForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSubmit();
        });
    }

    async open() {
        this.querySelector('#conditionUpdateModal')?.classList.add('active');
        await this.populateMachineDropdown();
    }

    close() {
        this.querySelector('#conditionUpdateModal')?.classList.remove('active');
    }

    async populateMachineDropdown() {
        const select = this.querySelector('#updateMachine');
        if (!select || typeof API === 'undefined') {
            return;
        }

        try {
            const response = await API.get('/machines');
            const machines = response?.status === 'success' && response.data?.machines ? response.data.machines : [];
            const activeMachines = machines.filter((machine) => machine.status === 'Active');

            select.innerHTML = '<option value="">Select Machine</option>';
            if (!activeMachines.length) {
                select.innerHTML = '<option value="">No active machines available</option>';
                return;
            }

            activeMachines.forEach((machine) => {
                const option = document.createElement('option');
                option.value = machine.id;
                option.textContent = `${machine.machine_id || `ID-${machine.id}`} - ${machine.machine_name || 'Unnamed'}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading machines:', error);
            select.innerHTML = '<option value="">Error loading machines. Please try again.</option>';
            window.MOUtils.emitToast('Failed to load machines. Please refresh the page.', 'error');
        }
    }

    async handleSubmit() {
        if (typeof API === 'undefined') {
            return;
        }

        const machineId = this.querySelector('#updateMachine')?.value;
        const condition = this.querySelector('#updateCondition')?.value;
        const engine = this.querySelector('#updateEngine')?.value;
        const hydraulic = this.querySelector('#updateHydraulic')?.value;
        const observations = this.querySelector('#updateObservations')?.value;
        const recommendations = this.querySelector('#updateRecommendations')?.value;

        if (!machineId || !condition || !engine || !hydraulic || !observations) {
            window.MOUtils.emitToast('Please fill in all required fields', 'error');
            return;
        }

        const today = new Date();
        const weekEndDate = today.toISOString().split('T')[0];
        const weekStartDate = new Date(today);
        weekStartDate.setDate(weekStartDate.getDate() - 6);

        const checkData = {
            machine_id: Number.parseInt(machineId, 10),
            operator_id: this.currentUser?.id || null,
            week_start_date: weekStartDate.toISOString().split('T')[0],
            week_end_date: weekEndDate,
            overall_condition: condition.toLowerCase(),
            engine_status: engine === 'Normal operation' ? 1 : 0,
            hydraulics: hydraulic === 'Normal operation' ? 1 : 0,
            electrical_system: 1,
            safety_equipment: 1,
            controls: 1,
            lubrication: 1,
            cooling_system: 1,
            filters: 1,
            notes: observations,
            issues_found: engine !== 'Normal operation' || hydraulic !== 'Normal operation'
                ? `Engine: ${engine}, Hydraulic: ${hydraulic}. ${recommendations || ''}`.trim()
                : recommendations || null,
        };

        try {
            const response = await API.post('/machine-weekly-checks', checkData);
            if (response?.status !== 'success') {
                window.MOUtils.emitToast(`Failed to submit report: ${response?.message || 'Unknown error'}`, 'error');
                return;
            }

            window.MOUtils.emitToast('Weekly check report submitted successfully! Supervisor will review.', 'success');
            this.querySelector('#conditionUpdateForm')?.reset();
            this.close();
            document.dispatchEvent(new CustomEvent('mo:weekly-check-submitted'));
        } catch (error) {
            console.error('Error submitting weekly check report:', error);
            window.MOUtils.emitToast(`Error submitting report: ${error.message}`, 'error');
        }
    }
}

customElements.define('mo-condition-update-modal', MOConditionUpdateModal);
