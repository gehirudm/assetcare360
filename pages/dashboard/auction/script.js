// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.getAttribute('data-section')).classList.add('active');
    });
});

function navigateTo(sectionId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    document.getElementById(sectionId).classList.add('active');
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#d93025' : type === 'warning' ? '#f59e0b' : '#5caf53';
    toast.style.display = 'block';
    setTimeout(() => (toast.style.display = 'none'), 3000);
}

// Filter functions
function filterAuctions(status) {
    filterItems('auctionsContainer', status, 'auctions');
}

function filterAssets(criteria) {
    const cards = document.querySelectorAll('#assetsContainer .item-card');
    let count = 0;
    cards.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        const cardType = card.getAttribute('data-type');
        let shouldShow = false;

        if (criteria === 'all') shouldShow = true;
        else if (criteria === 'good' && cardStatus === 'good') shouldShow = true;
        else if (criteria === 'fair' && cardStatus === 'fair') shouldShow = true;
        else if (criteria === 'vehicles' && cardType === 'vehicles') shouldShow = true;
        else if (criteria === 'equipment' && cardType === 'equipment') shouldShow = true;

        card.style.display = shouldShow ? 'flex' : 'none';
        if (shouldShow) count++;
    });
    const trigger = typeof event !== 'undefined' ? event.target : null;
    updateFilterButtons(trigger);
    showToast(`Showing ${count} assets`);
}

function filterBidders(criteria) {
    const cards = document.querySelectorAll('#biddersContainer .item-card');
    let count = 0;
    cards.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        const cardType = card.getAttribute('data-type');
        let shouldShow = false;

        if (criteria === 'all') shouldShow = true;
        else if (criteria === 'pending' && cardStatus === 'pending') shouldShow = true;
        else if (criteria === 'verified' && cardStatus === 'verified') shouldShow = true;
        else if (criteria === 'company' && cardType === 'company') shouldShow = true;
        else if (criteria === 'individual' && cardType === 'individual') shouldShow = true;

        card.style.display = shouldShow ? 'flex' : 'none';
        if (shouldShow) count++;
    });
    const trigger = typeof event !== 'undefined' ? event.target : null;
    updateFilterButtons(trigger);
    showToast(`Showing ${count} bidders`);
}

function filterSchedule(criteria) {
    const cards = document.querySelectorAll('#scheduleContainer .item-card');
    let count = 0;
    cards.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        const cardPeriod = card.getAttribute('data-period');
        let shouldShow = false;

        if (criteria === 'all') shouldShow = true;
        else if (criteria === 'scheduled' && cardStatus === 'scheduled') shouldShow = true;
        else if (criteria === 'published' && cardStatus === 'published') shouldShow = true;
        else if (criteria === 'this-week' && cardPeriod === 'this-week') shouldShow = true;

        card.style.display = shouldShow ? 'flex' : 'none';
        if (shouldShow) count++;
    });
    const trigger = typeof event !== 'undefined' ? event.target : null;
    updateFilterButtons(trigger);
    showToast(`Showing ${count} scheduled auctions`);
}

function filterReports(status) {
    filterItems('reportsContainer', status, 'reports');
}

function filterItems(containerId, status, label) {
    const cards = document.querySelectorAll(`#${containerId} .item-card`);
    let count = 0;
    cards.forEach(card => {
        const matches = status === 'all' || card.getAttribute('data-status') === status;
        card.style.display = matches ? 'flex' : 'none';
        if (matches) count++;
    });
    const trigger = typeof event !== 'undefined' ? event.target : null;
    updateFilterButtons(trigger);
    showToast(`Showing ${count} ${label}`);
}

