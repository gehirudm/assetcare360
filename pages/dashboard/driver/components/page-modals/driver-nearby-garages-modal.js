class DriverNearbyGaragesModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentPayload = {};
        this.garages = [];
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'nearbyGaragesModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'nearbyGaragesModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="nearbyGaragesModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="nearbyGaragesTitle"><i class="fas fa-store"></i> Nearby Garages</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>

                    <div id="nearbyGaragesMeta" class="form-section" style="display: none;"></div>

                    <div class="form-section">
                        <div id="nearbyGaragesList" style="display:grid; gap:10px;"></div>
                    </div>

                    <div id="garageEntrySection" class="form-section" style="display:none;">
                        <label class="form-label" for="garageEntryNotes">Garage Entry Notes *</label>
                        <textarea id="garageEntryNotes" class="form-textarea" placeholder="Enter details when you arrive at the approved garage..."></textarea>
                    </div>

                    <div style="display:flex; flex-wrap:wrap; gap:10px;">
                        <button id="garageEntrySubmitBtn" class="btn btn-primary" type="button" data-action="submit-entry" style="display:none;">
                            <i class="fas fa-sign-in-alt"></i> Confirm Garage Entry
                        </button>
                        <button class="btn btn-secondary" type="button" data-action="refresh-list">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button class="btn btn-secondary" type="button" data-action="close-modal">Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#nearbyGaragesModal');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');

            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (!actionEl) {
                return;
            }

            const action = actionEl.dataset.action;

            if (action === 'refresh-list') {
                this.loadGarages();
                return;
            }

            if (action === 'call-garage') {
                const phone = actionEl.dataset.phone || '';
                if (phone) {
                    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
                }
                return;
            }

            if (action === 'garage-directions') {
                const address = actionEl.dataset.address || '';
                const query = encodeURIComponent(address || actionEl.dataset.garage || '');
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
                return;
            }

            if (action === 'submit-entry') {
                this.submitGarageEntry();
            }
        });
    }

    async open(payload) {
        this.currentPayload = payload || {};
        this.setHeaderAndMode();
        await this.loadGarages();
        DriverUtils.setModalState(this.querySelector('#nearbyGaragesModal'), true);
    }

    close() {
        const notesField = this.querySelector('#garageEntryNotes');
        if (notesField) {
            notesField.value = '';
        }
        DriverUtils.setModalState(this.querySelector('#nearbyGaragesModal'), false);
    }

    setHeaderAndMode() {
        const mode = this.currentPayload.mode || 'browse';
        const title = this.querySelector('#nearbyGaragesTitle');
        const meta = this.querySelector('#nearbyGaragesMeta');
        const entrySection = this.querySelector('#garageEntrySection');
        const entrySubmitBtn = this.querySelector('#garageEntrySubmitBtn');

        if (mode === 'entry') {
            title.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log Garage Entry';
            entrySection.style.display = '';
            entrySubmitBtn.style.display = '';

            const breakdown = this.currentPayload.breakdown || {};
            const breakdownCode = breakdown.route_breakdown_id || `RBD-${breakdown.id || 'N/A'}`;
            const approvedGarage = breakdown?.garage_workflow?.approved_garage?.name || breakdown.approved_garage_name || 'Not assigned';

            meta.style.display = '';
            meta.innerHTML = `
                <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:12px;">
                    <div><strong>Route Breakdown:</strong> ${breakdownCode}</div>
                    <div><strong>Approved Garage:</strong> ${approvedGarage}</div>
                </div>
            `;
            return;
        }

        title.innerHTML = '<i class="fas fa-store"></i> Nearby Garages';
        entrySection.style.display = 'none';
        entrySubmitBtn.style.display = 'none';
        meta.style.display = 'none';
        meta.innerHTML = '';
    }

    async loadGarages() {
        const listEl = this.querySelector('#nearbyGaragesList');
        listEl.innerHTML = '<div style="color: var(--muted);">Loading garages...</div>';

        try {
            const response = await DriverUtils.apiGet('/garages');
            this.garages = DriverUtils.normalizeApiList(response, 'garages');
            const breakdown = this.currentPayload.breakdown || {};
            const approvedGarageId = Number(
                breakdown?.garage_workflow?.approved_garage?.id
                || breakdown.approved_garage_id
                || breakdown?.garage_workflow?.approved_garage_id
                || 0
            );
            const mode = this.currentPayload.mode || 'browse';

            let garagesToRender = Array.isArray(this.garages) ? [...this.garages] : [];

            if (approvedGarageId > 0) {
                const approvedGarageFromList = garagesToRender.find((garage) => Number(garage.id) === approvedGarageId);
                const approvedGarageFallback = {
                    id: approvedGarageId,
                    name: breakdown?.garage_workflow?.approved_garage?.name || breakdown.approved_garage_name || `Garage #${approvedGarageId}`,
                    address: breakdown?.garage_workflow?.approved_garage?.address || breakdown.approved_garage_address || 'Address unavailable',
                    phone: breakdown?.garage_workflow?.approved_garage?.phone || breakdown.approved_garage_phone || '',
                    city: '',
                };

                garagesToRender = [approvedGarageFromList || approvedGarageFallback];
            }

            if (!garagesToRender.length) {
                listEl.innerHTML = '<div style="padding: 10px; color: var(--muted);">No garages available right now.</div>';
                return;
            }

            listEl.innerHTML = garagesToRender.map((garage) => {
                const isApproved = approvedGarageId > 0 && Number(garage.id) === approvedGarageId;
                const cardStyle = isApproved
                    ? 'border: 1px solid #0ea5e9; background: #eff6ff;'
                    : 'border: 1px solid #e5e7eb; background: #f8fafc;';

                return `
                    <div style="padding: 12px; border-radius: 8px; ${cardStyle}">
                        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                            <div>
                                <div style="font-weight:700; color:#111827;">${garage.name}</div>
                                <div style="margin-top:4px; color:#4b5563; font-size: 0.9rem;">${garage.address}</div>
                                ${garage.city ? `<div style="margin-top:4px; color:#6b7280; font-size: 0.85rem;"><i class="fas fa-map-pin"></i> ${garage.city}</div>` : ''}
                                ${garage.phone ? `<div style="margin-top:4px; color:#374151;"><i class="fas fa-phone"></i> ${garage.phone}</div>` : ''}
                            </div>
                            ${isApproved ? '<span class="status-text status-in-progress">APPROVED</span>' : ''}
                        </div>
                        <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
                            ${garage.phone ? `<button class="btn btn-secondary btn-small" type="button" data-action="call-garage" data-phone="${garage.phone}"><i class="fas fa-phone"></i> Call</button>` : ''}
                            <button class="btn btn-secondary btn-small" type="button" data-action="garage-directions" data-garage="${garage.name}" data-address="${garage.address}"><i class="fas fa-map"></i> Directions</button>
                            ${mode === 'entry' && isApproved ? '<span class="status-text status-assigned">Use this garage for entry log</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load garages:', error);
            listEl.innerHTML = '<div style="padding: 10px; color: var(--danger);">Failed to load garages. Please try again.</div>';
        }
    }

    async submitGarageEntry() {
        const breakdown = this.currentPayload.breakdown || {};
        const routeBreakdownId = Number(breakdown.id || this.currentPayload.breakdownId || 0);

        if (!routeBreakdownId) {
            DriverUtils.showToast('Route breakdown identifier is missing.', 'error');
            return;
        }

        const notesInput = this.querySelector('#garageEntryNotes');
        const entryNotes = (notesInput?.value || '').trim();

        if (!entryNotes) {
            DriverUtils.showToast('Entry notes are required to log garage arrival.', 'error');
            return;
        }

        const approvedGarageId = Number(
            breakdown?.garage_workflow?.approved_garage?.id
            || breakdown.approved_garage_id
            || breakdown?.garage_workflow?.approved_garage_id
            || 0
        );

        if (!approvedGarageId) {
            DriverUtils.showToast('No approved garage found for this breakdown.', 'error');
            return;
        }

        try {
            const response = await DriverUtils.apiPost(`/route-breakdowns/${encodeURIComponent(routeBreakdownId)}/garage-entry`, {
                entry_notes: entryNotes,
            });

            if (response && (response.success || response.status === 'success')) {
                DriverUtils.showToast('Garage entry logged successfully.');
                this.close();
                DriverUtils.emit('driver:data-breakdowns-changed');
                return;
            }

            DriverUtils.showToast(response?.message || 'Failed to log garage entry.', 'error');
        } catch (error) {
            console.error('Failed to log garage entry:', error);
            DriverUtils.showToast('Failed to log garage entry. Please try again.', 'error');
        }
    }
}

customElements.define('driver-nearby-garages-modal', DriverNearbyGaragesModal);
