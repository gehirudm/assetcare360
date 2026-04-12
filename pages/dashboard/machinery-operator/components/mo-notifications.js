class MONotifications extends HTMLElement {
    connectedCallback() {
        if (this._mounted) {
            return;
        }

        this._mounted = true;
        this.render();
        this.refresh();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Notifications</h1>
                <p class="page-subtitle">Supervisor approvals and repair updates</p>
            </div>

            <div class="card">
                <div class="card-header"><i class="fas fa-bell"></i> Recent Notifications</div>
                <div id="operatorNotificationsList"></div>
            </div>
        `;
    }

    refresh() {
        const notifications = [
            {
                icon: 'fa-check-circle',
                iconColor: 'var(--ok)',
                title: 'Ticket Approved',
                description: 'MBD-001 approved by Supervisor John - Technical Officer Mike assigned',
                time: 'Aug 22, 8:45 AM',
            },
            {
                icon: 'fa-wrench',
                iconColor: 'var(--royal-blue)',
                title: 'Repair Update',
                description: 'MBD-001 - Parts ordered, repair scheduled for tomorrow',
                time: 'Aug 22, 9:00 AM',
            },
            {
                icon: 'fa-check-circle',
                iconColor: 'var(--ok)',
                title: 'Weekly Check Report Approved',
                description: 'UPD-005 for Excavator #045 reviewed and approved by Supervisor John',
                time: 'Aug 22, 5:15 PM',
            },
            {
                icon: 'fa-clock',
                iconColor: 'var(--warn)',
                title: 'Service Reminder',
                description: 'Excavator #045 service due in 2 days (153 hours remaining)',
                time: 'Aug 22, 6:00 AM',
            },
            {
                icon: 'fa-thumbs-up',
                iconColor: 'var(--kelly-green)',
                title: 'Ticket Resolved',
                description: 'MBD-002 completed successfully - Loader #128 back in service',
                time: 'Aug 21, 3:30 PM',
            },
        ];

        const container = this.querySelector('#operatorNotificationsList');
        if (!container) {
            return;
        }

        container.innerHTML = notifications.map((notification) => `
            <div class="item-card">
                <div class="item-details">
                    <strong>
                        <i class="fas ${notification.icon}" style="color: ${notification.iconColor};"></i>
                        ${notification.title}
                    </strong>
                    <div class="item-description">${notification.description}</div>
                    <div class="item-meta">${notification.time}</div>
                </div>
            </div>
        `).join('');

        document.dispatchEvent(new CustomEvent('mo:notifications-count', {
            detail: { count: notifications.length },
        }));
    }
}

customElements.define('mo-notifications', MONotifications);
