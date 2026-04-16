class TMEndTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this._tripId = null;
        this.render();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
            <div id="endTripModal" class="modal" aria-hidden="true">
                <div class="modal-content modal-sm">
                    <div class="modal-header">
                        <h2><i class="fas fa-flag-checkered"></i> End Trip</h2>
                        <button class="btn-close" type="button" data-action="close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="endTripForm">
                        <div id="endTripErrors" class="form-errors" style="display: none;"></div>

                        <div class="form-section">
                            <div class="form-group">
                                <label class="form-label">Final Odometer (km) *</label>
                                <input type="number" class="form-input" id="finalOdometer" name="final_odometer" 
                                       min="0" placeholder="Enter final odometer reading" required>
                                <small id="odometerHint" class="form-hint" style="display: none; color: #666; margin-top: 4px;"></small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Completion Notes</label>
                                <textarea class="form-textarea" id="completionNotes" name="completion_notes" 
                                          placeholder="Any notes about the trip..."></textarea>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-check"></i> Mark Completed
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="close">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            
            if (event.target.id === 'endTripModal') {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'close') {
                this.close();
            }
        });

        const form = this.querySelector('#endTripForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submit();
            });
        }
    }

    async open(tripId) {
        this._tripId = tripId;
        this._tripData = null;
        const modal = this.querySelector('#endTripModal');
        const form = this.querySelector('#endTripForm');
        const odometerInput = this.querySelector('#finalOdometer');
        const odometerHint = this.querySelector('#odometerHint');
        
        if (form) form.reset();
        this._hideErrors();
        odometerInput.min = 0;
        odometerHint.style.display = 'none';
        
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }

        // Fetch trip to get starting_odometer
        try {
            const res = await API.get(`/trips/${tripId}`);
            const trip = res.data?.trip || res.data;
            this._tripData = trip;

            const startingOdometer = parseInt(trip.starting_odometer, 10) || 0;
            if (startingOdometer > 0) {
                odometerInput.min = startingOdometer;
                odometerHint.textContent = `Must be ≥ ${startingOdometer.toLocaleString()} km (trip start)`;
                odometerHint.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to fetch trip details:', error);
        }
    }

    close() {
        const modal = this.querySelector('#endTripModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
        this._tripId = null;
    }

    _showErrors(message) {
        const errorsDiv = this.querySelector('#endTripErrors');
        if (errorsDiv) {
            errorsDiv.textContent = message;
            errorsDiv.style.display = 'block';
        }
    }

    _hideErrors() {
        const errorsDiv = this.querySelector('#endTripErrors');
        if (errorsDiv) {
            errorsDiv.style.display = 'none';
        }
    }

    async submit() {
        if (!this._tripId) return;
        
        this._hideErrors();

        const final_odometer = this.querySelector('#finalOdometer')?.value;
        const completion_notes = this.querySelector('#completionNotes')?.value.trim();

        if (!final_odometer) return this._showErrors('Final odometer reading is required.');

        // Validate odometer against trip's starting odometer
        if (this._tripData?.starting_odometer && parseInt(final_odometer) < parseInt(this._tripData.starting_odometer)) {
            return this._showErrors(`Odometer must be ≥ ${parseInt(this._tripData.starting_odometer).toLocaleString()} km (trip start reading).`);
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing...';
            submitBtn.disabled = true;
        }

        try {
            await API.post(`/trips/${this._tripId}/end`, {
                final_odometer: parseInt(final_odometer),
                completion_notes,
            });

            this.close();
            TMUtils.emitToast('Trip completed successfully', 'success');
            
            document.dispatchEvent(new CustomEvent('tm-modal:trip-ended', { bubbles: true }));
        } catch (error) {
            this._showErrors(error.message || 'Failed to end trip.');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }
}

customElements.define('tm-end-trip-modal', TMEndTripModal);
