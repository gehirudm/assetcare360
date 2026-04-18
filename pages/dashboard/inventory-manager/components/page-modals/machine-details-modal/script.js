// Machine details and deletion workflow

async function deleteMachine(id) {
    const machine = await fetchMachineRecord(id);
    if (!machine) {
        Utils.showToast('Machine not found', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete machine "${machine.machine_name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await API.delete(`/machines/${id}`);

        if (response.status === 'success') {
            Utils.showToast('Machine deleted successfully!', 'success');
            await refreshMachines();
        }
    } catch (error) {
        console.error('Failed to delete machine:', error);
        Utils.showToast(error.message || 'Failed to delete machine', 'error');
    }
}

async function viewMachineDetails(id) {
    const machine = await fetchMachineRecord(id);
    if (!machine) {
        Utils.showToast('Machine not found', 'error');
        return;
    }

    const modal = createDetailsModal('Machine Details', `
        <div class="form-section">
            <h5><i class="fas fa-info-circle"></i> Basic Information</h5>
            <p><strong>Machine ID:</strong> ${machine.machine_id}</p>
            <p><strong>Machine Name:</strong> ${machine.machine_name}</p>
            <p><strong>Model Number:</strong> ${machine.model_number}</p>
            <p><strong>Location:</strong> ${machine.location}</p>
            <p><strong>Status:</strong> <span class="status-text ${getStatusClass(machine.status)}">${machine.status}</span></p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Supplier Information</h5>
            <p><strong>Supplier:</strong> ${machine.supplier_name}</p>
            ${machine.supplier_contact ? `<p><strong>Contact:</strong> ${machine.supplier_contact}</p>` : ''}
        </div>
        <div class="form-section">
            <h5><i class="fas fa-calendar-alt"></i> Service & Warranty</h5>
            <p><strong>Service Interval:</strong> ${machine.service_interval_days} days</p>
            ${machine.last_service_date ? `<p><strong>Last Service:</strong> ${Utils.formatDate(machine.last_service_date)}</p>` : ''}
            ${machine.next_service_date ? `<p><strong>Next Service:</strong> ${Utils.formatDate(machine.next_service_date)}</p>` : ''}
            ${machine.warranty_expiry ? `<p><strong>Warranty Expiry:</strong> ${Utils.formatDate(machine.warranty_expiry)}</p>` : ''}
            ${machine.warranty_provider ? `<p><strong>Warranty Provider:</strong> ${machine.warranty_provider}</p>` : ''}
        </div>
        <div class="form-section">
            <h5><i class="fas fa-shield-alt"></i> Insurance</h5>
            ${machine.insurance_type ? `<p><strong>Insurance Type:</strong> ${machine.insurance_type}</p>` : '<p><strong>Insurance Type:</strong> N/A</p>'}
            ${machine.insurance_provider ? `<p><strong>Insurance Provider:</strong> ${machine.insurance_provider}</p>` : '<p><strong>Insurance Provider:</strong> N/A</p>'}
            ${machine.insurance_provider_details ? `<p><strong>Provider Details:</strong> ${machine.insurance_provider_details}</p>` : ''}
            ${machine.insurance_renew_interval_days ? `<p><strong>Renew Interval:</strong> ${machine.insurance_renew_interval_days} day(s)</p>` : ''}
            ${machine.last_insurance_renew_date ? `<p><strong>Last Renew Date:</strong> ${Utils.formatDate(machine.last_insurance_renew_date)}</p>` : ''}
            ${machine.next_insurance_renew_date ? `<p><strong>Next Renew Date:</strong> ${Utils.formatDate(machine.next_insurance_renew_date)}</p>` : ''}
            ${machine.last_insurance_renew_details ? `<p><strong>Last Renew Details:</strong> ${machine.last_insurance_renew_details}</p>` : ''}
        </div>
        ${machine.components && Array.isArray(machine.components) ? `
            <div class="form-section">
                <h5><i class="fas fa-list"></i> Components</h5>
                <div class="components-list">
                    ${machine.components.map(comp => `<span class="component-badge">${comp}</span>`).join('')}
                </div>
            </div>
        ` : ''}
        ${machine.notes ? `
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                <p>${machine.notes}</p>
            </div>
        ` : ''}
    `);

    document.body.appendChild(modal);
    modal.classList.add('active');
}
