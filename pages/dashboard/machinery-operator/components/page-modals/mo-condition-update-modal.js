class MOConditionUpdateModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentUser = null;
        this.mode = 'create';
        this.editingCheck = null;
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
                        <h2 id="conditionUpdateModalTitle"><i class="fas fa-clipboard-check"></i> Machine Weekly Check Report</h2>
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
                            <button type="submit" class="btn btn-primary" id="conditionUpdateSubmitButton">
                                <i id="conditionUpdateSubmitIcon" class="fas fa-check"></i> <span id="conditionUpdateSubmitText">Submit Update</span>
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

    async open(options = {}) {
        const mode = options.mode === 'edit' ? 'edit' : 'create';
        const check = options.check || null;

        this.setMode(mode, check);
        await this.populateMachineDropdown(check?.machine_id || null);

        if (this.mode === 'edit' && check) {
            this.prefillForm(check);
        } else {
            this.resetForm();
        }

        this.querySelector('#conditionUpdateModal')?.classList.add('active');
    }

    close() {
        this.querySelector('#conditionUpdateModal')?.classList.remove('active');
        this.setMode('create', null);
        this.resetForm();
    }

    setMode(mode, check = null) {
        this.mode = mode === 'edit' ? 'edit' : 'create';
        this.editingCheck = this.mode === 'edit' ? check : null;

        const title = this.querySelector('#conditionUpdateModalTitle');
        const submitText = this.querySelector('#conditionUpdateSubmitText');
        const submitIcon = this.querySelector('#conditionUpdateSubmitIcon');

        if (this.mode === 'edit') {
            if (title) {
                title.innerHTML = '<i class="fas fa-edit"></i> Edit Weekly Check Report';
            }
            if (submitText) {
                submitText.textContent = 'Save Changes';
            }
            if (submitIcon) {
                submitIcon.className = 'fas fa-save';
            }
            return;
        }

        if (title) {
            title.innerHTML = '<i class="fas fa-clipboard-check"></i> Machine Weekly Check Report';
        }
        if (submitText) {
            submitText.textContent = 'Submit Update';
        }
        if (submitIcon) {
            submitIcon.className = 'fas fa-check';
        }
    }

    resetForm() {
        this.querySelector('#conditionUpdateForm')?.reset();
    }

    normalizeCondition(condition) {
        const normalized = String(condition || '').toLowerCase();
        if (normalized === 'excellent') {
            return 'Excellent';
        }
        if (normalized === 'good') {
            return 'Good';
        }
        if (normalized === 'fair') {
            return 'Fair';
        }
        if (normalized === 'poor') {
            return 'Poor';
        }
        return 'Good';
    }

    mapSystemStatus(value) {
        if (value === true || value === 1 || value === '1' || value === 'true') {
            return 'Normal operation';
        }

        const normalized = String(value || '').toLowerCase();
        if (normalized.includes('significant')) {
            return 'Significant issues';
        }
        if (normalized.includes('minor')) {
            return 'Minor issues observed';
        }

        return 'Minor issues observed';
    }

    prefillForm(check) {
        this.querySelector('#updateMachine').value = check.machine_id ? String(check.machine_id) : '';
        this.querySelector('#updateCondition').value = this.normalizeCondition(check.overall_condition);
        this.querySelector('#updateEngine').value = this.mapSystemStatus(check.engine_status);
        this.querySelector('#updateHydraulic').value = this.mapSystemStatus(check.hydraulics);
        this.querySelector('#updateObservations').value = check.notes || '';
        this.querySelector('#updateRecommendations').value = check.issues_found || '';
    }

    async populateMachineDropdown(selectedMachineId = null) {
        const select = this.querySelector('#updateMachine');
        if (!select || typeof API === 'undefined') {
            return;
        }

        try {
            const response = await API.get('/machines');
            const machines = response?.status === 'success' && response.data?.machines ? response.data.machines : [];
            const activeMachines = machines.filter((machine) => machine.status === 'Active');
            const selectedMachine = selectedMachineId
                ? machines.find((machine) => String(machine.id) === String(selectedMachineId))
                : null;

            const machinesToShow = [...activeMachines];
            if (selectedMachine && !machinesToShow.some((machine) => String(machine.id) === String(selectedMachine.id))) {
                machinesToShow.push(selectedMachine);
            }

            select.innerHTML = '<option value="">Select Machine</option>';
            if (!machinesToShow.length) {
                select.innerHTML = '<option value="">No active machines available</option>';
                return;
            }

            machinesToShow.forEach((machine) => {
                const option = document.createElement('option');
                option.value = machine.id;
                option.textContent = `${machine.machine_id || `ID-${machine.id}`} - ${machine.machine_name || 'Unnamed'}`;
                select.appendChild(option);
            });

            if (selectedMachineId) {
                select.value = String(selectedMachineId);
            }
        } catch (error) {
            console.error('Error loading machines:', error);
            select.innerHTML = '<option value="">Error loading machines. Please try again.</option>';
            window.MOUtils.emitToast('Failed to load machines. Please refresh the page.', 'error');
        }
    }

    buildCheckPayload() {
        const machineId = this.querySelector('#updateMachine')?.value;
        const condition = this.querySelector('#updateCondition')?.value;
        const engine = this.querySelector('#updateEngine')?.value;
        const hydraulic = this.querySelector('#updateHydraulic')?.value;
        const observations = this.querySelector('#updateObservations')?.value;
        const recommendations = this.querySelector('#updateRecommendations')?.value;

        if (!machineId || !condition || !engine || !hydraulic || !observations) {
            window.MOUtils.emitToast('Please fill in all required fields', 'error');
            return null;
        }

        const fallbackEndDate = new Date();
        const existingEndDate = this.editingCheck?.week_end_date ? new Date(this.editingCheck.week_end_date) : null;
        const endDate = existingEndDate && !Number.isNaN(existingEndDate.getTime()) ? existingEndDate : fallbackEndDate;
        const weekEndDate = endDate.toISOString().split('T')[0];

        const fallbackStartDate = new Date(endDate);
        fallbackStartDate.setDate(fallbackStartDate.getDate() - 6);
        const weekStartDate = this.editingCheck?.week_start_date || fallbackStartDate.toISOString().split('T')[0];

        return {
            machine_id: Number.parseInt(machineId, 10),
            operator_id: this.currentUser?.id || null,
            week_start_date: weekStartDate,
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
    }

    async handleSubmit() {
        if (typeof API === 'undefined') {
            return;
        }

        const editingStatus = String(this.editingCheck?.status || '').trim().toLowerCase();
        if (this.mode === 'edit' && editingStatus !== 'pending') {
            window.MOUtils.emitToast('Only pending weekly checks can be edited.', 'warning');
            return;
        }

        const checkData = this.buildCheckPayload();
        if (!checkData) {
            return;
        }

        const submitButton = this.querySelector('#conditionUpdateSubmitButton');
        const submitText = this.querySelector('#conditionUpdateSubmitText');
        const originalText = submitText?.textContent || 'Submit Update';
        if (submitButton) {
            submitButton.disabled = true;
        }
        if (submitText) {
            submitText.textContent = this.mode === 'edit' ? 'Saving...' : 'Submitting...';
        }

        try {
            let response;
            if (this.mode === 'edit') {
                const checkId = this.editingCheck?.check_id;
                if (!checkId) {
                    window.MOUtils.emitToast('Unable to update this weekly check.', 'error');
                    return;
                }

                response = await API.put(`/machine-weekly-checks/${checkId}`, checkData);
            } else {
                response = await API.post('/machine-weekly-checks', checkData);
            }

            if (response?.status !== 'success') {
                window.MOUtils.emitToast(`Failed to submit report: ${response?.message || 'Unknown error'}`, 'error');
                return;
            }

            if (this.mode === 'edit') {
                window.MOUtils.emitToast('Weekly check report updated successfully.', 'success');
                document.dispatchEvent(new CustomEvent('mo:weekly-check-updated'));
            } else {
                window.MOUtils.emitToast('Weekly check report submitted successfully! Supervisor will review.', 'success');
                document.dispatchEvent(new CustomEvent('mo:weekly-check-submitted'));
            }

            this.close();
        } catch (error) {
            console.error('Error submitting weekly check report:', error);
            window.MOUtils.emitToast(`Error submitting report: ${error.message}`, 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
            if (submitText) {
                submitText.textContent = originalText;
            }
        }
    }
}

customElements.define('mo-condition-update-modal', MOConditionUpdateModal);
