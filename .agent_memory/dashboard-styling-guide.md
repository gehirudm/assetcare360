# Dashboard Styling Guide

Reference: `pages/dashboard/technical-officer/style.css`  
Use this as the canonical style template when building any new role dashboard page.

---

## 1. CSS Custom Properties (`:root`)

```css
:root {
    --royal-blue:   hsla(219, 89%, 53%, 1);
    --royal-blue-2: hsla(219, 75%, 50%, 1);
    --tang-blue:    hsla(219, 67%, 47%, 1);
    --kelly-green:  hsla(99, 60%, 43%, 1);
    --stone-100: #f7f9fb;   /* page background */
    --stone-200: #eef1f4;   /* borders, dividers */
    --text-900: #111827;
    --text-700: #374151;
    --muted:    #6b7280;
    --danger:   #d93025;
    --warn:     #f59e0b;
    --ok:       #10b981;
    --card:     #ffffff;
    --shadow:   0 4px 12px rgba(0,0,0,0.08);
    --ring:     0 0 0 3px rgba(59,130,246,.2);
    --gradient-blue: linear-gradient(to right, var(--royal-blue), var(--tang-blue));
}
```

---

## 2. Page Layout

```
body (background: var(--stone-100))
└── .container  (flex-direction: column; min-height: 100vh)
    ├── header.header
    └── .main-wrapper  (flex; flex: 1)
        ├── aside.sidebar  (width: 280px)
        └── main.main-content  (flex: 1; padding: 40px 30px 30px 36px)
            └── section.content-section[id]  (display:none → .active = display:block)
```

**Key rules:**
- `.content-section` has **no** background/shadow/border-radius — sections are transparent on the page background. Content cards handle their own elevation.
- `.content-section.active { display: block; }` with `animation: fadeIn 0.3s ease-in-out`

---

## 3. Header

```css
.header {
    background: var(--gradient-blue);
    color: white;
    padding: 15px 30px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
```

**Structure:**
```html
<header class="header">
  <div class="header-left">
    <div class="brand-logo">
      <span class="brand-name">AssetCare<span class="brand-highlight">360</span></span>
    </div>
    <div class="header-divider"></div>          <!-- 2px × 40px white rule -->
    <h1 class="header-title"><i class="fas fa-..."></i> [Role] Dashboard</h1>
  </div>
  <div class="header-user">
    <div class="user-info" onclick="window.location.href='/profile/index.html'" ...>
      <div class="user-avatar" id="userAvatar">T</div>
      <div class="user-details">
        <div class="user-name" id="userName">Loading...</div>
        <div class="user-meta">
          <span id="userEmployeeId"></span>
          <span class="separator">•</span>
          <span id="userRole"></span>
        </div>
      </div>
    </div>
    <button class="logout-btn" onclick="logout()">
      <i class="fas fa-sign-out-alt"></i><span>Logout</span>
    </button>
  </div>
</header>
```

- `brand-highlight` color: `#4fe200` (bright green)
- `header-divider`: `width:2px; height:40px; background: rgba(255,255,255,0.3)`

---

## 4. Sidebar

```css
.sidebar {
    width: 280px;
    background: linear-gradient(135deg, #4e73df, #2a59a0);
    color: #fff;
    padding: 20px 0;
    overflow-y: auto;
    box-shadow: 4px 0 20px rgba(0,0,0,0.15);
    border-right: 1px solid rgba(255,255,255,0.1);
}
```

**Nav items:**
```css
.nav-item {
    display: flex; align-items: center;
    padding: 15px 25px;
    border-left: 4px solid transparent;
    color: rgba(255,255,255,0.8);
    cursor: pointer; transition: all 0.3s ease;
}
.nav-item:hover  { background: rgba(255,255,255,0.1); border-left-color: #fff; color:#fff; transform: translateX(5px); }
.nav-item.active { background: rgba(255,255,255,0.15); border-left-color: #fff; font-weight:600; color:#fff; }
.nav-icon        { margin-right: 12px; font-size: 1.3rem; color: rgba(255,255,255,0.9); }
```

**Notification badge on nav item:**
```css
.nav-badge {
    margin-left: auto;
    background: #ef4444; color: #fff;
    font-size: 11px; font-weight: 700;
    min-width: 20px; height: 20px; padding: 0 5px;
    border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
}
```
Usage: `<span class="nav-badge" id="notifBadge" style="display:none;">0</span>` as last child of `.nav-item`

