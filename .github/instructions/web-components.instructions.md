---
description: "Use when building any UI element, dashboard shell, header, sidebar, navigation, dropdown, card, form section, or reusable widget in frontend pages. Covers web component authoring, file organisation under pages/components/, light DOM vs shadow DOM, attribute-driven config, and reuse rules."
applyTo: "pages/**"
---
# Web Components — Authoring & Organisation

## Rule 1 — Always use Web Components for reusable UI

Any UI piece that appears on more than one page, or that mixes structure + behaviour, **must** be implemented as a Web Component using the native Custom Elements API. Do not repeat raw HTML blocks across pages.

```js
class MyWidget extends HTMLElement {
    connectedCallback() {
        this.render();
    }
    render() {
        this.innerHTML = `<div class="my-widget">...</div>`;
    }
}
customElements.define('my-widget', MyWidget);
```

---

## Rule 2 — One component per file, organised into subfolders under `pages/components/`

Every component file goes in **`pages/components/`**. Never put component files in `pages/js/` (that folder is for shared utilities: `config.js`, `api.js`, `auth.js`, `dashboard-init.js`).

**One component class per file.** Name the file exactly after the custom element it defines.

### Subfolder taxonomy

```
pages/
  components/
    shared/                ← used by ANY dashboard (confirm-dialog, toast-notification, etc.)
    technical-officer/     ← TO-specific components (to-shell-header, to-shell-sidebar)
    supervisor/            ← supervisor-specific components (future)
    [role-name]/           ← one subfolder per dashboard role
  js/                      ← shared utilities only
    config.js
    api.js
    auth.js
    dashboard-init.js
```

**Rules for choosing a subfolder:**
- If the component is used by two or more dashboards → `shared/`
- If the component is only used by one dashboard role → `[role-name]/`
- Components composed inside another component → same subfolder as the parent (they are not standalone pages consumers)

```js
// ✅ correct — to-shell-header.js defines exactly one component
class TOShellHeader extends HTMLElement { ... }
customElements.define('to-shell-header', TOShellHeader);

// ❌ wrong — two components in one file
class TOShellHeader extends HTMLElement { ... }
class TOShellSidebar extends HTMLElement { ... }
customElements.define('to-shell-header',  TOShellHeader);
customElements.define('to-shell-sidebar', TOShellSidebar);
```

---

## Rule 3 — Shadow DOM + adoptedStyleSheets for self-contained components; light DOM for layout components

### Self-contained UI components (dialogs, toasts, cards, badges…)

Use **shadow DOM** with **Constructable Stylesheets** (`adoptedStyleSheets`). Shadow DOM gives true style encapsulation so the component's CSS can never bleed into or be clobbered by the page.

- CSS custom properties from `:root` (colours, radii, etc.) **pierce shadow boundaries** automatically — no extra work needed for theming.
- Use `:host` / `:host(.modifier)` instead of the element tag selector.
- All internal DOM access uses `this.shadowRoot.querySelector(...)`.

```js
// Module-level — created ONCE, shared across all instances (no re-parsing)
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
    :host          { display: none; position: fixed; inset: 0; ... }
    :host(.active) { display: flex; }
    .content       { background: var(--card, #fff); ... }
`);

class MyDialog extends HTMLElement {
    constructor() {
        super();
        const root = this.attachShadow({ mode: 'open' });
        // Adopt shared sheets first, then own styles (allows overrides)
        root.adoptedStyleSheets = [
            ...(window._ACStyles?.buttons ? [window._ACStyles.buttons] : []),
            ...(window._ACStyles?.icons   ? [window._ACStyles.icons]   : []),
            sheet,
        ];
    }
    connectedCallback() {
        this.shadowRoot.innerHTML = `<div class="content">...</div>`;
    }
}
```

### Shared style modules (`pages/components/styles/`)

Put reusable `CSSStyleSheet` objects — buttons, icon definitions, form controls — in **`pages/components/styles/`**. Each file:
- Creates the sheet at IIFE scope (once per page load)
- Guards with `if (window._ACStyles.xxx) return;` so multiple includes are safe
- Registers on `window._ACStyles.<name>`

```
pages/components/styles/
  buttons.js   → window._ACStyles.buttons  (all .btn variants)
  icons.js     → window._ACStyles.icons    (Font Awesome class definitions + codepoints)
