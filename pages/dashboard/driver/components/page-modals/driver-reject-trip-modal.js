class DriverRejectTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentTripId = null;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'rejectTripModal') {
                this.currentTripId = event.detail.tripId;
                this.open();
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'rejectTripModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="rejectTripModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-times-circle"></i> Reject Trip</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="rejectTripForm">
                        <div class="form-section">
                            <p id="rejectTripInfo" style="margin-bottom: 15px; color: var(--muted);"></p>
                            <div class="form-group">
                                <label class="form-label">Rejection Reason *</label>
                                <textarea 
                                    class="form-textarea" 
                                    id="rejectReason" 
                                    placeholder="Please provide a reason for rejecting this trip..." 
                                    required
                                    rows="4"
                                ></textarea>
                                <small style="color: var(--muted);">This reason will be visible to the Transportation Manager.</small>
                            </div>
                        </div>
                        <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                            <button type="submit" class="btn btn-danger">
                                <i class="fas fa-times"></i> Reject Trip
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#rejectTripModal');
        const form = this.querySelector('#rejectTripForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const reason = form.querySelector('#rejectReason').value.trim();

            if (!reason) {
                DriverUtils.showToast('Please provide a reason for rejection.', 'error');
                return;
            }

            if (!this.currentTripId) {
                DriverUtils.showToast('No trip selected.', 'error');
                return;
            }

            try {
                const response = await DriverUtils.apiPost(`/trips/${encodeURIComponent(this.currentTripId)}/reject`, {
                    reason: reason
                });

                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast(`Trip ${this.currentTripId} rejected successfully.`);
                    this.close();
                    form.reset();
                    DriverUtils.emit('driver:data-trips-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to reject trip.', 'error');
            } catch (error) {
                console.error('Failed to reject trip:', error);
                DriverUtils.showToast('Failed to reject trip. Please try again.', 'error');
            }
        });
    }

    open() {
        const infoEl = this.querySelector('#rejectTripInfo');
        if (infoEl && this.currentTripId) {
            infoEl.textContent = `You are about to reject trip ${this.currentTripId}. Please provide a reason below.`;
        }
        DriverUtils.setModalState(this.querySelector('#rejectTripModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#rejectTripModal'), false);
        this.currentTripId = null;
        this.querySelector('#rejectTripForm')?.reset();
    }
}

customElements.define('driver-reject-trip-modal', DriverRejectTripModal);
