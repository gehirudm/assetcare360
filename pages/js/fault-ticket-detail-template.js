(function registerFaultTicketDetailTemplate() {
    function normalizeStatus(status) {
        return (status || 'Unknown').toLowerCase().trim();
    }

    function normalizePriority(priority) {
        return (priority || 'Medium').toLowerCase().trim();
    }

    function toStatusClass(status) {
        return normalizeStatus(status).replace(/\s+/g, '-');
    }

    function toPriorityClass(priority) {
        return normalizePriority(priority).replace(/\s+/g, '-');
    }

    function formatDateTime(value) {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDateShort(value) {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatTicketDisplayId(ticket) {
        if (!ticket) return 'N/A';
        return ticket.breakdown_report_id || ticket.ticket_id || `#${ticket.id}`;
    }

    function isVehicleTicket(ticket) {
        if (!ticket) return false;

        const breakdownType = String(ticket.breakdown_type || '').toLowerCase().trim();
        if (breakdownType === 'vehicle_breakdown' || breakdownType === 'route_breakdown') {
            return true;
        }

        const vehicleId = Number(ticket.vehicle_id || ticket.breakdown_context?.vehicle_id || 0);
        const machineId = Number(ticket.machine_id || 0);

        return vehicleId > 0 && machineId <= 0;
    }

    function formatEquipmentLabel(ticket) {
        if (!ticket) return 'N/A';

        if (isVehicleTicket(ticket)) {
            const vehicleId = Number(ticket.vehicle_id || ticket.breakdown_context?.vehicle_id || 0);
            const numberPlate = String(ticket.number_plate || ticket.breakdown_context?.number_plate || '').trim();
            const vehicleName = String(ticket.vehicle_name || '').trim();
            const vehicleModel = String(ticket.breakdown_context?.equipment_model || ticket.machine_model_number || '').trim();

            const primaryLabel = numberPlate || String(ticket.breakdown_context?.equipment_label || '').trim();
            const secondaryLabel = vehicleName || vehicleModel;

            if (primaryLabel !== '' && secondaryLabel !== '' && secondaryLabel !== primaryLabel) {
                return `${primaryLabel} (${secondaryLabel})`;
            }

            if (primaryLabel !== '') {
                return primaryLabel;
            }

            if (secondaryLabel !== '') {
                return secondaryLabel;
            }

            if (vehicleId > 0) {
                return `Vehicle #${vehicleId}`;
            }

            return 'Vehicle';
        }

        return ticket.machine_model_number || ticket.machine_name || (ticket.machine_id ? `Machine #${ticket.machine_id}` : 'N/A');
    }

    function formatLkrCurrency(amount) {
        const value = Number.parseFloat(amount || 0);
        const safeAmount = Number.isFinite(value) ? value : 0;
        return `LKR ${safeAmount.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    window.FaultTicketDetailTemplate = {
        normalizeStatus,
        normalizePriority,
        toStatusClass,
        toPriorityClass,
        formatDateTime,
        formatDateShort,
        formatTicketDisplayId,
        isVehicleTicket,
        formatEquipmentLabel,
        formatLkrCurrency
    };
})();
