class TONotifications extends HTMLElement {
    constructor() {
        super();
        this.currentUser = null;
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        this.render();
        this.addEventListener('click', this._onRootClick);
        this._initialized = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
    }

    setCurrentUser(user) {
        this.currentUser = user || null;
    }

    async refresh() {
        await this.loadNotifications();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2 class="page-title"><i class="fas fa-bell"></i> Notifications</h2>
                <p class="page-subtitle">Tickets and updates that require your attention</p>
            </div>
            <div class="to-notifications-list">
                <div class="notif-empty" style="display:none;">
                    <i class="fas fa-check-circle"></i>
                    <p>You're all caught up! No pending notifications.</p>
                </div>
            </div>
        `;
    }

    async loadNotifications() {
        const list = this.querySelector('.to-notifications-list');
        const empty = this.querySelector('.notif-empty');

        if (!list || !empty) return;

        // Remove old notification cards while preserving empty state element.
        list.querySelectorAll('.notif-card').forEach(el => el.remove());

        if (!this.currentUser || !this.currentUser.id) {
            empty.style.display = 'block';
            this.updateBadge(0);
            return;
        }

        try {
            const response = await API.get('/fault-tickets');
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load notifications');
            }

            const tickets = (response.data && (response.data.tickets || response.data)) || [];
            const myTickets = tickets.filter(ticket =>
                ticket.assignments &&
                Array.isArray(ticket.assignments) &&
                ticket.assignments.some(assignment => assignment.assigned_to == this.currentUser.id)
            );

            const notifications = [];

            myTickets.forEach(ticket => {
                const status = String(ticket.status || '').toLowerCase();
                const ticketId = ticket.ticket_id || ticket.id;
                const asset = ticket.machine_name || ticket.vehicle_name || ticket.asset_name || 'Asset';

                if (status === 'assigned') {
                    notifications.push({
                        type: 'info',
                        icon: 'fa-ticket-alt',
                        title: `New ticket assigned - ${ticketId}`,
                        desc: `${ticket.issue || ticket.description || 'No description'} | ${asset}`,
                        action: { label: 'View Ticket', section: 'tickets' }
                    });
                } else if (status === 'parts approved') {
                    notifications.push({
                        type: 'success',
                        icon: 'fa-boxes',
                        title: `Spare parts approved - ${ticketId}`,
                        desc: `Parts for ${asset} have been approved. You can begin work.`,
                        action: { label: 'View Ticket', section: 'tickets' }
                    });
                } else if (status === 'waiting for budget approval') {
                    notifications.push({
                        type: 'warning',
                        icon: 'fa-file-invoice-dollar',
                        title: `Budget pending approval - ${ticketId}`,
                        desc: `Budget report for ${asset} is awaiting supervisor review.`,
                        action: null
                    });
                } else if (status === 'waiting for spare parts') {
                    notifications.push({
                        type: 'warning',
                        icon: 'fa-tools',
                        title: `Waiting for spare parts - ${ticketId}`,
                        desc: `Parts request for ${asset} is pending fulfillment.`,
                        action: null
                    });
                }
            });

            const actionableCount = notifications.filter(item => item.action !== null).length;
            this.updateBadge(actionableCount);

            if (notifications.length === 0) {
                empty.style.display = 'block';
                return;
            }

            empty.style.display = 'none';

            notifications.forEach(notification => {
                const card = document.createElement('div');
                card.className = `notif-card notif-${notification.type}`;
                card.innerHTML = `
                    <div class="notif-icon"><i class="fas ${notification.icon}"></i></div>
                    <div class="notif-body">
                        <div class="notif-title">${notification.title}</div>
                        <div class="notif-desc">${notification.desc}</div>
                        ${notification.action ? `
                            <div class="notif-action">
                                <button
                                    class="btn btn-small btn-primary"
                                    data-action-section="${notification.action.section}">
                                    ${notification.action.label}
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;

                list.appendChild(card);
            });
        } catch (error) {
            console.error('to-notifications load error:', error);
            this.updateBadge(0);

            const errEl = document.createElement('div');
            errEl.className = 'notif-card notif-danger';
            errEl.innerHTML = `
                <div class="notif-icon"><i class="fas fa-exclamation-circle"></i></div>
                <div class="notif-body">
                    <div class="notif-title">Failed to load notifications</div>
                    <div class="notif-desc">Please refresh the page and try again.</div>
                </div>
            `;

            list.appendChild(errEl);
            empty.style.display = 'none';
        }
    }

    updateBadge(count) {
        const sidebar = document.querySelector('to-shell-sidebar');
        if (sidebar && typeof sidebar.setNotifBadge === 'function') {
            sidebar.setNotifBadge(count);
        }
    }

    _onRootClick(event) {
        const actionButton = event.target.closest('button[data-action-section]');
        if (!actionButton) return;

        const section = actionButton.dataset.actionSection;
        if (!section) return;

        this.dispatchEvent(new CustomEvent('technical-officer-notifications:navigate', {
            bubbles: true,
            detail: { section }
        }));
    }
}

if (!customElements.get('to-notifications')) {
    customElements.define('to-notifications', TONotifications);
}
