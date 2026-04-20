# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: driver-dashboard/validate-driver-dashboard.spec.js >> driver dashboard mobile validation
- Location: driver-dashboard/validate-driver-dashboard.spec.js:786:1

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('#addGarageProgressBtn')
    - locator resolved to <button type="button" class="btn btn-action" id="addGarageProgressBtn" onclick="openDriverGarageProgress()">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
      - waiting 100ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting 500ms

```

```
Error: write EPIPE
```