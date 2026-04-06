---
description: "Use when implementing sub-headers, page headers, detail pages, breadcrumbs, or back navigation in frontend pages. Covers back button style, breadcrumb pattern, and sub-header layout rules."
applyTo: "pages/**"
---
# UI Navigation — Back Buttons & Sub-headers

## Back Navigation Style

**Never** use a large, pill-shaped or wide back button as the primary navigational element on a page or sub-header.

**Always** use one of these two modern patterns instead:

### Option A — Icon-only back button (preferred for detail pages)
A compact icon button placed on the left side of the sub-header. Width should be constrained to just the icon (and optionally a short word like "Back").

```html
<button class="back-icon-btn" onclick="window.location.href='../?section=tickets'" aria-label="Back to Tickets">
    <i class="fas fa-arrow-left"></i>
</button>
```

```css
.back-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1.5px solid var(--stone-200);
    background: var(--card);
    color: var(--text-700);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    transition: all 0.2s;
    flex-shrink: 0;
}
.back-icon-btn:hover {
    background: var(--stone-200);
    color: var(--text-900);
    transform: translateX(-2px);
}
```

### Option B — Breadcrumb trail (preferred for multi-level navigation)
A horizontal breadcrumb trail showing the navigation hierarchy. Use `>` or `fas fa-chevron-right` as separators.

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
    <a class="breadcrumb-item" href="../?section=dashboard">
        <i class="fas fa-chart-line"></i> Dashboard
    </a>
    <i class="breadcrumb-sep fas fa-chevron-right"></i>
    <a class="breadcrumb-item" href="../?section=tickets">
        Fault &amp; Repair Tickets
    </a>
    <i class="breadcrumb-sep fas fa-chevron-right"></i>
    <span class="breadcrumb-item breadcrumb-current">Ticket Detail</span>
</nav>
```

```css
.breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.875rem;
}
.breadcrumb-item {
    color: var(--muted);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 5px;
}
.breadcrumb-item:hover { color: var(--royal-blue); }
.breadcrumb-current {
    color: var(--text-900);
    font-weight: 600;
    cursor: default;
}
.breadcrumb-sep {
    font-size: 0.65rem;
    color: var(--muted);
}
```

## Sub-header Background

**Never** give a sub-header `div` a background color. Sub-headers must be transparent and blend into the page background (`var(--stone-100)`). Visual separation should come from spacing and typography alone — not from background fills, box shadows, or bottom borders on the container div.

```css
/* CORRECT — no background */
.detail-subheader {
    padding: 16px 0 20px;
    margin-bottom: 28px;
}

/* WRONG — background adds visual noise */
.detail-subheader {
    background: var(--card);        /* ✗ */
    border-bottom: 1px solid ...;   /* ✗ */
    box-shadow: ...;                /* ✗ */
}
```

This rule applies to any sub-header, section header, or page-title container `div` inside a content area. The shell `header.header` (top navbar) is exempt — it intentionally has a gradient background.

## Sub-header Layout

When a page needs a sub-header (e.g. a detail page inside a dashboard shell), structure it as:

```
[ back-icon-btn ]  [ page title ]  [ optional badge/chip ]
                   [ breadcrumb (if used instead) ]
```

- Place the back control on the **left** edge of the sub-header inner row
- Page title and optional status badges follow immediately to the right
- Sub-header lives **inside** `main.main-content`, below the shell header, above the page's main content
- Keep sub-header background consistent with the content area (`var(--card)` or inherit `var(--stone-100)`)

## Rules Summary

| Situation | Use |
|-----------|-----|
| Detail page (1 level deep) | Icon-only back button (Option A) |
| Deep drill-down (2+ levels) | Breadcrumb trail (Option B) |
| Modal / flyout navigation | No back button — use modal close (`×`) |
| Large rounded "← Back" button | **Never** — too visually heavy |
| Back button in the page header/navbar | **Never** — keep header clean, put back nav in sub-header only |
