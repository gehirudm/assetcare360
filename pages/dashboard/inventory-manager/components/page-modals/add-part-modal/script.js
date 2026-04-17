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
                            <h5><i class="fas fa-box"></i> Catalog Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart ID</label>
                                    <input
                                        type="text"
                                        class="form-input"
                                        id="sparepartIdDisplay"
                                        placeholder="Auto-generated"
                                        readonly
                                        style="background-color: #f3f4f6; cursor: not-allowed;"
                                    >
                                    <small style="color: var(--muted); display: block; margin-top: 4px;">Automatically generated unique identifier</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Category *</label>
                                    <select class="form-select" id="partCategory" required onchange="updateCompatibilityOptions()">
                                        <option value="">Select Category</option>
                                        <option value="vehicles">Vehicles</option>
                                        <option value="machines">Machines</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart Name *</label>
                                    <input type="text" class="form-input" id="sparepartName" placeholder="Enter sparepart name" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Low Stock Threshold *</label>
                                    <input type="number" class="form-input" id="lowStockThreshold" min="1" value="10" required>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-link"></i> Compatibility</h5>
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

const addPartModalState = {
    compatibilityOptions: {
        machines: null,
        vehicles: null,
    },
};

function parseAddPartNameList(items, key) {
    if (!Array.isArray(items)) {
        return [];
    }

    const names = items
        .map(item => (item && typeof item === 'object' ? item[key] : null))
        .map(name => (name ?? '').toString().trim())
        .filter(Boolean);

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

function escapeAddPartHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadAddPartCompatibilityOptions(category) {
    if (!category) {
        return [];
    }

    if (Array.isArray(addPartModalState.compatibilityOptions[category])) {
        return addPartModalState.compatibilityOptions[category];
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
    const names = parseAddPartNameList(records, nameKey);
    addPartModalState.compatibilityOptions[category] = names;

    return names;
}

function renderAddPartCompatibilityOptions(category, selectedValues = []) {
    const container = document.getElementById('compatibilityCheckboxes');
    const label = document.getElementById('compatibilityLabel');

    if (!container || !label) {
        return;
    }

    if (!category) {
        label.textContent = 'Compatible Machines/Vehicles';
        container.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">Please select a category first</p>';
        return;
    }

    const selectedSet = new Set((Array.isArray(selectedValues) ? selectedValues : []).map(value => String(value)));
    const options = addPartModalState.compatibilityOptions[category] || [];

    label.textContent = category === 'machines' ? 'Compatible Machines' : 'Compatible Vehicles';

    if (!options.length) {
        const emptyLabel = category === 'machines' ? 'machines' : 'vehicles';
        container.innerHTML = `<p style="color: #999; grid-column: 1 / -1;">No ${emptyLabel} available for compatibility selection</p>`;
        return;
    }

    const inputName = category === 'machines' ? 'compatibleMachines' : 'compatibleVehicles';
    container.innerHTML = options.map(name => `
        <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="${inputName}" value="${escapeAddPartHtml(name)}" ${selectedSet.has(name) ? 'checked' : ''}> ${escapeAddPartHtml(name)}
        </label>
    `).join('');
}

async function updateCompatibilityOptions(selectedValues = []) {
    const category = document.getElementById('partCategory')?.value || '';

    if (!category) {
        renderAddPartCompatibilityOptions('');
        return;
    }

    try {
        await loadAddPartCompatibilityOptions(category);
        renderAddPartCompatibilityOptions(category, selectedValues);
    } catch (error) {
        console.error('Failed to load compatibility options:', error);
        Utils.showToast(error.message || 'Failed to load compatibility options', 'error');
        renderAddPartCompatibilityOptions('');
    }
}

function collectAddPartCompatibility(category) {
    if (category === 'machines') {
        return {
            compatible_machines: Array.from(document.querySelectorAll('input[name="compatibleMachines"]:checked')).map(cb => cb.value),
            compatible_vehicles: [],
        };
    }

    if (category === 'vehicles') {
        return {
            compatible_machines: [],
            compatible_vehicles: Array.from(document.querySelectorAll('input[name="compatibleVehicles"]:checked')).map(cb => cb.value),
        };
    }

    return {
        compatible_machines: [],
        compatible_vehicles: [],
    };
}

async function openAddPartModal() {
    const form = document.getElementById('addPartForm');
    if (form) {
        form.reset();
    }

    const thresholdInput = document.getElementById('lowStockThreshold');
    if (thresholdInput) {
        thresholdInput.value = '10';
    }

    renderAddPartCompatibilityOptions('');

    try {
        const response = await API.get('/products/next-id');
        if (response.status === 'success' && response.data?.next_id) {
            document.getElementById('sparepartIdDisplay').value = response.data.next_id;
        } else {
            throw new Error('Failed to get next sparepart ID');
        }
        openModal('addPartModal');
    } catch (error) {
        console.error('Failed to get next sparepart ID:', error);
        Utils.showToast(error.message || 'Failed to get next sparepart ID', 'error');
    }
}

if (!window.__inventoryAddPartSubmitBound) {
    window.__inventoryAddPartSubmitBound = true;

    document.addEventListener('submit', async event => {
        if (!event.target || event.target.id !== 'addPartForm') {
            return;
        }

        event.preventDefault();

        const sparepartId = (document.getElementById('sparepartIdDisplay')?.value || '').trim();
        const name = (document.getElementById('sparepartName')?.value || '').trim();
        const category = document.getElementById('partCategory')?.value || '';
        const thresholdValue = document.getElementById('lowStockThreshold')?.value;
        const threshold = Number.parseInt(thresholdValue, 10);

        if (!sparepartId || !name || !category) {
            Utils.showToast('Please fill all required fields', 'error');
            return;
        }

        if (!Number.isFinite(threshold) || threshold <= 0) {
            Utils.showToast('Low stock threshold must be greater than 0', 'error');
            return;
        }

        const compatibility = collectAddPartCompatibility(category);

        try {
            showLoading(true);
            const payload = {
                sparepart_id: sparepartId,
                name,
                category,
                low_stock_threshold: threshold,
                compatible_machines: compatibility.compatible_machines,
                compatible_vehicles: compatibility.compatible_vehicles,
            };

            const response = await API.post('/products', payload);
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to create sparepart');
            }

            Utils.showToast(`${name} added to catalog successfully`, 'success');
            closeModal('addPartModal');

            if (event.target) {
                event.target.reset();
            }

            await Promise.all([
                refreshCatalog(),
                refreshDashboardOverview(),
                refreshNotifications(),
            ]);
        } catch (error) {
            console.error('Error saving spare part:', error);
            Utils.showToast(error.message || 'Error saving spare part', 'error');
        } finally {
            showLoading(false);
        }
    });
}
