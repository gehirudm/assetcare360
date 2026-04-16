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
                    <div class="modal-header">
                        <h4><i class="fas fa-ticket-alt"></i> Ticket Details</h4>
                        <button class="btn-close" type="button" data-action="close-modal">&times;</button>
                    </div>
                    <div style="padding: 30px;">
                    <div id="ticketDetailsContent"></div>
                    </div>
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

    openWithBreakdown(breakdown) {
        if (!breakdown) {
            this.emitToast('Breakdown data unavailable.', 'warning');
            return;
        }

        const content = this.querySelector('#ticketDetailsContent');
        if (content) {
            content.innerHTML = this.renderBreakdownContent(breakdown);
        }

        this.open();
    }

    renderBreakdownContent(b) {
        const statusInfo = this._getStatusInfo(b.effectiveStatus);
        const severityCls = 'status-' + String(b.severity || 'medium').toLowerCase();
        const assignedTo = b.assignments && b.assignments.length
            ? b.assignments.map(a => a.technician_name).filter(Boolean).join(', ')
            : 'Unassigned';
        const dateLabel = b._source === 'route' ? 'Reported' : 'Created';
        const formattedDate = b.date ? new Date(b.date).toLocaleString() : 'N/A';
        const sourceLabel = b._source === 'route' ? 'Route Breakdown' : 'Machine Breakdown';

        return `
            <div class="form-section">
                <h5><i class="fas fa-exclamation-triangle"></i> ${sourceLabel}</h5>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
                    <div><strong>Report ID:</strong> ${b.breakdownId || '#' + b._id}</div>
                    <div><strong>${b._source === 'route' ? 'Vehicle' : 'Machine'}:</strong> ${b.identifier}</div>
                    <div><strong>Reported By:</strong> ${b.reportedBy} (${b.reporterType})</div>
                    <div><strong>Type:</strong> ${b.type}</div>
                    <div><strong>Severity:</strong> <span class="status-badge ${severityCls}">${String(b.severity || 'Medium').toUpperCase()}</span></div>
                    <div><strong>Status:</strong> <span class="status-badge ${statusInfo.cls}">${statusInfo.label}</span></div>
                    ${b.ticketNumber ? `<div><strong>Fault Ticket:</strong> ${b.ticketNumber}</div>` : ''}
                    <div><strong>Assigned To:</strong> ${assignedTo}</div>
                    <div><strong>${dateLabel}:</strong> ${formattedDate}</div>
                </div>
                <div style="margin-bottom:15px;">
                    <strong>Description:</strong><br>
                    ${b.description || 'No description provided.'}
                </div>
                ${b._raw && b._raw.breakdown_location ? `<div style="margin-bottom:15px;"><strong>Location:</strong> ${b._raw.breakdown_location}</div>` : ''}
                ${b._raw && b._raw.resolution_notes ? `<div style="margin-bottom:15px;"><strong>Resolution Notes:</strong><br>${b._raw.resolution_notes}</div>` : ''}
            </div>
        `;
    }

    _getStatusInfo(status) {
        const map = {
            Open:     { label: 'Pending',          cls: 'status-pending' },
            Pending:  { label: 'Pending',          cls: 'status-pending' },
            Assigned: { label: 'Assigned',         cls: 'status-assigned' },
            'Waiting for Spare Parts':     { label: 'Awaiting Parts',    cls: 'status-waiting-for-spare-parts' },
            'Waiting for Budget Approval': { label: 'Awaiting Approval', cls: 'status-waiting-for-budget-approval' },
            'Parts Approved':              { label: 'Parts Approved',    cls: 'status-parts-approved' },
            'In Progress': { label: 'In Progress', cls: 'status-in-progress' },
            Resolved:      { label: 'Resolved',    cls: 'status-resolved' },
            Closed:        { label: 'Closed',      cls: 'status-closed' },
        };

        return map[status] || { label: status || 'Pending', cls: 'status-pending' };
    }

    openWithTicket(ticket) {
        if (!ticket) {
            this.emitToast('Ticket data unavailable.', 'warning');
            return;
        }

        const content = this.querySelector('#ticketDetailsContent');
        if (content) {
            content.innerHTML = this.renderLiveContent(ticket);
        }

        this.open();
    }

    renderLiveContent(ticket) {
        const statusClass = String(ticket.status || 'open').toLowerCase().replace(/\s+/g, '-');
        const assignedTo = Array.isArray(ticket.assignments) && ticket.assignments.length
            ? ticket.assignments.map(a => a.technician_name).filter(Boolean).join(', ')
            : 'Unassigned';
        const createdAt = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A';

        return `
            <div class="form-section">
                <h5><i class="fas fa-ticket-alt"></i> Ticket Information</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><strong>Ticket ID:</strong> ${ticket.ticket_id || ticket.id}</div>
                    <div><strong>Equipment:</strong> ${ticket.machine_name || 'N/A'}</div>
                    <div><strong>Reporter:</strong> ${ticket.reporter_full_name || 'N/A'} (${ticket.reporter_role || 'N/A'})</div>
                    <div><strong>Assigned To:</strong> ${assignedTo}</div>
                    <div><strong>Priority:</strong> ${ticket.priority || 'N/A'}</div>
                    <div><strong>Status:</strong> <span class="status-badge status-${statusClass}">${ticket.status || 'N/A'}</span></div>
                    <div><strong>Location:</strong> ${ticket.location || 'N/A'}</div>
                    <div><strong>Created:</strong> ${createdAt}</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Issue Description:</strong><br>
                    ${ticket.description || 'No description provided.'}
                </div>
                ${ticket.resolution_notes ? `<div style="margin-bottom: 15px;"><strong>Resolution Notes:</strong><br>${ticket.resolution_notes}</div>` : ''}
            </div>
        `;
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
