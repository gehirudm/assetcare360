class TOShellHeader extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'icon'];
    }

    connectedCallback() {
        this.style.display = 'contents';
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    get title() {
        return this.getAttribute('title') || 'Technical Officer Dashboard';
    }

    get icon() {
        return this.getAttribute('icon') || 'fa-tools';
    }

    render() {
        this.innerHTML = `<ac-header title="${this.title}" icon="${this.icon}"></ac-header>`;
    }

    updateUser(user) {
        const header = this.querySelector('ac-header');
        if (header && typeof header.updateUser === 'function') {
            header.updateUser(user);
        }
    }
}

if (!customElements.get('to-shell-header')) {
    customElements.define('to-shell-header', TOShellHeader);
}
