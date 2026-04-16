# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: driver-dashboard/validate-driver-dashboard.spec.js >> driver dashboard desktop validation
- Location: driver-dashboard/validate-driver-dashboard.spec.js:331:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('ac-layout')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('ac-layout')

```

# Page snapshot

```yaml
- generic [ref=e2]: "{\"status\":\"error\",\"message\":\"Endpoint not found\"}"
```

# Test source

```ts
  137 |                         destination: 'Matara',
  138 |                         vehicle_registration: 'LKA-1234',
  139 |                         starting_odometer: 45300,
  140 |                         status: 'Pending',
  141 |                         created_at: '2026-04-12T10:00:00Z',
  142 |                     },
  143 |                 },
  144 |             });
  145 |         }
  146 | 
  147 |         if (pathname.match(/\/api\/trips\/[^/]+$/) && method === 'PUT') {
  148 |             return json({ status: 'success', success: true, data: {} });
  149 |         }
  150 | 
  151 |         if (pathname.match(/\/api\/trips\/[^/]+\/(start|end|cancel)$/) && method === 'POST') {
  152 |             return json({ status: 'success', success: true, data: {} });
  153 |         }
  154 | 
  155 |         if (pathname.endsWith('/api/vehicle-checks') && method === 'GET') {
  156 |             return json({
  157 |                 status: 'success',
  158 |                 success: true,
  159 |                 data: fixtures.checks,
  160 |             });
  161 |         }
  162 | 
  163 |         if (pathname.endsWith('/api/vehicle-checks') && method === 'POST') {
  164 |             return json({
  165 |                 status: 'success',
  166 |                 success: true,
  167 |                 data: {
  168 |                     check: {
  169 |                         check_id: 'CHK-003',
  170 |                     },
  171 |                 },
  172 |             });
  173 |         }
  174 | 
  175 |         if (pathname.endsWith('/api/breakdown-reports') && method === 'GET') {
  176 |             return json({
  177 |                 status: 'success',
  178 |                 success: true,
  179 |                 data: { reports: fixtures.reports },
  180 |             });
  181 |         }
  182 | 
  183 |         if (pathname.endsWith('/api/route-breakdowns') && method === 'GET') {
  184 |             return json({
  185 |                 status: 'success',
  186 |                 success: true,
  187 |                 data: { breakdowns: fixtures.routeBreakdowns },
  188 |             });
  189 |         }
  190 | 
  191 |         if (pathname.endsWith('/api/breakdown-reports') && method === 'POST') {
  192 |             return json({ status: 'success', success: true, data: {} });
  193 |         }
  194 | 
  195 |         if (pathname.endsWith('/api/route-breakdowns') && method === 'POST') {
  196 |             return json({ status: 'success', success: true, data: {} });
  197 |         }
  198 | 
  199 |         if (pathname.match(/\/api\/(breakdown-reports|route-breakdowns)\/[^/]+$/) && (method === 'PUT' || method === 'DELETE')) {
  200 |             return json({ status: 'success', success: true, data: {} });
  201 |         }
  202 | 
  203 |         return route.continue();
  204 |     });
  205 | }
  206 | 
  207 | function attachMonitors(page, state) {
  208 |     page.on('console', (msg) => {
  209 |         const type = msg.type();
  210 |         if (type === 'warning' || type === 'error') {
  211 |             state.console.push({ type, text: msg.text() });
  212 |         }
  213 |     });
  214 | 
  215 |     page.on('response', (response) => {
  216 |         if (response.status() >= 400) {
  217 |             state.failedRequests.push({
  218 |                 url: response.url(),
  219 |                 method: response.request().method(),
  220 |                 status: response.status(),
  221 |             });
  222 |         }
  223 |     });
  224 | }
  225 | 
  226 | async function runFlow(page, viewportName) {
  227 |     const fixtures = buildFixtures();
  228 |     const state = {
  229 |         console: [],
  230 |         failedRequests: [],
  231 |     };
  232 | 
  233 |     await mockApi(page, fixtures);
  234 |     attachMonitors(page, state);
  235 | 
  236 |     await page.goto(`${BASE_URL}/dashboard/driver/index.html`, { waitUntil: 'domcontentloaded' });
> 237 |     await expect(page.locator('ac-layout')).toBeVisible();
      |                                             ^ Error: expect(locator).toBeVisible() failed
  238 | 
  239 |     await page.evaluate(() => {
  240 |         const layout = document.querySelector('ac-layout');
  241 |         if (layout && typeof layout.navigateTo === 'function') {
  242 |             layout.navigateTo('trip-log');
  243 |         }
  244 |     });
  245 | 
  246 |     await expect(page.locator('#trip-log')).toBeVisible();
  247 |     await page.locator('#trip-log [data-action="open-start-trip-modal"]').click();
  248 |     await expect(page.locator('#startTripModal')).toBeVisible();
  249 |     await page.locator('#startTripModal [data-action="close-modal"]').first().click();
  250 |     await expect(page.locator('#startTripModal')).toBeHidden();
  251 | 
  252 |     await page.evaluate(() => {
  253 |         const layout = document.querySelector('ac-layout');
  254 |         if (layout && typeof layout.navigateTo === 'function') {
  255 |             layout.navigateTo('vehicle-check');
  256 |         }
  257 |     });
  258 | 
  259 |     await expect(page.locator('#vehicle-check')).toBeVisible();
  260 |     await page.locator('#vehicle-check [data-action="open-weekly-check"]').click();
  261 |     await expect(page.locator('#dailyCheckModal')).toBeVisible();
  262 |     await page.locator('#dailyCheckModal [data-action="close-modal"]').first().click();
  263 |     await expect(page.locator('#dailyCheckModal')).toBeHidden();
  264 | 
  265 |     await page.evaluate(() => {
  266 |         const layout = document.querySelector('ac-layout');
  267 |         if (layout && typeof layout.navigateTo === 'function') {
  268 |             layout.navigateTo('breakdown');
  269 |         }
  270 |     });
  271 | 
  272 |     await expect(page.locator('#breakdown')).toBeVisible();
  273 |     await page.locator('#breakdown [data-action="open-breakdown-modal"]').click();
  274 |     await expect(page.locator('#breakdownModal')).toBeVisible();
  275 |     await page.locator('#breakdownModal [data-action="close-modal"]').first().click();
  276 |     await expect(page.locator('#breakdownModal')).toBeHidden();
  277 | 
  278 |     await page.evaluate(() => {
  279 |         const layout = document.querySelector('ac-layout');
  280 |         if (layout && typeof layout.navigateTo === 'function') {
  281 |             layout.navigateTo('transport-ticket');
  282 |         }
  283 |     });
  284 | 
  285 |     await expect(page.locator('#transport-ticket')).toBeVisible();
  286 |     await page.locator('#transport-ticket [data-action="open-transport-ticket-modal"]').click();
  287 |     await expect(page.locator('#transportTicketModal')).toBeVisible();
  288 |     await page.locator('#transportTicketModal [data-action="close-modal"]').first().click();
  289 |     await expect(page.locator('#transportTicketModal')).toBeHidden();
  290 | 
  291 |     let ariaSnapshot = '';
  292 |     try {
  293 |         ariaSnapshot = await page.locator('ac-layout').ariaSnapshot();
  294 |     } catch (error) {
  295 |         ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
  296 |     }
  297 | 
  298 |     const interactionSummary = await page.evaluate(() => ({
  299 |         activeSection: document.querySelector('.content-section.active')?.id || null,
  300 |         openModalCount: document.querySelectorAll('.modal.active').length,
  301 |         tripRows: document.querySelectorAll('#driverTripsList .inventory-item').length,
  302 |         checkRows: document.querySelectorAll('#driverChecksList .inventory-item').length,
  303 |         breakdownRows: document.querySelectorAll('#driverBreakdownList .inventory-item').length,
  304 |     }));
  305 | 
  306 |     await page.screenshot({
  307 |         path: path.join(OUT_DIR, `${STAGE}-${viewportName}.png`),
  308 |         fullPage: true,
  309 |     });
  310 | 
  311 |     const artifact = {
  312 |         stage: STAGE,
  313 |         viewport: viewportName,
  314 |         url: page.url(),
  315 |         title: await page.title(),
  316 |         accessibility: {
  317 |             ariaSnapshot,
  318 |             snapshotLength: ariaSnapshot.length,
  319 |         },
  320 |         console: state.console,
  321 |         failedRequests: state.failedRequests,
  322 |         interactionSummary,
  323 |     };
  324 | 
  325 |     fs.writeFileSync(
  326 |         path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
  327 |         JSON.stringify(artifact, null, 2)
  328 |     );
  329 | }
  330 | 
  331 | test('driver dashboard desktop validation', async ({ page }) => {
  332 |     await page.setViewportSize({ width: 1440, height: 900 });
  333 |     await runFlow(page, 'desktop');
  334 | });
  335 | 
  336 | test('driver dashboard mobile validation', async ({ page }) => {
  337 |     await page.setViewportSize({ width: 390, height: 844 });
```