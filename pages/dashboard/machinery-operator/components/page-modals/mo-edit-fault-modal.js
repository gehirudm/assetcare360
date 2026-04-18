class MOEditFaultModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.editSelectedPhotos = [];
        this.imagesToDelete = [];
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="editFaultModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-edit"></i> Edit Fault Report</h2>
                        <button class="btn-close" type="button" data-action="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="editFaultForm">
                        <input type="hidden" id="editTicketId">

                        <div class="form-section">
                            <h5><i class="fas fa-tools"></i> Fault Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Machine *</label>
                                    <select class="form-select" id="editMachineSelect" required disabled>
                                        <option value="">Select Machine</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Priority Level *</label>
                                    <select class="form-select" id="editPrioritySelect" required>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Fault Description *</label>
                                <textarea class="form-textarea" id="editDescription" rows="5" placeholder="Describe the issue in detail..." required></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-camera"></i> Existing Images</h5>
                            <div id="existingImages" class="photo-preview-container" style="margin-bottom: 20px;"></div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-camera"></i> Add New Images</h5>
                            <div class="photo-upload-area">
                                <div class="photo-upload" data-action="open-edit-photo-picker">
                                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--royal-blue);"></i>
                                    <p><strong>Click to upload new photos</strong></p>
                                    <p style="font-size: 0.85rem; color: var(--muted);">Maximum 5 images total (JPEG, PNG, WebP)</p>
                                    <input type="file" id="editPhotos" accept="image/jpeg,image/png,image/webp" multiple style="display: none;">
                                </div>
                                <div id="editPhotoPreviews" class="photo-preview-container"></div>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Update Fault Report
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

            if (event.target.id === 'editFaultModal') {
                this.close();
                return;
            }

            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;
            if (action === 'close-modal') {
                this.close();
                return;
            }

            if (action === 'open-edit-photo-picker') {
                this.querySelector('#editPhotos')?.click();
                return;
            }

            if (action === 'remove-edit-photo') {
                this.removeNewPhoto(Number.parseInt(actionEl.dataset.photoIndex, 10));
                return;
            }

            if (action === 'remove-existing-image') {
                this.markExistingImageForDelete(Number.parseInt(actionEl.dataset.imageId, 10));
            }
        });

        this.querySelector('#editPhotos')?.addEventListener('change', (event) => {
            this.handleNewPhotoSelection(event);
        });

        this.querySelector('#editFaultForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSubmit();
        });
    }

    async openWithTicket(ticketId) {
        if (!ticketId || typeof API === 'undefined') {
            return;
        }

        try {
            const response = await API.get(`/fault-tickets/${ticketId}`);
            if (response?.status !== 'success' || !response.data) {
                window.MOUtils.emitToast('Failed to load ticket details', 'error');
                return;
            }

            const ticket = response.data;
            const normalizedStatus = String(ticket.status || '').trim().toLowerCase();
            if (normalizedStatus !== 'open' && normalizedStatus !== 'pending') {
                window.MOUtils.emitToast(`Edit is only available while the fault ticket is Open. Current status: ${ticket.status || 'Unknown'}.`, 'error');
                return;
            }

            this.resetState();
            this.querySelector('#editTicketId').value = ticket.id;
            this.querySelector('#editMachineSelect').innerHTML = `<option value="${ticket.machine_id}" selected>${ticket.machine_name || 'Unknown Machine'}</option>`;
            this.querySelector('#editPrioritySelect').value = ticket.priority || 'Medium';
            this.querySelector('#editDescription').value = ticket.description || '';

            const existingImages = this.querySelector('#existingImages');
            existingImages.innerHTML = '';

            if (Array.isArray(ticket.images) && ticket.images.length) {
                ticket.images.forEach((image) => {
                    const item = document.createElement('div');
                    item.className = 'photo-preview-item';
                    item.dataset.imageId = String(image.id);
                    item.innerHTML = `
                        <img src="${CONFIG.API_BASE_URL}/uploads/fault-tickets/${image.image_url}" alt="${image.original_filename}">
                        <button type="button" class="remove-photo" data-action="remove-existing-image" data-image-id="${image.id}">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="photo-name">${image.original_filename}</div>
                    `;
                    existingImages.appendChild(item);
                });
            }

            this.querySelector('#editFaultModal')?.classList.add('active');
        } catch (error) {
            console.error('Error loading ticket for edit:', error);
            window.MOUtils.emitToast('Failed to load ticket details', 'error');
        }
    }

    close() {
        this.querySelector('#editFaultModal')?.classList.remove('active');
    }

    resetState() {
        this.editSelectedPhotos = [];
        this.imagesToDelete = [];
        this.querySelector('#editFaultForm')?.reset();
        this.querySelector('#editPhotoPreviews').innerHTML = '';
        this.querySelector('#editPhotos').value = '';
    }

    handleNewPhotoSelection(event) {
        const files = Array.from(event.target.files || []);
        const existingCount = this.querySelectorAll('#existingImages .photo-preview-item').length;
        if (existingCount + this.editSelectedPhotos.length + files.length > 5) {
            window.MOUtils.emitToast('Maximum 5 photos allowed in total', 'error');
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
                window.MOUtils.emitToast(`File too large: ${file.name}`, 'error');
                return;
            }
            validFiles.push(file);
        });

        this.editSelectedPhotos.push(...validFiles);
        this.renderNewPhotoPreview();
        event.target.value = '';
    }

    renderNewPhotoPreview() {
        const preview = this.querySelector('#editPhotoPreviews');
        preview.innerHTML = '';

        this.editSelectedPhotos.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const item = document.createElement('div');
                item.className = 'photo-preview-item';
                item.innerHTML = `
                    <img src="${event.target.result}" alt="${file.name}">
                    <button type="button" class="remove-photo" data-action="remove-edit-photo" data-photo-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="photo-name">${file.name}</div>
                `;
                preview.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    removeNewPhoto(index) {
        if (Number.isNaN(index) || index < 0 || index >= this.editSelectedPhotos.length) {
            return;
        }

        this.editSelectedPhotos.splice(index, 1);
        this.renderNewPhotoPreview();
        window.MOUtils.emitToast('Photo removed', 'success');
    }

    markExistingImageForDelete(imageId) {
        if (!imageId) {
            return;
        }

        this.imagesToDelete.push(imageId);
        const item = this.querySelector(`#existingImages .photo-preview-item[data-image-id="${imageId}"]`);
        item?.remove();
        window.MOUtils.emitToast('Image will be removed when you save', 'info');
    }

    async handleSubmit() {
        if (typeof API === 'undefined') {
            return;
        }

        const ticketId = this.querySelector('#editTicketId')?.value;
        if (!ticketId) {
            return;
        }

        const submitBtn = this.querySelector('#editFaultForm button[type="submit"]');
        const originalLabel = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        try {
            const formData = new FormData();
            formData.append('description', this.querySelector('#editDescription').value);
            formData.append('priority', this.querySelector('#editPrioritySelect').value);

            this.editSelectedPhotos.forEach((photo) => formData.append('photos[]', photo));
            this.imagesToDelete.forEach((imageId) => formData.append('delete_images[]', imageId));

            const response = await API.putFormData(`/fault-tickets/${ticketId}`, formData);
            if (response?.status !== 'success') {
                window.MOUtils.emitToast(response?.message || 'Failed to update fault ticket', 'error');
                return;
            }

            window.MOUtils.emitToast('Fault ticket updated successfully!', 'success');
            this.close();
            this.resetState();
            document.dispatchEvent(new CustomEvent('mo:fault-updated'));
        } catch (error) {
            console.error('Error updating fault ticket:', error);
            window.MOUtils.emitToast('Failed to update fault ticket. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalLabel;
        }
    }
}

customElements.define('mo-edit-fault-modal', MOEditFaultModal);
