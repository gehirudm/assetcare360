let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    try {
        loadingOverlay?.classList.add('active');

        const user = await DashboardInit.init(['Transportation Manager', 'Admin'], {
            updateUserDisplay: true
        });

        currentUser = user;
        bindLayoutSectionRouting();
        bindOverviewEvents();
    } catch (error) {
        console.error('Transportation manager bootstrap failed:', error);
        window.location.href = CONFIG.ROUTES.LOGIN;
    } finally {
        loadingOverlay?.classList.remove('active');
    }
});

function bindLayoutSectionRouting() {
    const layout = document.querySelector('ac-layout');
    if (!layout || layout._sectionRoutingBound) return;

    layout._sectionRoutingBound = true;
    layout.addEventListener('section-change', (event) => {
        const section = event.detail?.section;
        if (!section) return;

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('section', section);
        window.history.replaceState({}, '', nextUrl);
    });
}

function bindOverviewEvents() {
    const overview = document.querySelector('transport-overview');
    if (!overview || overview._overviewBridgeBound) return;

    overview._overviewBridgeBound = true;
    overview.addEventListener('transport-overview:navigate', (event) => {
        const section = event.detail?.section;
        const layout = document.querySelector('ac-layout');
        if (section && layout && typeof layout.navigateTo === 'function') {
            layout.navigateTo(section);
        }
    });

    overview.setUser(currentUser);
}
