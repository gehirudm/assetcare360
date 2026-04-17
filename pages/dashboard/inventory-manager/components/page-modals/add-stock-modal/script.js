class InventoryAddStockModal extends HTMLElement {
    connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;
        this.innerHTML = `
            <div id="addStockModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-plus-circle"></i> Add Stock to Existing Sparepart</h2>
                        <button class="btn-close" onclick="closeModal('addStockModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="addStockForm">
                        <div class="form-section">
                            <h5><i class="fas fa-box"></i> Sparepart Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart ID</label>
                                    <input
                                        type="text"
                                        class="form-input"
                                        id="addStockSparepartIdDisplay"
                                        placeholder="Select category and sparepart"
                                        readonly
                                        style="background-color: #f3f4f6; cursor: not-allowed;"
                                    >
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Category *</label>
                                    <select class="form-select" id="addStockCategory" required onchange="updateAddStockSparepartNameOptions()">
                                        <option value="">Select Category</option>
                                        <option value="vehicles">Vehicles</option>
                                        <option value="machines">Machines</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Existing Sparepart *</label>
                                    <select class="form-select" id="addStockSparepartName" required onchange="handleAddStockSparepartChange()">
                                        <option value="">Select Category First</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Quantity to Add *</label>
                                    <input type="number" class="form-input" id="addStockQuantity" min="1" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Storage Location</label>
                                    <input
                                        type="text"
                                        class="form-input"
                                        id="addStockLocation"
                                        placeholder="Location from catalog"
                                        readonly
                                        style="background-color: #f3f4f6; cursor: not-allowed;"
                                    >
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Received Date *</label>
                                    <input type="date" class="form-input" id="addStockReceivedDate" required>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5><i class="fas fa-truck"></i> Supplier Details</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Supplier Name</label>
                                    <input type="text" class="form-input" id="addStockSupplier" placeholder="Enter supplier name">
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
                            <h5><i class="fas fa-file-alt"></i> Additional Details</h5>
                            <div class="form-group">
                                <label class="form-label">Reference</label>
                                <input type="text" class="form-input" id="addStockReference" placeholder="PO number, invoice reference, etc.">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notes</label>
                                <textarea class="form-textarea" id="addStockNotes" placeholder="Optional stock addition notes"></textarea>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary" id="addStockSubmitBtn"><i class="fas fa-check"></i> Add Stock</button>
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
    productsByCategory: new Map(),
    selectedProduct: null,
};

function normalizeAddStockLookupValue(value) {
    return (value ?? '').toString().trim().toLowerCase();
}

function escapeAddStockHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
    } else if (tone === 'error') {
        sparepartIdDisplay.style.background = '#fee2e2';
        sparepartIdDisplay.style.color = '#991b1b';
    } else {
        sparepartIdDisplay.style.background = '#f3f4f6';
        sparepartIdDisplay.style.color = '#374151';
    }
}

function setAddStockLocationValue(value) {
    const locationInput = document.getElementById('addStockLocation');
    if (!locationInput) {
        return;
    }

    locationInput.value = value || '';
}

function getAddStockTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function updateAddStockModalHeading(mode) {
    const title = document.querySelector('#addStockModal .modal-header h2');
    const submit = document.getElementById('addStockSubmitBtn');

    if (mode === 'edit') {
        if (title) title.innerHTML = '<i class="fas fa-edit"></i> Edit Stock Addition';
        if (submit) submit.innerHTML = '<i class="fas fa-save"></i> Update Addition';
    } else {
        if (title) title.innerHTML = '<i class="fas fa-plus-circle"></i> Add Stock to Existing Sparepart';
        if (submit) submit.innerHTML = '<i class="fas fa-check"></i> Add Stock';
    }
}

function setAddStockSelectionControlsDisabled(disabled) {
    const category = document.getElementById('addStockCategory');
    const sparepart = document.getElementById('addStockSparepartName');

    if (category) category.disabled = disabled;
    if (sparepart) sparepart.disabled = disabled;
}

async function loadAddStockProducts(category, forceRefresh = false) {
    const normalizedCategory = normalizeAddStockLookupValue(category);
    if (!normalizedCategory) {
        return [];
    }

    if (!forceRefresh && addStockModalState.productsByCategory.has(normalizedCategory)) {
        return addStockModalState.productsByCategory.get(normalizedCategory);
    }

    const response = await API.get(`/products?category=${encodeURIComponent(normalizedCategory)}`);
    if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to load sparepart catalog');
    }

    const products = Array.isArray(response.data?.products)
        ? response.data.products.filter(product => Number(product.is_active) === 1)
        : [];

    products.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

    addStockModalState.productsByCategory.set(normalizedCategory, products);
    return products;
}

function findAddStockSelectedProduct(category, sparepartId) {
    const normalizedCategory = normalizeAddStockLookupValue(category);
    const normalizedId = normalizeAddStockLookupValue(sparepartId);

    const products = addStockModalState.productsByCategory.get(normalizedCategory) || [];
    return products.find(product => normalizeAddStockLookupValue(product.sparepart_id) === normalizedId) || null;
}

async function updateAddStockSparepartNameOptions(selectedSparepartId = '') {
    const category = document.getElementById('addStockCategory')?.value || '';
    const select = document.getElementById('addStockSparepartName');

    if (!select) {
        return;
    }

    select.innerHTML = '<option value="">Select Existing Sparepart</option>';
    addStockModalState.selectedProduct = null;
    setAddStockSparepartIdDisplay('');
    setAddStockLocationValue('');

    if (!category) {
        select.innerHTML = '<option value="">Select Category First</option>';
        return;
    }

    try {
        const products = await loadAddStockProducts(category, false);

        if (!products.length) {
            select.innerHTML = '<option value="">No spareparts in this category</option>';
            return;
        }

        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.sparepart_id;
            option.textContent = `${product.sparepart_id} · ${product.name}`;
            if (selectedSparepartId && product.sparepart_id === selectedSparepartId) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        if (selectedSparepartId) {
            handleAddStockSparepartChange();
        }
    } catch (error) {
        console.error('Failed to load spareparts for stock addition:', error);
        Utils.showToast(error.message || 'Failed to load spareparts', 'error');
        select.innerHTML = '<option value="">Failed to load spareparts</option>';
    }
}

function handleAddStockSparepartChange() {
    const category = document.getElementById('addStockCategory')?.value || '';
    const sparepartId = document.getElementById('addStockSparepartName')?.value || '';

    if (!category || !sparepartId) {
        addStockModalState.selectedProduct = null;
        setAddStockSparepartIdDisplay('');
        setAddStockLocationValue('');
        return;
    }

    const product = findAddStockSelectedProduct(category, sparepartId);
    addStockModalState.selectedProduct = product;

    if (!product) {
        setAddStockSparepartIdDisplay('', 'error');
        setAddStockLocationValue('');
        return;
    }

    setAddStockSparepartIdDisplay(product.sparepart_id, 'existing');
    setAddStockLocationValue(product.location || '');
}

function buildAddStockPayload() {
    const selectedProduct = addStockModalState.selectedProduct;
    if (!selectedProduct) {
        throw new Error('Please select an existing sparepart');
    }

    const quantityAdded = Number.parseInt(document.getElementById('addStockQuantity')?.value, 10);
    if (!Number.isFinite(quantityAdded) || quantityAdded <= 0) {
        throw new Error('Quantity to add must be greater than 0');
    }

    const receivedDate = document.getElementById('addStockReceivedDate')?.value || '';
    if (!receivedDate) {
        throw new Error('Received date is required');
    }

    return {
        sparepart_id: selectedProduct.sparepart_id,
        sparepart_name: selectedProduct.name,
        category: selectedProduct.category,
        location: selectedProduct.location || null,
        quantity_added: quantityAdded,
        received_date: receivedDate,
        supplier: (document.getElementById('addStockSupplier')?.value || '').trim() || null,
        supplier_contact: (document.getElementById('addStockSupplierContact')?.value || '').trim() || null,
        supplier_address: (document.getElementById('addStockSupplierAddress')?.value || '').trim() || null,
        warranty_period: (document.getElementById('addStockWarrantyPeriod')?.value || '').trim() || null,
        warranty_start: (document.getElementById('addStockWarrantyStart')?.value || '').trim() || null,
        warranty_terms: (document.getElementById('addStockWarrantyTerms')?.value || '').trim() || null,
        reference: (document.getElementById('addStockReference')?.value || '').trim() || null,
        notes: (document.getElementById('addStockNotes')?.value || '').trim() || null,
    };
}

async function createAdditionRecord(payload) {
    const response = await API.post('/additions', payload);
    if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to record stock addition');
    }
    return response;
}

async function updateAdditionRecord(payload) {
    if (!window.editingAdditionId) {
        throw new Error('No addition selected for editing');
    }

    const originalAddition = resolveAdditionRecord(window.editingAdditionId);
    const response = await API.put(`/additions/${window.editingAdditionId}`, payload);
    if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to update addition');
    }

    const previousQuantity = Number.parseInt(originalAddition?.quantity_added, 10);
    const nextQuantity = Number.parseInt(payload.quantity_added, 10);
    const quantityDifference = (Number.isFinite(nextQuantity) ? nextQuantity : 0) - (Number.isFinite(previousQuantity) ? previousQuantity : 0);

    if (quantityDifference !== 0) {
        const productResponse = await API.get(`/products/${payload.sparepart_id}`);
        if (productResponse.status === 'success' && productResponse.data) {
            const currentQuantity = Number.parseInt(productResponse.data.quantity, 10) || 0;
            const updatedQuantity = Math.max(0, currentQuantity + quantityDifference);
            await API.put(`/products/${payload.sparepart_id}`, { quantity: updatedQuantity });
        }
    }

    return response;
}

function resolveAdditionRecord(additionRef) {
    if (additionRef && typeof additionRef === 'object') {
        return additionRef;
    }

    const additions = Array.isArray(window.additionsData) ? window.additionsData : [];
    return additions.find(item => String(item.id) === String(additionRef)) || null;
}

function viewAdditionDetails(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition details not found', 'error');
        return;
    }

    const receivedDate = addition.received_date
        ? new Date(addition.received_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : 'N/A';

    const warrantyDisplay = addition.warranty_period ? `${addition.warranty_period} months` : 'N/A';

    const modal = createDetailsModal('Stock Addition Details', `
        <div class="form-section">
            <h5><i class="fas fa-box"></i> Sparepart Information</h5>
            <p><strong>Sparepart ID:</strong> ${escapeAddStockHtml(addition.sparepart_id || 'N/A')}</p>
            <p><strong>Sparepart Name:</strong> ${escapeAddStockHtml(addition.sparepart_name || 'N/A')}</p>
            <p><strong>Category:</strong> ${escapeAddStockHtml(addition.category || 'N/A')}</p>
            <p><strong>Storage Location:</strong> ${escapeAddStockHtml(addition.location || 'N/A')}</p>
            <p><strong>Received Date:</strong> ${escapeAddStockHtml(receivedDate)}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-chart-line"></i> Stock Information</h5>
            <p><strong>Quantity Added:</strong> <span style="color:#10b981; font-weight:700;">+${escapeAddStockHtml(addition.quantity_added || 0)} units</span></p>
            <p><strong>Previous Stock:</strong> ${escapeAddStockHtml(addition.previous_stock || 0)} units</p>
            <p><strong>New Stock:</strong> <span style="color:#6366f1; font-weight:600;">${escapeAddStockHtml(addition.new_stock || 0)} units</span></p>
            <p><strong>Reference:</strong> ${escapeAddStockHtml(addition.reference || 'N/A')}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-truck"></i> Supplier Information</h5>
            <p><strong>Supplier Name:</strong> ${escapeAddStockHtml(addition.supplier || 'N/A')}</p>
            <p><strong>Contact:</strong> ${escapeAddStockHtml(addition.supplier_contact || 'N/A')}</p>
            <p><strong>Address:</strong> ${escapeAddStockHtml(addition.supplier_address || 'N/A')}</p>
        </div>
        <div class="form-section">
            <h5><i class="fas fa-shield-alt"></i> Warranty Details</h5>
            <p><strong>Warranty Period:</strong> ${escapeAddStockHtml(warrantyDisplay)}</p>
            <p><strong>Warranty Terms:</strong> ${escapeAddStockHtml(addition.warranty_terms || 'N/A')}</p>
        </div>
        ${addition.notes ? `
        <div class="form-section">
            <h5><i class="fas fa-sticky-note"></i> Notes</h5>
            <p>${escapeAddStockHtml(addition.notes)}</p>
        </div>
        ` : ''}
        <div class="form-section">
            <h5><i class="fas fa-clock"></i> Record Information</h5>
            <p><strong>Added By:</strong> ${escapeAddStockHtml(addition.added_by || 'N/A')}</p>
            <p><strong>Created:</strong> ${addition.created_at ? new Date(addition.created_at).toLocaleString() : 'N/A'}</p>
        </div>
    `);

    document.body.appendChild(modal);
    modal.classList.add('active');
}

async function editAddition(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition details not found', 'error');
        return;
    }

    window.editingAdditionId = addition.id;
    updateAddStockModalHeading('edit');
    setAddStockSelectionControlsDisabled(true);

    const form = document.getElementById('addStockForm');
    if (form) {
        form.reset();
    }

    let resolvedCategory = addition.category || '';
    try {
        const productResponse = await API.get(`/products/${addition.sparepart_id}`);
        if (productResponse.status === 'success' && productResponse.data?.category) {
            resolvedCategory = productResponse.data.category;
        }
    } catch (error) {
        console.warn('Unable to resolve category from catalog for addition edit:', error);
    }

    document.getElementById('addStockCategory').value = resolvedCategory;

    try {
        await updateAddStockSparepartNameOptions(addition.sparepart_id || '');
    } catch (error) {
        console.error('Failed to preload sparepart options for edit:', error);
    }

    document.getElementById('addStockSparepartName').value = addition.sparepart_id || '';
    handleAddStockSparepartChange();

    document.getElementById('addStockQuantity').value = addition.quantity_added || '';
    document.getElementById('addStockReceivedDate').value = addition.received_date || getAddStockTodayDate();
    document.getElementById('addStockSupplier').value = addition.supplier || '';
    document.getElementById('addStockSupplierContact').value = addition.supplier_contact || '';
    document.getElementById('addStockSupplierAddress').value = addition.supplier_address || '';
    document.getElementById('addStockWarrantyPeriod').value = addition.warranty_period || '';
    document.getElementById('addStockWarrantyStart').value = addition.warranty_start || '';
    document.getElementById('addStockWarrantyTerms').value = addition.warranty_terms || '';
    document.getElementById('addStockReference').value = addition.reference || '';
    document.getElementById('addStockNotes').value = addition.notes || '';

    openModal('addStockModal');
}

async function deleteAddition(additionRef) {
    const addition = resolveAdditionRecord(additionRef);
    if (!addition) {
        Utils.showToast('Addition not found', 'error');
        return;
    }

    const confirmDelete = await Utils.confirm(
        'Are you sure you want to delete this stock addition?',
        `This will remove the record for ${addition.quantity_added} units of "${addition.sparepart_name}" added on ${new Date(addition.received_date).toLocaleDateString()}.`
    );

    if (!confirmDelete) return;

    try {
        const response = await API.delete(`/additions/${addition.id}`);
        if (response.status !== 'success') {
            throw new Error(response.message || 'Failed to delete addition');
        }

        Utils.showToast('Stock addition deleted successfully', 'success');
        await refreshSparepartAddition();
    } catch (error) {
        console.error('Error deleting addition:', error);
        Utils.showToast(error.message || 'Failed to delete addition', 'error');
    }
}

async function openAddStockModal() {
    window.editingAdditionId = null;
    updateAddStockModalHeading('create');
    setAddStockSelectionControlsDisabled(false);

    addStockModalState.selectedProduct = null;
    addStockModalState.productsByCategory.clear();

    const form = document.getElementById('addStockForm');
    if (form) {
        form.reset();
    }

    const receivedDateInput = document.getElementById('addStockReceivedDate');
    if (receivedDateInput) {
        receivedDateInput.value = getAddStockTodayDate();
    }

    setAddStockSparepartIdDisplay('');
    setAddStockLocationValue('');

    const sparepartSelect = document.getElementById('addStockSparepartName');
    if (sparepartSelect) {
        sparepartSelect.innerHTML = '<option value="">Select Category First</option>';
    }

    openModal('addStockModal');
}

if (!window.__inventoryAddStockSubmitBound) {
    window.__inventoryAddStockSubmitBound = true;

    document.addEventListener('submit', async event => {
        if (!event.target || event.target.id !== 'addStockForm') {
            return;
        }

        event.preventDefault();

        try {
            showLoading(true);
            const payload = buildAddStockPayload();

            if (window.editingAdditionId) {
                await updateAdditionRecord(payload);
                Utils.showToast('Addition record updated successfully', 'success');
            } else {
                await createAdditionRecord(payload);
                Utils.showToast(`${payload.quantity_added} unit(s) added to ${payload.sparepart_id}`, 'success');
            }

            closeModal('addStockModal');
            event.target.reset();
            window.editingAdditionId = null;

            updateAddStockModalHeading('create');
            setAddStockSelectionControlsDisabled(false);
            setAddStockSparepartIdDisplay('');
            setAddStockLocationValue('');

            await Promise.all([
                refreshSparepartAddition(),
                refreshCatalog(),
                refreshDashboardOverview(),
                refreshNotifications(),
            ]);
        } catch (error) {
            console.error('Error saving addition:', error);
            Utils.showToast(error.message || 'Failed to save stock addition', 'error');
        } finally {
            showLoading(false);
        }
    });
}
