class InventoryAddPartModal extends HTMLElement {
    connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;
        this.innerHTML = `
            <div id="addPartModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-plus-circle"></i> Add New Spare Part</h2>
                        <button class="btn-close" onclick="closeModal('addPartModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="addPartForm">
                        <div class="form-section">
                            <h5><i class="fas fa-box"></i> Basic Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart ID</label>
                                    <input type="text" class="form-input" id="sparepartIdDisplay"
                                           placeholder="Auto-generated" readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                                    <small style="color: var(--muted); display: block; margin-top: 4px;">Automatically generated unique identifier</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Category *</label>
                                    <select class="form-select" id="partCategory" required onchange="updateSparepartNameOptions(); updateCompatibilityOptions();">
                                        <option value="">Select Category</option>
                                        <option value="vehicles">Vehicles</option>
                                        <option value="machines">Machines</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart Name *</label>
                                    <select class="form-select" id="sparepartName" required>
                                        <option value="">Select Category First</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Storage Location *</label>
                                <select class="form-select" id="partLocation" required>
                                    <option value="">Select Location</option>
                                    <option value="LOCATION 1">LOCATION 1</option>
                                    <option value="LOCATION 2">LOCATION 2</option>
                                    <option value="LOCATION 3">LOCATION 3</option>
                                    <option value="LOCATION 4">LOCATION 4</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-link"></i> Machine Compatibility</h5>
                            <div class="form-group">
                                <label class="form-label" id="compatibilityLabel">Compatible Machines/Vehicles</label>
                                <div id="compatibilityCheckboxes" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
                                    <p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Add to Catalog</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('addPartModal')"><i class="fas fa-times"></i> Cancel</button>
                    </form>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('inventory-add-part-modal')) {
    customElements.define('inventory-add-part-modal', InventoryAddPartModal);
}

// Update sparepart name dropdown based on selected category
function updateSparepartNameOptions() {
    const category = document.getElementById('partCategory').value;
    const sparepartNameSelect = document.getElementById('sparepartName');

    sparepartNameSelect.innerHTML = '<option value="">Select Sparepart Name</option>';

    if (category && SPARE_PART_NAMES[category]) {
        SPARE_PART_NAMES[category].forEach(sparepartName => {
            const option = document.createElement('option');
            option.value = sparepartName;
            option.textContent = sparepartName;
            sparepartNameSelect.appendChild(option);
        });
    }
}

// Update compatibility checkboxes based on selected category
function updateCompatibilityOptions() {
    const category = document.getElementById('partCategory').value;
    const container = document.getElementById('compatibilityCheckboxes');
    const label = document.getElementById('compatibilityLabel');

    if (category === 'vehicles') {
        label.textContent = 'Compatible Vehicles';
        const vehicleTypesList = Object.keys(VEHICLE_TYPES);
        container.innerHTML = vehicleTypesList.map(vehicleType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibleVehicles" value="${vehicleType}"> ${vehicleType}
            </label>
        `).join('');
    } else if (category === 'machines') {
        label.textContent = 'Compatible Machines';
        const machineTypesList = Object.keys(MACHINE_TYPES);
        container.innerHTML = machineTypesList.map(machineType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="compatibleMachines" value="${machineType}"> ${machineType}
            </label>
        `).join('');
    } else {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
    }
}

// CREATE - Add Part
async function openAddPartModal() {
    try {
        // Fetch next sparepart ID from backend
        const response = await API.get('/products/next-id');
        if (response.status === 'success' && response.data && response.data.next_id) {
            document.getElementById('sparepartIdDisplay').value = response.data.next_id;
        } else {
            throw new Error('Failed to get next sparepart ID');
        }
        openModal('addPartModal');
    } catch (error) {
        console.error('Failed to get next sparepart ID:', error);
        Utils.showToast('Failed to get next sparepart ID', 'error');
        document.getElementById('sparepartIdDisplay').value = 'SPR-###';
        openModal('addPartModal');
    }
}

document.addEventListener('submit', async function (e) {
    if (!e.target || e.target.id !== 'addPartForm') {
        return;
    }

    e.preventDefault();

    const sparepartId = document.getElementById('sparepartIdDisplay').value;
    const sparepartName = document.getElementById('sparepartName').value;
    const category = document.getElementById('partCategory').value;
    const location = document.getElementById('partLocation').value;

    // Get compatible machines and vehicles
    const compatibleMachines = Array.from(document.querySelectorAll('input[name="compatibleMachines"]:checked'))
        .map(cb => cb.value);
    const compatibleVehicles = Array.from(document.querySelectorAll('input[name="compatibleVehicles"]:checked'))
        .map(cb => cb.value);

    // Save spare part to database (without warranty, quantity, and supplier fields - managed via additions)
    await saveSparePart({
        sparepart_id: sparepartId,
        name: sparepartName,
        category: category,
        quantity: 0,
        location: location,
        compatible_machines: JSON.stringify(compatibleMachines),
        compatible_vehicles: JSON.stringify(compatibleVehicles)
    });
});

async function saveSparePart(data) {
    try {
        showLoading(true);
        console.log('Saving spare part:', data);
        const response = await API.post('/products', data);
        console.log('API response:', response);

        if (response.status === 'success') {
            Utils.showToast(`${data.name} added to catalog successfully!`, 'success');
            closeModal('addPartModal');
            document.getElementById('addPartForm').reset();
            // Reload spare parts
            await refreshCatalog();
        } else {
            console.error('Failed to add spare part:', response);
            Utils.showToast(`Failed to add spare part: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Error saving spare part:', error);
        Utils.showToast('Error saving spare part', 'error');
    } finally {
        showLoading(false);
    }
}
