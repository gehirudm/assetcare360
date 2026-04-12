---
name: webapp-testing
description: 'Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.'
argument-hint: 'Target URL, flow to test, and pass/fail criteria'
---

# Web Application Testing

Test and debug local web applications using Playwright automation with a browser-first workflow.

## Outcome

This skill produces:
- A reproducible browser test flow (navigation, interactions, assertions)
- Debug artifacts for failures (screenshots, console, network errors)
- A concise pass/fail summary with actionable findings

## When to Use

Use this skill when you need to:
- Test frontend functionality in a real browser
- Verify UI behavior and interactions
- Debug web application issues
- Capture screenshots for documentation or debugging
- Inspect browser console logs and failed requests
- Validate form submissions and end-user flows
- Check responsive behavior across viewports

## Decision Flow

1. Choose execution path:
- If Playwright MCP browser tools are available, use MCP first for fast iterative validation.
- If MCP tools are unavailable, run local Node.js Playwright scripts.

2. Check environment:
- Verify target app is running and reachable.
- Verify auth/session prerequisites for protected routes.

3. Select depth:
- Smoke: page load, key element presence, no severe errors.
- Flow: full interaction path with assertions.
- Debug: deep diagnostics (console, network, screenshots, retries).

4. Branch on failures:
- Navigation failure: verify server and base URL.
- Selector failure: inspect accessibility tree and stabilize selector strategy.
- Timeout failure: wait for route/state transitions explicitly.
- Assertion failure: capture artifacts and isolate state assumptions.

## Playwright MCP Quickstart

Use this sequence first when MCP browser tools are available:

1. Initialize MCP browser tools
- Activate browser interaction tools.
- Activate page capture tools.
- Optionally activate browser logs and network capture tools when available.

2. Open target page in MCP context
- Navigate using MCP browser navigate tool (for example `http://127.0.0.1:3000/auth/login.html`).
- If needed, create/select a tab and retry navigation.

3. Validate MCP session is alive
- Take an accessibility snapshot.
- Capture console messages (error/warning levels).
- Capture failed network requests.

4. Continue test flow
- Interact with page elements.
- Capture screenshots for key states.
- Record pass/fail outcomes with artifacts.

## MCP Startup Troubleshooting

If MCP operations fail with an error similar to:
- `browserBackend.callTool: Target page, context or browser has been closed`

Follow this recovery order:
1. Re-initialize MCP browser interaction and capture tools.
2. Create/select a fresh browser tab, then retry navigation.
3. Verify editor setting `workbench.browser.enableChatTools` is enabled.
4. If content access is still unavailable, use local Node Playwright scripts as fallback and document that MCP context could not be attached.

## Verified MCP Operation Pattern

The following pattern is confirmed working in this project session:

1. Reset stale MCP context
- Run browser close first. If the result says no open tabs, continue.

2. Create active page context
- Navigate directly to a URL (for example `https://example.com`) to force a fresh page.
- Confirm success by checking returned page URL/title and snapshot output.

3. Operate live on target app
- Navigate to app URL (for example `http://127.0.0.1:3000/auth/login.html`).
- Capture snapshot.
- Perform interactions (type, click, filters/navigation actions).
- Capture another snapshot and screenshot for before/after proof.

4. Capture diagnostics in the same MCP session
- Read console messages.
- Export network requests.
- Attach artifact paths in test report.

## Live MCP Validation Checklist

Treat MCP control as valid only when all checks pass:
- Navigation returns updated page URL and title.
- Snapshot reflects the current page state.
- At least one user action (click/type/select) changes page state.
- Screenshot artifact is written successfully.
- Console/network logs are retrievable in-session.

## Procedure

1. Preflight
- Confirm app URL is reachable (for example, http://127.0.0.1:3000).
- Confirm dependent services are running (API, DB, queue, auth).
- Define success criteria before testing.

2. Instrumentation
- Enable console capture.
- Track failed network requests.
- Set artifact directory for screenshots and logs.

3. Execute interactions
- Navigate to target page.
- Wait for stable page state.
- Perform interactions (click/type/select/submit) incrementally.
- Assert expected outcomes after each major step.

4. Failure handling
- On any failure, capture full-page screenshot and context logs.
- Record exact failing selector, URL, and recent console/network events.
- Retry only when failure is clearly timing-related.

5. Report
- Summarize pass/fail checks.
- Include screenshot paths and key error lines.
- Provide next-step fix suggestions when failing.

## Quality Criteria

A run is considered complete when all are true:
- Target route(s) load successfully.
- Required UI elements are visible and interactive.
- Expected text/state transitions are verified.
- No unhandled console errors relevant to the tested flow.
- Failure artifacts exist for any failed step.

## Selector Strategy

Use selectors in this order:
1. data-testid
2. ARIA role + accessible name
3. Stable element id
4. Avoid styling-class selectors unless no alternative exists

## Built-in Resources

- Helper utilities: [assets/test-helper.js](./assets/test-helper.js)
- Smoke-run template: [scripts/local-playwright-smoke.js](./scripts/local-playwright-smoke.js)

## Usage Examples

Example prompts to invoke this skill:
- "Use webapp-testing to smoke test http://127.0.0.1:3000 and report console/network errors."
- "Use webapp-testing to validate login flow from /auth to /dashboard with screenshots on failure."
- "Use webapp-testing to test the spare parts request form submission and verify success toast."

## Limitations

- Requires a running target app and reachable dependencies.
- Complex SSO or MFA flows may need environment-specific setup.
- Client-side race conditions can produce flaky tests without explicit waits.
