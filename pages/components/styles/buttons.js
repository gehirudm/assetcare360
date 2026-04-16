/**
 * Shared button CSSStyleSheet for shadow-DOM components.
 *
 * Exposes: window._ACStyles.buttons
 *
 * Load this before any component that depends on it.
 * All colour values use CSS custom properties so the host page's :root
 * theme tokens are inherited across shadow boundaries automatically.
 */
(function () {
    window._ACStyles = window._ACStyles || {};
    if (window._ACStyles.buttons) return; // guard: load once

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            text-align: center;
        }

        .btn-primary {
            background: var(--royal-blue, #2563eb);
            color: white;
        }
        .btn-primary:hover {
            background: var(--tang-blue, #1d4ed8);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
            background: var(--stone-200, #e2e8f0);
            color: var(--text-700, #374151);
        }
        .btn-secondary:hover {
            background: #cbd5e0;
            transform: translateY(-1px);
        }

        .btn-danger {
            background: var(--danger, #dc2626);
            color: white;
        }
        .btn-danger:hover {
            background: #c53030;
            transform: translateY(-1px);
        }

        .btn-warning {
            background: var(--warn, #f59e0b);
            color: #000;
        }
        .btn-warning:hover {
            background: #d97706;
            transform: translateY(-1px);
        }

        .btn-info {
            background: var(--info, #3b82f6);
            color: white;
        }
        .btn-info:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }

        .btn-success {
            background: var(--kelly-green, #16a34a);
            color: white;
        }
        .btn-success:hover {
            background: #059669;
            transform: translateY(-1px);
        }

        .btn-small {
            padding: 8px 16px;
            font-size: 12px;
        }

        .btn-mini {
            padding: 6px 12px;
            font-size: 11px;
            margin: 2px;
        }
    `);

    window._ACStyles.buttons = sheet;
})();
