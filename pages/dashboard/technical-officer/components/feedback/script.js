class TOFeedback extends HTMLElement {
    constructor() {
        super();
        this._onRootClick = this._onRootClick.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this.addEventListener('submit', this._onSubmit);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        this.removeEventListener('submit', this._onSubmit);
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Asset Feedback</h1>
                <p class="page-subtitle">Submit feedback post-repair (shared with Supervisor & MM)</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button type="button" class="btn btn-primary" data-open-feedback-modal>
                    Submit Asset Feedback
                </button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-file-alt"></i> Recent Feedback Submissions</div>
                <div class="request-item">
                    <div class="ticket-details">
                        <strong>FB-001</strong>
                        <div class="ticket-meta">Equipment: Vehicle #101 | Component: Engine System</div>
                        <div class="ticket-issue">Post-repair assessment: Good performance, minor temperature variations</div>
                        <div class="ticket-meta">Shared with: Supervisor & Maintenance Manager</div>
                    </div>
                    <div class="ticket-actions">
                        <span class="status-badge status-complete">Submitted</span>
                        <small style="color: var(--muted);">Aug 22</small>
                    </div>
                </div>
            </div>

            <div data-feedback-modal class="modal">
                <div class="modal-content">
                    <button type="button" class="close" data-close-feedback-modal>&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Submit Asset Feedback</h2>
                    <form id="toFeedbackForm">
                        <div class="form-section">
                            <h5><i class="fas fa-comments"></i> Asset Performance Feedback</h5>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Equipment ID</label>
                                    <input type="text" class="form-input" placeholder="Enter equipment identifier" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Component/System</label>
                                    <select class="form-select" required>
                                        <option value="">Select Component</option>
                                        <option value="engine">Engine System</option>
                                        <option value="transmission">Transmission</option>
                                        <option value="hydraulics">Hydraulic System</option>
                                        <option value="brakes">Brake System</option>
                                        <option value="electrical">Electrical System</option>
                                        <option value="cooling">Cooling System</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Feedback Type</label>
                                <select class="form-select" required>
                                    <option value="">Select Type</option>
                                    <option value="post-repair">Post-Repair Assessment</option>
                                    <option value="preventive">Preventive Observation</option>
                                    <option value="performance">Performance Review</option>
                                    <option value="recommendation">Maintenance Recommendation</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Detailed Feedback</label>
                                <textarea class="form-textarea" placeholder="Provide detailed feedback about asset performance..." required></textarea>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Submit Feedback</button>
                    </form>
                </div>
            </div>
        `;
    }

    _onRootClick(event) {
        const openButton = event.target.closest('[data-open-feedback-modal]');
        if (openButton) {
            this.openModal();
            return;
        }

        const closeButton = event.target.closest('[data-close-feedback-modal]');
        if (closeButton) {
            this.closeModal();
            return;
        }

        const modal = this.querySelector('[data-feedback-modal]');
        if (modal && event.target === modal) {
            this.closeModal();
        }
    }

    _onSubmit(event) {
        if (event.target.id !== 'toFeedbackForm') return;

        event.preventDefault();
        event.target.reset();
        this.closeModal();

        this.dispatchEvent(new CustomEvent('technical-officer-feedback:submitted', {
            bubbles: true,
            detail: {
                message: 'Feedback submitted successfully! Shared with Supervisor & Maintenance Manager.'
            }
        }));
    }

    openModal() {
        const modal = this.querySelector('[data-feedback-modal]');
        if (!modal) return;
        modal.classList.add('active');
    }

    closeModal() {
        const modal = this.querySelector('[data-feedback-modal]');
        if (!modal) return;
        modal.classList.remove('active');
    }
}

if (!customElements.get('to-feedback')) {
    customElements.define('to-feedback', TOFeedback);
}
