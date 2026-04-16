class SupervisorAssignTicketModal extends HTMLElement {
    constructor() {
        super();
        this._initialized = false;
        this._currentTicketId = null;
        this._isEditMode = false;
        this._onDocumentKeydown = this._onDocumentKeydown.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;
        this.render();
        this.bindEvents();
        document.addEventListener('keydown', this._onDocumentKeydown);
        this._initialized = true;
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this._onDocumentKeydown);
    }

    get modalElement() {
        return this.querySelector('#assignTicketModal');
    }

    get formElement() {
        return this.querySelector('#assignTicketForm');
    }

    isOpen() {
        const modal = this.modalElement;
        if (!modal) return false;
        return window.getComputedStyle(modal).display === 'flex';
    }

    async open(ticketId, options = {}) {
        const { isEdit = false } = options;
        const normalizedTicketId = Number(ticketId);

        if (!Number.isFinite(normalizedTicketId) || normalizedTicketId <= 0) {
            this.emitToast('Invalid ticket ID', 'error');
            return;
        }

        try {
            const ticketResponse = await API.get(`/fault-tickets/${normalizedTicketId}`);
            const ticket = ticketResponse?.data;

            if (!ticket) {
                this.emitToast('Failed to load ticket details', 'error');
                return;
            }

            if (isEdit && ticket.status && ticket.status.toLowerCase() !== 'assigned') {
                this.emitToast('Only tickets with "Assigned" status can be edited', 'error');
                return;
            }

            this._currentTicketId = normalizedTicketId;
            this._isEditMode = Boolean(isEdit);

            this.applyModalTitle(this._isEditMode);
            this.applyTicketInfo(ticket);
            this.resetFormState();

            await this.loadTechniciansWithWorkload(ticket);

            if (this._isEditMode) {
                this.applyExistingAssignment(ticket);
            }

            this.updateTechnicianWarning();
            this.showModal();
        } catch (error) {
            console.error('Error loading ticket for assignment:', error);
            this.emitToast('Failed to load ticket details', 'error');
        }
    }

    close() {
        const modal = this.modalElement;
        if (!modal) return;

        modal.style.opacity = '0';

        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);

        this.resetFormState();
    }

    render() {
        this.innerHTML = `
            <div id="assignTicketModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>
                            <i class="fas fa-user-plus"></i> Assign Ticket to Technician(s)
                        </h2>
                        <button class="btn-close" type="button" data-assign-modal-close>&times;</button>
                    </div>
                    <form id="assignTicketForm">
                        <div class="form-section">
                            <h3 class="form-section-title">
                                <i class="fas fa-info-circle"></i> Ticket Information
                            </h3>

                            <div class="form-group">
                                <label>Ticket ID</label>
                                <div id="assignTicketId" class="readonly-field">TKT-050</div>
                            </div>

                            <div class="form-group">
                                <label>Select Technician(s) <span style="color: var(--muted); font-weight: 400;">(Select one or more)</span></label>
                                <small class="assignment-hint">Technicians are sorted by lowest current workload. Expertise and active ticket counts are shown to help pick the most free and qualified officer.</small>
                                <div id="techniciansList" class="checkbox-list"></div>
                                <div id="noTechnicianWarning"
                                    style="display: none; margin-top: 10px; padding: 12px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; color: #856404;">
                                    <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                                    <strong>Warning:</strong> No technicians selected. This will move the ticket back to
                                    <strong>Unassigned</strong> status.
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="assignPriority">Priority Level</label>
                                    <select id="assignPriority" name="priority">
                                        <option value="low">Low</option>
                                        <option value="medium" selected>Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="expectedCompletion">Expected Completion Date</label>
                                    <input type="date" id="expectedCompletion" name="expected_completion" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="assignmentNotes">Assignment Notes</label>
                                <textarea id="assignmentNotes" name="notes" rows="4" placeholder="Add any special instructions..."></textarea>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-user-check"></i> ASSIGN TICKET
                            </button>
                            <button type="button" class="btn btn-secondary" data-assign-modal-close>
                                CANCEL
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-assign-modal-close]');
            if (closeButton) {
                this.close();
                return;
            }

            if (event.target === this.modalElement) {
                this.close();
            }
        });

        this.addEventListener('submit', (event) => {
            if (event.target.id !== 'assignTicketForm') return;
            this.handleSubmit(event);
        });

        this.addEventListener('change', (event) => {
            if (!event.target.matches('input[name="technicians"]')) return;
            this.updateTechnicianWarning();
        });
    }

    _onDocumentKeydown(event) {
        if (event.key !== 'Escape' || !this.isOpen()) return;
        this.close();
    }

    emitToast(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('supervisor-ticket-modal:toast', {
            bubbles: true,
            detail: { message, type }
        }));
    }

    applyModalTitle(isEdit) {
        const titleElement = this.querySelector('#assignTicketModal .modal-header h2');
        if (!titleElement) return;

        titleElement.innerHTML = isEdit
            ? '<i class="fas fa-edit"></i> Edit Ticket Assignment'
            : '<i class="fas fa-user-plus"></i> Assign Ticket to Technician(s)';
    }

    applyTicketInfo(ticket) {
        const ticketIdElement = this.querySelector('#assignTicketId');
        if (ticketIdElement) {
            ticketIdElement.textContent = ticket.ticket_id || `MBD-${String(ticket.id).padStart(3, '0')}`;
        }

        const prioritySelect = this.querySelector('#assignPriority');
        if (prioritySelect && ticket.priority) {
            prioritySelect.value = String(ticket.priority).toLowerCase();
        }
    }

    applyExistingAssignment(ticket) {
        const assignments = Array.isArray(ticket.assignments) ? ticket.assignments : [];
        const selectedIds = assignments.map((assignment) => Number(assignment.assigned_to)).filter(Number.isFinite);

        selectedIds.forEach((technicianId) => {
            const checkbox = this.querySelector(`input[name="technicians"][value="${technicianId}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });

        if (assignments.length > 0) {
            const firstAssignment = assignments[0];

            const expectedCompletionInput = this.querySelector('#expectedCompletion');
            if (expectedCompletionInput && firstAssignment.expected_completion_date) {
                expectedCompletionInput.value = firstAssignment.expected_completion_date;
            }

            const notesInput = this.querySelector('#assignmentNotes');
            if (notesInput && firstAssignment.notes) {
                notesInput.value = firstAssignment.notes;
            }
        }
    }

    resetFormState() {
        const form = this.formElement;
        form?.reset();

        const techniciansList = this.querySelector('#techniciansList');
        if (techniciansList) {
            techniciansList.innerHTML = '';
        }

        const warningDiv = this.querySelector('#noTechnicianWarning');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }
    }

    showModal() {
        const modal = this.modalElement;
        if (!modal) return;

        modal.style.display = 'flex';
        modal.style.opacity = '0';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }

    async loadTechniciansWithWorkload(ticket) {
        const techniciansList = this.querySelector('#techniciansList');
        if (!techniciansList) {
            throw new Error('Technician list container not found');
        }

        const techResponse = await API.get('/technicians');
        if (techResponse?.status && techResponse.status !== 'success') {
            throw new Error(techResponse.message || 'Failed to load technicians');
        }

        const technicians = (techResponse?.data?.users || techResponse?.data || [])
            .map((technician) => ({
                ...technician,
                active_ticket_count: Number(technician.active_ticket_count || 0),
                technical_expertise: (technician.technical_expertise || 'General').trim() || 'General'
            }))
            .sort((first, second) => {
                if (first.active_ticket_count !== second.active_ticket_count) {
                    return first.active_ticket_count - second.active_ticket_count;
                }
                return (first.full_name || '').localeCompare(second.full_name || '');
            });

        if (technicians.length === 0) {
            techniciansList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--muted);">
                    <i class="fas fa-user-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>No active technical officers available in the system.</p>
                    <p style="font-size: 0.9em;">Contact system administrator to add technical officers.</p>
                </div>
            `;
            return;
        }

        const currentAssignments = new Set(
            (Array.isArray(ticket.assignments) ? ticket.assignments : [])
                .map((assignment) => Number(assignment.assigned_to))
                .filter(Number.isFinite)
        );

        techniciansList.innerHTML = technicians.map((tech) => {
            const activeTickets = tech.active_ticket_count;
            const workloadClass = activeTickets === 0 ? 'available' : (activeTickets <= 2 ? 'busy' : 'heavy');
            const workloadText = `${activeTickets} active ticket${activeTickets === 1 ? '' : 's'}`;
            const name = tech.full_name || tech.username || `Technician #${tech.id}`;
            const expertise = tech.technical_expertise || 'General';
            const checkedAttribute = currentAssignments.has(Number(tech.id)) ? 'checked' : '';

            return `
                <label class="checkbox-item">
                    <input type="checkbox" name="technicians" value="${tech.id}" ${checkedAttribute}>
                    <span class="technician-details">
                        <span class="technician-name">${name}</span>
                        <span class="technician-expertise"><i class="fas fa-wrench"></i> ${expertise}</span>
                    </span>
                    <span class="technician-workload ${workloadClass}">${workloadText}</span>
                </label>
            `;
        }).join('');
    }

    updateTechnicianWarning() {
        const warningDiv = this.querySelector('#noTechnicianWarning');
        if (!warningDiv) return;

        if (!this._isEditMode) {
            warningDiv.style.display = 'none';
            return;
        }

        const selectedTechnicians = this.querySelectorAll('input[name="technicians"]:checked');
        warningDiv.style.display = selectedTechnicians.length === 0 ? 'block' : 'none';
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (!this._currentTicketId) {
            this.emitToast('Ticket context is missing for assignment', 'error');
            return;
        }

        const form = this.formElement;
        if (!form) {
            this.emitToast('Assignment form is not available', 'error');
            return;
        }

        const selectedTechnicians = Array.from(form.querySelectorAll('input[name="technicians"]:checked'))
            .map((checkbox) => Number(checkbox.value))
            .filter(Number.isFinite);

        if (selectedTechnicians.length === 0 && !this._isEditMode) {
            this.emitToast('Please select at least one technician', 'error');
            return;
        }

        const formData = new FormData(form);
        const priority = String(formData.get('priority') || 'medium');
        const capitalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);

        const assignmentData = {
            technician_ids: selectedTechnicians,
            priority: capitalizedPriority,
            expected_completion_date: formData.get('expected_completion'),
            notes: formData.get('notes')
        };

        try {
            await API.post(`/fault-tickets/${this._currentTicketId}/assign`, assignmentData);

            this.close();

            if (selectedTechnicians.length === 0) {
                this.emitToast('All technicians unassigned. Ticket moved to Unassigned.', 'success');
            } else {
                this.emitToast('Ticket assigned successfully', 'success');
            }

            this.dispatchEvent(new CustomEvent('supervisor-assign-ticket-modal:assigned', {
                bubbles: true,
                detail: {
                    ticketId: this._currentTicketId,
                    technicianIds: selectedTechnicians
                }
            }));
        } catch (error) {
            console.error('Error assigning ticket:', error);
            this.emitToast(error.message || 'Failed to assign ticket', 'error');
        }
    }
}

if (!customElements.get('supervisor-assign-ticket-modal')) {
    customElements.define('supervisor-assign-ticket-modal', SupervisorAssignTicketModal);
}
