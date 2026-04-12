class SADeleteConfirmModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="deleteConfirmModal" class="modal" aria-hidden="true">
                <div class="modal-content" style="max-width: 550px;">
                    <div class="modal-header" style="background: var(--danger);">
                        <h2><i class="fas fa-exclamation-triangle"></i> Confirm User Deactivation</h2>
                        <button class="btn-close" type="button" data-close-modal>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="padding: 30px;">
                        <p id="deleteConfirmMessage" style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: var(--text-700);">
                            Are you sure you want to delete this user?
                        </p>
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                            <div style="display: flex; align-items: start; gap: 12px;">
                                <i class="fas fa-info-circle" style="color: #f59e0b; margin-top: 2px; font-size: 18px;"></i>
                                <div style="flex: 1;">
                                    <strong style="color: #92400e; display: block; margin-bottom: 8px;">Soft Delete Information</strong>
                                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                                        This is a <strong>soft delete</strong> operation. The user account will be marked as inactive and hidden from active user lists, but all historical data and records will be preserved to maintain system data consistency and audit trails.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="btn btn-secondary" data-close-modal>
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button type="button" class="btn btn-danger" id="deleteConfirmButton">
                                <i class="fas fa-user-slash"></i> Deactivate User
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#deleteConfirmModal');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('deleteConfirmModal');
            return;
        }

        const modal = this.querySelector('#deleteConfirmModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-delete-confirm-modal', SADeleteConfirmModal);
