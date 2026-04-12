class InventoryDeleteModal extends HTMLElement {
    connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;
        this.innerHTML = `
            <div id="deleteModal" class="modal">
                <div class="modal-content">
                    <button class="close" onclick="closeModal('deleteModal')">&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Confirm Delete</h2>
                    <div class="confirm-dialog">
                        <p id="deleteMessage"></p>
                        <button id="confirmDeleteBtn" class="btn btn-danger"><i class="fas fa-trash"></i> Yes, Delete</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('deleteModal')"><i class="fas fa-times"></i> Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('inventory-delete-modal')) {
    customElements.define('inventory-delete-modal', InventoryDeleteModal);
}

// DELETE - Delete Part
async function deletePart(partId) {
    const deleteMessage = document.getElementById('deleteMessage');
    deleteMessage.textContent = `Are you sure you want to delete part ${partId}? This action cannot be undone.`;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = async function () {
        try {
            showLoading(true);

            // Find the sparepart from sparepart_id
            const partElement = document.querySelector(`#catalogItems [data-id="${partId}"]`);
            if (!partElement) {
                Utils.showToast('Part not found', 'error');
                closeModal('deleteModal');
                return;
            }

            // Delete from database
            const response = await API.delete(`/products/${partId}`);

            if (response.status === 'success') {
                Utils.showToast(`Part ${partId} deleted successfully!`, 'success');
                closeModal('deleteModal');
                // Reload spare parts
                await refreshCatalog();
            } else {
                Utils.showToast(`Failed to delete part: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting part:', error);
            Utils.showToast('Error deleting part', 'error');
        } finally {
            showLoading(false);
        }
    };

    openModal('deleteModal');
}
