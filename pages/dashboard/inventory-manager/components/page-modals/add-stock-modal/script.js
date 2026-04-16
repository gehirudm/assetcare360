class InventoryAddStockModal extends HTMLElement {
    connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;
        this.innerHTML = `
            <div id="addStockModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-plus-circle"></i> Add New Spare Part</h2>
                        <button class="btn-close" onclick="closeModal('addStockModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="addStockForm">
                        <div class="form-section">
                            <h5><i class="fas fa-box"></i> Basic Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart ID</label>
                                    <input type="text" class="form-input" id="addStockSparepartIdDisplay"
                                           placeholder="Auto-generated" readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                                    <small style="color: var(--muted); display: block; margin-top: 4px;">Automatically generated unique identifier</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Category *</label>
                                    <select class="form-select" id="addStockCategory" required onchange="updateAddStockSparepartNameOptions(); updateAddStockCompatibilityOptions();">
                                        <option value="">Select Category</option>
                                        <option value="vehicles">Vehicles</option>
                                        <option value="machines">Machines</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart Name *</label>
                                    <select class="form-select" id="addStockSparepartName" required>
                                        <option value="">Select Category First</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Quantity *</label>
                                    <input type="number" class="form-input" id="addStockQuantity" min="0" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Storage Location *</label>
                                <select class="form-select" id="addStockLocation" required>
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
                                    <input type="text" class="form-input" id="addStockSupplier" placeholder="Enter supplier name" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Supplier Contact</label>
                                    <input type="text" class="form-input" id="addStockSupplierContact" placeholder="Enter supplier contact">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Supplier Address</label>
                                <textarea class="form-textarea" id="addStockSupplierAddress" placeholder="Enter supplier address"></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-shield-alt"></i> Warranty Details</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Warranty Period (months)</label>
                                    <input type="number" class="form-input" id="addStockWarrantyPeriod" min="0" max="60">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Warranty Start Date</label>
                                    <input type="date" class="form-input" id="addStockWarrantyStart">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Warranty Terms</label>
                                <textarea class="form-textarea" id="addStockWarrantyTerms" placeholder="Enter warranty terms and conditions"></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-link"></i> Machine Compatibility</h5>
                            <div class="form-group">
                                <label class="form-label" id="addStockCompatibilityLabel">Compatible Machines/Vehicles</label>
                                <div id="addStockCompatibilityCheckboxes" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
                                    <p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Add to Catalog</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('addStockModal')"><i class="fas fa-times"></i> Cancel</button>
                    </form>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('inventory-add-stock-modal')) {
    customElements.define('inventory-add-stock-modal', InventoryAddStockModal);
}

const addStockModalState = {
    productsByCategory: new Map()
};

function normalizeAddStockLookupValue(value) {
    return (value ?? '').toString().trim().toLowerCase();
}

function setAddStockSparepartIdDisplay(value, tone = 'neutral') {
    const sparepartIdDisplay = document.getElementById('addStockSparepartIdDisplay');
    if (!sparepartIdDisplay) {
        return;
    }

    sparepartIdDisplay.value = value || '';

    if (tone === 'existing') {
        sparepartIdDisplay.style.background = '#dbeafe';
        sparepartIdDisplay.style.color = '#1e40af';
    } else if (tone === 'new') {
        sparepartIdDisplay.style.background = '#dcfce7';
        sparepartIdDisplay.style.color = '#166534';
    } else if (tone === 'error') {
        sparepartIdDisplay.style.background = '#fee2e2';
        sparepartIdDisplay.style.color = '#991b1b';
    } else {
        sparepartIdDisplay.style.background = '#f3f4f6';
        sparepartIdDisplay.style.color = '#374151';
    }
}

async function refreshAddStockNextIdPreview() {
    const response = await API.get('/products/next-id');
    if (response.status === 'success' && response.data && response.data.next_id) {
        setAddStockSparepartIdDisplay(response.data.next_id, 'new');
        return response.data.next_id;
    }

    throw new Error('Failed to get next sparepart ID');
}

async function loadAddStockProducts(category, forceRefresh = false) {
    const cacheKey = normalizeAddStockLookupValue(category) || 'all';

    if (!forceRefresh && addStockModalState.productsByCategory.has(cacheKey)) {
        return addStockModalState.productsByCategory.get(cacheKey);
    }

    const endpoint = category
        ? `/products?category=${encodeURIComponent(category)}`
        : '/products';

    const response = await API.get(endpoint);
    if (response.status !== 'success' || !response.data || !Array.isArray(response.data.products)) {
        throw new Error(response.message || 'Failed to load spare part catalog');
    }

    addStockModalState.productsByCategory.set(cacheKey, response.data.products);
    return response.data.products;
}

async function resolveAddStockSparepartSelection(category, sparepartName, options = {}) {
    const normalizedCategory = normalizeAddStockLookupValue(category);
    const normalizedName = normalizeAddStockLookupValue(sparepartName);

    if (!normalizedCategory || !normalizedName) {
        return null;
    }

    const products = await loadAddStockProducts(category, Boolean(options.forceRefresh));
    const existingPart = products.find(product =>
        Number(product.is_active) === 1 &&
        normalizeAddStockLookupValue(product.category) === normalizedCategory &&
        normalizeAddStockLookupValue(product.name) === normalizedName
    );

    if (existingPart && existingPart.sparepart_id) {
        setAddStockSparepartIdDisplay(existingPart.sparepart_id, 'existing');
        return {
            mode: 'existing',
            sparepartId: existingPart.sparepart_id,
            product: existingPart,
            products
        };
    }

    if (options.preserveCurrentPreview) {
        const sparepartIdDisplay = document.getElementById('addStockSparepartIdDisplay');
        const currentPreviewId = sparepartIdDisplay?.value || '';
        if (/^SPR-\d+$/.test(currentPreviewId)) {
            setAddStockSparepartIdDisplay(currentPreviewId, 'new');
            return {
                mode: 'new',
                sparepartId: currentPreviewId,
                product: null,
                products
            };
        }
    }

    const nextId = await refreshAddStockNextIdPreview();
    return {
        mode: 'new',
        sparepartId: nextId,
        product: null,
        products
    };
}

// Handle add stock form submission
document.addEventListener('submit', async function (e) {
    if (!e.target || e.target.id !== 'addStockForm') {
        return;
    }

    e.preventDefault();

    const sparepartName = document.getElementById('addStockSparepartName').value;
    const category = document.getElementById('addStockCategory').value;
    const quantity = document.getElementById('addStockQuantity').value;
    const location = document.getElementById('addStockLocation').value;
    const supplier = document.getElementById('addStockSupplier').value || '';
    const supplierContact = document.getElementById('addStockSupplierContact')?.value || '';
    const supplierAddress = document.getElementById('addStockSupplierAddress')?.value || '';

    // Get warranty details
    const warrantyPeriod = document.getElementById('addStockWarrantyPeriod')?.value || '';
    const warrantyStart = document.getElementById('addStockWarrantyStart')?.value || '';
    const warrantyTerms = document.getElementById('addStockWarrantyTerms')?.value || '';

    // Get compatible machines and vehicles
    const compatibleMachines = Array.from(document.querySelectorAll('input[name="addStockCompatibleMachines"]:checked'))
        .map(cb => cb.value);
    const compatibleVehicles = Array.from(document.querySelectorAll('input[name="addStockCompatibleVehicles"]:checked'))
        .map(cb => cb.value);

    if (!category || !sparepartName) {
        Utils.showToast('Please select a category and sparepart name first', 'error');
        return;
    }

    try {
        const resolvedSelection = await resolveAddStockSparepartSelection(category, sparepartName, { forceRefresh: true, preserveCurrentPreview: true });

        if (!resolvedSelection || !resolvedSelection.sparepartId) {
            throw new Error('Unable to resolve a valid sparepart ID');
        }

        const resolvedSparepartId = resolvedSelection.sparepartId;
        setAddStockSparepartIdDisplay(resolvedSparepartId, resolvedSelection.mode === 'existing' ? 'existing' : 'new');

        // Check if we're in edit mode
        if (window.editingAdditionId) {
            // Update existing addition record
            await updateAdditionRecord({
                id: window.editingAdditionId,
                sparepart_id: resolvedSparepartId,
                sparepart_name: sparepartName,
                category: category,
                quantity_added: parseInt(quantity),
                location: location,
                supplier: supplier,
                supplier_contact: supplierContact,
                supplier_address: supplierAddress,
                warranty_period: warrantyPeriod || null,
                warranty_start: warrantyStart || null,
                warranty_terms: warrantyTerms || null,
                compatible_machines: JSON.stringify(compatibleMachines),
                compatible_vehicles: JSON.stringify(compatibleVehicles)
            });
        } else {
            // Save new spare part to database
            await saveSparePartFromAddStock({
                sparepart_id: resolvedSparepartId,
                name: sparepartName,
                category: category,
                quantity: parseInt(quantity),
                location: location,
                supplier: supplier,
                supplier_contact: supplierContact,
                supplier_address: supplierAddress,
                warranty_period: warrantyPeriod || null,
                warranty_start: warrantyStart || null,
                warranty_terms: warrantyTerms || null,
                compatible_machines: JSON.stringify(compatibleMachines),
                compatible_vehicles: JSON.stringify(compatibleVehicles)
            }, resolvedSelection);
        }
    } catch (error) {
        console.error('Failed to resolve sparepart selection:', error);
        Utils.showToast(error.message || 'Failed to resolve sparepart ID', 'error');
    }
});

// Update an existing addition record
async function updateAdditionRecord(data) {
    try {
        showLoading(true);
        console.log('Updating addition record:', data);

        // Get the original addition to compare quantities
        const originalAddition = window.additionsData?.find(a => a.id == data.id);

        // Update the addition record
        const response = await API.put(`/additions/${data.id}`, data);

        if (response.status === 'success') {
            // If quantity changed, update the sparepart quantity
            if (originalAddition && originalAddition.quantity_added !== data.quantity_added) {
                const quantityDifference = data.quantity_added - originalAddition.quantity_added;

                // Get current sparepart to calculate new quantity
                const sparepartResponse = await API.get(`/products/${data.sparepart_id}`);
                if (sparepartResponse.status === 'success' && sparepartResponse.data) {
                    const currentQuantity = parseInt(sparepartResponse.data.quantity) || 0;
                    const newQuantity = currentQuantity + quantityDifference;

                    // Update sparepart quantity
                    await API.put(`/products/${data.sparepart_id}`, {
                        quantity: newQuantity
                    });
                }
            }

            Utils.showToast('Addition record updated successfully!', 'success');
            closeModal('addStockModal');

            // Reset form and modal state
            const form = document.getElementById('addStockForm');
            if (form) form.reset();

            // Reset modal title and button
            const modalTitle = document.querySelector('#addStockModal .modal-header h2');
            const submitBtn = document.querySelector('#addStockModal button[type="submit"]');
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Spare Part';
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Add to Catalog';

            window.editingAdditionId = null;

            // Reload recent additions and spare parts
            await Promise.all([refreshSparepartAddition(), refreshCatalog()]);
        } else {
            console.error('Failed to update addition:', response);
            Utils.showToast(`Failed to update: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Error updating addition:', error);
        Utils.showToast('Error updating addition: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function saveSparePartFromAddStock(data, resolvedSelection = null) {
    try {
        showLoading(true);
        console.log('Saving spare part from Add Stock:', data);

        if (!data.category || !data.name || !data.sparepart_id) {
            throw new Error('Please select a category, sparepart name, and valid sparepart ID before saving');
        }

        // Check if sparepart already exists
        const catalogProducts = resolvedSelection && Array.isArray(resolvedSelection.products)
            ? resolvedSelection.products
            : await loadAddStockProducts(data.category, true);
        const existingPart = catalogProducts.find(p =>
            p.sparepart_id === data.sparepart_id && Number(p.is_active) === 1
        ) || null;

        let response;

        if (existingPart) {
            // POST /additions is the single source of truth — the backend handler
            // (SparepartAdditionController::create) already calls updateQuantity(+add).
            // Do NOT call PUT /products separately; that would double the quantity.
            const newQuantity = parseInt(existingPart.quantity) + parseInt(data.quantity);
            response = await API.post('/additions', {
                sparepart_id: data.sparepart_id,
                sparepart_name: data.name,
                category: data.category,
                location: data.location || existingPart.location,
                quantity_added: data.quantity,
                received_date: new Date().toISOString().split('T')[0],
                supplier: data.supplier || null,
                supplier_contact: data.supplier_contact || null,
                supplier_address: data.supplier_address || null,
                warranty_period: data.warranty_period || null,
                warranty_start: data.warranty_start || null,
                warranty_terms: data.warranty_terms || null,
                compatible_machines: data.compatible_machines || existingPart.compatible_machines,
                compatible_vehicles: data.compatible_vehicles || existingPart.compatible_vehicles,
                reference: `Stock Addition - ${data.sparepart_id}`,
                notes: `Added ${data.quantity} units from ${data.supplier || 'unknown supplier'}`
            });

            if (response.status === 'success') {
                Utils.showToast(`Added ${data.quantity} units to ${data.sparepart_id} from ${data.supplier || 'supplier'}. New total: ${newQuantity} units`, 'success');
            }
        } else {
            // Create new sparepart
            response = await API.post('/products', data);

            if (response.status === 'success') {
                // Record the addition in sparepart_additions table
                await API.post('/additions', {
                    sparepart_id: data.sparepart_id,
                    sparepart_name: data.name,
                    category: data.category,
                    location: data.location,
                    quantity_added: data.quantity,
                    previous_stock: 0,
                    new_stock: data.quantity,
                    received_date: new Date().toISOString().split('T')[0],
                    supplier: data.supplier || null,
                    supplier_contact: data.supplier_contact || null,
                    supplier_address: data.supplier_address || null,
                    warranty_period: data.warranty_period || null,
                    warranty_start: data.warranty_start || null,
                    warranty_terms: data.warranty_terms || null,
                    compatible_machines: data.compatible_machines || null,
                    compatible_vehicles: data.compatible_vehicles || null,
                    reference: 'Initial Stock',
                    notes: `New sparepart added from ${data.supplier || 'catalog'}`
                });

                Utils.showToast(`${data.name} added to catalog successfully!`, 'success');
            }
        }

        if (response.status === 'success') {
            closeModal('addStockModal');
            document.getElementById('addStockForm').reset();

            // Reload spare parts and recent additions
            await Promise.all([
                refreshCatalog(),
                refreshSparepartAddition()
            ]);
        } else {
            console.error('Failed to save spare part:', response);
            Utils.showToast(`Failed to save spare part: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Error saving spare part:', error);
        Utils.showToast('Error saving spare part: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Update sparepart name dropdown for add stock form
function updateAddStockSparepartNameOptions() {
    const category = document.getElementById('addStockCategory').value;
    const sparepartNameSelect = document.getElementById('addStockSparepartName');

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

// Auto-fetch sparepart ID when name is selected
document.addEventListener('change', async function (e) {
    if (!e.target || e.target.id !== 'addStockSparepartName') {
        return;
    }

    const category = document.getElementById('addStockCategory').value;
    const sparepartName = e.target.value;

    if (!category || !sparepartName) {
        return;
    }

    try {
        const resolvedSelection = await resolveAddStockSparepartSelection(category, sparepartName, { forceRefresh: false });

        if (!resolvedSelection || !resolvedSelection.sparepartId) {
            return;
        }

        if (resolvedSelection.mode === 'existing') {
            Utils.showToast(`Found existing sparepart: ${resolvedSelection.sparepartId}`, 'info');
        } else {
            Utils.showToast(`New sparepart will be created: ${resolvedSelection.sparepartId}`, 'info');
        }
    } catch (error) {
        console.error('Error fetching sparepart:', error);
        Utils.showToast(error.message || 'Failed to resolve sparepart ID', 'error');
    }
});

// Update compatibility checkboxes for add stock form
function updateAddStockCompatibilityOptions() {
    const category = document.getElementById('addStockCategory').value;
    const container = document.getElementById('addStockCompatibilityCheckboxes');
    const label = document.getElementById('addStockCompatibilityLabel');

    if (category === 'vehicles') {
        label.textContent = 'Compatible Vehicles';
        const vehicleTypesList = Object.keys(VEHICLE_TYPES);
        container.innerHTML = vehicleTypesList.map(vehicleType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="addStockCompatibleVehicles" value="${vehicleType}"> ${vehicleType}
            </label>
        `).join('');
    } else if (category === 'machines') {
        label.textContent = 'Compatible Machines';
        const machineTypesList = Object.keys(MACHINE_TYPES);
        container.innerHTML = machineTypesList.map(machineType => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="addStockCompatibleMachines" value="${machineType}"> ${machineType}
            </label>
        `).join('');
    } else {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
    }
}

function resolveAdditionRecord(additionRef) {
    if (additionRef && typeof additionRef === 'object') {
        return additionRef;
    }

    const additions = Array.isArray(window.additionsData) ? window.additionsData : [];
    return additions.find(a => a.id == additionRef);
}

// View addition details in modal
function viewAdditionDetails(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition details not found', 'error');
        return;
    }

    const date = new Date(addition.received_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Format warranty information
    let warrantyDisplay = 'N/A';
    if (addition.warranty_period) {
        const warrantyMonths = addition.warranty_period;
        warrantyDisplay = `${warrantyMonths} months`;
        if (addition.warranty_start) {
            const startDate = new Date(addition.warranty_start);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + parseInt(warrantyMonths));
            warrantyDisplay = `${warrantyMonths} months (Valid until ${endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
        }
    }

    // Format compatible machines/vehicles
    let compatibleMachines = [];
    let compatibleVehicles = [];
    try {
        if (addition.compatible_machines) {
            compatibleMachines = JSON.parse(addition.compatible_machines);
        }
        if (addition.compatible_vehicles) {
            compatibleVehicles = JSON.parse(addition.compatible_vehicles);
        }
    } catch (e) {
        console.error('Error parsing compatibility data:', e);
    }

    // Format category display
    const categoryDisplay = addition.category === 'vehicles' ? 'Vehicle Parts' : 'Machine Parts';

    // Create modal using the same pattern as viewPartDetails
    const modal = createDetailsModal('Stock Addition Details', `
        <div class="form-section">
            <h5><i class="fas fa-box"></i> Sparepart Information</h5>
            <p><strong>Sparepart ID:</strong> ${addition.sparepart_id}</p>
            <p><strong>Sparepart Name:</strong> ${addition.sparepart_name}</p>
            <p><strong>Category:</strong> ${categoryDisplay}</p>
            <p><strong>Storage Location:</strong> ${addition.location || 'N/A'}</p>
            <p><strong>Received Date:</strong> ${date}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-chart-line"></i> Stock Information</h5>
            <p><strong>Quantity Added:</strong> <span style="color:#10b981; font-weight:700;">+${addition.quantity_added} units</span></p>
            <p><strong>Previous Stock:</strong> ${addition.previous_stock} units</p>
            <p><strong>New Stock:</strong> <span style="color:#6366f1; font-weight:600;">${addition.new_stock} units</span></p>
            <p><strong>Reference:</strong> ${addition.reference || 'N/A'}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Supplier Information</h5>
            <p><strong>Supplier Name:</strong> ${addition.supplier || 'N/A'}</p>
            <p><strong>Contact:</strong> ${addition.supplier_contact || 'N/A'}</p>
            <p><strong>Address:</strong> ${addition.supplier_address || 'N/A'}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-shield-alt"></i> Warranty Details</h5>
            <p><strong>Warranty Period:</strong> ${warrantyDisplay}</p>
            <p><strong>Warranty Terms:</strong> ${addition.warranty_terms || 'N/A'}</p>
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
        ${addition.notes ? `
        <div class="form-section">
            <h5><i class="fas fa-sticky-note"></i> Notes</h5>
            <p>${addition.notes}</p>
        </div>
        ` : ''}
        <div class="form-section">
            <h5><i class="fas fa-clock"></i> Record Information</h5>
            <p><strong>Added By:</strong> ${addition.added_by || 'admin'}</p>
            <p><strong>Created:</strong> ${new Date(addition.created_at).toLocaleString()}</p>
        </div>
    `);

    document.body.appendChild(modal);
    modal.classList.add('active');
}

// Edit addition - open modal with pre-filled data
async function editAddition(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition details not found', 'error');
        return;
    }

    // Store the addition ID for updating
    window.editingAdditionId = addition.id;

    // Open the add stock modal and populate with existing data
    try {
        // Populate form fields - use safe element access
        const setFieldValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        setFieldValue('addStockSparepartIdDisplay', addition.sparepart_id);
        setFieldValue('addStockCategory', addition.category);

        // Update sparepart name options for the category
        await updateAddStockSparepartNameOptions();

        // Set the sparepart name after options are loaded
        setTimeout(() => {
            setFieldValue('addStockSparepartName', addition.sparepart_name);
        }, 100);

        // Other fields
        setFieldValue('addStockQuantity', addition.quantity_added);
        setFieldValue('addStockLocation', addition.location);
        setFieldValue('addStockSupplier', addition.supplier);
        setFieldValue('addStockSupplierContact', addition.supplier_contact);
        setFieldValue('addStockSupplierAddress', addition.supplier_address);
        setFieldValue('addStockWarrantyPeriod', addition.warranty_period);
        setFieldValue('addStockWarrantyStart', addition.warranty_start);
        setFieldValue('addStockWarrantyTerms', addition.warranty_terms);

        // Update compatibility options and set checkboxes
        updateAddStockCompatibilityOptions();

        // Set compatible machines/vehicles checkboxes after a short delay to ensure they're loaded
        setTimeout(() => {
            if (addition.compatible_machines) {
                try {
                    // Handle if it's already an array or a JSON string
                    const machines = typeof addition.compatible_machines === 'string'
                        ? JSON.parse(addition.compatible_machines)
                        : addition.compatible_machines;

                    if (Array.isArray(machines)) {
                        machines.forEach(machineId => {
                            const checkbox = document.querySelector(`#addStockCompatibilityCheckboxes input[value="${machineId}"]`);
                            if (checkbox) checkbox.checked = true;
                        });
                    }
                } catch (e) {
                    console.error('Error parsing machines:', e, addition.compatible_machines);
                }
            }
            if (addition.compatible_vehicles) {
                try {
                    // Handle if it's already an array or a JSON string
                    const vehicles = typeof addition.compatible_vehicles === 'string'
                        ? JSON.parse(addition.compatible_vehicles)
                        : addition.compatible_vehicles;

                    if (Array.isArray(vehicles)) {
                        vehicles.forEach(vehicleId => {
                            const checkbox = document.querySelector(`#addStockCompatibilityCheckboxes input[value="${vehicleId}"]`);
                            if (checkbox) checkbox.checked = true;
                        });
                    }
                } catch (e) {
                    console.error('Error parsing vehicles:', e, addition.compatible_vehicles);
                }
            }
        }, 300);

        // Change modal title and button for edit mode
        const modalTitle = document.querySelector('#addStockModal .modal-header h2');
        const submitBtn = document.querySelector('#addStockModal button[type="submit"]');
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Stock Addition';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Addition';

        openModal('addStockModal');
    } catch (error) {
        console.error('Failed to open edit modal:', error);
        Utils.showToast('Failed to load addition for editing', 'error');
    }
}

// Delete addition
async function deleteAddition(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition not found', 'error');
        return;
    }

    const confirmDelete = await Utils.confirm(
        `Are you sure you want to delete this stock addition?`,
        `This will remove the record for ${addition.quantity_added} units of "${addition.sparepart_name}" added on ${new Date(addition.received_date).toLocaleDateString()}.`
    );

    if (!confirmDelete) return;

    try {
        const response = await API.delete(`/additions/${addition.id}`);

        if (response.status === 'success') {
            Utils.showToast('Stock addition deleted successfully', 'success');
            await refreshSparepartAddition();
        } else {
            throw new Error(response.message || 'Failed to delete addition');
        }
    } catch (error) {
        console.error('Error deleting addition:', error);
        Utils.showToast(error.message || 'Failed to delete addition', 'error');
    }
}

// Open add stock modal
async function openAddStockModal() {
    try {
        // Clear any editing state
        window.editingAdditionId = null;
        addStockModalState.productsByCategory.clear();

        // Reset modal title and button to add mode
        const modalTitle = document.querySelector('#addStockModal .modal-header h2');
        const submitBtn = document.querySelector('#addStockModal button[type="submit"]');
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Spare Part';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Add to Catalog';

        // Reset form fields
        const form = document.getElementById('addStockForm');
        if (form) form.reset();

        // Clear compatibility checkboxes
        const compatibilityContainer = document.getElementById('addStockCompatibilityCheckboxes');
        if (compatibilityContainer) {
            compatibilityContainer.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
        }
        const compatibilityLabel = document.getElementById('addStockCompatibilityLabel');
        if (compatibilityLabel) {
            compatibilityLabel.textContent = 'Compatible Machines/Vehicles';
        }

        // Reset category dropdown
        document.getElementById('addStockCategory').value = '';
        document.getElementById('addStockSparepartName').innerHTML = '<option value="">Select category first</option>';

        // Fetch next sparepart ID from backend
        await refreshAddStockNextIdPreview();
        openModal('addStockModal');
    } catch (error) {
        console.error('Failed to get next sparepart ID:', error);
        Utils.showToast('Failed to get next sparepart ID', 'error');
        setAddStockSparepartIdDisplay('SPR-###', 'error');
        openModal('addStockModal');
    }
}
