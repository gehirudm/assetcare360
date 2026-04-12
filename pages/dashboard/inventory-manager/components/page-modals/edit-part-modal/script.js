class InventoryEditPartModal extends HTMLElement {
    connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;
        this.innerHTML = `
            <div id="editPartModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-edit"></i> Edit Spare Part</h2>
                        <button class="btn-close" onclick="closeModal('editPartModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="editPartForm">
                        <input type="hidden" id="editPartId">
                        <div class="form-section">
                            <h5><i class="fas fa-box"></i> Basic Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart ID</label>
                                    <input type="text" class="form-input" id="editSparepartId"
                                           readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                                    <small style="color: var(--muted); display: block; margin-top: 4px;">Sparepart identifier (cannot be changed)</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Category *</label>
                                    <select class="form-select" id="editPartCategory" required onchange="updateEditSparepartNameOptions(); updateEditCompatibilityOptions();">
                                        <option value="">Select Category</option>
                                        <option value="vehicles">Vehicles</option>
                                        <option value="machines">Machines</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart Name *</label>
                                    <select class="form-select" id="editSparepartName" required>
                                        <option value="">Select Category First</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Quantity *</label>
                                    <input type="number" class="form-input" id="editPartQuantity" min="0" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Storage Location *</label>
                                <select class="form-select" id="editPartLocation" required>
                                    <option value="">Select Location</option>
                                    <option value="LOCATION 1">LOCATION 1</option>
                                    <option value="LOCATION 2">LOCATION 2</option>
                                    <option value="LOCATION 3">LOCATION 3</option>
                                    <option value="LOCATION 4">LOCATION 4</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-truck"></i> Supplier Details</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Supplier Name</label>
                                    <input type="text" class="form-input" id="editPartSupplier" placeholder="Enter supplier name" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Supplier Contact</label>
                                    <input type="text" class="form-input" id="editPartSupplierContact" placeholder="Enter supplier contact">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Supplier Address</label>
                                <textarea class="form-textarea" id="editPartSupplierAddress" placeholder="Enter supplier address"></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-link"></i> Machine Compatibility</h5>
                            <div class="form-group">
                                <label class="form-label" id="editCompatibilityLabel">Compatible Machines/Vehicles</label>
                                <div id="editCompatibilityCheckboxes" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
                                    <p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Part</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('editPartModal')"><i class="fas fa-times"></i> Cancel</button>
                    </form>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('inventory-edit-part-modal')) {
    customElements.define('inventory-edit-part-modal', InventoryEditPartModal);
}

// Update sparepart name dropdown for edit form
function updateEditSparepartNameOptions() {
    const category = document.getElementById('editPartCategory').value;
    const sparepartNameSelect = document.getElementById('editSparepartName');
    const currentValue = sparepartNameSelect.value;

    sparepartNameSelect.innerHTML = '<option value="">Select Sparepart Name</option>';

    if (category && SPARE_PART_NAMES[category]) {
        SPARE_PART_NAMES[category].forEach(sparepartName => {
            const option = document.createElement('option');
            option.value = sparepartName;
            option.textContent = sparepartName;
            if (sparepartName === currentValue) {
                option.selected = true;
            }
            sparepartNameSelect.appendChild(option);
        });
    }
}

// Update compatibility checkboxes for edit form
function updateEditCompatibilityOptions() {
    const category = document.getElementById('editPartCategory').value;
    const container = document.getElementById('editCompatibilityCheckboxes');
    const label = document.getElementById('editCompatibilityLabel');

    if (category === 'vehicles') {
        label.textContent = 'Compatible Vehicles';
        const vehicleTypesList = Object.keys(VEHICLE_TYPES);
        container.innerHTML = vehicleTypesList.map(vehicleType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="editCompatibleVehicles" value="${vehicleType}"> ${vehicleType}
            </label>
        `).join('');
    } else if (category === 'machines') {
        label.textContent = 'Compatible Machines';
        const machineTypesList = Object.keys(MACHINE_TYPES);
        container.innerHTML = machineTypesList.map(machineType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="editCompatibleMachines" value="${machineType}"> ${machineType}
            </label>
        `).join('');
    } else {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
    }
}

// READ - View Part Details
async function viewPartDetails(partId) {
    try {
        showLoading(true);

        // Fetch part details from database
        const response = await API.get(`/products/${partId}`);

        if (response.status !== 'success' || !response.data) {
            Utils.showToast('Failed to load spare part details', 'error');
            return;
        }

        const part = response.data;

        // Parse JSON fields
        const compatibleMachines = part.compatible_machines ? JSON.parse(part.compatible_machines) : [];
        const compatibleVehicles = part.compatible_vehicles ? JSON.parse(part.compatible_vehicles) : [];

        // Determine stock status
        const quantity = parseInt(part.quantity) || 0;
        const stockStatus = quantity > 10 ? 'In Stock' : (quantity > 0 ? 'Low Stock' : 'Out of Stock');
        const stockBadge = quantity > 10 ? 'status-in-stock' : (quantity > 0 ? 'status-low-stock' : 'status-out-of-stock');

        // Format category
        const categoryDisplay = part.category === 'vehicles' ? 'Vehicle Parts' : 'Machine Parts';

        const modal = createDetailsModal('Spare Part Details', `
            <div class="form-section">
                <h5><i class="fas fa-box"></i> Part Information</h5>
                <p><strong>Sparepart ID:</strong> ${part.sparepart_id}</p>
                <p><strong>Sparepart Name:</strong> ${part.name}</p>
                <p><strong>Category:</strong> ${categoryDisplay}</p>
                <p><strong>Quantity:</strong> ${quantity} units</p>
                <p><strong>Stock Status:</strong> <span class="status-text ${stockBadge}">${stockStatus}</span></p>
                <p><strong>Storage Location:</strong> ${part.location || 'N/A'}</p>
                ${part.unit_price ? `<p><strong>Unit Price:</strong> LKR ${parseFloat(part.unit_price).toFixed(2)}</p>` : ''}
                ${part.reorder_level ? `<p><strong>Reorder Level:</strong> ${part.reorder_level} units</p>` : ''}
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Supplier Information</h5>
                <p><strong>Supplier Name:</strong> ${part.supplier || 'N/A'}</p>
                <p><strong>Contact:</strong> ${part.supplier_contact || 'N/A'}</p>
                <p><strong>Address:</strong> ${part.supplier_address || 'N/A'}</p>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-cog"></i> Compatible Machines</h5>
                <div class="components-list">
                    ${compatibleMachines.length > 0
                ? compatibleMachines.map(machine => `<span class="component-badge">${machine}</span>`).join('')
                : '<span class="text-muted">No compatible machines specified</span>'}
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Compatible Vehicles</h5>
                <div class="components-list">
                    ${compatibleVehicles.length > 0
                ? compatibleVehicles.map(vehicle => `<span class="component-badge">${vehicle}</span>`).join('')
                : '<span class="text-muted">No compatible vehicles specified</span>'}
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-clock"></i> Record Information</h5>
                <p><strong>Created:</strong> ${new Date(part.created_at).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> ${new Date(part.updated_at).toLocaleString()}</p>
            </div>
        `);

        document.body.appendChild(modal);
        modal.classList.add('active');

    } catch (error) {
        console.error('Error loading part details:', error);
        Utils.showToast('Error loading spare part details', 'error');
    } finally {
        showLoading(false);
    }
}

// UPDATE - Edit Part
async function editPart(partId) {
    try {
        showLoading(true);

        // Fetch spare part data from database
        const response = await API.get(`/products/${partId}`);

        if (response.status !== 'success' || !response.data) {
            Utils.showToast('Failed to load spare part details', 'error');
            return;
        }

        const part = response.data;

        // Parse JSON fields
        const compatibleMachines = part.compatible_machines ? JSON.parse(part.compatible_machines) : [];
        const compatibleVehicles = part.compatible_vehicles ? JSON.parse(part.compatible_vehicles) : [];

        // Set basic information
        document.getElementById('editPartId').value = part.id;
        document.getElementById('editSparepartId').value = part.sparepart_id;

        // Set category first to populate dropdown options
        document.getElementById('editPartCategory').value = part.category;
        updateEditSparepartNameOptions();
        updateEditCompatibilityOptions();

        // Set sparepart name
        document.getElementById('editSparepartName').value = part.name;
        document.getElementById('editPartQuantity').value = part.quantity;
        document.getElementById('editPartLocation').value = part.location;

        // Set supplier details
        document.getElementById('editPartSupplier').value = part.supplier || '';
        document.getElementById('editPartSupplierContact').value = part.supplier_contact || '';
        document.getElementById('editPartSupplierAddress').value = part.supplier_address || '';

        // Set compatibility checkboxes
        if (part.category === 'machines') {
            compatibleMachines.forEach(machine => {
                const checkbox = document.querySelector(`input[name="editCompatibleMachines"][value="${machine}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } else if (part.category === 'vehicles') {
            compatibleVehicles.forEach(vehicle => {
                const checkbox = document.querySelector(`input[name="editCompatibleVehicles"][value="${vehicle}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        openModal('editPartModal');
    } catch (error) {
        console.error('Error loading spare part for edit:', error);
        Utils.showToast('Error loading spare part details', 'error');
    } finally {
        showLoading(false);
    }
}

document.addEventListener('submit', async function (e) {
    if (!e.target || e.target.id !== 'editPartForm') {
        return;
    }

    e.preventDefault();

    const partId = document.getElementById('editPartId').value;
    const sparepartName = document.getElementById('editSparepartName').value;
    const quantity = document.getElementById('editPartQuantity').value;
    const category = document.getElementById('editPartCategory').value;
    const location = document.getElementById('editPartLocation').value;
    const supplier = document.getElementById('editPartSupplier').value || '';
    const supplierContact = document.getElementById('editPartSupplierContact').value || '';
    const supplierAddress = document.getElementById('editPartSupplierAddress').value || '';

    // Get compatible machines and vehicles
    const compatibleMachines = Array.from(document.querySelectorAll('input[name="editCompatibleMachines"]:checked'))
        .map(cb => cb.value);
    const compatibleVehicles = Array.from(document.querySelectorAll('input[name="editCompatibleVehicles"]:checked'))
        .map(cb => cb.value);

    // Update spare part in database
    try {
        showLoading(true);
        const response = await API.put(`/products/${partId}`, {
            name: sparepartName,
            category: category,
            quantity: parseInt(quantity),
            location: location,
            supplier: supplier,
            supplier_contact: supplierContact,
            supplier_address: supplierAddress,
            compatible_machines: JSON.stringify(compatibleMachines),
            compatible_vehicles: JSON.stringify(compatibleVehicles)
        });

        if (response.status === 'success') {
            Utils.showToast(`${sparepartName} updated successfully!`, 'success');
            closeModal('editPartModal');
            e.target.reset();
            // Reload spare parts list
            await refreshCatalog();
        } else {
            Utils.showToast('Failed to update spare part', 'error');
        }
    } catch (error) {
        console.error('Error updating spare part:', error);
        Utils.showToast('Error updating spare part', 'error');
    } finally {
        showLoading(false);
    }
});