function updateFilterButtons(activeBtn) {
    if (!activeBtn || !activeBtn.parentElement) return;
    activeBtn.parentElement.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

// View Details Functions
function viewAuctionDetails(id) {
    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal active';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Auction Details - ${id}</h2>
            <div class="form-section">
                <h5><i class="fas fa-gavel"></i> Auction Information</h5>
                <div><strong>Auction ID:</strong> ${id}</div>
                <div><strong>Asset:</strong> Truck LX-A-9876 (2019)</div>
                <div><strong>Status:</strong> <span class="status-badge status-in-progress">Active - Ending Soon</span></div>
                <div><strong>Created:</strong> Oct 15, 2025</div>
                <div><strong>Start Time:</strong> Oct 17, 2025 10:00 AM</div>
                <div><strong>End Time:</strong> Oct 19, 2025 04:30 PM</div>
                <div><strong>Time Remaining:</strong> 2 hours 15 minutes</div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-money-bill-wave"></i> Bidding Information</h5>
                <div><strong>Reserve Price:</strong> $18,000</div>
                <div><strong>Starting Bid:</strong> $18,000</div>
                <div><strong>Current Bid:</strong> $18,500</div>
                <div><strong>Above Reserve:</strong> 2.8%</div>
                <div><strong>Total Bidders:</strong> 12</div>
                <div><strong>Total Bids:</strong> 27</div>
                <div><strong>Bid Increment:</strong> $100</div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-truck"></i> Asset Details</h5>
                <div><strong>Make/Model:</strong> Truck LX-A-9876</div>
                <div><strong>Year:</strong> 2019</div>
                <div><strong>Mileage:</strong> 85,000 km</div>
                <div><strong>Condition:</strong> Good</div>
                <div><strong>Location:</strong> Main Depot - Colombo</div>
            </div>
            <div class="form-section">
                <h5><i class="fas fa-chart-bar"></i> Bidding Activity</h5>
                <div style="margin-bottom: 8px;">
                    <strong>Recent Bids:</strong><br>
                    $18,500 - BID-032 (M. Jayasekara) - 5 min ago<br>
                    $18,400 - BID-014 (Next Motors) - 12 min ago<br>
                    $18,300 - BID-032 (M. Jayasekara) - 25 min ago<br>
                    $18,200 - BID-045 (R. Fernando) - 1 hour ago
                </div>
            </div>
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(detailsModal);
}

function viewBidders(auctionId) {
    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal active';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            <h2 style="margin-bottom: 20px; color: var(--tang-blue);">Bidders for ${auctionId}</h2>
            <div class="form-section">
                <h5><i class="fas fa-users"></i> Registered Bidders (12)</h5>
                <div style="margin-bottom: 8px;">
                    <strong>Active Bidders:</strong><br><br>
                    <strong>BID-032</strong> - M. Jayasekara | Individual<br>
                    Last Bid: $18,500 (5 min ago) | Total Bids: 8<br><br>
                    <strong>BID-014</strong> - Next Motors (Pvt) | Company<br>
                    Last Bid: $18,400 (12 min ago) | Total Bids: 6<br><br>
                    <strong>BID-045</strong> - R. Fernando | Individual<br>
                    Last Bid: $18,200 (1 hour ago) | Total Bids: 5
                </div>
            </div>
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
        </div>
    `;
    document.body.appendChild(detailsModal);
}

// Quick action helpers
function viewAssetDetails(assetId) {
    showToast(`Viewing asset: ${assetId}`);
}

function scheduleAssetAuction(assetId) {
    showToast(`Scheduled auction for ${assetId}`);
}

function approveBidder(bidderId) {
    showToast(`Bidder ${bidderId} approved`);
}

function viewBidderDetails(bidderId) {
    showToast(`Viewing bidder ${bidderId}`);
}

function editSchedule(auctionId) {
    showToast(`Editing schedule for ${auctionId}`);
}

function publishAuction(auctionId) {
    showToast(`Publishing ${auctionId}`);
}

function viewReportDetails(reportId) {
    showToast(`Viewing report ${reportId}`);
}

function exportToCSV() {
    showToast('Exporting report data...');
}

// Dismiss modals when clicking the overlay
window.addEventListener('click', evt => {
    if (evt.target.classList.contains('modal')) {
        if (evt.target.id) {
            if (evt.target.id === 'confirmationModal') {
                closeConfirmation();
            } else {
                closeModal(evt.target.id);
            }
        } else {
            evt.target.remove();
        }
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Enforce auth and populate header
    await DashboardInit.init(['Auction Officer'], { updateUserDisplay: true });

    const createAuctionForm = document.getElementById('createAuctionForm');
    if (createAuctionForm) {
        createAuctionForm.addEventListener('submit', e => {
            e.preventDefault();
            showToast('Auction created successfully');
            closeModal('createAuctionModal');
            createAuctionForm.reset();
        });
    }

    const registerBidderForm = document.getElementById('registerBidderForm');
    if (registerBidderForm) {
        registerBidderForm.addEventListener('submit', e => {
            e.preventDefault();
            showToast('Bidder registered successfully');
            closeModal('registerBidderModal');
            registerBidderForm.reset();
        });
    }

    const scheduleAuctionForm = document.getElementById('scheduleAuctionForm');
    if (scheduleAuctionForm) {
        scheduleAuctionForm.addEventListener('submit', e => {
            e.preventDefault();
            showToast('Auction schedule saved');
            closeModal('scheduleAuctionModal');
            scheduleAuctionForm.reset();
        });
    }

    const reportFilters = document.getElementById('reportFilters');
    if (reportFilters) {
        reportFilters.addEventListener('submit', e => {
            e.preventDefault();
            showToast('Filters applied');
        });
    }
});
