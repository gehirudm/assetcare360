(function initViewTicketRouting(globalScope) {
    function getTicketIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    function getReturnUrlFromParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get('return_to');
        if (!returnTo) return null;

        try {
            const resolved = new URL(returnTo, window.location.href);
            if (resolved.origin !== window.location.origin) {
                return null;
            }
            return resolved;
        } catch (error) {
            console.warn('Invalid return_to parameter ignored:', error);
            return null;
        }
    }

    function getRoleDashboardUrl(currentUser) {
        if (!currentUser || !currentUser.role) return null;

        const roleKey = currentUser.role.toUpperCase().replace(/\s+/g, '_');
        const dashboardPath = globalScope.CONFIG?.ROUTES?.DASHBOARD?.[roleKey];
        if (!dashboardPath) return null;

        return new URL(dashboardPath, window.location.origin);
    }

    function buildViewTicketUrl(ticketId) {
        const targetUrl = new URL('./index.html', window.location.href);
        targetUrl.searchParams.set('id', ticketId);

        const returnUrl = getReturnUrlFromParams();
        if (returnUrl) {
            targetUrl.searchParams.set('return_to', `${returnUrl.pathname}${returnUrl.search}`);
        }

        return targetUrl.toString();
    }

    function navigateBack(currentUser) {
        const returnUrl = getReturnUrlFromParams();
        if (returnUrl) {
            window.location.href = returnUrl.toString();
            return;
        }

        const dashboardUrl = getRoleDashboardUrl(currentUser);
        if (dashboardUrl) {
            window.location.href = dashboardUrl.toString();
            return;
        }

        window.history.back();
    }

    globalScope.ViewTicketRouting = {
        getTicketIdFromUrl,
        getReturnUrlFromParams,
        getRoleDashboardUrl,
        buildViewTicketUrl,
        navigateBack
    };
}(window));