```

Load style modules **before** any component that adopts them.

### FA icons inside shadow DOM

Shadow DOM does **not** inherit `.fas`, `.fa-check` etc. from the page stylesheet.  
`@font-face` declarations **are** global, so the font files are available — but the CSS class rules must be re-declared in the shadow root. `icons.js` provides a shared `CSSStyleSheet` that covers the icons used by our components. When a new icon is needed inside a shadow-DOM component, add its codepoint to `pages/components/styles/icons.js`.

### Layout / structural components (shell headers, sidebars…)

Use **light DOM** when the component's visual appearance is defined by 40+ CSS classes that live in the dashboard's own `style.css`. Switching those to shadow DOM would require migrating all the CSS into the component file first.

- Apply the structural CSS class to the host: `this.classList.add('header')`.
- Page scripts can reach internal elements with `document.getElementById()` and `document.querySelector()` directly.
- Migrate to shadow DOM by moving the component's CSS out of `style.css` and into a Constructable Stylesheet inside the component file.

```js
// ✅ correct — layout component, light DOM, host class applied
connectedCallback() {
    this.classList.add('sidebar');
    this.innerHTML = `...`;
}

// ✅ correct — self-contained dialog, shadow DOM
constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [sharedButtonSheet, ownSheet];
}
```

### CSS variables for external theming

Any property that consumers might want to customise should be a CSS variable with a sensible default:

```css
/* In the component's CSSStyleSheet */
:host {
    --cd-max-width: 460px;
}
.content {
    max-width: var(--cd-max-width);
    background: var(--card, #fff);     /* falls back if --card not defined */
}
```

```html
<!-- Consumer overrides per-instance -->
<confirm-dialog style="--cd-max-width: 600px;"></confirm-dialog>
```

---

## Rule 4 — Apply host classes in `connectedCallback()`

When a component replaces a structural element (`<header>`, `<aside>`, etc.) apply the CSS class to `this` so existing stylesheet rules target it correctly.

```js
connectedCallback() {
    this.classList.add('header');   // <to-shell-header class="header">
    this.render();
}
```

---

## Rule 5 — Expose config via HTML attributes (not global variables)

Use `observedAttributes` + HTML attributes instead of `window.*` config objects.

```html
<!-- ✅ correct — config is declarative, visible in HTML source -->
<to-shell-sidebar mode="subpage" active-section="tickets" base-path="../"></to-shell-sidebar>

<!-- ❌ wrong — hidden global config, requires reading JS to understand behaviour -->
<script>window.TO_SHELL_CONFIG = { ... };</script>
<to-shell-sidebar></to-shell-sidebar>
```

```js
static get observedAttributes() {
    return ['active-section', 'mode', 'base-path'];
}
attributeChangedCallback() {
    if (this.isConnected) this.render();
}
get activeSection() { return this.getAttribute('active-section') || 'dashboard'; }
```

---

## Rule 6 — Register at the bottom of the file

Always call `customElements.define()` at the end of the file, after the class definition.

```js
// to-shell-header.js
customElements.define('to-shell-header', TOShellHeader);
```

---

## Rule 8 — Global state handling

Components should never read or write arbitrary `window.*` properties to share state.

### Component-local state — instance properties
Transient UI state (open/closed, loading, error) lives as instance properties set in the constructor and read in `render()`.

```js
class MyDropdown extends HTMLElement {
    constructor() {
        super();
        this._open = false;
    }
    connectedCallback() { this.render(); }
    toggle() { this._open = !this._open; this.render(); }
    render() {
        this.querySelector('.menu').style.display = this._open ? 'block' : 'none';
    }
}
```

### Cross-component / cross-page state — utility module, not `window.*`
State that multiple pages or components need (current user, notification counts) is owned by a single utility (`dashboard-init.js`) and pushed into components via explicit DOM update calls. Components expose **named update methods** so callers don't need to know their internal structure.

```js
// ✅ correct — component exposes an update method
class TOShellHeader extends HTMLElement {
    updateUser(user) {
        this.querySelector('#userAvatar').textContent    = user.initials;
        this.querySelector('#profileMenuAvatar').textContent = user.initials;
        this.querySelector('#userName').textContent     = user.full_name;
        this.querySelector('#userRole').textContent     = user.role;
        this.querySelector('#userEmployeeId').textContent = user.employee_id;
    }
}

// caller (dashboard-init.js or script.js):
document.querySelector('to-shell-header').updateUser(user);

// ❌ wrong — scattered window.* properties
window.currentUser = user;
// component reads window.currentUser in render() — hidden coupling
```

### Notification badge — push, don't poll
When a component displays a live count (e.g. `#notifBadge`), the page script computes the count and calls the component's update method. The component never fetches data itself.

```js
// script.js
const count = tickets.filter(isActionable).length;
document.querySelector('to-shell-sidebar').setNotifBadge(count);
```

---

## Rule 7 — Load component scripts before dependent page scripts

Load order in HTML: **config → api → auth → style modules → components → dashboard-init → script.js**

Style modules (from `pages/components/styles/`) must come before any shadow-DOM component that adopts them.

```html
<script src="../../js/config.js"></script>
<script src="../../js/api.js"></script>
<script src="../../js/auth.js"></script>
<!-- Shared layout components (light DOM, no style deps) -->
<script src="../../components/shared/ac-header.js"></script>
<script src="../../components/shared/ac-sidebar.js"></script>
<script src="../../components/shared/ac-layout.js"></script>
<!-- Style modules BEFORE shadow-DOM components -->
<script src="../../components/styles/buttons.js"></script>
<script src="../../components/styles/icons.js"></script>
<script src="../../components/shared/confirm-dialog.js"></script>
<script src="../../js/dashboard-init.js"></script>
<script src="./script.js"></script>
```

Adjust relative path depth based on where the page lives under `pages/`.

---

## Rule 9 — Use `<ac-layout>` for all dashboard shells

Every dashboard page **must** use the three shared layout components instead of raw `<header>`, `<aside>`, and navigation JS:

| Old pattern (remove) | New pattern (use) |
|---|---|
| `<header class="header">` ... `</header>` | `<ac-header title="..." icon="fa-...">` |
| `<aside class="sidebar"><nav>` ... `</nav></aside>` | Part of `<ac-layout nav='[...]'>` |
| `document.querySelectorAll('.nav-item').forEach(...)` | Listen to `section-change` event |
| `function navigateTo(id) { ... }` | `document.querySelector('ac-layout').navigateTo(id)` |

### How to migrate a dashboard

**Before (raw HTML + imperative JS):**
```html
<header class="header">
    <div class="header-left">...</div>
    <div class="header-user">
        <div class="user-avatar" id="userAvatar">S</div>
        <div id="userName">Loading...</div>
        <button onclick="logout()">Logout</button>
    </div>
</header>
<div class="main-wrapper">
    <aside class="sidebar">
        <nav>
            <div class="nav-item active" data-section="dashboard">...</div>
            <div class="nav-item" data-section="fault-tickets">...</div>
        </nav>
    </aside>
    <main class="main-content">
        <section class="content-section active" id="dashboard">...</section>
        <section class="content-section" id="fault-tickets">...</section>
    </main>
</div>
```
```js
// script.js — remove all of this boilerplate:
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() { ... });
});
function navigateTo(sectionId) { ... }
```

**After (component-based):**
```html
<ac-layout
    title="Supervisor Dashboard"
    icon="fa-user-tie"
    active-section="dashboard"
    nav='[
        { "section": "dashboard",     "icon": "fas fa-chart-line",          "label": "Dashboard" },
        { "section": "fault-tickets", "icon": "fas fa-exclamation-triangle", "label": "Fault Tickets" }
    ]'>
    <section class="content-section" id="dashboard">...</section>
    <section class="content-section" id="fault-tickets">...</section>
</ac-layout>
```
```js
// script.js — single event listener replaces all nav boilerplate:
document.querySelector('ac-layout')
    .addEventListener('section-change', e => loadSectionData(e.detail.section));
```

### `<ac-layout>` nav item format
Each object in the `nav` JSON array:
```json
{
    "section": "notifications",
    "icon":    "fas fa-bell",
    "label":   "Notifications",
    "badge":   true
}
```
- `section` — matches the `id` of the corresponding `<section class="content-section">` element
- `icon`    — full Font Awesome class string, e.g. `"fas fa-chart-line"`
- `label`   — display text
- `badge`   — optional; `true` on exactly one item to show a notification count badge

### Notification badge
```js
document.querySelector('ac-layout ac-sidebar').setNotifBadge(count);
```

### `window.navigateTo` / `window.navigateToSection`
`<ac-layout>` automatically registers both as globals pointing to its own `navigateTo()` method, so existing `onclick="navigateTo('section')"` attributes in section HTML continue to work without changes.

---

## Existing components & style modules

### Style modules (`pages/components/styles/`)

| File | Global | Contents |
|------|--------|----------|
| `styles/buttons.js` | `window._ACStyles.buttons` | `.btn` + all colour variants + size modifiers |
| `styles/icons.js`   | `window._ACStyles.icons`   | FA utility classes + codepoints for icons used by components |

### Components

| File | Element | DOM | Scope | Purpose |
|------|---------|-----|-------|---------|
| `shared/ac-header.js` | `<ac-header>` | light | shared | Unified dashboard header with profile dropdown |
| `shared/ac-sidebar.js` | `<ac-sidebar>` | light | shared | Unified dashboard sidebar nav |
| `shared/ac-layout.js` | `<ac-layout>` | light | shared | Composes header + sidebar + main, handles section switching |
| `shared/confirm-dialog.js` | `<confirm-dialog>` | **shadow** | shared | Confirmation/alert modal |
| `technical-officer/to-shell-header.js` | `<to-shell-header>` | light | technical-officer | TO-specific header (kept until migrated to `<ac-header>`) |
| `technical-officer/to-shell-sidebar.js` | `<to-shell-sidebar>` | light | technical-officer | TO-specific sidebar (kept until migrated to `<ac-layout>`) |

Update these tables whenever a new component or style module is added.
