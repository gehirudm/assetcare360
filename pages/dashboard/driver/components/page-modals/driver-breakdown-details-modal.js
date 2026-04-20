class DriverBreakdownDetailsModal extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.bindEvents();

        DriverUtils.on('driver:modal-open', (event) => {
            if (event.detail?.id === 'breakdownDetailsModal') {
                this.open(event.detail?.payload || {});
            }
        });

        DriverUtils.on('driver:modal-close', (event) => {
            if (event.detail?.id === 'breakdownDetailsModal') {
                this.close();
            }
        });
    }

    render() {
        this.innerHTML = `
            <div id="breakdownDetailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-info-circle"></i> Breakdown Report Details</h2>
                        <button class="btn-close" type="button" data-action="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="breakdownDetailsToolbar" style="display:none; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;">
                        <button class="btn btn-primary btn-small" id="trackWorkflowButton" type="button" data-action="track-workflow" aria-expanded="false">
                            <i class="fas fa-route"></i> Track Workflow
                        </button>
                        <span id="trackWorkflowHint" style="font-size:0.8rem; color:#475569;"></span>
                    </div>
                    <div id="breakdownDetailsContent"></div>
                    <button class="btn btn-secondary" type="button" data-action="close-modal"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const modal = this.querySelector('#breakdownDetailsModal');
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target === modal || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'track-workflow') {
                this.showWorkflowFlow();
            }
        });
    }

    setWorkflowToolbar(context = null) {
        const toolbar = this.querySelector('#breakdownDetailsToolbar');
        const button = this.querySelector('#trackWorkflowButton');
        const hint = this.querySelector('#trackWorkflowHint');

        if (!toolbar || !button || !hint) {
            return;
        }

        if (!context) {
            toolbar.style.display = 'none';
            button.setAttribute('aria-expanded', 'false');
            button.disabled = false;
            hint.textContent = '';
            return;
        }

        toolbar.style.display = 'flex';
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-route"></i> Track Workflow';
        button.setAttribute('aria-expanded', 'false');
        hint.textContent = context.isRouteBreakdown
            ? 'RBD workflow shows garage approval, entry, repair updates, and completion.'
            : 'VBD workflow shows assignment, approvals, repair progress, and closure.';
    }

    showWorkflowFlow() {
        const workflowSection = this.querySelector('#driverWorkflowSection');
        const button = this.querySelector('#trackWorkflowButton');

        if (!workflowSection) {
            DriverUtils.showToast('Workflow details are not available for this report.', 'warning');
            return;
        }

        workflowSection.style.display = 'block';
        workflowSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-check-circle"></i> Workflow Visible';
            button.setAttribute('aria-expanded', 'true');
        }
    }

    async open(payload) {
        const item = payload?.item || null;
        const content = this.querySelector('#breakdownDetailsContent');
        const modal = this.querySelector('#breakdownDetailsModal');

        if (!content || !modal) {
            return;
        }

        DriverUtils.setModalState(modal, true);
        this.setWorkflowToolbar(null);

        const routeBreakdownId = this.getRouteBreakdownId(payload, item);
        if (routeBreakdownId) {
            content.innerHTML = '<div style="padding: 20px; text-align:center; color: var(--muted);">Loading ticket tracking details...</div>';

            try {
                const detailPayload = await this.loadRouteBreakdownDetails(routeBreakdownId, item);
                const context = this.buildWorkflowContext(detailPayload.breakdown, detailPayload.workflowDetails);
                content.innerHTML = this.renderDetailedView(context, { showWorkflow: false });
                this.setWorkflowToolbar(context);
                return;
            } catch (error) {
                console.error('Failed to load route breakdown details:', error);
                if (item) {
                    content.innerHTML = `${this.renderBasicItem(item)}<div style="padding: 12px; border-left: 4px solid var(--danger); border-radius: 6px; background: #fef2f2; color: #991b1b; margin-top: 12px;">Unable to load full workflow details. Showing basic report information.</div>`;
                    this.setWorkflowToolbar(null);
                    return;
                }

                content.innerHTML = '<p style="color: var(--danger);">Failed to load breakdown details. Please try again.</p>';
                this.setWorkflowToolbar(null);
                return;
            }
        }

        const vehicleBreakdownId = this.getVehicleBreakdownId(payload, item);
        if (vehicleBreakdownId) {
            content.innerHTML = '<div style="padding: 20px; text-align:center; color: var(--muted);">Loading ticket workflow details...</div>';

            try {
                const detailPayload = await this.loadVehicleBreakdownDetails(vehicleBreakdownId, item);
                const context = this.buildWorkflowContext(detailPayload.breakdown, detailPayload.workflowDetails, {
                    isRouteBreakdown: false,
                });
                content.innerHTML = this.renderDetailedView(context, { showWorkflow: false });
                this.setWorkflowToolbar(context);
                return;
            } catch (error) {
                console.error('Failed to load vehicle breakdown details:', error);
                if (item) {
                    content.innerHTML = `${this.renderBasicItem(item)}<div style="padding: 12px; border-left: 4px solid var(--danger); border-radius: 6px; background: #fef2f2; color: #991b1b; margin-top: 12px;">Unable to load full workflow details. Showing basic report information.</div>`;
                    this.setWorkflowToolbar(null);
                    return;
                }

                content.innerHTML = '<p style="color: var(--danger);">Failed to load breakdown details. Please try again.</p>';
                this.setWorkflowToolbar(null);
                return;
            }
        }

        if (!item) {
            content.innerHTML = '<p style="color: var(--muted);">Breakdown details are not available.</p>';
            this.setWorkflowToolbar(null);
            return;
        }

        content.innerHTML = this.renderBasicItem(item);
        this.setWorkflowToolbar(null);
    }

    getRouteBreakdownId(payload, item) {
        const fromPayload = Number.parseInt(payload?.breakdownId, 10);
        if (fromPayload) {
            return fromPayload;
        }

        if (!item) {
            return null;
        }

        const looksLikeRouteBreakdown = item.type === 'in-route'
            || payload?.itemType === 'in-route'
            || Boolean(item.route_breakdown_id);

        if (!looksLikeRouteBreakdown) {
            return null;
        }

        const fromItem = Number.parseInt(item.id, 10);
        return fromItem || null;
    }

    getVehicleBreakdownId(payload, item) {
        if (!item) {
            return null;
        }

        const looksLikeVehicleBreakdown = item.type === 'breakdown'
            || item.ticket_item_type === 'vehicle'
            || payload?.itemType === 'breakdown'
            || Boolean(item.breakdown_id);

        if (!looksLikeVehicleBreakdown) {
            return null;
        }

        const fromItem = Number.parseInt(item.id, 10);
        return Number.isFinite(fromItem) ? fromItem : null;
    }

    async loadRouteBreakdownDetails(routeBreakdownId, fallbackItem) {
        const response = await DriverUtils.apiGet(`/route-breakdowns/${encodeURIComponent(routeBreakdownId)}`);
        const breakdown = response?.data?.breakdown || response?.breakdown || null;

        if (!breakdown) {
            if (fallbackItem) {
                return {
                    breakdown: fallbackItem,
                    workflowDetails: {
                        ticket: null,
                        budgetReports: [],
                        spareRequests: [],
                    },
                };
            }

            throw new Error('Route breakdown not found');
        }

        const ticketId = Number.parseInt(breakdown.fault_ticket_id, 10);
        const workflowDetails = await this.loadTicketWorkflowDetails(ticketId);

        return { breakdown, workflowDetails };
    }

    async loadVehicleBreakdownDetails(vehicleBreakdownId, fallbackItem) {
        const response = await DriverUtils.apiGet(`/breakdown-reports/${encodeURIComponent(vehicleBreakdownId)}`);
        const breakdown = response?.data?.report || response?.report || null;

        if (!breakdown) {
            if (fallbackItem) {
                return {
                    breakdown: fallbackItem,
                    workflowDetails: {
                        ticket: null,
                        budgetReports: [],
                        spareRequests: [],
                    },
                };
            }

            throw new Error('Vehicle breakdown not found');
        }

        const ticketId = Number.parseInt(breakdown.fault_ticket_id, 10);
        const workflowDetails = await this.loadTicketWorkflowDetails(ticketId);

        return { breakdown, workflowDetails };
    }

    async loadTicketWorkflowDetails(ticketId) {
        const workflowDetails = {
            ticket: null,
            budgetReports: [],
            spareRequests: [],
        };

        if (!ticketId) {
            return workflowDetails;
        }

        const [ticketResult, budgetResult, spareResult] = await Promise.allSettled([
            DriverUtils.apiGet(`/fault-tickets/${ticketId}`),
            DriverUtils.apiGet(`/budget-reports/ticket/${ticketId}`),
            DriverUtils.apiGet(`/spare-part-requests/ticket/${ticketId}`),
        ]);

        if (ticketResult.status === 'fulfilled' && ticketResult.value?.status === 'success') {
            const ticketPayload = ticketResult.value.data;
            if (ticketPayload && typeof ticketPayload === 'object') {
                workflowDetails.ticket = ticketPayload;
            }
        }

        if (budgetResult.status === 'fulfilled' && budgetResult.value?.status === 'success') {
            const budgetPayload = budgetResult.value.data;
            const reports = Array.isArray(budgetPayload?.reports)
                ? budgetPayload.reports
                : (Array.isArray(budgetPayload) ? budgetPayload : []);

            workflowDetails.budgetReports = this.sortByDateDesc(reports, ['created_at', 'updated_at', 'reviewed_at']);
        }

        if (spareResult.status === 'fulfilled' && spareResult.value?.status === 'success') {
            const sparePayload = spareResult.value.data;
            const requests = Array.isArray(sparePayload)
                ? sparePayload
                : (Array.isArray(sparePayload?.requests) ? sparePayload.requests : []);

            workflowDetails.spareRequests = this.sortByDateDesc(requests, ['created_at', 'updated_at', 'reviewed_at']);
        }

        return workflowDetails;
    }

    buildWorkflowContext(breakdown, workflowDetails, options = {}) {
        const ticket = workflowDetails.ticket;
        const ticketStatus = ticket?.status || breakdown.ticket_status || breakdown.status || 'Pending';
        const ticketId = ticket?.id || breakdown.fault_ticket_id || null;
        const isRouteBreakdown = options.isRouteBreakdown === true || Boolean(breakdown.route_breakdown_id);

        const assignmentsFromTicket = Array.isArray(ticket?.assignments) ? ticket.assignments : [];
        const assignmentsFromBreakdown = Array.isArray(breakdown.assigned_technicians) ? breakdown.assigned_technicians : [];
        const assignments = assignmentsFromTicket.length ? assignmentsFromTicket : assignmentsFromBreakdown;

        const workUpdatesFromTicket = Array.isArray(ticket?.work_updates) ? ticket.work_updates : [];
        const workUpdatesFromBreakdown = Array.isArray(breakdown.work_updates) ? breakdown.work_updates : [];
        const workUpdates = this.sortByDateDesc(
            workUpdatesFromTicket.length ? workUpdatesFromTicket : workUpdatesFromBreakdown,
            ['created_at', 'updated_at']
        );

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
            createdAt: ticket?.created_at || breakdown.breakdown_datetime || breakdown.breakdown_date || breakdown.created_at || null,
            isRouteBreakdown,
        };
    }

    renderDetailedView(context, options = {}) {
        const breakdown = context.breakdown;
        const showWorkflow = options.showWorkflow === true;
        const garageWorkflowHtml = this.renderGarageWorkflowSection(breakdown);
        const garageUpdatesHtml = this.renderGarageUpdatesSection(breakdown.garage_updates || []);
        const isRouteBreakdown = context.isRouteBreakdown === true;
        const reportLabel = isRouteBreakdown ? 'Route Breakdown ID' : 'Breakdown ID';
        const reportIdValue = breakdown.route_breakdown_id || breakdown.breakdown_id || `#${breakdown.id || 'N/A'}`;
        const dateValue = this.formatDate(breakdown.breakdown_datetime || breakdown.breakdown_date || breakdown.created_at);
        const infoTitle = isRouteBreakdown ? 'Route Information' : 'Vehicle Information';
        const locationField = isRouteBreakdown
            ? `<p><strong>Location:</strong> ${this.escapeHtml(breakdown.breakdown_location || 'N/A')}</p>`
            : '';

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
            ${this.renderWorkflowFlow(context, showWorkflow)}

            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Breakdown Information</h5>
                <p><strong>${this.escapeHtml(reportLabel)}:</strong> ${this.escapeHtml(reportIdValue)}</p>
                <p><strong>Date:</strong> ${this.escapeHtml(dateValue)}</p>
                <p><strong>Status:</strong> ${this.escapeHtml(context.ticketStatus || breakdown.status || 'Pending')}</p>
                <p><strong>Severity:</strong> ${this.escapeHtml(String(breakdown.severity || 'N/A').toUpperCase())}</p>
                <p><strong>Breakdown Type:</strong> ${this.escapeHtml(breakdown.breakdown_type || 'General Fault')}</p>
            </div>

            <div class="form-section">
                <h5><i class="fas fa-route"></i> ${this.escapeHtml(infoTitle)}</h5>
                <p><strong>Vehicle:</strong> ${this.escapeHtml(breakdown.number_plate || `Vehicle #${breakdown.vehicle_id || 'N/A'}`)}</p>
                <p><strong>Driver:</strong> ${this.escapeHtml(breakdown.driver_name || 'N/A')}</p>
                ${locationField}
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

            ${garageWorkflowHtml}
            ${garageUpdatesHtml}

            ${assignmentsHtml}
            ${workUpdatesHtml}
        `;
    }

    renderGarageWorkflowSection(breakdown) {
        const workflow = breakdown?.garage_workflow;
        if (!workflow) {
            return '';
        }

        const approvedGarage = workflow.approved_garage;
        const billImageUrl = this.resolveImageUrl(workflow.bill_image_path);

        return `
            <div class="form-section">
                <h5><i class="fas fa-warehouse"></i> Garage Workflow</h5>
                <p><strong>Status:</strong> ${this.escapeHtml(this.getGarageWorkflowLabel(workflow.status))}</p>
                ${approvedGarage ? `<p><strong>Approved Garage:</strong> ${this.escapeHtml(approvedGarage.name || 'N/A')}</p>` : ''}
                ${approvedGarage?.address ? `<p><strong>Garage Address:</strong> ${this.escapeHtml(approvedGarage.address)}</p>` : ''}
                ${workflow.approved_at ? `<p><strong>Approved At:</strong> ${this.escapeHtml(this.formatDate(workflow.approved_at))}</p>` : ''}
                ${workflow.approved_by ? `<p><strong>Approved By:</strong> ${this.escapeHtml(workflow.approved_by)}</p>` : ''}
                ${workflow.garage_entry_at ? `<p><strong>Garage Entry At:</strong> ${this.escapeHtml(this.formatDate(workflow.garage_entry_at))}</p>` : ''}
                ${workflow.bill_amount !== null && workflow.bill_amount !== undefined ? `<p><strong>Bill Amount:</strong> ${this.escapeHtml(this.formatCurrency(workflow.bill_amount))}</p>` : ''}
                ${workflow.completion_remarks ? `<p><strong>Completion Remarks:</strong> ${this.escapeHtml(workflow.completion_remarks)}</p>` : ''}
                ${billImageUrl ? `
                    <div style="margin-top: 10px;">
                        <strong>Bill Image:</strong>
                        <div style="margin-top: 8px;">
                            <a href="${this.escapeHtml(billImageUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;">
                                <img src="${this.escapeHtml(billImageUrl)}" alt="Bill Image" style="max-width: 240px; border-radius: 8px; border: 1px solid #d1d5db;">
                            </a>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderGarageUpdatesSection(updates) {
        if (!Array.isArray(updates) || !updates.length) {
            return '';
        }

        return `
            <div class="form-section">
                <h5><i class="fas fa-stream"></i> Garage Progress Updates</h5>
                ${updates.map((update) => {
                    const typeLabel = String(update.update_type || 'progress').replace(/_/g, ' ').toUpperCase();
                    const imageHtml = this.renderGarageUpdateImages(update.progress_images || []);
                    return `
                        <div style="padding: 12px; border-radius: 8px; background: #f8fafc; border-left: 4px solid #0ea5e9; margin-bottom: 10px;">
                            <p style="margin: 0 0 6px 0;"><strong>${this.escapeHtml(typeLabel)}</strong> | ${this.escapeHtml(this.formatDate(update.created_at))}</p>
                            <p style="margin: 0 0 8px 0; color: #374151;"><strong>Updated By:</strong> ${this.escapeHtml(update.updated_by_name || 'N/A')}</p>
                            <p style="margin: 0; color: #111827;">${this.escapeHtml(update.note || 'No note provided')}</p>
                            ${imageHtml}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderGarageUpdateImages(images) {
        if (!Array.isArray(images) || !images.length) {
            return '';
        }

        return `
            <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
                ${images.map((path) => {
                    const imageUrl = this.resolveImageUrl(path);
                    if (!imageUrl) {
                        return '';
                    }

                    return `
                        <a href="${this.escapeHtml(imageUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;">
                            <img src="${this.escapeHtml(imageUrl)}" alt="Garage update image" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; border: 1px solid #d1d5db;">
                        </a>
                    `;
                }).join('')}
            </div>
        `;
    }

    getGarageWorkflowLabel(status) {
        const labels = {
            awaiting_supervisor_approval: 'Awaiting Supervisor Approval',
            garage_approved: 'Garage Approved',
            garage_entry_logged: 'Garage Entry Logged',
            repair_in_progress: 'Repair In Progress',
            completed: 'Completed',
        };

        const key = String(status || 'awaiting_supervisor_approval');
        return labels[key] || key.replace(/_/g, ' ');
    }

    resolveImageUrl(path) {
        const rawPath = String(path || '').trim();
        if (!rawPath) {
            return '';
        }

        if (/^https?:\/\//i.test(rawPath)) {
            return rawPath;
        }

        const normalizedPath = rawPath.replace(/^\/+/, '');
        const apiBaseUrl = String(CONFIG?.API_BASE_URL || '').replace(/\/api\/?$/, '');
        if (!apiBaseUrl) {
            return '/' + normalizedPath;
        }

        return `${apiBaseUrl}/${normalizedPath}`;
    }

    renderWorkflowFlow(context, isVisible = true) {
        const steps = this.getFlowSteps(context);
        const flowTitle = context.isRouteBreakdown
            ? 'Route Breakdown Ticket Workflow (RBD)'
            : 'Vehicle Breakdown Ticket Workflow (VBD)';
        const currentStage = this.getCurrentWorkflowStageLabel(context);

        return `
            <div id="driverWorkflowSection" class="form-section driver-flow-section" style="${isVisible ? '' : 'display:none;'}">
                <h5><i class="fas fa-project-diagram"></i> ${this.escapeHtml(flowTitle)}</h5>
                <p style="margin: 0 0 12px 0; padding: 8px 10px; border-radius: 8px; background: #eff6ff; color: #1d4ed8; font-weight: 600; font-size: 0.85rem;">
                    <i class="fas fa-location-arrow"></i> Current Stage: ${this.escapeHtml(currentStage)}
                </p>
                <div class="driver-ticket-flow">
                    ${steps.map((step, index) => this.renderFlowStep(step, index === steps.length - 1)).join('')}
                </div>
            </div>
        `;
    }

    getFlowSteps(context) {
        if (context.isRouteBreakdown === true) {
            return this.getRouteFlowSteps(context);
        }

        return this.getVehicleFlowSteps(context);
    }

    getCurrentWorkflowStageLabel(context) {
        if (context.isRouteBreakdown === true) {
            const status = this.normalizeStatus(
                context.breakdown?.garage_workflow?.status
                || context.breakdown?.garage_workflow_status
                || ''
            );

            const labelMap = {
                awaiting_supervisor_approval: 'Awaiting Supervisor Garage Approval',
                garage_approved: 'Garage Approved',
                garage_entry_logged: 'Garage Entry Logged',
                repair_in_progress: 'Repair In Progress',
                completed: 'Garage Workflow Completed',
            };

            return labelMap[status] || this.getGarageWorkflowLabel(status || 'awaiting_supervisor_approval');
        }

        return String(context.ticketStatus || 'Pending').toUpperCase();
    }

    getRouteFlowSteps(context) {
        const hasTicket = Boolean(context.ticketId || context.breakdown.fault_ticket_number);
        const ticketStatus = context.normalizedTicketStatus;
        const workflow = context.breakdown?.garage_workflow || {};
        const workflowStatus = this.normalizeStatus(
            workflow.status
            || context.breakdown?.garage_workflow_status
            || 'awaiting_supervisor_approval'
        );
        const garageUpdates = this.sortByDateDesc(
            Array.isArray(context.breakdown?.garage_updates) ? context.breakdown.garage_updates : [],
            ['created_at', 'updated_at']
        );
        const latestGarageUpdate = garageUpdates[0] || null;
        const approvedGarageName = workflow?.approved_garage?.name || context.breakdown?.approved_garage_name || null;

        const isGarageApproved = ['garage_approved', 'garage_entry_logged', 'repair_in_progress', 'completed'].includes(workflowStatus);
        const isGarageEntryLogged = ['garage_entry_logged', 'repair_in_progress', 'completed'].includes(workflowStatus);
        const isRepairTracked = ['repair_in_progress', 'completed'].includes(workflowStatus);
        const isGarageCompleted = workflowStatus === 'completed';

        const reportedStep = {
            title: 'Route Breakdown Reported',
            state: 'completed',
            date: context.breakdown.breakdown_datetime || context.breakdown.created_at,
            details: [
                `Report ID: ${context.breakdown.route_breakdown_id || context.breakdown.id || 'N/A'}`,
                `Vehicle: ${context.breakdown.number_plate || `Vehicle #${context.breakdown.vehicle_id || 'N/A'}`}`,
                `Location: ${context.breakdown.breakdown_location || 'N/A'}`,
                `Severity: ${String(context.breakdown.severity || 'Medium').toUpperCase()}`,
            ],
        };

        const ticketStep = {
            title: 'Fault Ticket Created',
            state: hasTicket ? 'completed' : 'pending',
            date: context.createdAt,
            details: hasTicket
                ? [
                    `Ticket Number: ${context.breakdown.fault_ticket_number || context.ticket?.ticket_id || 'Generated'}`,
                    `Current Ticket Status: ${context.ticketStatus || 'Pending'}`,
                ]
                : ['Waiting for ticket creation from breakdown report.'],
        };

        let approvalState = 'pending';
        if (!hasTicket) {
            approvalState = 'pending';
        } else if (isGarageApproved) {
            approvalState = 'completed';
        } else if (ticketStatus === 'insurance claimed') {
            approvalState = 'active';
        } else {
            approvalState = 'active';
        }

        const approvalStep = {
            title: 'Supervisor Garage Approval',
            state: approvalState,
            date: workflow.approved_at || null,
            details: isGarageApproved
                ? [
                    `Approved Garage: ${approvedGarageName || 'N/A'}`,
                    `Approved By: ${workflow.approved_by || 'Supervisor'}`,
                    ...(workflow.approval_notes ? [`Approval Notes: ${workflow.approval_notes}`] : []),
                ]
                : ['Supervisor has not approved a nearby garage yet.'],
        };

        let entryState = 'pending';
        if (isGarageEntryLogged) {
            entryState = 'completed';
        } else if (workflowStatus === 'garage_approved') {
            entryState = 'active';
        }

        const entryStep = {
            title: 'Garage Entry Logged',
            state: entryState,
            date: workflow.garage_entry_at || null,
            details: isGarageEntryLogged
                ? [
                    `Garage Entry Time: ${this.formatDate(workflow.garage_entry_at)}`,
                    ...(approvedGarageName ? [`Garage: ${approvedGarageName}`] : []),
                ]
                : ['Driver has not logged garage entry yet.'],
        };

        let progressState = 'pending';
        if (isGarageCompleted) {
            progressState = 'completed';
        } else if (isRepairTracked || isGarageEntryLogged) {
            progressState = 'active';
        }

        const progressDetails = [];
        if (latestGarageUpdate) {
            progressDetails.push(`Latest Update: ${latestGarageUpdate.note || 'Progress update submitted.'}`);
            progressDetails.push(`Updated On: ${this.formatDate(latestGarageUpdate.created_at || latestGarageUpdate.updated_at)}`);
        }
        progressDetails.push(`Total Garage Updates: ${garageUpdates.length}`);
        if (!garageUpdates.length) {
            progressDetails.push('No repair progress updates submitted yet.');
        }

        const progressStep = {
            title: 'Garage Repair Tracking',
            state: progressState,
            date: latestGarageUpdate?.created_at || null,
            details: progressDetails,
        };

        let completionState = 'pending';
        if (ticketStatus === 'closed') {
            completionState = 'completed';
        } else if (isGarageCompleted || ticketStatus === 'resolved') {
            completionState = 'active';
        }

        const completionDetails = [];
        if (workflow.bill_amount !== null && workflow.bill_amount !== undefined) {
            completionDetails.push(`Garage Bill: ${this.formatCurrency(workflow.bill_amount)}`);
        }
        if (workflow.completion_remarks) {
            completionDetails.push(`Completion Remarks: ${workflow.completion_remarks}`);
        }
        if (context.resolutionNotes) {
            completionDetails.push(`Resolution Notes: ${context.resolutionNotes}`);
        }
        if (!completionDetails.length) {
            completionDetails.push('Waiting for final completion details and ticket closure.');
        }

        const completionStep = {
            title: 'Completion and Closure',
            state: completionState,
            date: context.resolvedAt || workflow.completed_at || null,
            details: completionDetails,
        };

        return [
            reportedStep,
            ticketStep,
            approvalStep,
            entryStep,
            progressStep,
            completionStep,
        ];
    }

    getVehicleFlowSteps(context) {
        const isRouteBreakdown = context.isRouteBreakdown === true;
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
            title: isRouteBreakdown ? 'Breakdown Reported On Route' : 'Vehicle Breakdown Reported',
            state: 'completed',
            date: context.breakdown.breakdown_datetime || context.breakdown.breakdown_date || context.breakdown.created_at,
            details: [
                `Report ID: ${context.breakdown.route_breakdown_id || context.breakdown.breakdown_id || 'N/A'}`,
                `Fault Type: ${context.breakdown.breakdown_type || 'General Fault'}`,
                `Severity: ${String(context.breakdown.severity || 'Medium').toUpperCase()}`,
                ...(isRouteBreakdown ? [`Location: ${context.breakdown.breakdown_location || 'N/A'}`] : []),
            ],
        };

        const ticketStep = {
            title: 'Fault Ticket Created',
            state: hasTicket ? 'completed' : 'pending',
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
            date: hasAssignments ? (context.assignments[0].assigned_at || context.assignments[0].assigned_date || context.assignments[0].created_at) : null,
            details: hasAssignments
                ? [`Assigned To: ${context.assignments.map((item) => item.technician_name || 'Technician').join(', ')}`]
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

            const items = Array.isArray(latestSpareRequest.items) ? latestSpareRequest.items : [];
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
            title: 'Resolution and Closure',
            state: resolutionState,
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
            <div class="driver-flow-step${isLast ? ' is-last' : ''}">
                <div class="driver-flow-marker">
                    <div class="driver-flow-dot driver-flow-dot-${stateMeta.key}">
                        <i class="fas ${stateMeta.icon}"></i>
                    </div>
                </div>
                <div class="driver-flow-content">
                    <div class="driver-flow-head">
                        <div class="driver-flow-title">${this.escapeHtml(step.title)}</div>
                        <span class="driver-flow-state driver-flow-state-${stateMeta.key}">${this.escapeHtml(stateMeta.label)}</span>
                    </div>
                    ${step.date ? `<div class="driver-flow-date"><i class="fas fa-calendar-alt"></i> ${this.escapeHtml(this.formatDate(step.date))}</div>` : ''}
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
            <div class="driver-flow-detail-list">
                ${details.map((detail) => `<div class="driver-flow-detail-item"><i class="fas fa-angle-right"></i>${this.escapeHtml(detail)}</div>`).join('')}
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

    renderBasicItem(item) {
        const statusColor = DriverUtils.getStatusColor(item.status);
        const severityColor = DriverUtils.getStatusColor(item.severity);

        return `
            <div class="form-section">
                <h5><i class="fas fa-id-card"></i> Breakdown Information</h5>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>ID:</strong><span>${this.escapeHtml(item.breakdownId || item.breakdown_id || item.route_breakdown_id || 'N/A')}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Type:</strong><span>${this.escapeHtml(item.type === 'in-route' ? 'Breakdown in Route' : 'Breakdown')}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Status:</strong><span style="color:${statusColor}; font-weight:700;">${this.escapeHtml(item.status || 'Pending')}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Severity:</strong><span style="color:${severityColor}; font-weight:700;">${this.escapeHtml(String(item.severity || 'medium').toUpperCase())}</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 6px;"><strong>Date:</strong><span>${this.escapeHtml(DriverUtils.formatDateTime(item.dateRaw || item.breakdown_date || item.breakdown_datetime))}</span></div>
                </div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-file-alt"></i> Description</h5>
                <div style="padding: 12px; background: #f8f9fa; border-radius: 6px;">${this.escapeHtml(item.summary || item.description || 'No description provided.')}</div>
            </div>
        `;
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
        if (!value) {
            return 'N/A';
        }

        return DriverUtils.formatDateTime(value);
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
        DriverUtils.setModalState(this.querySelector('#breakdownDetailsModal'), false);
    }
}

customElements.define('driver-breakdown-details-modal', DriverBreakdownDetailsModal);
