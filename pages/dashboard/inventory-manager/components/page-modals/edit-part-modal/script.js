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
                            <h5><i class="fas fa-box"></i> Catalog Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart ID</label>
                                    <input
                                        type="text"
                                        class="form-input"
                                        id="editSparepartId"
                                        readonly
                                        style="background-color: #f3f4f6; cursor: not-allowed;"
                                    >
                                    <small style="color: var(--muted); display: block; margin-top: 4px;">Sparepart identifier (cannot be changed)</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Category *</label>
                                    <select class="form-select" id="editPartCategory" required onchange="updateEditCompatibilityOptions()">
                                        <option value="">Select Category</option>
                                        <option value="vehicles">Vehicles</option>
                                        <option value="machines">Machines</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart Name *</label>
                                    <input type="text" class="form-input" id="editSparepartName" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Current Stock</label>
                                    <input type="number" class="form-input" id="editPartCurrentStock" readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Low Stock Threshold *</label>
                                    <input type="number" class="form-input" id="editLowStockThreshold" min="1" required>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-link"></i> Compatibility</h5>
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

const editPartModalState = {
    compatibilityOptions: {
        machines: null,
        vehicles: null,
    },
};

function escapeEditPartHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseEditPartNameList(items, key) {
    if (!Array.isArray(items)) {
        return [];
    }

    const names = items
        .map(item => (item && typeof item === 'object' ? item[key] : null))
        .map(name => (name ?? '').toString().trim())
        .filter(Boolean);

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

function parseCompatibilityField(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string' && value.trim() !== '') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map(item => String(item).trim()).filter(Boolean);
            }
        } catch (error) {
            console.warn('Unable to parse compatibility field:', error);
        }
    }

    return [];
}

function resolveLowStockThreshold(part) {
    const rawThreshold = Number.parseInt(part?.low_stock_threshold ?? part?.reorder_level, 10);
    if (Number.isFinite(rawThreshold) && rawThreshold > 0) {
        return rawThreshold;
    }

    return 10;
}

function getStockStatus(quantity, threshold) {
    if (quantity <= 0) {
        return { label: 'Out of Stock', badge: 'status-out-of-stock' };
    }

    if (quantity <= threshold) {
        return { label: 'Low Stock', badge: 'status-low-stock' };
    }

    return { label: 'In Stock', badge: 'status-in-stock' };
}

async function loadEditCompatibilityOptions(category) {
    if (!category) {
        return [];
    }

    if (Array.isArray(editPartModalState.compatibilityOptions[category])) {
        return editPartModalState.compatibilityOptions[category];
    }

    let endpoint = '';
    let responseKey = '';
    let nameKey = '';

    if (category === 'machines') {
        endpoint = '/machines';
        responseKey = 'machines';
        nameKey = 'machine_name';
    } else if (category === 'vehicles') {
        endpoint = '/vehicles';
        responseKey = 'vehicles';
        nameKey = 'vehicle_name';
    } else {
        return [];
    }

    const response = await API.get(endpoint);
    if (response.status !== 'success') {
        throw new Error(response.message || `Failed to load ${category}`);
    }

    const records = Array.isArray(response.data?.[responseKey]) ? response.data[responseKey] : [];
    const names = parseEditPartNameList(records, nameKey);
    editPartModalState.compatibilityOptions[category] = names;

    return names;
}

function renderEditCompatibilityOptions(category, selectedValues = []) {
    const container = document.getElementById('editCompatibilityCheckboxes');
    const label = document.getElementById('editCompatibilityLabel');

    if (!container || !label) {
        return;
    }

    if (!category) {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
        return;
    }

    const options = editPartModalState.compatibilityOptions[category] || [];
    const selectedSet = new Set((Array.isArray(selectedValues) ? selectedValues : []).map(value => String(value)));

    label.textContent = category === 'machines' ? 'Compatible Machines' : 'Compatible Vehicles';

    if (!options.length) {
        const emptyLabel = category === 'machines' ? 'machines' : 'vehicles';
        container.innerHTML = `<p style="color: #999; grid-column: 1 / -1;">No ${emptyLabel} available for compatibility selection</p>`;
        return;
    }

    const inputName = category === 'machines' ? 'editCompatibleMachines' : 'editCompatibleVehicles';
    container.innerHTML = options.map(name => `
        <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="${inputName}" value="${escapeEditPartHtml(name)}" ${selectedSet.has(name) ? 'checked' : ''}> ${escapeEditPartHtml(name)}
        </label>
    `).join('');
}

async function updateEditCompatibilityOptions(selectedValues = []) {
    const category = document.getElementById('editPartCategory')?.value || '';

    if (!category) {
        renderEditCompatibilityOptions('');
        return;
    }

    try {
        await loadEditCompatibilityOptions(category);
        renderEditCompatibilityOptions(category, selectedValues);
    } catch (error) {
        console.error('Failed to load edit compatibility options:', error);
        Utils.showToast(error.message || 'Failed to load compatibility options', 'error');
        renderEditCompatibilityOptions('');
    }
}

function collectEditCompatibility(category) {
    if (category === 'machines') {
        return {
            compatible_machines: Array.from(document.querySelectorAll('input[name="editCompatibleMachines"]:checked')).map(cb => cb.value),
            compatible_vehicles: [],
        };
    }

    if (category === 'vehicles') {
        return {
            compatible_machines: [],
            compatible_vehicles: Array.from(document.querySelectorAll('input[name="editCompatibleVehicles"]:checked')).map(cb => cb.value),
        };
    }

    return {
        compatible_machines: [],
        compatible_vehicles: [],
    };
}

