class MaintenanceServiceReports extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.currentFilter = 'all';
        this.reportData = this.buildReportData();
        this.underReviewIds = ['SR-002', 'SR-004'];
        this.reviewedIds = ['SR-001', 'SR-003'];

        this.render();
        this.bindEvents();
        this.renderReportLists();
    }

    buildReportData() {
        return {
            'SR-001': {
                id: 'SR-001',
                equipment: 'Vehicle #089',
                serviceType: 'Brake System Complete Overhaul',
                cost: 'LKR 15,000',
                technicalOfficer: 'Technical Officer B',
                serviceDate: 'Aug 19, 2025',
                description: 'Complete brake system overhaul including master cylinder replacement, brake pad replacement, and brake fluid system flush.',
                partsUsed: 'Brake pads (4 sets), Brake fluid (2L), Brake discs (2), Master cylinder (1)',
                laborHours: '8 hours',
                invoiceNumbers: 'INV-089-BRK-001, INV-089-BRK-002',
                warrantyClaims: 'WC-001 - Brake disc replacement under warranty',
                nextServiceDue: 'Aug 19, 2026',
                recommendations: 'Monitor brake fluid levels monthly',
            },
            'SR-002': {
                id: 'SR-002',
                equipment: 'Machine #203',
                serviceType: 'Preventive Maintenance - Hydraulic System',
                cost: 'LKR 8,500',
                technicalOfficer: 'Technical Officer A',
                serviceDate: 'Aug 15, 2025',
                description: 'Routine preventive maintenance of hydraulic system including oil change, filter replacement, and system pressure testing.',
                partsUsed: 'Hydraulic oil (15L), Oil filter (2), Pressure seals (5)',
                laborHours: '4 hours',
                invoiceNumbers: 'INV-203-HYD-001',
                warrantyClaims: 'None',
                nextServiceDue: 'Nov 15, 2025',
                recommendations: 'Check hydraulic oil levels weekly',
            },
            'SR-003': {
                id: 'SR-003',
                equipment: 'Machine #180',
                serviceType: 'Engine Maintenance',
                cost: 'LKR 28,000',
                technicalOfficer: 'Technical Officer A',
                serviceDate: 'Aug 10, 2025',
                description: 'Major engine maintenance including valve adjustment, timing chain replacement, and complete engine tune-up.',
                partsUsed: 'Timing chain (1), Engine oil (8L), Air filter (1), Spark plugs (6)',
                laborHours: '12 hours',
                invoiceNumbers: 'INV-180-ENG-001, INV-180-ENG-002',
                warrantyClaims: 'WC-002 - Timing chain under warranty',
                nextServiceDue: 'Feb 10, 2026',
                recommendations: 'Monitor engine temperature and oil pressure',
            },
            'SR-004': {
                id: 'SR-004',
                equipment: 'Vehicle #067',
                serviceType: 'Engine Service - Complete overhaul',
                cost: 'LKR 22,000',
                technicalOfficer: 'Technical Officer B',
                serviceDate: 'Aug 12, 2025',
                description: 'Complete engine overhaul including piston replacement, crankshaft grinding, and cylinder head refurbishment.',
                partsUsed: 'Pistons (4), Engine gaskets, Engine oil (6L), Oil filter (1)',
                laborHours: '16 hours',
                invoiceNumbers: 'INV-067-ENG-001',
                warrantyClaims: 'WC-003 - Piston set under warranty',
                nextServiceDue: 'Feb 12, 2026',
                recommendations: 'Break-in period required - light duty for 100 hours',
            },
        };
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Service Report Management</h1>
                <p class="page-subtitle">Review service reports with invoices/warranty claims</p>
            </div>

            <div class="filter-controls" id="serviceReportFilterControls">
                <button class="filter-btn active" type="button" data-action="set-filter" data-status="all">All Reports</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="under-review">Under Review</button>
                <button class="filter-btn" type="button" data-action="set-filter" data-status="reviewed">Reviewed</button>
            </div>

            <div class="card service-report-card" data-report-status="under-review">
                <div class="card-header"><i class="fas fa-clipboard-list"></i> Reports Under Review</div>
                <div id="underReviewReportsList"></div>
            </div>

            <div class="card service-report-card" data-report-status="reviewed" style="display: none;">
                <div class="card-header"><i class="fas fa-check-circle"></i> Reviewed Reports</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Report ID</th>
                            <th>Equipment</th>
                            <th>Service Type</th>
                            <th>Cost</th>
                            <th>Technical Officer</th>
                            <th>Review Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="reviewedReportsTableBody"></tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-chart-bar"></i> Report Statistics</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div class="stats-card stats-pending">
                        <div class="stats-number" id="underReviewCount">0</div>
                        <div class="stats-label">Under Review</div>
                    </div>
                    <div class="stats-card stats-active">
                        <div class="stats-number">25</div>
                        <div class="stats-label">Reports This Month</div>
                    </div>
                    <div class="stats-card" style="background: #f0f9ff; border: 1px solid #e0f2fe;">
                        <div class="stats-number" style="color: var(--royal-blue);">LKR 2.8L</div>
                        <div class="stats-label">Total Service Cost</div>
                    </div>
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

            const action = button.dataset.action;
            if (!action) {
                return;
            }

            if (action === 'set-filter') {
                this.applyFilter(button.dataset.status, button);
                return;
            }

            if (action === 'approve-report') {
                this.approveReport(button.dataset.reportId);
                return;
            }

            if (action === 'view-report') {
                this.viewReportDetails(button.dataset.reportId);
            }
        });
    }

    emitToast(message, type = 'success') {
        this.dispatchEvent(new CustomEvent('maintenance-ui:toast', {
            bubbles: true,
            detail: { message, type },
        }));
    }

    getReport(reportId) {
        return this.reportData[String(reportId)] || null;
    }

    renderReportLists() {
        const underReviewList = this.querySelector('#underReviewReportsList');
        const reviewedBody = this.querySelector('#reviewedReportsTableBody');
        const underReviewCount = this.querySelector('#underReviewCount');

        if (underReviewList) {
            if (this.underReviewIds.length === 0) {
                underReviewList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No reports under review.</p>';
            } else {
                underReviewList.innerHTML = this.underReviewIds.map((reportId) => {
                    const report = this.getReport(reportId);
                    if (!report) {
                        return '';
                    }

                    return `
                        <div class="request-item">
                            <div class="ticket-details">
                                <strong>${report.id}</strong>
                                <div class="ticket-meta">Equipment: ${report.equipment} | Submitted by: ${report.technicalOfficer}</div>
                                <div class="ticket-issue">${report.serviceType}</div>
                                <div class="ticket-meta">
                                    Date: ${report.serviceDate} | Cost: ${report.cost}<br>
                                    Parts Used: ${report.partsUsed}<br>
                                    Attachments: ${report.invoiceNumbers}
                                </div>
                            </div>
                            <div class="ticket-actions">
                                <span class="status-badge status-under-review">Under Review</span>
                                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
                                    <button class="btn btn-success btn-small" type="button" data-action="approve-report" data-report-id="${report.id}">Approve</button>
                                    <button class="btn btn-secondary btn-small" type="button" data-action="view-report" data-report-id="${report.id}">View Report</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        if (reviewedBody) {
            if (this.reviewedIds.length === 0) {
                reviewedBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted);">No reviewed reports available</td></tr>';
            } else {
                reviewedBody.innerHTML = this.reviewedIds.map((reportId) => {
                    const report = this.getReport(reportId);
                    if (!report) {
                        return '';
                    }

                    const reviewDate = report.reviewDate || report.serviceDate;
                    return `
                        <tr>
                            <td>${report.id}</td>
                            <td>${report.equipment}</td>
                            <td>${report.serviceType}</td>
                            <td>${report.cost}</td>
                            <td>${report.technicalOfficer}</td>
                            <td>${reviewDate}</td>
                            <td><button class="btn btn-secondary btn-small" type="button" data-action="view-report" data-report-id="${report.id}">View</button></td>
                        </tr>
                    `;
                }).join('');
            }
        }

        if (underReviewCount) {
            underReviewCount.textContent = String(this.underReviewIds.length);
        }
    }

    setActiveFilterButton(button) {
        this.querySelectorAll('#serviceReportFilterControls .filter-btn').forEach((item) => {
            item.classList.remove('active');
        });

        if (button) {
            button.classList.add('active');
        }
    }

    applyFilter(status, button) {
        const nextStatus = status || this.currentFilter || 'all';
        this.currentFilter = nextStatus;

        if (button) {
            this.setActiveFilterButton(button);
        } else {
            const activeButton = this.querySelector(`#serviceReportFilterControls [data-status="${nextStatus}"]`);
            this.setActiveFilterButton(activeButton);
        }

        this.querySelectorAll('.service-report-card').forEach((card) => {
            const reportStatus = card.dataset.reportStatus;
            card.style.display = nextStatus === 'all' || reportStatus === nextStatus ? 'block' : 'none';
        });
    }

    viewReportDetails(reportId) {
        const report = this.getReport(reportId);
        if (!report) {
            this.emitToast(`Report ${reportId} not found.`, 'warning');
            return;
        }

        const modal = document.querySelector('maintenance-report-details-modal');
        if (!modal || typeof modal.open !== 'function') {
            this.emitToast('Report details modal is unavailable.', 'error');
            return;
        }

        modal.open(report);
    }

    approveReport(reportId) {
        const id = String(reportId || '');
        if (!this.underReviewIds.includes(id)) {
            this.emitToast(`Report ${id} is already reviewed.`, 'info');
            this.applyFilter('reviewed');
            return;
        }

        this.underReviewIds = this.underReviewIds.filter((item) => item !== id);
        if (!this.reviewedIds.includes(id)) {
            this.reviewedIds.unshift(id);
        }

        const report = this.getReport(id);
        if (report) {
            report.reviewDate = new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        }

        this.renderReportLists();
        this.emitToast(`Service report ${id} approved and moved to reviewed list!`, 'success');
        setTimeout(() => {
            this.applyFilter('reviewed');
        }, 200);
    }

    reviewReport(reportId) {
        this.viewReportDetails(reportId);
    }
}

customElements.define('maintenance-service-reports', MaintenanceServiceReports);
