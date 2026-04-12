class SAResetPasswordModal extends HTMLElement {
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
            <div id="resetPasswordModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-close-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Reset User Password</h2>
                    <form id="resetPasswordForm">
                        <div class="form-section">
                            <h5><i class="fas fa-key"></i> Password Reset</h5>
                            <div class="form-group">
                                <label class="form-label">User to Reset</label>
                                <select class="form-select" required>
                                    <option value="">Select User</option>
                                    <option value="EMP-001">John Smith (EMP-001)</option>
                                    <option value="EMP-002">Sarah Johnson (EMP-002)</option>
                                    <option value="EMP-003">Michael Chen (EMP-003)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">New Temporary Password</label>
                                <input type="text" class="form-input" placeholder="Auto-generated" readonly>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="sendEmailNotif" checked>
                                <label for="sendEmailNotif">Send email notification to user</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="forcePasswordChange" checked>
                                <label for="forcePasswordChange">Force password change on next login</label>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-warning">Reset Password</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#resetPasswordModal');
        const form = this.querySelector('#resetPasswordForm');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.emitToast('Password reset request submitted.', 'success');
            this.close();
        });
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('resetPasswordModal');
            return;
        }

        const modal = this.querySelector('#resetPasswordModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-reset-password-modal', SAResetPasswordModal);
