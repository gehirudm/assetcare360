/**
 * inventory-orders-approvals.js
 * Component for Inventory Manager Orders & Approvals section
 */

class InventoryOrdersApprovals extends HTMLElement {
    constructor() {
        super();
        this.allOrders = [];
        this.currentFilter = 'all';
        this.currentUser = null;
    }

    connectedCallback() {
        this.loadStyles();
        this.render();
        this.bindEvents();
    }

    loadStyles() {
        const linkId = 'inventory-orders-approvals-styles';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = './components/orders-approvals/style.css';
            document.head.appendChild(link);
        }
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-clipboard-check"></i> Orders & Approvals</h2>
                <p class="page-subtitle">Manage spare part requests from Technical Officers</p>
            </div>

            <!-- Stats Cards -->
            <div class="stats-bar" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
                <div class="card" style="padding: 15px; text-align: center;">
                    <div style="font-size: 1.8rem; font-weight: 700; color: var(--tang-blue);" id="ordersTotalCount">0</div>
                    <div style="font-size: 0.85rem; color: #6b7280;">Total Requests</div>
                </div>
                <div class="card" style="padding: 15px; text-align: center;">
                    <div style="font-size: 1.8rem; font-weight: 700; color: #f59e0b;" id="ordersPendingCount">0</div>
                    <div style="font-size: 0.85rem; color: #6b7280;">Pending</div>
                </div>
                <div class="card" style="padding: 15px; text-align: center;">
                    <div style="font-size: 1.8rem; font-weight: 700; color: #10b981;" id="ordersApprovedCount">0</div>
                    <div style="font-size: 0.85rem; color: #6b7280;">Approved</div>
                </div>
                <div class="card" style="padding: 15px; text-align: center;">
                    <div style="font-size: 1.8rem; font-weight: 700; color: #ef4444;" id="ordersRejectedCount">0</div>
                    <div style="font-size: 0.85rem; color: #6b7280;">Rejected</div>
                </div>
            </div>

            <!-- Search Bar -->
            <div class="search-bar">
                <input type="text" id="orderSearch" class="search-input" placeholder="Search by request ID, ticket, equipment, or parts...">
                <button class="btn btn-secondary" id="ordersRefreshBtn">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>

            <!-- Filter Tabs -->
            <div class="filter-controls" id="orderFilterTabs">
                <button class="filter-btn active" data-status="all">All Orders</button>
                <button class="filter-btn" data-status="Pending">Pending</button>
                <button class="filter-btn" data-status="Approved">Approved</button>
                <button class="filter-btn" data-status="Issued">Issued</button>
                <button class="filter-btn" data-status="Rejected">Rejected</button>
            </div>

            <!-- Orders List -->
            <div id="ordersList">
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2em; margin-bottom: 10px;"></i>
                    <p>Loading spare part requests...</p>
                </div>
            </div>

