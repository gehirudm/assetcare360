class SAPettyCashConfig extends HTMLElement {
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
            <div class="page-header">
                <h1 class="page-title">Petty Cash Configuration</h1>
                <p class="page-subtitle">Manage petty cash allowances and limits</p>
            </div>

            <div style="margin-bottom: 20px;">
                <button class="btn btn-primary" type="button" data-action="open-limit-modal">
                    <i class="fas fa-money-bill-wave"></i> Set New Limit
                </button>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-cog"></i> Global Petty Cash Settings</div>
                <div class="form-section">
                    <h5><i class="fas fa-dollar-sign"></i> Default Allowances</h5>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Role</th>
                                <th>Daily Limit</th>
                                <th>Monthly Limit</th>
                                <th>Requires Approval</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span class="status-text status-supervisor">Supervisor</span></td>
                                <td>LKR 500</td>
                                <td>LKR 5,000</td>
                                <td>Above LKR 200</td>
                                <td>
                                    <button class="btn btn-secondary btn-small" type="button" data-action="edit-limit" data-role="supervisor">Edit</button>
                                </td>
                            </tr>
                            <tr>
                                <td><span class="status-text status-officer">Technical Officer</span></td>
                                <td>LKR 200</td>
                                <td>LKR 2,000</td>
                                <td>Above LKR 100</td>
                                <td>
                                    <button class="btn btn-secondary btn-small" type="button" data-action="edit-limit" data-role="technical-officer">Edit</button>
                                </td>
                            </tr>
                            <tr>
                                <td><span class="status-text status-manager">Maintenance Manager</span></td>
                                <td>LKR 1,000</td>
                                <td>LKR 10,000</td>
                                <td>Above LKR 500</td>
                                <td>
                                    <button class="btn btn-secondary btn-small" type="button" data-action="edit-limit" data-role="maintenance-manager">Edit</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-bar"></i> Current Month Usage Overview</div>
                <div class="grid">
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--royal-blue);">LKR 12,450</div>
                        <div class="stat-label">Total Disbursed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--kelly-green);">LKR 8,200</div>
                        <div class="stat-label">Approved Requests</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--warn);">LKR 1,500</div>
                        <div class="stat-label">Pending Approval</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-user"></i> Individual User Allowances</div>
                <div class="search-bar">
                    <input type="text" class="search-input" placeholder="Search by employee name or ID..." id="pettyCashUserSearch">
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Role</th>
                            <th>Current Month Usage</th>
                            <th>Remaining Limit</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>John Smith (EMP-001)</td>
                            <td><span class="status-text status-supervisor">Supervisor</span></td>
                            <td>LKR 3,200 / LKR 5,000</td>
                            <td>LKR 1,800</td>
                            <td><span class="status-text status-active">Normal</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" type="button" data-action="view-history" data-employee-id="EMP-001">View History</button>
                                <button class="btn btn-primary btn-small" type="button" data-action="adjust-limit" data-employee-id="EMP-001">Adjust Limit</button>
                            </td>
                        </tr>
                        <tr>
                            <td>Michael Chen (EMP-003)</td>
                            <td><span class="status-text status-officer">Technical Officer</span></td>
                            <td>LKR 1,850 / LKR 2,000</td>
                            <td>LKR 150</td>
                            <td><span class="status-text status-pending">Near Limit</span></td>
                            <td>
                                <button class="btn btn-secondary btn-small" type="button" data-action="view-history" data-employee-id="EMP-003">View History</button>
                                <button class="btn btn-primary btn-small" type="button" data-action="adjust-limit" data-employee-id="EMP-003">Adjust Limit</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            const action = button.dataset.action;
            if (!action) {
                return;
            }

            if (action === 'open-limit-modal') {
                this.openModal('setPettyCashLimitModal');
                return;
            }

            if (action === 'edit-limit') {
                this.openEditLimit(button.dataset.role);
                return;
            }

            if (action === 'view-history') {
                this.openPettyCashHistory(button.dataset.employeeId);
                return;
            }

            if (action === 'adjust-limit') {
                this.openAdjustLimit(button.dataset.employeeId);
            }
        });
    }

    openModal(modalId) {
        if (typeof window.openModal === 'function') {
            window.openModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        if (typeof window.closeModal === 'function') {
            window.closeModal(modalId);
            return;
        }

        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    openDetailsModal(titleText, contentHtml, onReady) {
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');

        if (!title || !content) {
            return;
        }

        title.textContent = titleText;
        content.innerHTML = contentHtml;

        if (typeof onReady === 'function') {
            onReady(content);
        }

        this.openModal('detailsModal');
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    openEditLimit(role) {
        const limitsData = {
            supervisor: { daily: 500, monthly: 5000, approval: 200 },
            'technical-officer': { daily: 200, monthly: 2000, approval: 100 },
            'maintenance-manager': { daily: 1000, monthly: 10000, approval: 500 },
        };

        const data = limitsData[role] || { daily: 0, monthly: 0, approval: 0 };

        this.openDetailsModal(
            `Edit Petty Cash Limit: ${String(role || '').replace(/-/g, ' ').toUpperCase()}`,
            `
                <form id="editPettyCashForm">
                    <div class="form-section">
                        <h5>Allowance Configuration</h5>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Daily Limit (LKR)</label>
                                <input type="number" class="form-input" value="${data.daily}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Monthly Limit (LKR)</label>
                                <input type="number" class="form-input" value="${data.monthly}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Approval Required Above (LKR)</label>
                            <input type="number" class="form-input" value="${data.approval}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Notes</label>
                            <textarea class="form-textarea" placeholder="Any special conditions or notes"></textarea>
                        </div>
                    </div>
                    <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary" data-action="close-details">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });

                content.querySelector('#editPettyCashForm')?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.emitToast(`Petty cash limits updated for ${role}!`, 'success');
                    this.closeModal('detailsModal');
                });
            }
        );
    }

    openPettyCashHistory(employeeId) {
        this.openDetailsModal(
            `Petty Cash History: ${employeeId}`,
            `
                <div class="form-section">
                    <h5>Transaction History</h5>
                    <table class="table" style="margin-top: 15px;">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Purpose</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Oct 18, 2025</td>
                                <td>LKR 150</td>
                                <td>Vehicle parts procurement</td>
                                <td><span class="status-text status-completed">Approved</span></td>
                            </tr>
                            <tr>
                                <td>Oct 15, 2025</td>
                                <td>LKR 85</td>
                                <td>Tool maintenance</td>
                                <td><span class="status-text status-completed">Approved</span></td>
                            </tr>
                            <tr>
                                <td>Oct 12, 2025</td>
                                <td>LKR 220</td>
                                <td>Emergency repairs</td>
                                <td><span class="status-text status-pending">Pending</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-primary" data-action="close-details">Close</button>
                </div>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });
            }
        );
    }

    openAdjustLimit(employeeId) {
        this.openDetailsModal(
            `Adjust Petty Cash Limit: ${employeeId}`,
            `
                <form id="adjustLimitForm">
                    <div class="form-section">
                        <h5>Individual Limit Adjustment</h5>
                        <div class="form-group">
                            <label class="form-label">Current Monthly Limit</label>
                            <input type="text" class="form-input" value="LKR 2,000" readonly disabled>
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Monthly Limit (LKR)</label>
                            <input type="number" class="form-input" placeholder="e.g., 3000" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Adjustment Reason</label>
                            <select class="form-select" required>
                                <option value="">Select Reason</option>
                                <option value="project">Special Project</option>
                                <option value="promotion">Role Change/Promotion</option>
                                <option value="temporary">Temporary Increase</option>
                                <option value="permanent">Permanent Adjustment</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Justification Notes</label>
                            <textarea class="form-textarea" placeholder="Provide detailed justification for this adjustment" required></textarea>
                        </div>
                    </div>
                    <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary" data-action="close-details">Cancel</button>
                        <button type="submit" class="btn btn-primary">Adjust Limit</button>
                    </div>
                </form>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });

                content.querySelector('#adjustLimitForm')?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.emitToast(`Limit adjusted successfully for ${employeeId}!`, 'success');
                    this.closeModal('detailsModal');
                });
            }
        );
    }
}

customElements.define('sa-petty-cash-config', SAPettyCashConfig);
