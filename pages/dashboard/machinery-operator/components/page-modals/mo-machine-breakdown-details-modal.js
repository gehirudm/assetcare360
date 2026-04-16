class MOMachineBreakdownDetailsModal extends HTMLElement {
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
            <div id="machineBreakdownModal" class="modal" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-info-circle"></i> Machine Breakdown Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="machineBreakdownDetailsContent"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target.id === 'machineBreakdownModal' || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
            }
        });
    }

    async open(breakdownId) {
        if (!breakdownId || typeof API === 'undefined') {
            return;
        }

        const content = this.querySelector('#machineBreakdownDetailsContent');
        if (!content) {
            return;
        }

        content.innerHTML = '<div style="padding: 20px; text-align:center; color: var(--stone-500);">Loading breakdown details...</div>';
        this.querySelector('#machineBreakdownModal')?.classList.add('active');

        try {
            const response = await API.get(`/machine-breakdowns/${breakdownId}`);
            if (response?.status !== 'success' || !response.data) {
                content.innerHTML = '<div style="padding: 20px; color: var(--danger);">Failed to load breakdown details.</div>';
                return;
            }

            const breakdown = response.data;
            const workflowDetails = await this.fetchWorkflowDetails(breakdown);
            const context = this.buildWorkflowContext(breakdown, workflowDetails);
            content.innerHTML = this.renderDetails(context);
        } catch (error) {
            console.error('Error loading breakdown details:', error);
            content.innerHTML = '<div style="padding: 20px; color: var(--danger);">Error loading breakdown details.</div>';
        }
    }

    async fetchWorkflowDetails(breakdown) {
        const details = {
            ticket: null,
            budgetReports: [],
            spareRequests: [],
        };

        const ticketId = Number.parseInt(breakdown?.fault_ticket_id, 10);
        if (!ticketId) {
            return details;
        }

        const [ticketResult, budgetResult, spareResult] = await Promise.allSettled([
            API.get(`/fault-tickets/${ticketId}`),
            API.get(`/budget-reports/ticket/${ticketId}`),
            API.get(`/spare-part-requests/ticket/${ticketId}`),
        ]);

        if (ticketResult.status === 'fulfilled' && ticketResult.value?.status === 'success') {
            const ticketPayload = ticketResult.value.data;
            if (ticketPayload && typeof ticketPayload === 'object') {
                details.ticket = ticketPayload;
            }
        }

        if (budgetResult.status === 'fulfilled' && budgetResult.value?.status === 'success') {
            const budgetPayload = budgetResult.value.data;
            const reports = Array.isArray(budgetPayload?.reports)
                ? budgetPayload.reports
                : (Array.isArray(budgetPayload) ? budgetPayload : []);
            details.budgetReports = this.sortByDateDesc(reports, ['created_at', 'updated_at', 'reviewed_at']);
        }

        if (spareResult.status === 'fulfilled' && spareResult.value?.status === 'success') {
            const sparePayload = spareResult.value.data;
            const requests = Array.isArray(sparePayload)
                ? sparePayload
                : (Array.isArray(sparePayload?.requests) ? sparePayload.requests : []);
            details.spareRequests = this.sortByDateDesc(requests, ['created_at', 'updated_at', 'reviewed_at']);
        }

        return details;
    }

    buildWorkflowContext(breakdown, workflowDetails) {
        const ticket = workflowDetails.ticket;
        const ticketStatus = ticket?.status || breakdown.ticket_status || breakdown.status || 'Pending';
        const ticketId = ticket?.id || breakdown.fault_ticket_id || null;

        const assignmentsFromTicket = Array.isArray(ticket?.assignments) ? ticket.assignments : [];
        const assignmentsFromBreakdown = Array.isArray(breakdown.assignments) ? breakdown.assignments : [];
        const assignments = assignmentsFromTicket.length ? assignmentsFromTicket : assignmentsFromBreakdown;

        const workUpdatesFromTicket = Array.isArray(ticket?.work_updates) ? ticket.work_updates : [];
        const workUpdatesFromBreakdown = Array.isArray(breakdown.work_updates) ? breakdown.work_updates : [];
        const workUpdatesSource = workUpdatesFromTicket.length ? workUpdatesFromTicket : workUpdatesFromBreakdown;
        const workUpdates = this.sortByDateDesc(workUpdatesSource, ['created_at', 'updated_at']);

        const budgetReports = Array.isArray(workflowDetails.budgetReports) ? workflowDetails.budgetReports : [];
        const spareRequests = Array.isArray(workflowDetails.spareRequests) ? workflowDetails.spareRequests : [];

        return {
            breakdown,
            ticket,
            ticketId,
            ticketStatus,
            normalizedTicketStatus: this.normalizeStatus(ticketStatus),
            assignments,
            workUpdates,
            budgetReports,
            latestBudget: budgetReports[0] || null,
            spareRequests,
            latestSpareRequest: spareRequests[0] || null,
            resolutionNotes: ticket?.resolution_notes || breakdown.resolution_notes || null,
            resolvedAt: ticket?.resolved_at || breakdown.resolved_at || null,
            createdAt: ticket?.created_at || null,
        };
    }

    renderDetails(context) {
        const breakdown = context.breakdown;
        const assignmentsHtml = context.assignments.length
            ? `
                <div class="form-section">
                    <h5><i class="fas fa-user-cog"></i> Assigned Technicians</h5>
                    ${context.assignments.map((item) => {
                        const assignedDate = item.assigned_at || item.assigned_date || item.created_at;
                        return `<p><strong>${this.escapeHtml(item.technician_name || 'Technician')}</strong> - Assigned: ${this.escapeHtml(this.formatDate(assignedDate))}</p>`;
                    }).join('')}
                </div>
            `
            : '';

        const workUpdatesHtml = context.workUpdates.length
            ? `
                <div class="form-section">
                    <h5><i class="fas fa-check-circle" style="color: #27ae60;"></i> Work Update Details</h5>
                    ${context.workUpdates.map((update) => `
                        <div style="padding: 15px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #27ae60; margin-bottom: 10px;">
                            <p style="margin: 0 0 8px 0; font-weight: 600; color: #27ae60;"><i class="fas fa-user-cog"></i> ${this.escapeHtml(update.technician_name || 'Technical Officer')}</p>
                            <p style="margin: 0 0 8px 0; color: #333;"><strong>Work Description:</strong> ${this.escapeHtml(update.machine_description || 'N/A')}</p>
                            <p style="margin: 0 0 8px 0; color: #333;"><strong>Parts Used:</strong> ${this.escapeHtml(update.parts_used || 'None')}</p>
                            <p style="margin: 0 0 8px 0; color: #333;"><strong>Time Spent:</strong> ${this.escapeHtml(update.time_spent ? `${update.time_spent} hours` : 'N/A')}</p>
                            <p style="margin: 0; color: #666; font-size: 0.9em;"><i class="fas fa-calendar-check"></i> Updated: ${this.escapeHtml(this.formatDate(update.created_at))}</p>
                        </div>
                    `).join('')}
                </div>
            `
            : '';

        return `
            ${this.renderWorkflowFlow(context)}

            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Breakdown Information</h5>
                <p><strong>Breakdown ID:</strong> ${this.escapeHtml(breakdown.breakdown_id || 'N/A')}</p>
                <p><strong>Date:</strong> ${this.escapeHtml(this.formatDate(breakdown.breakdown_date || breakdown.created_at))}</p>
                <p><strong>Status:</strong> ${this.escapeHtml(context.ticketStatus || breakdown.status || 'Pending')}</p>
                <p><strong>Severity:</strong> ${this.escapeHtml(breakdown.severity || 'N/A')}</p>
                <p><strong>Breakdown Type:</strong> ${this.escapeHtml(breakdown.breakdown_type || 'General Fault')}</p>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-cogs"></i> Machine Information</h5>
                <p><strong>Machine:</strong> ${this.escapeHtml(breakdown.machine_model || breakdown.machine_name || `Machine #${breakdown.machine_id}`)}</p>
                ${breakdown.serial_number ? `<p><strong>Serial Number:</strong> ${this.escapeHtml(breakdown.serial_number)}</p>` : ''}
                <p><strong>Operator:</strong> ${this.escapeHtml(breakdown.operator_name || 'N/A')}</p>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-file-alt"></i> Description</h5>
                <p>${this.escapeHtml(breakdown.description || 'No description provided')}</p>
            </div>

            ${breakdown.fault_ticket_number ? `
                <div class="form-section">
                    <h5><i class="fas fa-ticket-alt"></i> Fault Ticket</h5>
                    <p><strong>Ticket Number:</strong> ${this.escapeHtml(breakdown.fault_ticket_number)}</p>
                    <p><strong>Current Status:</strong> ${this.escapeHtml(context.ticketStatus || 'Pending')}</p>
                </div>
            ` : ''}

            ${assignmentsHtml}
            ${workUpdatesHtml}

            <button class="btn btn-secondary" type="button" data-action="close-modal">
                <i class="fas fa-times"></i> Close
            </button>
        `;
    }

    renderWorkflowFlow(context) {
        const steps = this.getFlowSteps(context);

        return `
            <div class="form-section mo-flow-section">
                <h5><i class="fas fa-project-diagram"></i> Ticket Resolution Flow</h5>
                <div class="mo-ticket-flow">
                    ${steps.map((step, index) => this.renderFlowStep(step, index === steps.length - 1)).join('')}
                </div>
            </div>
        `;
    }

    getFlowSteps(context) {
        const hasTicket = Boolean(context.ticketId || context.breakdown.fault_ticket_number);
        const status = context.normalizedTicketStatus;
        const hasAssignments = context.assignments.length > 0;
        const hasWorkUpdates = context.workUpdates.length > 0;
        const latestWorkUpdate = context.workUpdates[0] || null;

        const latestBudget = context.latestBudget;
        const budgetStatus = this.normalizeStatus(latestBudget?.status);
        const previousRejectedBudget = context.budgetReports.find((report) => this.normalizeStatus(report.status) === 'rejected');

        const latestSpareRequest = context.latestSpareRequest;
        const spareStatus = this.normalizeStatus(latestSpareRequest?.status);
        const previousRejectedSpareRequest = context.spareRequests.find((request) => this.normalizeStatus(request.status) === 'rejected');

        const reportedStep = {
            title: 'Breakdown Reported',
            state: 'completed',
            icon: 'fa-exclamation-triangle',
            date: context.breakdown.breakdown_date || context.breakdown.created_at,
            details: [
                `Report ID: ${context.breakdown.breakdown_id || 'N/A'}`,
                `Fault Type: ${context.breakdown.breakdown_type || 'General Fault'}`,
                `Severity: ${String(context.breakdown.severity || 'Medium').toUpperCase()}`,
            ],
        };

        const ticketStep = {
            title: 'Fault Ticket Created',
            state: hasTicket ? 'completed' : 'pending',
            icon: 'fa-ticket-alt',
            date: context.createdAt,
            details: hasTicket
                ? [
                    `Ticket Number: ${context.breakdown.fault_ticket_number || context.ticket?.ticket_id || 'Generated'}`,
                    `Current Ticket Status: ${context.ticketStatus || 'Pending'}`,
                ]
                : ['Waiting for supervisor to create fault ticket'],
        };

        let assignmentState = 'pending';
        if (hasTicket && hasAssignments) {
            assignmentState = 'completed';
        } else if (hasTicket && ['assigned', 'waiting for budget approval', 'waiting for spare parts', 'parts approved', 'parts rejected', 'in progress', 'resolved', 'closed'].includes(status)) {
            assignmentState = 'active';
        }

        const assignmentStep = {
            title: 'Technician Assignment',
            state: assignmentState,
            icon: 'fa-user-cog',
            date: hasAssignments ? (context.assignments[0].assigned_at || context.assignments[0].assigned_date || context.assignments[0].created_at) : null,
            details: hasAssignments
                ? [
                    `Assigned To: ${context.assignments.map((item) => item.technician_name || 'Technician').join(', ')}`,
                ]
                : ['No active technician assignment yet'],
        };

        let budgetState = 'pending';
        const budgetDetails = [];
        if (!hasTicket) {
            budgetDetails.push('Budget phase starts after ticket creation');
        } else if (latestBudget) {
            budgetDetails.push(`Budget ID: #${latestBudget.id}`);
            budgetDetails.push(`Amount: ${this.formatCurrency(latestBudget.total_amount)}`);
            budgetDetails.push(`Status: ${String(latestBudget.status || 'pending').toUpperCase()}`);
            if (latestBudget.submitted_by_name) {
                budgetDetails.push(`Submitted By: ${latestBudget.submitted_by_name}`);
            }
            if (latestBudget.reviewed_by_name) {
                budgetDetails.push(`Reviewed By: ${latestBudget.reviewed_by_name}`);
            }
            if (latestBudget.review_notes) {
                budgetDetails.push(`Review Notes: ${latestBudget.review_notes}`);
            }

            if (budgetStatus === 'rejected') {
                budgetState = 'rejected';
            } else if (budgetStatus === 'approved') {
                budgetState = 'completed';
            } else if (budgetStatus === 'pending' || budgetStatus === 'revised') {
                budgetState = 'active';
            } else {
                budgetState = 'active';
            }
        } else if (['waiting for spare parts', 'parts approved', 'parts rejected', 'in progress', 'resolved', 'closed'].includes(status)) {
            budgetState = 'completed';
            budgetDetails.push('Budget stage was completed or not required for this flow.');
        } else {
            budgetDetails.push('Budget report has not been submitted yet.');
        }

        if (previousRejectedBudget && latestBudget && this.normalizeStatus(latestBudget.status) !== 'rejected') {
            budgetDetails.push(`Earlier Rejection: ${previousRejectedBudget.review_notes || 'A previous budget submission was rejected.'}`);
        }

        const budgetStep = {
            title: 'Budget Review',
            state: budgetState,
            icon: 'fa-file-invoice-dollar',
            date: latestBudget ? (latestBudget.reviewed_at || latestBudget.updated_at || latestBudget.created_at) : null,
            details: budgetDetails,
        };

        let spareState = 'pending';
        const spareDetails = [];
        if (!hasTicket) {
            spareDetails.push('Spare parts review starts after ticket creation');
        } else if (latestSpareRequest) {
            spareDetails.push(`Request ID: ${latestSpareRequest.request_id || `#${latestSpareRequest.id}`}`);
            spareDetails.push(`Status: ${String(latestSpareRequest.status || 'Pending').toUpperCase()}`);
            if (latestSpareRequest.review_notes) {
                spareDetails.push(`Review Notes: ${latestSpareRequest.review_notes}`);
            }
            if (latestSpareRequest.reviewed_by_name) {
                spareDetails.push(`Reviewed By: ${latestSpareRequest.reviewed_by_name}`);
            }

            const items = Array.isArray(latestSpareRequest.items)
                ? latestSpareRequest.items
                : [];
            if (items.length) {
                spareDetails.push(`Items: ${items.map((item) => `${item.part_code || item.part_name || 'PART'} x${item.quantity || 0}`).join(', ')}`);
            }

            if (spareStatus === 'rejected' || status === 'parts rejected') {
                spareState = 'rejected';
            } else if (spareStatus === 'approved' || spareStatus === 'issued' || status === 'parts approved') {
                spareState = 'completed';
            } else if (spareStatus === 'pending' || status === 'waiting for spare parts') {
                spareState = 'active';
            } else {
                spareState = 'pending';
            }
        } else if (status === 'parts rejected') {
            spareState = 'rejected';
            spareDetails.push('Spare parts request was rejected.');
        } else if (['in progress', 'resolved', 'closed'].includes(status)) {
            spareState = 'completed';
            spareDetails.push('No spare parts request is currently blocking progress.');
        } else {
            spareDetails.push('No spare parts request submitted yet.');
        }

        if (previousRejectedSpareRequest && latestSpareRequest && this.normalizeStatus(latestSpareRequest.status) !== 'rejected') {
            spareDetails.push(`Earlier Rejection: ${previousRejectedSpareRequest.review_notes || 'A previous spare parts request was rejected.'}`);
        }

        const spareStep = {
            title: 'Spare Parts Review',
            state: spareState,
            icon: 'fa-boxes-stacked',
            date: latestSpareRequest ? (latestSpareRequest.reviewed_at || latestSpareRequest.updated_at || latestSpareRequest.created_at) : null,
            details: spareDetails,
        };

        let repairState = 'pending';
        const repairDetails = [];
        if (!hasTicket) {
            repairDetails.push('Repair phase starts after ticket creation and approvals.');
        } else if (hasWorkUpdates) {
            repairState = 'completed';
            repairDetails.push(`Updated By: ${latestWorkUpdate.technician_name || 'Technical Officer'}`);
            repairDetails.push(`Work: ${latestWorkUpdate.machine_description || 'Work details recorded'}`);
            repairDetails.push(`Parts Used: ${latestWorkUpdate.parts_used || 'None'}`);
            repairDetails.push(`Time Spent: ${latestWorkUpdate.time_spent ? `${latestWorkUpdate.time_spent} hours` : 'N/A'}`);
        } else if (status === 'in progress') {
            repairState = 'active';
            repairDetails.push('Technician is currently working on the fault.');
        } else if (['resolved', 'closed'].includes(status)) {
            repairState = 'completed';
            repairDetails.push('Repair has been marked as completed.');
        } else {
            repairDetails.push('Repair work has not started yet.');
        }

        const repairStep = {
            title: 'Repair Work',
            state: repairState,
            icon: 'fa-screwdriver-wrench',
            date: latestWorkUpdate?.created_at || null,
            details: repairDetails,
        };

        let resolutionState = 'pending';
        const resolutionDetails = [];
        if (!hasTicket) {
            resolutionDetails.push('Resolution will appear after ticket progression.');
        } else if (status === 'closed') {
            resolutionState = 'completed';
            resolutionDetails.push('Ticket is fully closed.');
        } else if (status === 'resolved') {
            resolutionState = 'active';
            resolutionDetails.push('Ticket is resolved and awaiting closure.');
        } else {
            resolutionDetails.push('Ticket is not yet resolved.');
        }

        if (context.resolutionNotes) {
            resolutionDetails.push(`Resolution Notes: ${context.resolutionNotes}`);
        }

        if (context.resolvedAt) {
            resolutionDetails.push(`Resolved On: ${this.formatDate(context.resolvedAt)}`);
        }

        const resolutionStep = {
            title: 'Resolution & Closure',
            state: resolutionState,
            icon: 'fa-flag-checkered',
            date: context.resolvedAt,
            details: resolutionDetails,
        };

        return [
            reportedStep,
            ticketStep,
            assignmentStep,
            budgetStep,
            spareStep,
            repairStep,
            resolutionStep,
        ];
    }

    renderFlowStep(step, isLast) {
        const stateMeta = this.getWorkflowStateMeta(step.state);

        return `
            <div class="mo-flow-step${isLast ? ' is-last' : ''}">
                <div class="mo-flow-marker">
                    <div class="mo-flow-dot mo-flow-dot-${stateMeta.key}">
                        <i class="fas ${stateMeta.icon}"></i>
                    </div>
                </div>
                <div class="mo-flow-content">
                    <div class="mo-flow-head">
                        <div class="mo-flow-title">${this.escapeHtml(step.title)}</div>
                        <span class="mo-flow-state mo-flow-state-${stateMeta.key}">${this.escapeHtml(stateMeta.label)}</span>
                    </div>
                    ${step.date ? `<div class="mo-flow-date"><i class="fas fa-calendar-alt"></i> ${this.escapeHtml(this.formatDate(step.date))}</div>` : ''}
                    ${this.renderFlowDetails(step.details)}
                </div>
            </div>
        `;
    }

    renderFlowDetails(details) {
        if (!Array.isArray(details) || !details.length) {
            return '';
        }

        return `
            <div class="mo-flow-detail-list">
                ${details.map((detail) => `<div class="mo-flow-detail-item"><i class="fas fa-angle-right"></i>${this.escapeHtml(detail)}</div>`).join('')}
            </div>
        `;
    }

    getWorkflowStateMeta(state) {
        const normalized = this.normalizeStatus(state);
        if (normalized === 'completed') {
            return { key: 'completed', label: 'Completed', icon: 'fa-check' };
        }

        if (normalized === 'active') {
            return { key: 'active', label: 'In Progress', icon: 'fa-spinner' };
        }

        if (normalized === 'rejected') {
            return { key: 'rejected', label: 'Rejected', icon: 'fa-times' };
        }

        return { key: 'pending', label: 'Pending', icon: 'fa-clock' };
    }

    sortByDateDesc(items, candidateKeys) {
        if (!Array.isArray(items)) {
            return [];
        }

        return [...items].sort((a, b) => {
            const aTime = this.extractTimestamp(a, candidateKeys);
            const bTime = this.extractTimestamp(b, candidateKeys);
            return bTime - aTime;
        });
    }

    extractTimestamp(item, candidateKeys) {
        if (!item || typeof item !== 'object') {
            return 0;
        }

        for (const key of candidateKeys) {
            if (!item[key]) {
                continue;
            }

            const parsed = new Date(item[key]).getTime();
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }

        return 0;
    }

    normalizeStatus(value) {
        return String(value || '').trim().toLowerCase();
    }

    formatDate(value) {
        if (window.MOUtils && typeof window.MOUtils.formatDate === 'function') {
            return window.MOUtils.formatDate(value);
        }

        if (!value) {
            return 'N/A';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return 'N/A';
        }

        return parsed.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatCurrency(value) {
        const amount = Number.parseFloat(value);
        if (!Number.isFinite(amount)) {
            return 'N/A';
        }

        return `LKR ${amount.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    close() {
        this.querySelector('#machineBreakdownModal')?.classList.remove('active');
    }
}

customElements.define('mo-machine-breakdown-details-modal', MOMachineBreakdownDetailsModal);
