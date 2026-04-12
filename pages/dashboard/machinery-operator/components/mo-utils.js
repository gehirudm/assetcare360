(function setupMachineryOperatorUtils() {
    if (window.MOUtils) {
        return;
    }

    function formatDate(dateString) {
        if (!dateString) {
            return 'N/A';
        }

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return 'N/A';
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function getStatusInfo(status) {
        const statusMap = {
            Open: { label: 'Pending', class: 'status-pending', text: 'Pending' },
            Pending: { label: 'Pending', class: 'status-pending', text: 'Pending' },
            Assigned: { label: 'Assigned', class: 'status-assigned', text: 'Assigned' },
            'Waiting for Spare Parts': { label: 'Awaiting Parts', class: 'status-in-progress', text: 'Awaiting Parts' },
            'Parts Approved': { label: 'Parts Approved', class: 'status-assigned', text: 'Parts Approved' },
            'In Progress': { label: 'In Progress', class: 'status-in-progress', text: 'In Progress' },
            Resolved: { label: 'Finished', class: 'status-resolved', text: 'Finished' },
            Closed: { label: 'Finished', class: 'status-resolved', text: 'Finished' },
        };

        return statusMap[status] || { label: status || 'Pending', class: 'status-pending', text: status || 'Pending' };
    }

    function getUpdateText(status) {
        const updateMap = {
            Open: 'Awaiting supervisor review',
            Pending: 'Awaiting supervisor review',
            Assigned: 'Technician assigned to this ticket',
            'Waiting for Spare Parts': 'Waiting for spare parts to be approved',
            'Parts Approved': 'Spare parts approved, repair to begin soon',
            'In Progress': 'Being investigated and repaired',
            Resolved: 'Work completed and ticket resolved',
            Closed: 'Ticket closed',
        };

        return updateMap[status] || 'No updates';
    }

    function normalizeFilterStatus(status) {
        const value = String(status || '').toLowerCase();

        if (value === 'open' || value === 'pending') {
            return 'open';
        }

        if (value === 'assigned' || value.includes('progress') || value.includes('spare') || value.includes('parts')) {
            return 'in-progress';
        }

        if (value === 'resolved' || value === 'finished' || value === 'completed') {
            return 'resolved';
        }

        if (value === 'closed') {
            return 'closed';
        }

        return value || 'open';
    }

    function emitToast(message, type) {
        document.dispatchEvent(new CustomEvent('mo-ui:toast', {
            detail: { message, type: type || 'success' },
        }));
    }

    window.MOUtils = {
        formatDate,
        getStatusInfo,
        getUpdateText,
        normalizeFilterStatus,
        emitToast,
    };
})();
