class MaintenanceTicketDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.ticketData = this.buildTicketData();
        this.render();
        this.bindEvents();
    }

    buildTicketData() {
        return {
            'TKT-001': {
                id: 'TKT-001',
                equipment: 'Vehicle #101',
                issue: 'Engine overheating',
                reporter: 'John Driver',
                supervisor: 'Supervisor John',
                assignedTo: 'Technical Officer A',
                status: 'In Progress',
                costEstimate: 'LKR 45,000',
                description: 'Engine temperature exceeding normal range during operations. Thermostat and cooling system suspected. Requires complete cooling system inspection and potential engine overhaul.',
                timeline: 'Started: Aug 20, 09:00 AM<br>Expected Completion: Aug 25, 17:00 PM<br>Current Status: Parts ordered, repair in progress',
                partsUsed: 'Thermostat, Coolant, Radiator Hose (Ordered)',
                priority: 'High',
                location: 'Workshop Bay 2',
            },
            'TKT-002': {
                id: 'TKT-002',
                equipment: 'Machine #205',
                issue: 'Hydraulic leak',
                reporter: 'Mike Operator',
                supervisor: 'Supervisor Mike',
                assignedTo: 'Awaiting Assignment',
                status: 'Pending',
                costEstimate: 'LKR 32,000',
                description: 'Hydraulic fluid leaking from main pump assembly. Affecting machine operation efficiency and creating safety hazard.',
                timeline: 'Reported: Aug 22, 14:30 PM<br>Assignment: Pending resource availability<br>Estimated Start: Aug 25, 2025',
                partsUsed: 'Assessment pending',
                priority: 'Medium',
                location: 'Field Site A',
            },
            'TKT-003': {
                id: 'TKT-003',
                equipment: 'Vehicle #089',
                issue: 'Brake failure',
                reporter: 'Sarah Driver',
                supervisor: 'Supervisor John',
                assignedTo: 'Technical Officer B',
                status: 'Completed',
                costEstimate: 'LKR 15,000',
                description: 'Complete brake system failure during operation. Emergency repair completed with full brake system replacement.',
                timeline: 'Completed: Aug 19, 11:00 AM<br>Duration: 21 hours<br>Emergency Priority',
                partsUsed: 'Brake pads, Brake fluid, Brake discs, Master cylinder',
                priority: 'Critical',
                location: 'Workshop Bay 1',
            },
            'TKT-004': {
                id: 'TKT-004',
                equipment: 'Machine #180',
                issue: 'Engine smoke',
                reporter: 'Tom Operator',
                supervisor: 'Supervisor Mike',
                assignedTo: 'Technical Officer C',
                status: 'In Progress',
                costEstimate: 'LKR 25,000',
                description: 'Black smoke emitting from exhaust during operation. Possible engine oil burning or air filter issues.',
                timeline: 'Started: Aug 23, 10:00 AM<br>Expected Completion: Aug 26, 16:00 PM<br>Diagnosis in progress',
                partsUsed: 'Air filter, Engine oil (Ordered)',
                priority: 'Medium',
                location: 'Field Site B',
            },
        };
    }

    render() {
        this.innerHTML = `
            <div id="ticketDetailsModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <button class="close" type="button" data-action="close-modal">&times;</button>
                    <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Ticket Details</h2>
                    <div id="ticketDetailsContent"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="close-modal"]') || event.target.id === 'ticketDetailsModal') {
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

    openById(ticketId) {
        const ticket = this.ticketData[String(ticketId || '')];
        if (!ticket) {
            this.emitToast(`Ticket ${ticketId} not found.`, 'warning');
            return;
        }

        const detailsContainer = this.querySelector('#ticketDetailsContent');
        if (detailsContainer) {
            detailsContainer.innerHTML = this.renderContent(ticket);
        }

        this.open();
    }

    open() {
        if (typeof window.openModal === 'function') {
            window.openModal('ticketDetailsModal');
            return;
        }

        const modal = this.querySelector('#ticketDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.add('active');
    }

    close() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('ticketDetailsModal');
            return;
        }

        const modal = this.querySelector('#ticketDetailsModal');
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
    }

    renderContent(ticket) {
        const statusClass = String(ticket.status || 'pending').toLowerCase().replace(/\s+/g, '-');

        return `
            <div class="form-section">
                <h5><i class="fas fa-ticket-alt"></i> Ticket Information</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><strong>Ticket ID:</strong> ${ticket.id}</div>
                    <div><strong>Equipment:</strong> ${ticket.equipment}</div>
                    <div><strong>Reporter:</strong> ${ticket.reporter}</div>
                    <div><strong>Supervisor:</strong> ${ticket.supervisor}</div>
                    <div><strong>Assigned To:</strong> ${ticket.assignedTo}</div>
                    <div><strong>Priority:</strong> ${ticket.priority}</div>
                    <div><strong>Status:</strong> <span class="status-badge status-${statusClass}">${ticket.status}</span></div>
                    <div><strong>Cost Estimate:</strong> ${ticket.costEstimate}</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Issue Description:</strong><br>
                    ${ticket.description}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Timeline:</strong><br>
                    ${ticket.timeline}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Location:</strong> ${ticket.location}
                </div>
                <div>
                    <strong>Parts Used:</strong><br>
                    ${ticket.partsUsed}
                </div>
            </div>
        `;
    }
}

customElements.define('maintenance-ticket-details-modal', MaintenanceTicketDetailsModal);