            <!-- Approval/Rejection Modal -->
            <div class="modal" id="orderActionModal">
                <div class="modal-overlay"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title" id="orderActionTitle">Order Action</h3>
                        <button class="modal-close" id="orderActionModalClose">&times;</button>
                    </div>
                    <div class="modal-body" id="orderActionContent"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Filter tabs
        this.querySelectorAll('#orderFilterTabs .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                this.filterByStatus(status);
            });
        });

        // Search input
        const searchInput = this.querySelector('#orderSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Refresh button
        const refreshBtn = this.querySelector('#ordersRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadOrders());
        }

        // Modal close
        const modalClose = this.querySelector('#orderActionModalClose');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeActionModal());
        }

        // Modal overlay click
        const modalOverlay = this.querySelector('#orderActionModal .modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeActionModal());
        }
    }

    async loadOrders() {
        try {
            const response = await API.get('/spare-part-requests');
            if (response.status === 'success') {
                this.allOrders = response.data || [];
                this.updateStats(this.allOrders);
                this.applyFilters();
            } else {
                console.error('Failed to load spare part requests:', response);
                Utils.showToast('Failed to load spare part requests', 'error');
                this.displayOrders([]);
            }
        } catch (error) {
            console.error('Error loading spare part orders:', error);
            Utils.showToast('Failed to load spare part requests', 'error');
            this.displayOrders([]);
        }
    }

    updateStats(requests) {
        const pending = requests.filter(r => r.status === 'Pending').length;
        const approved = requests.filter(r => r.status === 'Approved').length;
        const rejected = requests.filter(r => r.status === 'Rejected').length;

        const el = id => this.querySelector(`#${id}`);
        if (el('ordersTotalCount')) el('ordersTotalCount').textContent = requests.length;
        if (el('ordersPendingCount')) el('ordersPendingCount').textContent = pending;
        if (el('ordersApprovedCount')) el('ordersApprovedCount').textContent = approved;
        if (el('ordersRejectedCount')) el('ordersRejectedCount').textContent = rejected;

        // Dispatch event for badge update
        this.dispatchEvent(new CustomEvent('inventory-orders-approvals:count-change', {
            bubbles: true,
            detail: { count: pending }
        }));
    }

    filterByStatus(status) {
        this.currentFilter = status;

        // Update active button
        this.querySelectorAll('#orderFilterTabs .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === status);
        });

        this.applyFilters();
    }

    applyFilters() {
        const searchValue = (this.querySelector('#orderSearch')?.value || '').toLowerCase();

        const filtered = this.allOrders.filter(order => {
            // Status filter
            const matchesStatus = this.currentFilter === 'all' || order.status === this.currentFilter;

            // Search filter
            const matchesSearch = !searchValue ||
                (order.request_id || '').toLowerCase().includes(searchValue) ||
                (order.ticket_id_formatted || '').toLowerCase().includes(searchValue) ||
                (order.fault_ticket_code || '').toLowerCase().includes(searchValue) ||
                (order.equipment_name || '').toLowerCase().includes(searchValue) ||
                (order.location || '').toLowerCase().includes(searchValue) ||
                (order.requested_by_name || '').toLowerCase().includes(searchValue) ||
                (order.additional_notes || '').toLowerCase().includes(searchValue) ||
                (order.items || []).some(i =>
                    (i.part_name || '').toLowerCase().includes(searchValue) ||
                    (i.part_code || '').toLowerCase().includes(searchValue)
                );

            return matchesStatus && matchesSearch;
        });

        this.displayOrders(filtered);
    }

    displayOrders(orderList) {
        const container = this.querySelector('#ordersList');
        if (!container) return;

        if (orderList.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <p style="text-align: center; color: var(--muted); padding: 40px;">
                        <i class="fas fa-clipboard-check" style="font-size: 3rem; display: block; margin-bottom: 15px;"></i>
                        No spare part requests found.
                    </p>
                </div>`;
            return;
        }

        container.innerHTML = orderList.map(order => {
            const statusClass = order.status === 'Approved' ? 'status-approved' :
                order.status === 'Rejected' ? 'status-rejected' :
                    order.status === 'Issued' ? 'status-resolved' : 'status-pending';

            const priorityClass = (order.priority || '').toLowerCase() === 'critical' ? 'status-critical' :
                (order.priority || '').toLowerCase() === 'high' ? 'status-low-stock' : 'status-pending';

            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const ticketType = (order.ticket_id_formatted || '').startsWith('VBD') ? 'Vehicle Breakdown' :
                (order.ticket_id_formatted || '').startsWith('MBD') ? 'Machine Breakdown' :
                    (order.ticket_id_formatted || '').startsWith('RBD') ? 'Routine Breakdown' : 'Fault Ticket';

            const partsCount = (order.items || []).reduce((sum, i) => sum + i.quantity, 0);
            const partsLabel = `${(order.items || []).length} part${(order.items || []).length !== 1 ? 's' : ''} (${partsCount} units)`;

            // Build action buttons based on status
            let actionButtons = '';
            if (order.status === 'Pending') {
                actionButtons = `
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" data-action="view" data-id="${order.id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                        <button class="btn btn-small" style="background: #10b981; color: white;" data-action="approve" data-id="${order.id}">
                            <i class="fas fa-check"></i> APPROVE
                        </button>
                        <button class="btn btn-small" style="background: #ef4444; color: white;" data-action="reject" data-id="${order.id}">
                            <i class="fas fa-times"></i> REJECT
                        </button>
                    </div>`;
            } else {
                actionButtons = `
                    <div class="action-buttons">
                        <button class="btn btn-small btn-primary" data-action="view" data-id="${order.id}">
                            <i class="fas fa-eye"></i> VIEW
                        </button>
                    </div>`;
            }

            return `
            <div class="inventory-item" data-id="${order.id}" data-status="${order.status}">
                <div class="item-details" style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px;">
                        <strong style="display: inline; margin-bottom: 0;"><i class="fas fa-file-alt" style="color: var(--tang-blue);"></i> ${order.request_id}</strong>
                        <span class="status-text ${statusClass}">${order.status}</span>
                        <span class="status-text ${priorityClass}">${order.priority}</span>
                    </div>
                    <div class="item-meta">
                        <i class="fas fa-ticket-alt" style="color: var(--tang-blue);"></i> <strong>${order.ticket_id_formatted || '-'}</strong> — ${ticketType} |
                        <i class="fas fa-cog"></i> ${order.equipment_name || '-'}
                    </div>
                    <div class="item-description">
                        <i class="fas fa-box" style="color: #6b7280;"></i> ${partsLabel} |
                        <i class="fas fa-user"></i> ${order.requested_by_name || '-'} |
                        <i class="fas fa-calendar"></i> ${dateStr}
                    </div>
                </div>
                <div class="item-actions">
                    ${actionButtons}
                </div>
            </div>`;
        }).join('');

        // Bind action button events
        container.querySelectorAll('.action-buttons button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const orderId = parseInt(btn.dataset.id);
                if (action === 'view') this.viewOrderDetails(orderId);
                else if (action === 'approve') this.approveOrder(orderId);
                else if (action === 'reject') this.rejectOrder(orderId);
            });
        });

        // Bind row click to view details
        container.querySelectorAll('.inventory-item').forEach(item => {
            item.addEventListener('click', () => {
                const orderId = parseInt(item.dataset.id);
                this.viewOrderDetails(orderId);
            });
        });
    }

    approveOrder(orderId) {
        const order = this.allOrders.find(r => r.id == orderId);
        if (!order) {
            Utils.showToast('Order not found. Please refresh and try again.', 'error');
            return;
        }

        const title = this.querySelector('#orderActionTitle');
        const content = this.querySelector('#orderActionContent');

        title.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i> Approve Spare Parts Request';
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--tang-blue);"></i>
                <p style="margin-top: 10px; color: #6b7280;">Checking stock availability...</p>
            </div>
        `;

        this.openActionModal();
        this.checkAvailabilityAndShowApprovalForm(order);
    }

    async checkAvailabilityAndShowApprovalForm(order) {
        const content = this.querySelector('#orderActionContent');
        
        try {
            // Build items for availability check
            const itemsToCheck = (order.items || []).map(item => ({
                part_code: item.part_code,
                quantity: item.quantity
            }));

            // Call availability API
            const availResponse = await API.post('/spare-part-requests/check-availability', {
                items: itemsToCheck
            });

            let availabilityData = [];
            if (availResponse.status === 'success' && availResponse.data?.items) {
                availabilityData = availResponse.data.items;
            }

            // Merge availability data with order items
            const itemsWithAvailability = (order.items || []).map(item => {
                const avail = availabilityData.find(a => a.part_code === item.part_code) || {
                    status: 'unknown',
                    available_qty: 0,
                    message: 'Could not check availability'
                };
                return { ...item, availability: avail };
            });

            // Check if all items are available
            const unavailableItems = itemsWithAvailability.filter(i => 
                i.availability.status === 'not_found' || 
                i.availability.status === 'out_of_stock' ||
                i.availability.status === 'insufficient'
            );
            const canApprove = unavailableItems.length === 0;

            // Build availability summary per item (simple text)
            const getStatusText = (avail, requestedQty) => {
                switch (avail.status) {
                    case 'available':    return `Requested: ${requestedQty} | In Stock: ${avail.available_qty} — Available`;
                    case 'insufficient': return `Requested: ${requestedQty} | In Stock: ${avail.available_qty} — Insufficient stock`;
                    case 'out_of_stock': return `Requested: ${requestedQty} | In Stock: 0 — Out of stock`;
                    case 'not_found':    return `Requested: ${requestedQty} | Not found in catalog`;
                    default:             return `Requested: ${requestedQty} | Status unknown`;
                }
            };

            const partsHTML = itemsWithAvailability.map(item => `
                <div class="form-group">
                    <label class="form-label">${item.part_name}${item.part_code ? ' (' + item.part_code + ')' : ''}</label>
                    <input type="text" class="form-input" value="${getStatusText(item.availability, item.quantity)}" readonly
                        style="color: ${['out_of_stock','not_found','insufficient'].includes(item.availability.status) ? '#dc2626' : '#16a34a'}; font-weight: 500;">
                </div>
            `).join('');

            // Simple warning if items unavailable
            const warningHTML = !canApprove
                ? `<p class="form-warning-text"><i class="fas fa-exclamation-triangle"></i> Some parts are unavailable or not in the catalog. Please add stock through <strong>Spare Part Addition</strong> before approving.</p>`
                : '';

            content.innerHTML = `
                <form id="approvalForm">
                    <div class="form-section">
                        <h5><i class="fas fa-info-circle"></i> Request Details</h5>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Request ID</label>
                                <input type="text" class="form-input" value="${order.request_id}" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Ticket</label>
                                <input type="text" class="form-input" value="${order.ticket_id_formatted || '-'}" readonly>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Equipment</label>
                                <input type="text" class="form-input" value="${order.equipment_name || '-'}" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Requested By</label>
                                <input type="text" class="form-input" value="${order.requested_by_name || '-'}" readonly>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h5><i class="fas fa-box"></i> Requested Parts</h5>
                        ${partsHTML}
                    </div>

                    ${warningHTML}

                    ${canApprove ? `
                    <div class="form-section">
                        <div class="form-group">
                            <label class="form-label">Approval Notes (Optional)</label>
                            <textarea class="form-textarea" id="approvalNotes" rows="3" placeholder="Add any notes for this approval..."></textarea>
                        </div>
                    </div>
                    ` : ''}

                    <div class="modal-actions">
                        ${canApprove ? `
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-check"></i> Confirm Approval
                        </button>
                        ` : `
                        <button type="button" class="btn btn-secondary" disabled style="cursor: not-allowed;">
                            <i class="fas fa-ban"></i> Cannot Approve
                        </button>
                        `}
                        <button type="button" class="btn btn-secondary" id="cancelApproval">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </form>
            `;

            // Bind form events
            const form = content.querySelector('#approvalForm');
            if (canApprove) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.confirmApproval(order.id);
                });
            }

            const cancelBtn = content.querySelector('#cancelApproval');
            cancelBtn.addEventListener('click', () => this.closeActionModal());

        } catch (error) {
            console.error('Error checking availability:', error);
            content.innerHTML = `
                <div class="approval-warning">
                    <div class="warning-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="warning-content">
                        <strong>Error Checking Availability</strong>
                        <p>Could not verify stock availability. Please try again.</p>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancelApproval">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            `;
            content.querySelector('#cancelApproval').addEventListener('click', () => this.closeActionModal());
        }
    }

    rejectOrder(orderId) {
        const order = this.allOrders.find(r => r.id == orderId);
        if (!order) {
            Utils.showToast('Order not found. Please refresh and try again.', 'error');
            return;
        }

        const title = this.querySelector('#orderActionTitle');
        const content = this.querySelector('#orderActionContent');

        title.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i> Reject Spare Parts Request';
        content.innerHTML = `
            <form id="rejectionForm">
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Request Details</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Request ID</label>
                            <input type="text" class="form-input" value="${order.request_id}" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ticket</label>
                            <input type="text" class="form-input" value="${order.ticket_id_formatted || '-'}" readonly>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Equipment</label>
                            <input type="text" class="form-input" value="${order.equipment_name || '-'}" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Parts Requested</label>
                            <input type="text" class="form-input" value="${(order.items || []).map(i => i.part_name).join(', ') || '-'}" readonly>
                        </div>
                    </div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-ban"></i> Rejection Details</h5>
                    <div class="form-group">
                        <label class="form-label">Rejection Reason <span style="color: #ef4444;">*</span></label>
                        <select class="form-select" id="rejectionReason" required>
                            <option value="">Select Reason</option>
                            <option value="Out of Stock">Item Out of Stock</option>
                            <option value="Insufficient Justification">Insufficient Justification</option>
                            <option value="Budget Constraints">Budget Constraints</option>
                            <option value="Alternative Available">Alternative Part Available</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Additional Comments <span style="color: #ef4444;">*</span></label>
                        <textarea class="form-textarea" id="rejectionComments" rows="3" placeholder="Provide detailed reason for rejection..." required></textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-danger"><i class="fas fa-times"></i> Confirm Rejection</button>
                    <button type="button" class="btn btn-secondary" id="cancelRejection"><i class="fas fa-arrow-left"></i> Cancel</button>
                </div>
            </form>
        `;

        const form = content.querySelector('#rejectionForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.confirmRejection(orderId);
        });

        const cancelBtn = content.querySelector('#cancelRejection');
        cancelBtn.addEventListener('click', () => this.closeActionModal());

        this.openActionModal();
    }

    async confirmApproval(orderId) {
        try {
            const notes = this.querySelector('#approvalNotes')?.value || '';
            const response = await API.post(`/spare-part-requests/${orderId}/approve`, {
                reviewed_by: this.currentUser?.id,
                notes: notes
            });

            if (response.status === 'success') {
                Utils.showToast('Spare parts request approved! Fault ticket updated to Parts Approved.', 'success');
                this.closeActionModal();
                await this.loadOrders();
            } else {
                Utils.showToast('Failed to approve: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error approving order:', error);
            Utils.showToast('Failed to approve request: ' + error.message, 'error');
        }
    }

    async confirmRejection(orderId) {
        try {
            const reason = this.querySelector('#rejectionReason')?.value || '';
            const comments = this.querySelector('#rejectionComments')?.value || '';
            const notes = reason + (comments ? ': ' + comments : '');

            if (!reason) {
                Utils.showToast('Please select a rejection reason', 'error');
                return;
            }

            const response = await API.post(`/spare-part-requests/${orderId}/reject`, {
                reviewed_by: this.currentUser?.id,
                notes: notes
            });

            if (response.status === 'success') {
                Utils.showToast('Spare parts request rejected.', 'info');
                this.closeActionModal();
                await this.loadOrders();
            } else {
                Utils.showToast('Failed to reject: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            Utils.showToast('Failed to reject request: ' + error.message, 'error');
        }
    }

    viewOrderDetails(orderId) {
        const order = this.allOrders.find(r => r.id == orderId);
        if (!order) {
            Utils.showToast('Order not found', 'error');
            return;
        }

        const statusClass = order.status === 'Approved' ? 'status-approved' :
            order.status === 'Rejected' ? 'status-rejected' :
                order.status === 'Issued' ? 'status-resolved' : 'status-pending';
        const priorityClass = (order.priority || '').toLowerCase() === 'critical' ? 'status-critical' :
            (order.priority || '').toLowerCase() === 'high' ? 'status-low-stock' : 'status-pending';
        const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const reviewDate = order.reviewed_at ? new Date(order.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

        const ticketType = (order.ticket_id_formatted || '').startsWith('VBD') ? 'Vehicle Breakdown' :
            (order.ticket_id_formatted || '').startsWith('MBD') ? 'Machine Breakdown' :
                (order.ticket_id_formatted || '').startsWith('RBD') ? 'Routine Breakdown' : 'Fault Ticket';

        const partsHTML = order.items && order.items.length > 0
            ? `<table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                <thead><tr style="background: #f3f4f6;">
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Part Code</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Part Name</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                </tr></thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${item.part_code || '-'}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${item.part_name}</td>
                            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #f3f4f6; font-weight: 700;">${item.quantity}</td>
                        </tr>`).join('')}
                </tbody>
               </table>`
            : '<p style="color: #9ca3af;">No parts listed</p>';

        // Build action buttons for pending orders in the details modal
        let modalActions = '';
        if (order.status === 'Pending') {
            modalActions = `
            <div style="display: flex; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <button class="btn btn-success" id="approveFromDetails" data-id="${order.id}">
                    <i class="fas fa-check"></i> Approve Request
                </button>
                <button class="btn btn-danger" id="rejectFromDetails" data-id="${order.id}">
                    <i class="fas fa-times"></i> Reject Request
                </button>
            </div>`;
        }

        const modalContent = `
            <div class="form-section">
                <h5><i class="fas fa-info-circle"></i> Request Information</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <p><strong>Request ID:</strong> ${order.request_id}</p>
                    <p><strong>Status:</strong> <span class="status-text ${statusClass}">${order.status}</span></p>
                    <p><strong>Priority:</strong> <span class="status-text ${priorityClass}">${order.priority}</span></p>
                    <p><strong>Requested By:</strong> ${order.requested_by_name || '-'}</p>
                    <p><strong>Request Date:</strong> ${dateStr}</p>
                    <p><strong>Location:</strong> ${order.location || '-'}</p>
                </div>
            </div>
            <div class="form-section" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px;">
                <h5><i class="fas fa-ticket-alt" style="color: var(--tang-blue);"></i> Linked Ticket Summary</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <p><strong>Ticket ID:</strong> <span style="color: var(--tang-blue); font-weight: 700;">${order.ticket_id_formatted || '-'}</span></p>
                    <p><strong>Type:</strong> ${ticketType}</p>
                    <p><strong>Equipment:</strong> ${order.equipment_name || '-'}</p>
                    <p><strong>Ticket Status:</strong> <span class="status-text ${order.ticket_status?.toLowerCase().includes('approved') ? 'status-approved' : 'status-pending'}">${order.ticket_status || '-'}</span></p>
                </div>
                ${order.ticket_description ? `<p style="margin-top: 8px;"><strong>Description:</strong> ${order.ticket_description}</p>` : ''}
            </div>
            ${order.additional_notes ? `
            <div class="form-section">
                <h5><i class="fas fa-sticky-note"></i> Additional Notes</h5>
                <p>${order.additional_notes}</p>
            </div>` : ''}
            <div class="form-section">
                <h5><i class="fas fa-box"></i> Spare Parts Requested (${(order.items || []).length} items)</h5>
                ${partsHTML}
            </div>
            ${order.status !== 'Pending' ? `
            <div class="form-section">
                <h5><i class="fas fa-user-check"></i> Review Details</h5>
                <p><strong>Reviewed By:</strong> ${order.reviewed_by_name || '-'}</p>
                <p><strong>Review Date:</strong> ${reviewDate}</p>
                ${order.review_notes ? `<p><strong>Notes:</strong> ${order.review_notes}</p>` : ''}
            </div>` : ''}
            ${modalActions}
        `;

        this.createDetailsModal(`Spare Parts Request — ${order.request_id}`, modalContent, order.id);
    }

    createDetailsModal(title, content, orderId) {
        // Remove any existing detail modals
        document.querySelectorAll('.modal[id^="detailsModal_"]').forEach(m => {
            m.classList.remove('active');
            setTimeout(() => m.remove(), 300);
        });

        const modal = document.createElement('div');
        modal.id = `detailsModal_${orderId}`;
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind close button
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        // Bind overlay click
        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        // Bind action buttons if they exist
        const approveBtn = modal.querySelector('#approveFromDetails');
        if (approveBtn) {
            approveBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
                this.approveOrder(parseInt(approveBtn.dataset.id));
            });
        }

        const rejectBtn = modal.querySelector('#rejectFromDetails');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
                this.rejectOrder(parseInt(rejectBtn.dataset.id));
            });
        }
    }

    openActionModal() {
        const modal = this.querySelector('#orderActionModal');
        if (modal) modal.classList.add('active');
    }

    closeActionModal() {
        const modal = this.querySelector('#orderActionModal');
        if (modal) modal.classList.remove('active');
    }

    // Public method for parent to set current user
    setCurrentUser(user) {
        this.currentUser = user;
    }

    // Public method for parent to trigger refresh
    refresh() {
        this.loadOrders();
    }
}

customElements.define('inventory-orders-approvals', InventoryOrdersApprovals);
