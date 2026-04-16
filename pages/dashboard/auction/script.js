function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast || !message) {
        return;
    }

    toast.textContent = message;
    toast.style.background = type === 'error' ? '#d93025' : type === 'warning' ? '#f59e0b' : '#5caf53';
    toast.style.display = 'block';

    window.clearTimeout(showToast._timerId);
    showToast._timerId = window.setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function bindAuctionEventBridges() {
    const layout = document.querySelector('ac-layout');

    document.addEventListener('auction-dashboard:navigate', (event) => {
        const section = event.detail?.section;
        if (!section || !layout || typeof layout.navigateTo !== 'function') {
            return;
        }

        layout.navigateTo(section);
    });

    document.addEventListener('auction-ui:toast', (event) => {
        const detail = event.detail || {};
        showToast(detail.message, detail.type || 'success');
    });

    document.addEventListener('auction-active-auctions:open-create-modal', () => {
        document.querySelector('auction-create-auction-modal')?.open();
    });

    document.addEventListener('auction-bidders:open-register-modal', () => {
        document.querySelector('auction-register-bidder-modal')?.open();
    });

    document.addEventListener('auction-assets:schedule', (event) => {
        const assetId = event.detail?.assetId;
        document.querySelector('auction-schedule-auction-modal')?.open();
        if (assetId) {
            showToast(`Scheduled auction for ${assetId}`);
        }
    });

    document.addEventListener('auction-active-auctions:view-details', (event) => {
        const auctionId = event.detail?.auctionId;
        if (!auctionId) {
            return;
        }

        document.querySelector('auction-details-modal')?.open(auctionId);
    });

    document.addEventListener('auction-active-auctions:view-bidders', (event) => {
        const auctionId = event.detail?.auctionId;
        if (!auctionId) {
            return;
        }

        document.querySelector('auction-bidders-modal')?.open(auctionId);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await DashboardInit.init(['Auction Officer'], { updateUserDisplay: true });
    bindAuctionEventBridges();
});
