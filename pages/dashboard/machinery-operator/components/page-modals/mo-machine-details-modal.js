class MOMachineDetailsModal extends HTMLElement {
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
            <div id="detailsModal_machine" class="modal" aria-hidden="true">
                <div class="modal-content" id="machineDetailsContent"></div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (event.target.id === 'detailsModal_machine' || (actionEl && actionEl.dataset.action === 'close-modal')) {
                this.close();
                return;
            }

            if (actionEl && actionEl.dataset.action === 'report-fault') {
                this.close();
                document.dispatchEvent(new CustomEvent('mo:open-report-fault-modal'));
            }
        });
    }

    open(machineId) {
        const machineMap = {
            'EXC-045': {
                name: 'Excavator #045',
                type: 'Hydraulic Excavator',
                hours: '1,847 / 2,000',
                lastService: 'July 15, 2024',
                location: 'Site A - Zone 3',
                status: 'Operational',
                fuelLevel: '75%',
                condition: 'Good - Minor hydraulic noise',
            },
            'TRK-203': {
                name: 'Truck #203',
                type: 'Heavy Duty Truck',
                hours: '2,340 / 2,500',
                lastService: 'August 10, 2024',
                location: 'Maintenance Bay 2',
                status: 'Under Repair',
                fuelLevel: '45%',
                condition: 'Under maintenance - MBD-003',
            },
            'LOD-128': {
                name: 'Loader #128',
                type: 'Front End Loader',
                hours: '890 / 2,000',
                lastService: 'June 20, 2024',
                location: 'Site B - Zone 1',
                status: 'Operational',
                fuelLevel: '90%',
                condition: 'Excellent - No issues',
            },
        };

        const machine = machineMap[machineId];
        if (!machine) {
            window.MOUtils.emitToast('Machine details are unavailable right now.', 'error');
            return;
        }

        const content = this.querySelector('#machineDetailsContent');
        if (!content) {
            return;
        }

        content.innerHTML = `
            <div class="modal-header">
                <h2><i class="fas fa-cog"></i> ${machine.name} Details</h2>
                <button class="btn-close" type="button" data-action="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="padding: 30px;">
                <div class="form-section">
                    <h5><i class="fas fa-wrench"></i> Machine Information</h5>
                    <div style="margin-bottom: 8px;"><strong>Machine ID:</strong> ${machineId}</div>
                    <div style="margin-bottom: 8px;"><strong>Type:</strong> ${machine.type}</div>
                    <div style="margin-bottom: 8px;"><strong>Status:</strong> <span class="status-text ${machine.status === 'Operational' ? 'status-approved' : 'status-pending'}">${machine.status}</span></div>
                    <div style="margin-bottom: 8px;"><strong>Location:</strong> ${machine.location}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-chart-bar"></i> Operating Hours</h5>
                    <div style="margin-bottom: 8px;"><strong>Current Hours:</strong> ${machine.hours}</div>
                    <div style="margin-bottom: 8px;"><strong>Last Service:</strong> ${machine.lastService}</div>
                    <div style="margin-bottom: 8px;"><strong>Service Status:</strong> ${machineId === 'EXC-045' ? 'Due in 153 hours' : 'Up to date'}</div>
                </div>
                <div class="form-section">
                    <h5><i class="fas fa-info-circle"></i> Current Condition</h5>
                    <div style="margin-bottom: 8px;"><strong>Overall Condition:</strong> ${machine.condition}</div>
                    <div style="margin-bottom: 8px;"><strong>Fuel Level:</strong> ${machine.fuelLevel}</div>
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--stone-200); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-primary" type="button" data-action="report-fault">
                        <i class="fas fa-exclamation-triangle"></i> Report Fault
                    </button>
                    <button class="btn btn-secondary" type="button" data-action="close-modal">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;

        this.querySelector('#detailsModal_machine')?.classList.add('active');
    }

    close() {
        this.querySelector('#detailsModal_machine')?.classList.remove('active');
    }
}

customElements.define('mo-machine-details-modal', MOMachineDetailsModal);
