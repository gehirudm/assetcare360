class SADetailsModal extends HTMLElement {
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
            <div id="detailsModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="detailsTitle"><i class="fas fa-user"></i> Details</h2>
                        <button class="btn-close" type="button" data-close-modal>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="detailsContent" style="padding: 30px;">
                        <!-- Content will be populated dynamically -->
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#detailsModal');

        this.addEventListener('click', (event) => {
            if (event.target === modal || event.target.closest('[data-close-modal]')) {
                this.close();
            }
        });
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('detailsModal');
            return;
        }

        const modal = this.querySelector('#detailsModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

customElements.define('sa-details-modal', SADetailsModal);