---

## 5. Page Header (inside each section)

```css
.page-header { margin-bottom: 30px; border-bottom: 2px solid var(--stone-200); padding-bottom: 15px; }
.page-title  { font-size: 2rem; color: var(--tang-blue); margin-bottom: 5px; }
.page-subtitle { color: var(--muted); font-size: 1.1rem; }
```

---

## 6. Summary Cards (Dashboard grid)

```html
<div class="grid">           <!-- 2-column grid, gap: 25px -->
  <div class="summary-card clickable" onclick="navigateTo('section')">
    <div class="summary-card-content">
      <div class="summary-icon"><i class="fas fa-..."></i></div>
      <div class="summary-details">
        <div class="summary-title">Label</div>
        <div class="summary-number" id="statId">0</div>
        <div class="summary-description">description text</div>
      </div>
    </div>
    <div class="summary-arrow"><i class="fas fa-chevron-right"></i></div>
  </div>
</div>
```

- Background: `linear-gradient(135deg, var(--royal-blue), var(--tang-blue))`
- `summary-icon`: 75×75px, `background: rgba(255,255,255,0.2)`, `border-radius:16px`, `font-size:2.2rem`
- `summary-number`: `font-size:3rem; font-weight:800`
- On hover: `translateY(-5px)`, deeper shadow; arrow shifts right

---

## 7. Content Cards

```css
.card {
    background: var(--card);
    border: 1px solid var(--stone-200);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
    transition: all 0.3s ease;
}
.card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.15); transform: translateY(-2px); }
.card-header { font-weight:600; color: var(--tang-blue); margin-bottom:15px; font-size:1.1rem; display:flex; align-items:center; gap:10px; }
```

---

## 8. Status Badges

Two variants: `.status-badge` (pill with background) and `.status-text` (coloured text, no background).

| Status | Badge BG | Text colour |
|---|---|---|
| `status-pending` | `var(--warn)` / `#000` | `#d97706` |
| `status-open` | `#3b82f6` / `#fff` | `#3b82f6` |
| `status-assigned` | `var(--royal-blue)` / `#fff` | `var(--royal-blue)` |
| `status-waiting-for-spare-parts` | `#f59e0b` / `#000` | `#f59e0b` |
| `status-parts-approved` | `#10b981` / `#fff` | `#10b981` |
| `status-in-progress` | `#3b82f6` / `#fff` | `#3b82f6` |
| `status-resolved` / `status-completed` | `var(--kelly-green)` / `#fff` | `var(--kelly-green)` |
| `status-closed` | `#6b7280` / `#fff` | `#6b7280` |
| `status-approved` | `var(--ok)` / `#fff` | `var(--ok)` |
| `status-rejected` | `var(--danger)` / `#fff` | `var(--danger)` |
| `status-high` | `#ef4444` / `#fff` | `#ef4444` |
| `status-medium` | `#f59e0b` / `#000` | `#f59e0b` |
| `status-low` | `#6b7280` / `#fff` | `#6b7280` |

---

## 9. Buttons

```css
.btn           { padding: 12px 24px; border-radius: 8px; font-size:1rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
.btn-primary   { background: var(--royal-blue); color: white; }
.btn-secondary { background: var(--stone-200); color: var(--text-700); }
.btn-success   { background: var(--kelly-green); color: white; }
.btn-warning   { background: var(--warn); color: #000; }
.btn-small     { padding: 8px 16px; font-size: 12px; }
.btn-mini      { padding: 6px 12px; font-size: 11px; }
```

---

## 10. Filter Pills

```css
.filter-controls { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
.filter-btn       { padding: 8px 16px; border: 2px solid var(--stone-200); border-radius:20px; font-size:12px; font-weight:600; }
.filter-btn.active { background: var(--royal-blue); color:white; border-color: var(--royal-blue); }
```

---

## 11. List Rows (tickets / requests)

```css
.ticket-item, .request-item {
    display: flex; justify-content:space-between; align-items:flex-start; gap:12px;
    border: 1px solid #e5e7eb; background:#fff;
    padding:12px; border-radius:8px; margin-bottom:10px;
    transition: all 0.2s ease;
}
.ticket-item:hover, .request-item:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
```