async function fetchPartForCatalog(partId) {
    const response = await API.get(`/products/${partId}`);
    if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'Failed to load spare part details');
    }
    return response.data;
}

async function viewPartDetails(partId) {
    try {
        showLoading(true);
        const part = await fetchPartForCatalog(partId);

        const compatibleMachines = parseCompatibilityField(part.compatible_machines);
        const compatibleVehicles = parseCompatibilityField(part.compatible_vehicles);
        const quantity = Number.parseInt(part.quantity, 10) || 0;
        const threshold = resolveLowStockThreshold(part);
        const stockStatus = getStockStatus(quantity, threshold);
        const categoryDisplay = part.category === 'vehicles' ? 'Vehicle Parts' : 'Machine Parts';

        const modal = createDetailsModal('Spare Part Details', `
            <div class="form-section">
                <h5><i class="fas fa-box"></i> Part Information</h5>
                <p><strong>Sparepart ID:</strong> ${escapeEditPartHtml(part.sparepart_id || 'N/A')}</p>
                <p><strong>Sparepart Name:</strong> ${escapeEditPartHtml(part.name || 'N/A')}</p>
                <p><strong>Category:</strong> ${escapeEditPartHtml(categoryDisplay)}</p>
                <p><strong>Quantity:</strong> ${quantity} units</p>
                <p><strong>Stock Status:</strong> <span class="status-text ${stockStatus.badge}">${stockStatus.label}</span></p>
                <p><strong>Low Stock Threshold:</strong> ${threshold} units</p>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-cog"></i> Compatible Machines</h5>
                <div class="components-list">
                    ${compatibleMachines.length > 0
                        ? compatibleMachines.map(machine => `<span class="component-badge">${escapeEditPartHtml(machine)}</span>`).join('')
                        : '<span class="text-muted">No compatible machines specified</span>'}
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Compatible Vehicles</h5>
                <div class="components-list">
                    ${compatibleVehicles.length > 0
                        ? compatibleVehicles.map(vehicle => `<span class="component-badge">${escapeEditPartHtml(vehicle)}</span>`).join('')
                        : '<span class="text-muted">No compatible vehicles specified</span>'}
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-clock"></i> Record Information</h5>
                <p><strong>Created:</strong> ${part.created_at ? new Date(part.created_at).toLocaleString() : 'N/A'}</p>
                <p><strong>Last Updated:</strong> ${part.updated_at ? new Date(part.updated_at).toLocaleString() : 'N/A'}</p>
            </div>
        `);

        document.body.appendChild(modal);
        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading part details:', error);
        Utils.showToast(error.message || 'Error loading spare part details', 'error');
    } finally {
        showLoading(false);
    }
}

async function editPart(partId) {
    try {
        showLoading(true);
        const part = await fetchPartForCatalog(partId);

        const quantity = Number.parseInt(part.quantity, 10) || 0;
        const threshold = resolveLowStockThreshold(part);
        const category = part.category || '';

        document.getElementById('editPartId').value = part.id || '';
        document.getElementById('editSparepartId').value = part.sparepart_id || '';
        document.getElementById('editPartCategory').value = category;
        document.getElementById('editSparepartName').value = part.name || '';
        document.getElementById('editPartCurrentStock').value = quantity;
        document.getElementById('editLowStockThreshold').value = threshold;

        const selectedCompatibility = category === 'machines'
            ? parseCompatibilityField(part.compatible_machines)
            : parseCompatibilityField(part.compatible_vehicles);

        await updateEditCompatibilityOptions(selectedCompatibility);
        openModal('editPartModal');
    } catch (error) {
        console.error('Error loading spare part for edit:', error);
        Utils.showToast(error.message || 'Error loading spare part details', 'error');
    } finally {
        showLoading(false);
    }
}

if (!window.__inventoryEditPartSubmitBound) {
    window.__inventoryEditPartSubmitBound = true;

    document.addEventListener('submit', async event => {
        if (!event.target || event.target.id !== 'editPartForm') {
            return;
        }

        event.preventDefault();

        const sparepartId = (document.getElementById('editSparepartId')?.value || '').trim();
        const category = document.getElementById('editPartCategory')?.value || '';
        const name = (document.getElementById('editSparepartName')?.value || '').trim();
        const thresholdValue = document.getElementById('editLowStockThreshold')?.value;
        const threshold = Number.parseInt(thresholdValue, 10);

        if (!sparepartId || !category || !name) {
            Utils.showToast('Please fill all required fields', 'error');
            return;
        }

        if (!Number.isFinite(threshold) || threshold <= 0) {
            Utils.showToast('Low stock threshold must be greater than 0', 'error');
            return;
        }

        const compatibility = collectEditCompatibility(category);

        try {
            showLoading(true);
            const payload = {
                name,
                category,
                low_stock_threshold: threshold,
                compatible_machines: compatibility.compatible_machines,
                compatible_vehicles: compatibility.compatible_vehicles,
            };

            const response = await API.put(`/products/${sparepartId}`, payload);
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to update sparepart');
            }

            Utils.showToast(`${name} updated successfully`, 'success');
            closeModal('editPartModal');
            event.target.reset();

            await Promise.all([
                refreshCatalog(),
                refreshDashboardOverview(),
                refreshNotifications(),
            ]);
        } catch (error) {
            console.error('Error updating spare part:', error);
            Utils.showToast(error.message || 'Error updating spare part', 'error');
        } finally {
            showLoading(false);
        }
    });
}
