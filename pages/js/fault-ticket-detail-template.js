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

    function formatEquipmentLabel(ticket) {
        if (!ticket) return 'N/A';
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
        formatEquipmentLabel,
        formatLkrCurrency
    };
})();
