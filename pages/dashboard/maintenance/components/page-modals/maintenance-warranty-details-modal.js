class MaintenanceWarrantyDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.warrantyData = this.buildWarrantyData();
        this.render();
        this.bindEvents();
    }

    buildWarrantyData() {
        return {
            'VH101-ENG': {
                equipment: 'Vehicle #101',
                component: 'Engine Block',
                purchaseDate: 'Dec 15, 2023',
                warrantyPeriod: '24 months',
                expiryDate: 'Dec 15, 2025',
                status: 'Active',
                supplier: 'Engine Corp Ltd',
                contactNumber: '+94-11-234-5678',
                claimHistory: 'No previous claims',
                termsConditions: 'Covers manufacturing defects, excludes wear and tear',
            },
            'MC205-HYD': {
                equipment: 'Machine #205',
                component: 'Hydraulic Pump',
                purchaseDate: 'Aug 10, 2023',
                warrantyPeriod: '24 months',
                expiryDate: 'Aug 10, 2025',
                status: 'Expired',
                supplier: 'Hydraulic Systems Inc',
                contactNumber: '+94-11-345-6789',
                claimHistory: '1 claim processed in July 2024',
                termsConditions: 'Covers pump failure, excludes seal replacements',
            },
            'VH089-BRK': {
                equipment: 'Vehicle #089',
                component: 'Brake System',
                purchaseDate: 'Sep 30, 2024',
                warrantyPeriod: '12 months',
                expiryDate: 'Sep 30, 2025',
                status: 'Expiring Soon',
                supplier: 'Brake Tech Solutions',
                contactNumber: '+94-11-456-7890',
                claimHistory: 'No claims',
                termsConditions: 'Covers brake components, excludes brake pads',
            },
        };
    }

    render() {
        this.innerHTML = `
            <div id="warrantyDetailsModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-action="close-modal">&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Warranty Details</h2>
                    <div id="warrantyDetailsContent"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'warrantyDetailsModal') {
                this.close();
            }
        });
    }

    emitToast(message, type = 'warning') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    openById(warrantyId) {
        const warranty = this.warrantyData[String(warrantyId || '')];
        if (!warranty) {
            this.emitToast(`Warranty ${warrantyId} not found.`, 'warning');
            return;
        }

        const detailsContainer = this.querySelector('#warrantyDetailsContent');
        if (detailsContainer) {
            detailsContainer.innerHTML = this.renderContent(warranty);
        }

        this.open();
    }

    open() {
        if (typeof window.openModal === 'function') {
            window.openModal('warrantyDetailsModal');
            return;
        }

        const modal = this.querySelector('#warrantyDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('warrantyDetailsModal');
            return;
        }

        const modal = this.querySelector('#warrantyDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
    }

    renderContent(warranty) {
        const statusClass = String(warranty.status || 'active').toLowerCase().replace(/\s+/g, '-');

        return `
            <div class="form-section">
                <h5><i class="fas fa-shield-alt"></i> Warranty Information</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><strong>Equipment:</strong> ${warranty.equipment}</div>
                    <div><strong>Component:</strong> ${warranty.component}</div>
                    <div><strong>Purchase Date:</strong> ${warranty.purchaseDate}</div>
                    <div><strong>Warranty Period:</strong> ${warranty.warrantyPeriod}</div>
                    <div><strong>Expiry Date:</strong> ${warranty.expiryDate}</div>
                    <div><strong>Status:</strong> <span class="status-badge warranty-${statusClass}">${warranty.status}</span></div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Supplier:</strong> ${warranty.supplier}<br>
                    <strong>Contact:</strong> ${warranty.contactNumber}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Claim History:</strong><br>
                    ${warranty.claimHistory}
                </div>
                <div>
                    <strong>Terms & Conditions:</strong><br>
                    ${warranty.termsConditions}
                </div>
            </div>
        `;
    }
}

customElements.define('maintenance-warranty-details-modal', MaintenanceWarrantyDetailsModal);
