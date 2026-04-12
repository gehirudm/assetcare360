class DriverEndTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'endTripModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'endTripModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="endTripModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-flag-checkered"></i> End Trip</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="endTripForm">
                        <input type="hidden" id="endTripId">
                        <div class="form-section">
                            <div class="form-group">
                                <label class="form-label">Final Odometer Reading *</label>
                                <input type="number" class="form-input" id="endTripOdometer" min="0" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Completion Notes</label>
                                <textarea class="form-textarea" id="endTripNotes" placeholder="Any notes about trip completion..."></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-success">Complete Trip</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#endTripModal');
        const form = this.querySelector('#endTripForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const tripId = form.querySelector('#endTripId').value;
            const finalOdometer = Number.parseInt(form.querySelector('#endTripOdometer').value, 10);
            const completionNotes = form.querySelector('#endTripNotes').value.trim();

            try {
                const response = await DriverUtils.apiPost(`/trips/${encodeURIComponent(tripId)}/end`, {
                    final_odometer: finalOdometer,
                    completion_notes: completionNotes,
                });

                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast(`Trip ${tripId} completed.`);
                    this.close();
                    form.reset();
                    DriverUtils.emit('driver:data-trips-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to complete trip.', 'error');
            } catch (error) {
                console.error('Failed to end trip:', error);
                DriverUtils.showToast('Failed to complete trip. Please try again.', 'error');
            }
        });
    }

    open(payload) {
        const form = this.querySelector('#endTripForm');
        const trip = payload?.trip || null;

        form.querySelector('#endTripId').value = trip?.trip_id || '';
        const odometerInput = form.querySelector('#endTripOdometer');
        const minimum = Number.parseInt(payload?.minimumOdometer || trip?.starting_odometer || 0, 10);
        odometerInput.min = Number.isFinite(minimum) ? minimum : 0;
        odometerInput.placeholder = `Must be greater than ${odometerInput.min}`;

        DriverUtils.setModalState(this.querySelector('#endTripModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#endTripModal'), false);
    }
}

customElements.define('driver-end-trip-modal', DriverEndTripModal);
