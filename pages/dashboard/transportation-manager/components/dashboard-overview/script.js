class TransportOverview extends HTMLElement {
    constructor() {
        super();
        this._user = null;
        this._onRootClick = this._onRootClick.bind(this);
    }

    connectedCallback() {
        this.render();
        if (this._eventsBound) return;
        this.addEventListener('click', this._onRootClick);
        this._eventsBound = true;
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._onRootClick);
        this._eventsBound = false;
    }

    setUser(user) {
        this._user = user || null;
        this.render();
    }

    _onRootClick(event) {
        const trigger = event.target.closest('[data-go-section]');
        if (!trigger) return;

        const section = trigger.getAttribute('data-go-section');
        if (!section) return;

        this.dispatchEvent(new CustomEvent('transport-overview:navigate', {
            detail: { section },
            bubbles: true
        }));
    }

    render() {
        const displayName = this._user?.full_name?.trim() || 'Transportation Manager';
        const firstName = displayName.split(' ')[0];
        this.innerHTML = `
            <div class="card">
                <h3><i class="fas fa-route"></i> Welcome, ${firstName}</h3>
                <p>Use the quick actions below to navigate transportation workflows.</p>
                <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
                    <button class="btn" type="button" data-go-section="fleet-overview">Fleet Overview</button>
                    <button class="btn" type="button" data-go-section="route-planning">Route Planning</button>
                    <button class="btn" type="button" data-go-section="assignments">Assignments</button>
                </div>
            </div>
        `;
    }
}

customElements.define('transport-overview', TransportOverview);