---

## 12. Forms

```css
.form-group   { margin-bottom: 20px; }
.form-label   { display:block; margin-bottom:8px; font-weight:700; color: var(--text-700); }
.form-input, .form-select, .form-textarea {
    width:100%; padding:12px 15px; border:1px solid var(--stone-200);
    border-radius:10px; font-size:14px;
}
.form-input:focus, ... { box-shadow: var(--ring); border-color: var(--royal-blue); }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.form-section { border:1px solid var(--stone-200); border-radius:10px; padding:16px; background:#fafcff; }
```

---

## 13. Modals

**Overlay (class="modal"):**
```css
.modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:1000; align-items:center; justify-content:center; }
.modal.active { display:flex; }
```

**Content box:**
```css
.modal-content { background:white; width:90%; max-width:800px; max-height:90vh; border-radius:15px; padding:30px; box-shadow:0 20px 60px rgba(0,0,0,0.3); overflow-y:auto; }
.modal-content:has(.modal-header) { padding:0; }
```

**Header strip (gradient blue):**
```css
.modal-header { background: var(--gradient-blue); color:white; padding:20px 30px; border-radius:15px 15px 0 0; ... }
```

**Close button (`class="close"`):**
```css
.close { position:absolute; right:15px; top:15px; width:35px; height:35px; border-radius:50%; background:var(--royal-blue); color:#fff; ... }
```

**Confirmation dialog (from `dashboard-init.js`):**
```css
.confirmation-modal { z-index:2000; }
/* renders as full-screen overlay — CSS override needed in sub-pages */
```
⚠️ The confirmation dialog injects `class="modal confirmation-modal"`. In role dashboard pages, `.modal` already acts as the overlay, so nothing special is needed. In sub-pages (e.g. detail pages) where `.modal` is a card, override `.confirmation-modal` to be `position:fixed; inset:0` explicitly.

---

## 14. Notification Cards (sidebar Notifications section)

```css
.notif-card { background:#fff; border:1px solid var(--stone-200); border-radius:10px; padding:16px 20px; margin-bottom:12px; display:flex; align-items:flex-start; gap:14px; }
.notif-card.notif-warning { border-left: 4px solid #f59e0b; }
.notif-card.notif-info    { border-left: 4px solid #3b82f6; }
.notif-card.notif-success { border-left: 4px solid #10b981; }
.notif-card.notif-danger  { border-left: 4px solid #ef4444; }
```

---

## 15. Toast

```css
.toast { position:fixed; top:20px; right:20px; background:var(--kelly-green); color:white; padding:15px 20px; border-radius:8px; display:none; z-index:1001; }
```

---

## 16. Responsive (≤ 768px)

- Sidebar: `position:fixed; top:70px; left:-100%; height:calc(100vh - 70px); z-index:999` → `.sidebar.open { left:0; }`
- Grid: single column
- Summary cards: reduced padding/icon size
- Form grid: single column

---

## 17. Script load order (important)

```html
<script src="../../js/config.js"></script>
<script src="../../js/api.js"></script>
<script src="../../js/auth.js"></script>
<script src="../../js/dashboard-init.js"></script>
<script src="./script.js"></script>
```

- Adjust `../../` depth to match the page's location relative to `pages/`
- `dashboard-init.js` provides: `DashboardInit.updateUserInfo(user)`, `createConfirmationDialog()`, `logout()`, `closeConfirmation()`, `confirmAction()`

---

## 18. Navigation pattern (query-param SPA)

```js
function navigateTo(sectionId) {
    const url = new URL(window.location.href);
    url.searchParams.set('section', sectionId);
    history.pushState({ section: sectionId }, '', url.toString());
    activateSection(sectionId);
}
function activateSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${sectionId}"]`)?.classList.add('active');
    document.getElementById(sectionId)?.classList.add('active');
}
function restoreSectionFromUrl() {
    const section = new URLSearchParams(window.location.search).get('section') || 'dashboard';
    activateSection(section);
}
window.addEventListener('popstate', e => activateSection((e.state?.section) || 'dashboard'));
document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', function() { navigateTo(this.dataset.section); }));
// Call at end of DOMContentLoaded: restoreSectionFromUrl();
```
