class SAActivityTracking extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentRoleFilter = 'all';
        this.render();
        this.bindEvents();
        this.updateActiveUserCount();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">User Activity Tracking</h1>
                <p class="page-subtitle">Monitor real-time user activity and generate reports</p>
            </div>

            <div class="filter-controls" id="activityFilterTabs" data-filter-group="activity-role">
                <button class="filter-btn active" type="button" data-role-filter="all">All Users</button>
                <button class="filter-btn" type="button" data-role-filter="Admin">Admin</button>
                <button class="filter-btn" type="button" data-role-filter="Supervisor">Supervisor</button>
                <button class="filter-btn" type="button" data-role-filter="Inventory Manager">Inventory Manager</button>
                <button class="filter-btn" type="button" data-role-filter="Technical Officer">Technical Officer</button>
                <button class="filter-btn" type="button" data-role-filter="Driver">Driver</button>
                <button class="filter-btn" type="button" data-role-filter="Machinary Operator">Machinary Operator</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <span>🟢 Currently Active Users</span>
                    <span id="activeUserCount" class="status-text status-normal">0 active</span>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Login Time</th>
                            <th>IP Address</th>
                            <th>Current Activity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="activeUsersList">
                        ${this.renderActiveUserRow('EMP-001', 'John Smith', 'Supervisor', 'Today 9:30 AM (2h 15m)', '192.168.1.45', 'Viewing Breakdown Tickets')}
                        ${this.renderActiveUserRow('EMP-002', 'Sarah Johnson', 'Inventory Manager', 'Today 8:15 AM (3h 30m)', '192.168.1.52', 'Managing Inventory')}
                        ${this.renderActiveUserRow('EMP-007', 'David Martinez', 'Driver', 'Today 10:00 AM (1h 45m)', '192.168.1.89', 'Viewing Dashboard')}
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-bar"></i> Activity Summary (Last 24 Hours)</div>
                <div class="grid">
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--kelly-green);">38</div>
                        <div class="stat-label">Unique Logins</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--royal-blue);">256</div>
                        <div class="stat-label">Total Actions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: var(--danger);">3</div>
                        <div class="stat-label">Failed Login Attempts</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-line"></i> Detailed User Activity</div>
                <div class="search-bar">
                    <input type="text" class="search-input" placeholder="Search by user name or employee ID..." id="activityUserSearch">
                    <select class="filter-select" id="activityDateFilter">
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>

                ${this.renderDetailedActivity('EMP-001', 'John Smith', 'Supervisor')}
                ${this.renderDetailedActivity('EMP-002', 'Sarah Johnson', 'Inventory Manager')}
                ${this.renderDetailedActivity('EMP-003', 'Michael Chen', 'Technical Officer')}
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-exclamation-triangle"></i> User Inactivity Report</div>
                <div class="notification-item warning">
                    <span class="notification-icon"><i class="fas fa-clock"></i></span>
                    <div>
                        <strong>No Recent Activity:</strong> Robert Williams (EMP-004) - Last login: 8 days ago
                        <div style="margin-top: 5px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="btn btn-secondary btn-small" type="button" data-action="view-user" data-employee-id="EMP-004">View User</button>
                            <button class="btn btn-warning btn-small" type="button" data-action="send-reminder" data-employee-id="EMP-004">Send Reminder</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderActiveUserRow(employeeId, name, role, loginTime, ip, activity) {
        return `
            <tr data-role="${role}">
                <td>${name} (${employeeId})</td>
                <td><span class="status-text status-supervisor">${role}</span></td>
                <td>${loginTime}</td>
                <td>${ip}</td>
                <td>${activity}</td>
                <td>
                    <button class="btn btn-secondary btn-small" type="button" data-action="view-session" data-employee-id="${employeeId}">View Session</button>
                    <button class="btn btn-danger btn-small" type="button" data-action="force-logout" data-employee-id="${employeeId}">Force Logout</button>
                </td>
            </tr>
        `;
    }

    renderDetailedActivity(employeeId, name, role) {
        return `
            <div class="user-item">
                <div class="user-details">
                    <strong>${name} (${employeeId})</strong>
                    <div class="user-meta">Role: ${role}</div>
                    <div class="user-meta" style="margin-top: 5px;">
                        <strong>Activity Timeline:</strong><br>
                        • 9:30 AM - Logged in<br>
                        • 10:15 AM - Reviewed reports<br>
                        • 11:20 AM - Updated request
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary btn-small" type="button" data-action="full-log" data-employee-id="${employeeId}">Full Log</button>
                    <button class="btn btn-primary btn-small" type="button" data-action="generate-report" data-employee-id="${employeeId}">Generate Report</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) {
                return;
            }

            if (button.dataset.roleFilter) {
                this.currentRoleFilter = button.dataset.roleFilter;
                this.setActiveFilterButton(button.closest('[data-filter-group]'), button);
                this.applyRoleFilter();
                return;
            }

            const action = button.dataset.action;
            const employeeId = button.dataset.employeeId;

            if (action === 'view-session') {
                this.openUserSession(employeeId);
                return;
            }

            if (action === 'force-logout') {
                this.forceLogout(employeeId);
                return;
            }

            if (action === 'full-log') {
                this.openFullActivityLog(employeeId);
                return;
            }

            if (action === 'generate-report') {
                this.emitToast(`Generating activity report for ${employeeId}...`, 'info');
                return;
            }

            if (action === 'send-reminder') {
                this.emitToast(`Inactivity reminder sent to ${employeeId}`, 'success');
                return;
            }

            if (action === 'view-user') {
                if (typeof window.viewUserDetails === 'function') {
                    window.viewUserDetails(employeeId);
                } else {
                    this.emitToast(`Viewing user details for ${employeeId}`, 'info');
                }
                return;
            }

            if (action === 'close-details') {
                this.closeModal('detailsModal');
            }
        });
    }

    setActiveFilterButton(group, activeButton) {
        if (!group) {
            return;
        }

        group.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
        activeButton.classList.add('active');
    }

    applyRoleFilter() {
        const rows = this.querySelectorAll('#activeUsersList tr');
        let visibleCount = 0;

        rows.forEach((row) => {
            const role = row.dataset.role;
            const matches = this.currentRoleFilter === 'all' || role === this.currentRoleFilter;
            row.style.display = matches ? '' : 'none';
            if (matches) {
                visibleCount += 1;
            }
        });

        this.updateActiveUserCount(visibleCount);
    }

    updateActiveUserCount(overrideCount) {
        const count = Number.isInteger(overrideCount)
            ? overrideCount
            : Array.from(this.querySelectorAll('#activeUsersList tr')).filter((row) => row.style.display !== 'none').length;

        const countNode = this.querySelector('#activeUserCount');
        if (countNode) {
            countNode.textContent = `${count} active`;
        }
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('sa-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
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

    openUserSession(employeeId) {
        this.openDetailsModal(
            `Active Session Details: ${employeeId}`,
            `
                <div class="form-section">
                    <h5>User Information</h5>
                    <div style="background: var(--light-bg); padding: 15px; border-radius: 8px; margin-top: 10px;">
                        <strong>Employee ID:</strong> ${employeeId}<br>
                        <strong>Status:</strong> Active session
                    </div>
                </div>
                <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn btn-secondary" data-action="close-details">Close</button>
                    <button type="button" class="btn btn-danger" data-action="force-logout" data-employee-id="${employeeId}">Force Logout</button>
                </div>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });
                content.querySelector('[data-action="force-logout"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                    this.forceLogout(employeeId);
                });
            }
        );
    }

    forceLogout(employeeId) {
        const confirmed = window.confirm(
            `Force Logout\n\nAre you sure you want to force logout ${employeeId}?\n\nThis will immediately terminate their active session.`
        );

        if (!confirmed) {
            return;
        }

        this.emitToast(`${employeeId} has been logged out successfully!`, 'success');
    }

    openFullActivityLog(employeeId) {
        this.openDetailsModal(
            `Complete Activity Log: ${employeeId}`,
            `
                <div class="form-section">
                    <h5>User Activity History</h5>
                    <table class="table" style="margin-top: 10px;">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Action</th>
                                <th>Module</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Oct 18, 11:43 AM</td>
                                <td>Viewed Details</td>
                                <td>Breakdown Management</td>
                                <td>Ticket MBD-156</td>
                            </tr>
                            <tr>
                                <td>Oct 18, 9:30 AM</td>
                                <td>Login</td>
                                <td>Authentication</td>
                                <td>IP: 192.168.1.45</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style="text-align: right; margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn btn-secondary" data-action="close-details">Close</button>
                    <button type="button" class="btn btn-primary" data-action="export-activity" data-employee-id="${employeeId}">Export to CSV</button>
                </div>
            `,
            (content) => {
                content.querySelector('[data-action="close-details"]')?.addEventListener('click', () => {
                    this.closeModal('detailsModal');
                });
                content.querySelector('[data-action="export-activity"]')?.addEventListener('click', () => {
                    this.emitToast(`Activity log exported for ${employeeId}!`, 'success');
                });
            }
        );
    }
}

customElements.define('sa-activity-tracking', SAActivityTracking);
