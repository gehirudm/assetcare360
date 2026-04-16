class InventoryReorderModal extends HTMLElement {
    connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;
        this.innerHTML = `
            <div id="reorderModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-sync"></i> Reorder Part</h2>
                        <button class="btn-close" onclick="closeModal('reorderModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="reorderForm">
                        <div class="form-section">
                            <h5><i class="fas fa-clipboard-list"></i> Reorder Information</h5>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sparepart Name</label>
                                    <input type="text" class="form-input" id="reorderSparepartName" readonly>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Current Stock</label>
                                    <input type="text" class="form-input" id="reorderCurrentStock" readonly>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Quantity to Order</label>
                                    <input type="number" class="form-input" id="reorderQuantity" min="1" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Priority</label>
                                    <select class="form-select" id="reorderPriority" required>
                                        <option value="normal">Normal</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Justification</label>
                                <textarea class="form-textarea" id="reorderJustification" placeholder="Reason for reordering" required></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Reorder Request</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('reorderModal')"><i class="fas fa-times"></i> Cancel</button>
                    </form>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('inventory-reorder-modal')) {
    customElements.define('inventory-reorder-modal', InventoryReorderModal);
}

// REORDER FUNCTIONS
function reorderPart(partId) {
    const partData = {
        'OF-205': { name: 'Oil Filter - OF-205', currentStock: '8 units' },
        'HYD-250': { name: 'Hydraulic Pump - HYD-250', currentStock: '0 units' },
        'HYD-HOSE-25': { name: 'Hydraulic Hoses - HYD-HOSE-25', currentStock: '3 units' },
        'EO-15W40': { name: 'Engine Oil - EO-15W40', currentStock: '2 units' }
    };

    const part = partData[partId] || { name: `Part ${partId}`, currentStock: '0 units' };

    document.getElementById('reorderSparepartName').value = part.name;
    document.getElementById('reorderCurrentStock').value = part.currentStock;

    openModal('reorderModal');
}

document.addEventListener('submit', function (e) {
    if (!e.target || e.target.id !== 'reorderForm') {
        return;
    }

    e.preventDefault();

    const sparepartName = document.getElementById('reorderSparepartName').value;
    const quantity = document.getElementById('reorderQuantity').value;
    const priority = document.getElementById('reorderPriority').value;

    Utils.showToast(`Reorder request submitted for ${quantity} units of ${sparepartName} (Priority: ${priority}). Supplier will be contacted.`, 'success');
    closeModal('reorderModal');
    e.target.reset();
});
