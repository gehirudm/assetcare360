class DriverViewTripModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'viewTripModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'viewTripModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="viewTripModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-info-circle"></i> Trip Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="viewTripDetailsContent"></div>
                    <button class="btn btn-secondary" type="button" data-action="close-modal"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#viewTripModal');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });
    }

    open(payload) {
        const trip = payload?.trip;
        const content = this.querySelector('#viewTripDetailsContent');

        if (!trip) {
            content.innerHTML = '<p style="color: var(--muted);">Trip details are not available.</p>';
            DriverUtils.setModalState(this.querySelector('#viewTripModal'), true);
            return;
        }

        const route = `${trip.origin || 'N/A'} → ${trip.destination || 'N/A'}`;
        const statusColor = DriverUtils.getStatusColor(trip.status);
        const cargoSummary = DriverUtils.buildCargoSummary(trip);
        const hasDangerousCargo = DriverUtils.hasDangerousCargo(trip);
        const cargoItems = DriverUtils.normalizeCargoItems(trip);

        const cargoItemsHtml = cargoItems.length
            ? `
                <div data-driver-cargo-items style="display: grid; gap: 8px; margin-top: 10px;">
                    ${cargoItems.map((item) => {
                        const quantity = DriverUtils.formatQuantity(item.quantity || 0);
                        const name = DriverUtils.escapeHtml(item.name || item.cargo_item_id || 'Cargo Item');
                        const unit = DriverUtils.escapeHtml(item.unit || 'units');
                        const notes = item.notes ? `<div style="font-size: 12px; color: var(--muted); margin-top: 4px;"><i class="fas fa-sticky-note"></i> ${DriverUtils.escapeHtml(item.notes)}</div>` : '';
                        const dangerBadge = Number(item.is_dangerous) === 1
                            ? '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;"><i class="fas fa-radiation"></i> Dangerous</span>'
                            : '';

                        return `
                            <div style="padding: 10px; border: 1px solid var(--stone-200); border-radius: 8px; background: #fff;">
                                <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                                    <strong>${name}</strong>
                                    <span>${quantity} ${unit}</span>
                                </div>
                                ${dangerBadge}
                                ${notes}
                            </div>
                        `;
                    }).join('')}
                </div>
            `
            : '';

        content.innerHTML = `
            <div class="form-section">
                <h5><i class="fas fa-id-card"></i> Trip Information</h5>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Trip ID:</strong><span>${DriverUtils.escapeHtml(trip.trip_id)}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Status:</strong><span style="color: ${statusColor}; font-weight: 700;">${DriverUtils.escapeHtml(trip.status)}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Route:</strong><span>${DriverUtils.escapeHtml(route)}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Vehicle:</strong><span>${DriverUtils.escapeHtml(trip.vehicle_registration || 'Not assigned')}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Date:</strong><span>${DriverUtils.escapeHtml(DriverUtils.formatDate(trip.created_at || trip.date))}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Starting Odometer:</strong><span>${DriverUtils.escapeHtml(trip.starting_odometer || 'N/A')} km</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Final Odometer:</strong><span>${DriverUtils.escapeHtml(trip.final_odometer || 'Not completed')}${trip.final_odometer ? ' km' : ''}</span></div>
                    ${trip.assistant_driver_name ? `<div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Assistant Driver:</strong><span>${DriverUtils.escapeHtml(trip.assistant_driver_name)}</span></div>` : ''}
                </div>
            </div>
            ${trip.status === 'Rejected' && trip.rejection_reason ? `
            <div class="form-section" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px;">
                <h5 style="color: #dc2626;"><i class="fas fa-times-circle"></i> Rejection Reason</h5>
                <p style="color: #dc2626; margin: 0;">${DriverUtils.escapeHtml(trip.rejection_reason)}</p>
            </div>
            ` : ''}
            <div class="form-section">
                <h5><i class="fas fa-boxes-stacked"></i> Cargo</h5>
                <div style="padding: 12px; background: #f8f9fa; border-radius: 6px;">
                    <div style="margin-bottom: 6px;"><strong>Summary:</strong> ${DriverUtils.escapeHtml(cargoSummary || 'No cargo description provided.')}</div>
                    <div>
                        <strong>Dangerous Cargo:</strong>
                        ${hasDangerousCargo
                            ? '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;"><i class="fas fa-radiation"></i> Yes</span>'
                            : '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;">No</span>'}
                    </div>
                    ${cargoItemsHtml}
                </div>
            </div>
        `;

        DriverUtils.setModalState(this.querySelector('#viewTripModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#viewTripModal'), false);
    }
}

customElements.define('driver-view-trip-modal', DriverViewTripModal);
