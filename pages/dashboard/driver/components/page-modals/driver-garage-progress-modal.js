class DriverGarageProgressModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'garageProgressModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'garageProgressModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="garageProgressModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-camera"></i> Add Garage Progress Update</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>

                    <form id="garageProgressForm">
                        <input type="hidden" id="garageProgressRouteBreakdownId">

                        <div class="form-section">
                            <div class="form-group">
                                <label class="form-label">Route Breakdown ID</label>
                                <input type="text" class="form-input" id="garageProgressBreakdownCode" readonly>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="garageProgressNote">Progress Note *</label>
                                <textarea class="form-textarea" id="garageProgressNote" placeholder="Describe latest repair progress..." required></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="garageProgressImages">Progress Images (max 5)</label>
                                <input type="file" class="form-input" id="garageProgressImages" accept="image/png,image/jpeg,image/webp" multiple>
                            </div>
                        </div>

                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button type="submit" class="btn btn-primary"><i class="fas fa-upload"></i> Submit Progress</button>
                            <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#garageProgressModal');
        const form = this.querySelector('#garageProgressForm');

        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const routeBreakdownId = Number(this.querySelector('#garageProgressRouteBreakdownId').value || 0);
            const note = this.querySelector('#garageProgressNote').value.trim();
            const imageInput = this.querySelector('#garageProgressImages');
            const files = Array.from(imageInput?.files || []);

            if (!routeBreakdownId) {
                DriverUtils.showToast('Route breakdown identifier is missing.', 'error');
                return;
            }

            if (!note) {
                DriverUtils.showToast('Progress note is required.', 'error');
                return;
            }

            if (files.length > 5) {
                DriverUtils.showToast('You can upload up to 5 images per progress update.', 'error');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('progress_note', note);
                files.forEach((file) => {
                    formData.append('progress_images[]', file);
                });

                const response = await DriverUtils.apiPostFormData(
                    `/route-breakdowns/${encodeURIComponent(routeBreakdownId)}/garage-progress`,
                    formData
                );

                if (response && (response.success || response.status === 'success')) {
                    DriverUtils.showToast('Progress update submitted successfully.');
                    this.close();
                    form.reset();
                    DriverUtils.emit('driver:data-breakdowns-changed');
                    return;
                }

                DriverUtils.showToast(response?.message || 'Failed to submit progress update.', 'error');
            } catch (error) {
                console.error('Failed to submit progress update:', error);
                DriverUtils.showToast('Failed to submit progress update. Please try again.', 'error');
            }
        });
    }

    open(payload) {
        const breakdown = payload?.breakdown || {};
        const routeBreakdownId = Number(breakdown.id || payload?.routeBreakdownId || 0);
        const routeBreakdownCode = breakdown.route_breakdown_id || (routeBreakdownId ? `RBD-${routeBreakdownId}` : '');

        const form = this.querySelector('#garageProgressForm');
        form.reset();

        this.querySelector('#garageProgressRouteBreakdownId').value = routeBreakdownId ? String(routeBreakdownId) : '';
        this.querySelector('#garageProgressBreakdownCode').value = routeBreakdownCode;

        DriverUtils.setModalState(this.querySelector('#garageProgressModal'), true);
    }

    close() {
        DriverUtils.setModalState(this.querySelector('#garageProgressModal'), false);
    }
}

customElements.define('driver-garage-progress-modal', DriverGarageProgressModal);
