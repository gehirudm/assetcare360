/**
 * Minimal Font Awesome class definitions for shadow-DOM components.
 *
 * Exposes: window._ACStyles.icons
 *
 * WHY THIS EXISTS:
 * Shadow DOM does NOT inherit CSS class rules from the host page, so
 * `.fas .fa-check` etc. must be re-declared inside the shadow root.
 * However, @font-face declarations ARE global, so the font files loaded
 * by the FA Kit script in <head> are already available – we only need to
 * point the class rules at the same font family and supply the unicode
 * codepoints we use.
 *
 * HOW TO EXTEND:
 * Add a new `.fa-{name}::before { content: "\\fXXX"; }` line here whenever
 * a shadow-DOM component needs an icon not already listed below.
 * Codepoints are stable within a major FA version.
 */
(function () {
    window._ACStyles = window._ACStyles || {};
    if (window._ACStyles.icons) return; // guard: load once

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        /* ----- FA utility base ------------------------------------------ */
        .fas, .far, .fab, .fal,
        .fa-solid, .fa-regular, .fa-brands {
            -moz-osx-font-smoothing: grayscale;
            -webkit-font-smoothing: antialiased;
            display: inline-block;
            font-style: normal;
            font-variant: normal;
            text-rendering: auto;
            line-height: 1;
        }

        /* Solid weight — supports both FA 5 and FA 6 Kit naming */
        .fas, .fa-solid {
            font-family: "Font Awesome 6 Free", "Font Awesome 5 Free";
            font-weight: 900;
        }

        /* Regular weight */
        .far, .fa-regular {
            font-family: "Font Awesome 6 Free", "Font Awesome 5 Free";
            font-weight: 400;
        }

        /* ----- Icon codepoints used by shadow-DOM components ------------- */

        /* confirm-dialog */
        .fa-check::before                { content: "\\f00c"; }
        .fa-times::before                { content: "\\f00d"; }
        .fa-exclamation-triangle::before { content: "\\f071"; }
        .fa-question-circle::before      { content: "\\f059"; }

        /* to-shell-header (when migrated to shadow DOM) */
        .fa-chevron-down::before         { content: "\\f078"; }
        .fa-user-circle::before          { content: "\\f2bd"; }
        .fa-sign-out-alt::before         { content: "\\f2f5"; }
        .fa-user-cog::before             { content: "\\f4fe"; }

        /* to-shell-sidebar (when migrated to shadow DOM) */
        .fa-chart-line::before           { content: "\\f201"; }
        .fa-ticket-alt::before           { content: "\\f3ff"; }
        .fa-tools::before                { content: "\\f7d9"; }
        .fa-warehouse::before            { content: "\\f494"; }
        .fa-shield-alt::before           { content: "\\f3ed"; }
        .fa-comments::before             { content: "\\f086"; }
        .fa-bell::before                 { content: "\\f0f3"; }
    `);

    window._ACStyles.icons = sheet;
})();
