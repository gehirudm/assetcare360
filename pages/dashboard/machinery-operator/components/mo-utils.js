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
        const normalizedValue = String(status || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
        if (normalizedValue === 'insurance claimed' || normalizedValue === 'insurance claim approved') {
            return { label: 'Resolved', class: 'status-resolved', text: 'Resolved' };
        }

        const statusMap = {
            Open: { label: 'Pending', class: 'status-pending', text: 'Pending' },
            Pending: { label: 'Pending', class: 'status-pending', text: 'Pending' },
            Assigned: { label: 'Assigned', class: 'status-assigned', text: 'Assigned' },
            'Waiting for Budget Approval': { label: 'Awaiting Approval', class: 'status-in-progress', text: 'Awaiting Approval' },
            'Waiting for Spare Parts': { label: 'Awaiting Parts', class: 'status-in-progress', text: 'Awaiting Parts' },
            'Parts Approved': { label: 'Parts Approved', class: 'status-assigned', text: 'Parts Approved' },
            'Parts Rejected': { label: 'Parts Rejected', class: 'status-rejected', text: 'Parts Rejected' },
            'In Progress': { label: 'In Progress', class: 'status-in-progress', text: 'In Progress' },
            'Insurance Claimed': { label: 'Resolved', class: 'status-resolved', text: 'Resolved' },
            Resolved: { label: 'Resolved', class: 'status-resolved', text: 'Resolved' },
            Closed: { label: 'Closed', class: 'status-resolved', text: 'Closed' },
        };

        return statusMap[status] || { label: status || 'Pending', class: 'status-pending', text: status || 'Pending' };
    }

    function getUpdateText(status) {
        const normalizedValue = String(status || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
        if (normalizedValue === 'insurance claimed' || normalizedValue === 'insurance claim approved') {
            return 'Ticket closed through insurance claim';
        }

        const updateMap = {
            Open: 'Awaiting supervisor review',
            Pending: 'Awaiting supervisor review',
            Assigned: 'Technician assigned to this ticket',
            'Waiting for Budget Approval': 'Budget report submitted and awaiting approval',
            'Waiting for Spare Parts': 'Waiting for spare parts to be approved',
            'Parts Approved': 'Spare parts approved, repair to begin soon',
            'Parts Rejected': 'Spare parts request was rejected and needs revision',
            'In Progress': 'Being investigated and repaired',
            'Insurance Claimed': 'Ticket closed through insurance claim',
            Resolved: 'Work completed and ticket resolved',
            Closed: 'Ticket closed',
        };

        return updateMap[status] || 'No updates';
    }

    function normalizeFilterStatus(status) {
        const value = String(status || '').trim().toLowerCase();
        const canonical = value.replace(/[_-]+/g, ' ');

        if (canonical === 'open' || canonical === 'pending') {
            return 'open';
        }

        if (canonical === 'assigned' || canonical.includes('progress') || canonical.includes('spare') || canonical.includes('parts')) {
            return 'in-progress';
        }

        if (
            canonical === 'resolved'
            || canonical === 'finished'
            || canonical === 'completed'
            || canonical === 'insurance claimed'
            || canonical === 'insurance claim approved'
        ) {
            return 'resolved';
        }

        if (canonical === 'closed') {
            return 'closed';
        }

        return canonical || 'open';
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
