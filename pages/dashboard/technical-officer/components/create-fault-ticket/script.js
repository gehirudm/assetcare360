const CREATE_FAULT_TICKET_BASE = new URL('./', document.currentScript ? document.currentScript.src : window.location.href);

class CreateFaultTicket extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            isOpen: false,
            loading: false,
            error: null,
            repairType: ''
        };

        this._onEscKey = this._onEscKey.bind(this);
        this._handleSubmit = this._handleSubmit.bind(this);
    }

    async connectedCallback() {
        if (this._initialized) return;

        const css = await this._loadStyles();
        this.shadowRoot.innerHTML = `
            <style>${css}</style>
            ${this.template()}
        `;

        this._cacheDom();
        this._bindEvents();
        this._initialized = true;
        this.render();

        window.addEventListener('keydown', this._onEscKey);
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._onEscKey);
    }

    async _loadStyles() {
        try {
            const response = await fetch(new URL('style.css', CREATE_FAULT_TICKET_BASE));
            if (!response.ok) {
                throw new Error(`Failed to load style.css (${response.status})`);
            }
            return await response.text();
        } catch (error) {
            console.error('Failed to load create-fault-ticket styles:', error);
            return ':host{display:block;margin-bottom:20px;}';
        }
    }

    template() {
        return `
            <button type="button" class="open-ticket-btn" id="openTicketBtn">Create New Repair Ticket</button>

            <div class="modal" id="createModal">
                <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="createTicketTitle">
                    <button type="button" class="close-btn" id="closeTicketBtn" aria-label="Close modal">&times;</button>
                    <h2 class="modal-title" id="createTicketTitle">Create New Repair Ticket</h2>

                    <form id="createRepairTicketForm">
                        <div class="form-section">
                            <h5>Asset Information</h5>

                            <div class="form-group">
                                <label class="form-label" for="assetType">Asset Type *</label>
                                <select class="form-input" id="assetType" required>
                                    <option value="">Select Asset Type</option>
                                    <option value="vehicle">Vehicle</option>
                                    <option value="machine">Machine</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="assetId">Asset ID / Registration *</label>
                                <input class="form-input" type="text" id="assetId" placeholder="e.g., LKA-1234 or Machine #205" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="assetName">Asset Name</label>
                                <input class="form-input" type="text" id="assetName" placeholder="e.g., Toyota Hilux, Excavator">
                            </div>
                        </div>

                        <div class="form-section">
                            <h5>Fault Details</h5>

                            <div class="form-group">
                                <label class="form-label" for="faultCategory">Fault Category *</label>
                                <select class="form-input" id="faultCategory" required>
                                    <option value="">Select Category</option>
                                    <option value="engine">Engine/Motor</option>
                                    <option value="transmission">Transmission</option>
                                    <option value="electrical">Electrical System</option>
                                    <option value="hydraulic">Hydraulic System</option>
                                    <option value="brake">Brake System</option>
                                    <option value="cooling">Cooling System</option>
                                    <option value="fuel">Fuel System</option>
                                    <option value="suspension">Suspension</option>
                                    <option value="body">Body/Structure</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="faultDescription">Fault Description *</label>
                                <textarea class="form-textarea" id="faultDescription" rows="4" placeholder="Describe the fault/issue in detail..." required></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="reportedBy">Reported By</label>
                                <input class="form-input" type="text" id="reportedBy" placeholder="Driver/Operator name">
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="repairPriority">Priority *</label>
                                <select class="form-input" id="repairPriority" required>
                                    <option value="high">High - Urgent</option>
                                    <option value="medium" selected>Medium - Normal</option>
                                    <option value="low">Low - Non-urgent</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <h5>Repair Management</h5>

                            <div class="form-group">
                                <label class="form-label" for="repairType">Repair Type *</label>
                                <select class="form-input" id="repairType" required>
                                    <option value="">Select Repair Type</option>
                                    <option value="internal">Resolve by Me (Internal Repair)</option>
                                    <option value="outsourced">Outsource to External Service</option>
                                </select>
                            </div>

                            <div id="internalRepairFields" class="hidden">
                                <div class="form-group">
                                    <label class="form-label" for="estimatedCompletion">Estimated Completion Time</label>
                                    <input class="form-input" type="datetime-local" id="estimatedCompletion">
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="requiredParts">Required Parts (if known)</label>
                                    <textarea class="form-textarea" id="requiredParts" rows="3" placeholder="List any parts that will be needed..."></textarea>
                                </div>
                            </div>

                            <div id="outsourcedRepairFields" class="hidden">
                                <div class="form-group">
                                    <label class="form-label" for="serviceProvider">Service Provider Name</label>
                                    <input class="form-input" type="text" id="serviceProvider" placeholder="Garage/Workshop name">
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="serviceContact">Service Provider Contact</label>
                                    <input class="form-input" type="text" id="serviceContact" placeholder="Contact number">
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="serviceAddress">Service Provider Address</label>
                                    <textarea class="form-textarea" id="serviceAddress" rows="2" placeholder="Complete address..."></textarea>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="estimatedCost">Estimated Cost (LKR)</label>
                                    <input class="form-input" type="number" id="estimatedCost" step="100" placeholder="Estimated repair cost">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="additionalNotes">Additional Notes</label>
                                <textarea class="form-textarea" id="additionalNotes" rows="3" placeholder="Any additional information..."></textarea>
                            </div>
                        </div>

                        <div class="form-error" id="formError"></div>
                        <button type="submit" class="submit-btn" id="submitBtn">Create Ticket & Send to Supervisor</button>
                    </form>
                </div>
            </div>
        `;
    }

    _cacheDom() {
        this._openBtn = this.shadowRoot.getElementById('openTicketBtn');
        this._closeBtn = this.shadowRoot.getElementById('closeTicketBtn');
        this._modal = this.shadowRoot.getElementById('createModal');
        this._form = this.shadowRoot.getElementById('createRepairTicketForm');
        this._repairType = this.shadowRoot.getElementById('repairType');
        this._internalFields = this.shadowRoot.getElementById('internalRepairFields');
        this._outsourcedFields = this.shadowRoot.getElementById('outsourcedRepairFields');
        this._serviceProvider = this.shadowRoot.getElementById('serviceProvider');
        this._submitBtn = this.shadowRoot.getElementById('submitBtn');
        this._formError = this.shadowRoot.getElementById('formError');
    }

    _bindEvents() {
        this._openBtn.addEventListener('click', () => this.open());
        this._closeBtn.addEventListener('click', () => this.close());

        this._modal.addEventListener('click', (event) => {
            if (event.target === this._modal) {
                this.close();
            }
        });

        this._repairType.addEventListener('change', (event) => {
            this.setState({ repairType: event.target.value });
        });

        this._form.addEventListener('submit', this._handleSubmit);
    }

    _onEscKey(event) {
        if (event.key === 'Escape' && this.state.isOpen) {
            this.close();
        }
    }

    open() {
        this.setState({ isOpen: true, error: null });
    }

    close() {
        this.setState({ isOpen: false, loading: false, error: null });
    }

    setState(partial) {
        this.state = { ...this.state, ...partial };
        this.render();
    }

    render() {
        if (!this._initialized) return;

        this._modal.classList.toggle('active', this.state.isOpen);

        const isInternal = this.state.repairType === 'internal';
        const isOutsourced = this.state.repairType === 'outsourced';

        this._internalFields.classList.toggle('hidden', !isInternal);
        this._outsourcedFields.classList.toggle('hidden', !isOutsourced);

        this._serviceProvider.required = isOutsourced;

        this._submitBtn.disabled = this.state.loading;
        this._submitBtn.textContent = this.state.loading
            ? 'Creating Ticket...'
            : 'Create Ticket & Send to Supervisor';

        if (this.state.error) {
            this._formError.style.display = 'block';
            this._formError.textContent = this.state.error;
        } else {
            this._formError.style.display = 'none';
            this._formError.textContent = '';
        }
    }

    async _handleSubmit(event) {
        event.preventDefault();

        if (!this._form.checkValidity()) {
            this._form.reportValidity();
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            const assetType = this.shadowRoot.getElementById('assetType').value;
            const assetId = this.shadowRoot.getElementById('assetId').value;
            const assetName = this.shadowRoot.getElementById('assetName').value;
            const faultCategory = this.shadowRoot.getElementById('faultCategory').value;
            const faultDescription = this.shadowRoot.getElementById('faultDescription').value;
            const reportedBy = this.shadowRoot.getElementById('reportedBy').value;
            const priority = this.shadowRoot.getElementById('repairPriority').value;
            const repairType = this.shadowRoot.getElementById('repairType').value;

            const ticketId = 'MBD-' + String(Math.floor(Math.random() * 900) + 100);

            const ticketData = {
                ticketId,
                assetType,
                assetId,
                assetName,
                faultCategory,
                faultDescription,
                reportedBy,
                priority,
                repairType,
                createdBy: 'Technical Officer',
                status: 'pending-supervisor-approval',
                createdDate: new Date().toISOString()
            };

            if (repairType === 'internal') {
                ticketData.estimatedCompletion = this.shadowRoot.getElementById('estimatedCompletion').value;
                ticketData.requiredParts = this.shadowRoot.getElementById('requiredParts').value;
            } else if (repairType === 'outsourced') {
                ticketData.serviceProvider = this.shadowRoot.getElementById('serviceProvider').value;
                ticketData.serviceContact = this.shadowRoot.getElementById('serviceContact').value;
                ticketData.serviceAddress = this.shadowRoot.getElementById('serviceAddress').value;
                ticketData.estimatedCost = this.shadowRoot.getElementById('estimatedCost').value;
            }

            ticketData.additionalNotes = this.shadowRoot.getElementById('additionalNotes').value;

            const repairTypeText = repairType === 'internal'
                ? 'Internal Repair (To be resolved by you)'
                : 'Outsourced Repair';

            const successMessage = `Repair Ticket ${ticketId} created successfully!\nType: ${repairTypeText}\nAsset: ${assetId}\nSent to supervisor for approval and management.`;

            this.dispatchEvent(new CustomEvent('create-fault-ticket-created', {
                detail: { ticketData, successMessage },
                bubbles: true,
                composed: true
            }));

            this._form.reset();
            this.setState({
                isOpen: false,
                loading: false,
                error: null,
                repairType: ''
            });
        } catch (error) {
            console.error('Failed to create repair ticket:', error);
            this.setState({
                loading: false,
                error: 'Failed to create repair ticket. Please try again.'
            });
        }
    }
}

if (!customElements.get('create-fault-ticket')) {
    customElements.define('create-fault-ticket', CreateFaultTicket);
}
