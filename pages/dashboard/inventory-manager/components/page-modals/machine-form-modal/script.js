// Machine form modal workflow (add/edit)

function cleanupMachineModals() {
    document.querySelectorAll('#addMachineModal, #editMachineModal').forEach((modal) => {
        modal.remove();
    });
}

async function openAddMachineModal() {
    cleanupMachineModals();

    // Fetch next machine ID before creating the modal
    let nextMachineId = 'MCH-001';
    try {
        const response = await API.get('/machines/next-id');
        if (response.status === 'success' && response.data.next_id) {
            nextMachineId = response.data.next_id;
        }
    } catch (error) {
        console.error('Failed to fetch next machine ID:', error);
    }

    const modal = createMachineModal(null, nextMachineId);
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function createMachineModal(machine = null, nextMachineId = 'MCH-001') {
    const isEdit = !!machine;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = isEdit ? 'editMachineModal' : 'addMachineModal';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-cog"></i> ${isEdit ? 'Edit' : 'Add New'} Machine</h2>
                <button class="btn-close" onclick="closeModal('${modal.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="${isEdit ? 'editMachineForm' : 'addMachineForm'}">
                ${isEdit ? `<input type="hidden" id="machineId" value="${machine.id}">` : ''}
                
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Machine ID</label>
                            <input type="text" class="form-input" id="machineIdDisplay" 
                                   value="${machine?.machine_id || nextMachineId}" 
                                   placeholder="${nextMachineId}" readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                            <small style="color: var(--muted); display: block; margin-top: 4px;">Automatically generated unique identifier</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Machine Name *</label>
                            <select class="form-select" id="machineName" required onchange="updateMachineComponents(this)">
                                <option value="">Select Machine Type</option>
                                ${Object.keys(MACHINE_TYPES).map(type => `
                                    <option value="${type}" ${machine?.machine_name === type ? 'selected' : ''}>${type}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Model Number *</label>
                            <input type="text" class="form-input" id="modelNumber" 
                                   value="${machine?.model_number || ''}" 
                                   placeholder="e.g., CAT-320D" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Location *</label>
                            <select class="form-select" id="location" required>
                                <option value="">Select Location</option>
                                ${LOCATIONS.map(loc => `
                                    <option value="${loc}" ${machine?.location === loc ? 'selected' : ''}>${loc}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="status">
                                <option value="Active" ${machine?.status === 'Active' ? 'selected' : ''}>Active</option>
                                <option value="Inactive" ${machine?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                                <option value="Under Maintenance" ${machine?.status === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                                <option value="Decommissioned" ${machine?.status === 'Decommissioned' ? 'selected' : ''}>Decommissioned</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-truck"></i> Supplier Information</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Supplier Name *</label>
                            <input type="text" class="form-input" id="supplierName" 
                                   value="${machine?.supplier_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Supplier Contact</label>
                            <input type="text" class="form-input" id="supplierContact" 
                                   value="${machine?.supplier_contact || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Service Interval (Days) *</label>
                            <input type="number" class="form-input" id="serviceInterval" 
                                   value="${machine?.service_interval_days || 90}" min="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Last Service Date</label>
                            <input type="date" class="form-input" id="lastServiceDate" 
                                   value="${machine?.last_service_date || ''}" 
                                   max="${new Date().toISOString().split('T')[0]}">
                            <small style="color: var(--muted); display: block; margin-top: 4px;">Cannot be in the future</small>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Warranty Expiry</label>
                            <input type="date" class="form-input" id="warrantyExpiry" 
                                   value="${machine?.warranty_expiry || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Warranty Provider</label>
                            <input type="text" class="form-input" id="warrantyProvider" 
                                   value="${machine?.warranty_provider || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-shield-alt"></i> Insurance</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Insurance Type *</label>
                            <select class="form-select" id="insuranceType" required>
                                <option value="">Select Insurance Type</option>
                                <option value="Full" ${machine?.insurance_type === 'Full' ? 'selected' : ''}>Full</option>
                                <option value="Third-Party" ${machine?.insurance_type === 'Third-Party' ? 'selected' : ''}>Third-Party</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Insurance Provider *</label>
                            <input type="text" class="form-input" id="insuranceProvider"
                                   value="${machine?.insurance_provider || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Insurance Provider Details *</label>
                            <textarea class="form-textarea" id="insuranceProviderDetails" rows="2" required>${machine?.insurance_provider_details || ''}</textarea>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Insurance Renew Interval (Days) *</label>
                            <input type="number" class="form-input" id="insuranceRenewIntervalDays"
                                   value="${machine?.insurance_renew_interval_days || ''}" min="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Last Insurance Renew Date *</label>
                            <input type="date" class="form-input" id="lastInsuranceRenewDate"
                                   value="${machine?.last_insurance_renew_date || ''}"
                                   max="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Last Insurance Renew Details *</label>
                            <textarea class="form-textarea" id="lastInsuranceRenewDetails" rows="2" required>${machine?.last_insurance_renew_details || ''}</textarea>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h5><i class="fas fa-cogs"></i> Machine Components</h5>
                    <div class="form-group">
                        <label class="form-label">Select Components</label>
                        <div class="components-grid" id="componentsGrid">
                            ${machine?.machine_name && MACHINE_TYPES[machine.machine_name] ? MACHINE_TYPES[machine.machine_name].map(component => {
        const isChecked = machine?.components?.includes(component) ? 'checked' : '';
        return `
                                    <label class="component-checkbox">
                                        <input type="checkbox" name="machineComponent" value="${component}" ${isChecked}>
                                        <span>${component}</span>
                                    </label>
                                `;
    }).join('') : '<p style="color: var(--muted); padding: 1rem;">Please select a machine type to see available components</p>'}
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea class="form-textarea" id="notes" rows="3">${machine?.notes || ''}</textarea>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Update' : 'Add'} Machine
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('${modal.id}')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </form>
        </div>
    `;

    // Add form submit handler
    setTimeout(() => {
        const form = modal.querySelector('form');
        form.addEventListener('submit', isEdit ? handleEditMachine : handleAddMachine);
    }, 100);

    return modal;
}

// Update machine components based on selected machine type
function updateMachineComponents(trigger) {
    const form = trigger?.closest('form') || document.getElementById('editMachineForm') || document.getElementById('addMachineForm');
    if (!form) {
        return;
    }

    const machineType = form.querySelector('#machineName')?.value;
    const componentsGrid = form.querySelector('#componentsGrid');

    if (!componentsGrid) return;

    if (!machineType || !MACHINE_TYPES[machineType]) {
        componentsGrid.innerHTML = '<p style="color: var(--muted); padding: 1rem;">Please select a machine type to see available components</p>';
        return;
    }

    const components = MACHINE_TYPES[machineType];
    componentsGrid.innerHTML = components.map(component => `
        <label class="component-checkbox">
            <input type="checkbox" name="machineComponent" value="${component}" checked>
            <span>${component}</span>
        </label>
    `).join('');
}

async function handleAddMachine(e) {
    e.preventDefault();

    try {
        const form = e.currentTarget;
        const formData = getMachineFormData(form);

        // Validate last service date is not in the future
        if (formData.last_service_date) {
            const lastServiceDate = new Date(formData.last_service_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

            if (lastServiceDate > today) {
                Utils.showToast('Last service date cannot be in the future', 'error');
                return;
            }
        }

        if (formData.last_insurance_renew_date) {
            const lastInsuranceRenewDate = new Date(formData.last_insurance_renew_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (lastInsuranceRenewDate > today) {
                Utils.showToast('Last insurance renew date cannot be in the future', 'error');
                return;
            }
        }

        const response = await API.post('/machines', formData);

        if (response.status === 'success') {
            Utils.showToast('Machine added successfully!', 'success');
            closeModal('addMachineModal');
            await refreshMachines();
            if (typeof refreshInsuranceManagement === 'function') {
                await refreshInsuranceManagement();
            }
        } else if (response.status === 'error') {
            // Display error message from backend
            Utils.showToast(response.message || 'Failed to add machine', 'error');

            // If there are validation errors, display them on the form
            if (response.errors) {
                Utils.showFormErrors(form, response.errors);
            }
        }
    } catch (error) {
        console.error('Failed to add machine:', error);
        Utils.showToast(error.message || 'Failed to add machine', 'error');
    }
}

async function handleEditMachine(e) {
    e.preventDefault();

    try {
        const form = e.currentTarget;
        const machineId = form.querySelector('#machineId')?.value;
        const formData = getMachineFormData(form);

        if (!machineId) {
            Utils.showToast('Machine ID is missing for update', 'error');
            return;
        }

        // Validate last service date is not in the future
        if (formData.last_service_date) {
            const lastServiceDate = new Date(formData.last_service_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

            if (lastServiceDate > today) {
                Utils.showToast('Last service date cannot be in the future', 'error');
                return;
            }
        }

        if (formData.last_insurance_renew_date) {
            const lastInsuranceRenewDate = new Date(formData.last_insurance_renew_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (lastInsuranceRenewDate > today) {
                Utils.showToast('Last insurance renew date cannot be in the future', 'error');
                return;
            }
        }

        const response = await API.put(`/machines/${machineId}`, formData);

        if (response.status === 'success') {
            Utils.showToast('Machine updated successfully!', 'success');
            closeModal('editMachineModal');
            await refreshMachines();
            if (typeof refreshInsuranceManagement === 'function') {
                await refreshInsuranceManagement();
            }
        } else if (response.status === 'error') {
            // Display error message from backend
            Utils.showToast(response.message || 'Failed to update machine', 'error');

            // If there are validation errors, display them on the form
            if (response.errors) {
                Utils.showFormErrors(form, response.errors);
            }
        }
    } catch (error) {
        console.error('Failed to update machine:', error);
        Utils.showToast(error.message || 'Failed to update machine', 'error');
    }
}

function getMachineFormData(form) {
    const selectedComponents = Array.from(form.querySelectorAll('input[name="machineComponent"]:checked'))
        .map(cb => cb.value);

    return {
        machine_name: form.querySelector('#machineName')?.value || '',
        model_number: form.querySelector('#modelNumber')?.value || '',
        location: form.querySelector('#location')?.value || '',
        status: form.querySelector('#status')?.value || 'Active',
        supplier_name: form.querySelector('#supplierName')?.value || '',
        supplier_contact: form.querySelector('#supplierContact')?.value || '',
        service_interval_days: parseInt(form.querySelector('#serviceInterval')?.value || '0', 10),
        last_service_date: form.querySelector('#lastServiceDate')?.value || null,
        warranty_expiry: form.querySelector('#warrantyExpiry')?.value || null,
        warranty_provider: form.querySelector('#warrantyProvider')?.value || '',
        insurance_type: form.querySelector('#insuranceType')?.value || '',
        insurance_provider: form.querySelector('#insuranceProvider')?.value || '',
        insurance_provider_details: form.querySelector('#insuranceProviderDetails')?.value || '',
        insurance_renew_interval_days: parseInt(form.querySelector('#insuranceRenewIntervalDays')?.value || '0', 10),
        last_insurance_renew_date: form.querySelector('#lastInsuranceRenewDate')?.value || null,
        last_insurance_renew_details: form.querySelector('#lastInsuranceRenewDetails')?.value || '',
        components: selectedComponents,
        notes: form.querySelector('#notes')?.value || ''
    };
}

async function editMachine(id) {
    cleanupMachineModals();

    const machine = await fetchMachineRecord(id);
    if (!machine) {
        Utils.showToast('Machine not found', 'error');
        return;
    }

    const modal = createMachineModal(machine);
    document.body.appendChild(modal);
    modal.classList.add('active');
}
