class MOReportFaultModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentUser = null;
        this.selectedPhotos = [];
        this.render();
        this.bindEvents();
    }

    setCurrentUser(user) {
        this.currentUser = user || null;
    }

    render() {
        this.innerHTML = `
            <div id="reportFaultModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-exclamation-triangle"></i> Report Machine Fault</h2>
                        <button class="btn-close" type="button" data-action="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="reportFaultForm">
                        <div id="faultFormErrors" class="form-errors" style="display: none; background-color: #fee; border: 1px solid #fcc; border-radius: 4px; padding: 12px; margin-bottom: 20px; color: #c00;"></div>

                        <div class="form-section">
                            <h5><i class="fas fa-tools"></i> Fault Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Machine *</label>
                                    <select class="form-select" id="faultMachine" name="machine_id" required>
                                        <option value="">Select Machine</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Priority Level *</label>
                                    <select class="form-select" id="faultPriority" name="priority" required>
                                        <option value="Low">Low</option>
                                        <option value="Medium" selected>Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Fault Description *</label>
                                <textarea class="form-textarea" id="faultDescription" name="description" required placeholder="Describe the fault in detail including any unusual sounds, behaviors, or observations..." minlength="10"></textarea>
                                <small style="color: var(--muted); display: block; margin-top: 4px;">Minimum 10 characters required</small>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-camera"></i> Photo Documentation</h5>
                            <div class="photo-upload-area">
                                <div class="photo-upload" data-action="open-photo-picker">
                                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--royal-blue);"></i>
                                    <p><strong>Click to upload photos</strong></p>
                                    <p style="font-size: 0.85rem; color: var(--muted);">Maximum 5 images (JPEG, PNG, WebP)</p>
                                    <input type="file" id="faultPhotos" accept="image/jpeg,image/png,image/webp" multiple style="display: none;">
                                </div>
                                <div id="photoPreviewContainer" class="photo-preview-container"></div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Submit Fault Report
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

            if (event.target.id === 'reportFaultModal') {
                this.close();
                return;
            }

            if (!actionEl) {
                return;
            }

            if (actionEl.dataset.action === 'close-modal') {
                this.close();
                return;
            }

            if (actionEl.dataset.action === 'open-photo-picker') {
                this.querySelector('#faultPhotos')?.click();
                return;
            }

            if (actionEl.dataset.action === 'remove-photo') {
                const index = Number.parseInt(actionEl.dataset.photoIndex, 10);
                this.removePhoto(index);
            }
        });

        this.querySelector('#faultPhotos')?.addEventListener('change', (event) => {
            this.handlePhotoSelection(event);
        });

        this.querySelector('#reportFaultForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSubmit();
        });
    }

    async open() {
        this.querySelector('#reportFaultModal')?.classList.add('active');
        await this.loadMachines();
    }

    close() {
        this.querySelector('#reportFaultModal')?.classList.remove('active');
        this.hideErrors();
    }

    async loadMachines() {
        const machineSelect = this.querySelector('#faultMachine');
        if (!machineSelect || typeof API === 'undefined') {
            return;
        }

        machineSelect.innerHTML = '<option value="">Loading machines...</option>';
        machineSelect.disabled = true;

        try {
            const response = await API.get('/machines');
            const machines = response?.status === 'success' && response.data?.machines ? response.data.machines : [];
            const activeMachines = machines.filter((machine) => machine.status === 'Active');

            machineSelect.innerHTML = '<option value="">Select Machine</option>';
            if (!activeMachines.length) {
                machineSelect.innerHTML = '<option value="">No active machines available</option>';
            } else {
                activeMachines.forEach((machine) => {
                    const option = document.createElement('option');
                    option.value = machine.id;
                    option.textContent = `${machine.machine_id || `ID-${machine.id}`} - ${machine.machine_name}`;
                    machineSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading machines:', error);
            machineSelect.innerHTML = '<option value="">Error loading machines</option>';
            window.MOUtils.emitToast('Failed to load machines. Please try again.', 'error');
        } finally {
            machineSelect.disabled = false;
        }
    }

    handlePhotoSelection(event) {
        const files = Array.from(event.target.files || []);
        if (this.selectedPhotos.length + files.length > 5) {
            window.MOUtils.emitToast('Maximum 5 photos allowed', 'error');
            event.target.value = '';
            return;
        }

        const validFiles = [];
        files.forEach((file) => {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                window.MOUtils.emitToast(`Invalid file type: ${file.name}`, 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                window.MOUtils.emitToast(`File too large: ${file.name}. Max is 5MB.`, 'error');
                return;
            }
            validFiles.push(file);
        });

        this.selectedPhotos.push(...validFiles);
        this.renderPhotoPreview();
        event.target.value = '';
    }

    renderPhotoPreview() {
        const preview = this.querySelector('#photoPreviewContainer');
        if (!preview) {
            return;
        }

        preview.innerHTML = '';
        this.selectedPhotos.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const item = document.createElement('div');
                item.className = 'photo-preview-item';
                item.innerHTML = `
                    <img src="${event.target.result}" alt="${file.name}">
                    <button type="button" class="remove-photo" data-action="remove-photo" data-photo-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="photo-name" title="${file.name}">${file.name}</div>
                `;
                preview.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    removePhoto(index) {
        if (Number.isNaN(index) || index < 0 || index >= this.selectedPhotos.length) {
            return;
        }

        this.selectedPhotos.splice(index, 1);
        this.renderPhotoPreview();
        window.MOUtils.emitToast('Photo removed', 'success');
    }

    async handleSubmit() {
        if (typeof API === 'undefined') {
            return;
        }

        this.hideErrors();

        const machineId = this.querySelector('#faultMachine')?.value;
        const description = this.querySelector('#faultDescription')?.value;
        const priority = this.querySelector('#faultPriority')?.value;

        const submitBtn = this.querySelector('#reportFaultForm button[type="submit"]');
        if (!submitBtn) {
            return;
        }

        const originalLabel = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            const breakdownData = {
                machine_id: Number.parseInt(machineId, 10),
                operator_id: this.currentUser?.id || null,
                breakdown_date: new Date().toISOString(),
                breakdown_type: 'General Fault',
                severity: priority || 'Medium',
                description,
                status: 'Pending',
            };

            const breakdownResponse = await API.post('/machine-breakdowns', breakdownData);
            if (breakdownResponse?.status !== 'success' || !breakdownResponse.data?.breakdown_id) {
                this.showErrors(breakdownResponse?.errors || { error: breakdownResponse?.message || 'Failed to create machine breakdown report.' });
                return;
            }

            let photoUploadWarning = null;
            if (this.selectedPhotos.length > 0) {
                const uploadResult = await this.uploadPhotosToLinkedTicket(breakdownResponse.data.breakdown_id);
                if (!uploadResult.success) {
                    photoUploadWarning = uploadResult.message;
                }
            }

            if (photoUploadWarning) {
                window.MOUtils.emitToast(photoUploadWarning, 'warning');
            } else {
                window.MOUtils.emitToast('Machine breakdown reported successfully! Supervisor will review and assign a technician.', 'success');
            }

            this.resetForm();
            this.close();
            document.dispatchEvent(new CustomEvent('mo:fault-created'));
        } catch (error) {
            console.error('Error submitting fault report:', error);
            window.MOUtils.emitToast(error.message || 'Failed to submit fault report', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalLabel;
        }
    }

    async uploadPhotosToLinkedTicket(breakdownId) {
        const linkedTicketId = await this.findLinkedTicketId(breakdownId);
        if (!linkedTicketId) {
            return {
                success: false,
                message: 'Breakdown reported, but photos could not be attached automatically. You can add them later by editing the ticket.'
            };
        }

        const formData = new FormData();
        this.selectedPhotos.forEach((photo) => formData.append('photos[]', photo));

        const response = await API.putFormData(`/fault-tickets/${linkedTicketId}`, formData);
        if (response?.status !== 'success') {
            return {
                success: false,
                message: 'Breakdown reported, but photo upload failed. You can add photos later by editing the ticket.'
            };
        }

        return { success: true };
    }

    async findLinkedTicketId(breakdownId) {
        const normalizedBreakdownId = String(breakdownId || '').trim();
        if (!normalizedBreakdownId) {
            return null;
        }

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const response = await API.get('/machine-breakdowns');
            const reports = response?.status === 'success' && Array.isArray(response.data?.reports)
                ? response.data.reports
                : [];

            const matched = reports.find((report) => String(report.breakdown_id || '').trim() === normalizedBreakdownId);
            const ticketId = Number.parseInt(matched?.fault_ticket_id, 10);

            if (Number.isFinite(ticketId) && ticketId > 0) {
                return ticketId;
            }

            if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }

        return null;
    }

    showErrors(errors) {
        const errorDiv = this.querySelector('#faultFormErrors');
        if (!errorDiv) {
            return;
        }

        const normalized = errors?.errors || errors;
        const values = typeof normalized === 'object' && normalized !== null
            ? Object.values(normalized)
            : [String(normalized)];

        errorDiv.innerHTML = `<ul style="margin:0; padding-left:20px;">${values.map((message) => `<li>${message}</li>`).join('')}</ul>`;
        errorDiv.style.display = 'block';

        const modalContent = this.querySelector('#reportFaultModal .modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }

    hideErrors() {
        const errorDiv = this.querySelector('#faultFormErrors');
        if (!errorDiv) {
            return;
        }

        errorDiv.innerHTML = '';
        errorDiv.style.display = 'none';
    }

    resetForm() {
        const form = this.querySelector('#reportFaultForm');
        form?.reset();

        this.selectedPhotos = [];
        this.renderPhotoPreview();
        this.hideErrors();
    }
}

customElements.define('mo-report-fault-modal', MOReportFaultModal);
