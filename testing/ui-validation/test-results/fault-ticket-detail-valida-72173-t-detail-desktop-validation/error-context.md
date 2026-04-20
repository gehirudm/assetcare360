# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fault-ticket-detail/validate-fault-ticket-detail.spec.js >> shared fault-ticket detail desktop validation
- Location: fault-ticket-detail/validate-fault-ticket-detail.spec.js:219:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#ticketId')
Expected substring: "TKT-501"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#ticketId')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic "Technical Officer Dashboard" [ref=e3]:
      - generic "Technical Officer Dashboard" [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e7]: AssetCare360
          - heading "Technical Officer Dashboard" [level=1] [ref=e9]: Technical Officer Dashboard
        - button "TO" [ref=e13] [cursor=pointer]:
          - generic [ref=e14]: TO
    - generic [ref=e16]:
      - navigation [ref=e19]:
        - generic [ref=e22] [cursor=pointer]: Dashboard
        - generic [ref=e25] [cursor=pointer]: Analytics
        - generic [ref=e28] [cursor=pointer]: Fault & Repair Tickets
        - generic [ref=e31] [cursor=pointer]: Spare Part Management
        - generic [ref=e34] [cursor=pointer]: Inventory Management
        - generic [ref=e37] [cursor=pointer]: Service & Warranty
        - generic [ref=e40] [cursor=pointer]: Asset Feedback
        - generic [ref=e43] [cursor=pointer]: Notifications
      - main [ref=e44]:
        - generic [ref=e46]:
          - button "Back to Fault & Repair Tickets" [ref=e47] [cursor=pointer]
          - generic [ref=e49]:
            - navigation "Breadcrumb" [ref=e50]:
              - link "Dashboard" [ref=e51] [cursor=pointer]:
                - /url: /dashboard/technical-officer/index.html?section=dashboard
                - text: Dashboard
              - link "Fault & Repair Tickets" [ref=e54] [cursor=pointer]:
                - /url: /dashboard/technical-officer/index.html?section=tickets
              - generic [ref=e57]: TKT-501
            - heading "Fault Ticket Detail" [level=2] [ref=e58]: Fault Ticket Detail
        - generic [ref=e60]:
          - generic [ref=e61]:
            - generic [ref=e62]:
              - generic [ref=e63]:
                - generic [ref=e64]: Ticket ID
                - generic [ref=e66]: TKT-501
              - generic [ref=e67]:
                - generic [ref=e68]: Status
                - generic [ref=e71]: Open
              - generic [ref=e72]:
                - generic [ref=e73]: Priority
                - generic [ref=e76]: High
              - generic [ref=e77]:
                - generic [ref=e78]: Equipment
                - generic [ref=e80]: CAT-320D
              - generic [ref=e81]:
                - generic [ref=e82]: Location
                - generic [ref=e84]: North Yard
              - generic [ref=e85]:
                - generic [ref=e86]: Reported
                - generic [ref=e88]: Apr 12, 2026
            - generic [ref=e89]:
              - generic [ref=e90]: Issue Description
              - paragraph [ref=e92]: Hydraulic pressure drop under load
          - generic [ref=e93]:
            - heading "Ticket Progress Flow" [level=2] [ref=e94]: Ticket Progress Flow
            - generic [ref=e96]:
              - generic [ref=e102]:
                - generic [ref=e103]:
                  - generic [ref=e104]: Fault Reported
                  - generic [ref=e105]: Step 1
                - generic [ref=e106]:
                  - generic [ref=e107]:
                    - generic [ref=e110]: Supervisor One
                    - generic [ref=e113]: Apr 12, 2026
                  - paragraph [ref=e114]: "Fault reported. Breakdown type: N/A."
              - generic [ref=e120]:
                - generic [ref=e121]:
                  - generic [ref=e122]: Assigned to Technician
                  - generic [ref=e123]: Step 2
                - generic [ref=e124]:
                  - generic [ref=e125]:
                    - generic [ref=e126]:
                      - generic [ref=e128]: Supervisor One
                      - generic [ref=e129]: Supervisor
                    - generic [ref=e130]:
                      - generic [ref=e132]: Technical Officer One
                      - generic [ref=e133]: Technical Officer
                  - paragraph [ref=e134]: Assigned on Apr 12, 2026.
              - generic [ref=e140]:
                - generic [ref=e141]:
                  - generic [ref=e142]: Budget Approval
                  - generic [ref=e143]: Step 3
                - generic [ref=e144]:
                  - generic [ref=e145]: No budget report submitted yet.
                  - button "Submit Budget Report" [ref=e148] [cursor=pointer]: Submit Budget Report
              - generic [ref=e155]:
                - generic [ref=e156]:
                  - generic [ref=e157]: Spare Parts Request
                  - generic [ref=e158]: Step 4
                - generic [ref=e159]:
                  - generic [ref=e160]: No spare parts requested yet.
                  - button "Request Spare Parts" [ref=e163] [cursor=pointer]: Request Spare Parts
              - generic [ref=e170]:
                - generic [ref=e171]:
                  - generic [ref=e172]: Repair In Progress
                  - generic [ref=e173]: Step 5
                - generic [ref=e175]: Work has not started yet.
              - generic [ref=e182]:
                - generic [ref=e183]:
                  - generic [ref=e184]: Resolved
                  - generic [ref=e185]: Step 6
                - generic [ref=e187]: Not yet resolved.
              - generic [ref=e193]:
                - generic [ref=e194]:
                  - generic [ref=e195]: Ticket Closed
                  - generic [ref=e196]: Step 7
                - generic [ref=e198]: Ticket is not yet closed.
  - text:   
```

# Test source

```ts
  60  |             updated_at: '2026-02-12T10:00:00Z',
  61  |             photos: []
  62  |         }
  63  |     ];
  64  | 
  65  |     return {
  66  |         user: {
  67  |             id: 1001,
  68  |             full_name: 'Technical Officer One',
  69  |             role: 'Technical Officer',
  70  |             employee_id: 'LITRO-TECHOFFICER-001'
  71  |         },
  72  |         ticket: baseTicket,
  73  |         machineTickets: [baseTicket, ...priorTickets]
  74  |     };
  75  | }
  76  | 
  77  | function attachMonitors(page, state) {
  78  |     page.on('console', (msg) => {
  79  |         const type = msg.type();
  80  |         if (type === 'warning' || type === 'error') {
  81  |             state.console.push({ type, text: msg.text() });
  82  |         }
  83  |     });
  84  | 
  85  |     page.on('response', (response) => {
  86  |         if (response.status() >= 400) {
  87  |             state.failedRequests.push({
  88  |                 url: response.url(),
  89  |                 method: response.request().method(),
  90  |                 status: response.status()
  91  |             });
  92  |         }
  93  |     });
  94  | }
  95  | 
  96  | async function mockApi(page, fixtures) {
  97  |     await page.route('**/api/**', async (route) => {
  98  |         const request = route.request();
  99  |         const method = request.method();
  100 |         const url = new URL(request.url());
  101 |         const pathname = url.pathname;
  102 | 
  103 |         const json = (body, status = 200) => route.fulfill({
  104 |             status,
  105 |             contentType: 'application/json',
  106 |             body: JSON.stringify(body)
  107 |         });
  108 | 
  109 |         if (pathname.endsWith('/api/auth/me') && method === 'GET') {
  110 |             return json({ status: 'success', success: true, data: fixtures.user });
  111 |         }
  112 | 
  113 |         if (pathname.match(/\/api\/fault-tickets\/\d+$/) && method === 'GET') {
  114 |             return json({ status: 'success', success: true, data: fixtures.ticket });
  115 |         }
  116 | 
  117 |         if (pathname.endsWith('/api/fault-tickets') && method === 'GET') {
  118 |             const machineId = url.searchParams.get('machine_id');
  119 |             if (machineId) {
  120 |                 return json({ status: 'success', success: true, data: { tickets: fixtures.machineTickets } });
  121 |             }
  122 | 
  123 |             return json({ status: 'success', success: true, data: { tickets: fixtures.machineTickets } });
  124 |         }
  125 | 
  126 |         if (pathname.match(/\/api\/budget-reports\/ticket\/\d+\/latest$/) && method === 'GET') {
  127 |             return json({ status: 'success', success: true, data: { report: null } });
  128 |         }
  129 | 
  130 |         if (pathname.endsWith('/api/budget-reports') && method === 'POST') {
  131 |             return json({
  132 |                 status: 'success',
  133 |                 success: true,
  134 |                 data: {
  135 |                     id: 910,
  136 |                     status: 'pending'
  137 |                 }
  138 |             });
  139 |         }
  140 | 
  141 |         return json({ status: 'success', success: true, data: {} });
  142 |     });
  143 | }
  144 | 
  145 | async function runFlow(page, viewportName) {
  146 |     const fixtures = buildFixtures();
  147 |     const state = {
  148 |         console: [],
  149 |         failedRequests: []
  150 |     };
  151 | 
  152 |     attachMonitors(page, state);
  153 |     await mockApi(page, fixtures);
  154 | 
  155 |     const returnTo = encodeURIComponent('/dashboard/technical-officer/index.html?section=tickets');
  156 |     const startUrl = `${BASE_URL}/view-ticket/index.html?id=${fixtures.ticket.id}&return_to=${returnTo}`;
  157 |     await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  158 | 
  159 |     await expect(page.locator('#mainContent')).toBeVisible({ timeout: 15000 });
> 160 |     await expect(page.locator('#ticketId')).toContainText('TKT-501');
      |                                             ^ Error: expect(locator).toContainText(expected) failed
  161 | 
  162 |     await expect(page.locator('#viewAllTicketsBtn')).toBeVisible({ timeout: 10000 });
  163 |     await page.locator('#viewAllTicketsBtn').click();
  164 |     await expect(page.locator('#allTicketsModal')).toHaveClass(/active/, { timeout: 10000 });
  165 |     await expect(page.locator('#allTicketsContent .modal-ticket-item')).toHaveCount(3);
  166 | 
  167 |     await page.locator('#allTicketsModal .modal-close').first().click();
  168 |     await expect(page.locator('#allTicketsModal')).not.toHaveClass(/active/, { timeout: 10000 });
  169 | 
  170 |     await page.locator('#ticketPhotos .photo-gallery-item').first().click();
  171 |     await expect(page.locator('#imageViewerModal')).toHaveClass(/active/, { timeout: 10000 });
  172 |     await page.locator('#imageViewerModal .modal-close').click();
  173 |     await expect(page.locator('#imageViewerModal')).not.toHaveClass(/active/, { timeout: 10000 });
  174 | 
  175 |     await page.locator('#budgetReportContent button.btn-primary').first().click();
  176 |     await expect(page.locator('#budgetReportModal')).toHaveClass(/active/, { timeout: 10000 });
  177 |     await page.locator('#budgetReportModal .modal-close').click();
  178 |     await expect(page.locator('#budgetReportModal')).not.toHaveClass(/active/, { timeout: 10000 });
  179 | 
  180 |     let ariaSnapshot = '';
  181 |     try {
  182 |         ariaSnapshot = await page.locator('body').ariaSnapshot();
  183 |     } catch (error) {
  184 |         ariaSnapshot = `Accessibility snapshot unavailable: ${error.message}`;
  185 |     }
  186 | 
  187 |     await page.screenshot({
  188 |         path: path.join(OUT_DIR, `${STAGE}-${viewportName}.png`),
  189 |         fullPage: true
  190 |     });
  191 | 
  192 |     const artifact = {
  193 |         stage: STAGE,
  194 |         viewport: viewportName,
  195 |         startUrl,
  196 |         finalUrl: page.url(),
  197 |         title: await page.title(),
  198 |         accessibility: {
  199 |             ariaSnapshot,
  200 |             snapshotLength: ariaSnapshot.length
  201 |         },
  202 |         console: state.console,
  203 |         failedRequests: state.failedRequests,
  204 |         interactionSummary: {
  205 |             ticketId: fixtures.ticket.id,
  206 |             allTicketsModalOpened: true,
  207 |             imageViewerOpened: true,
  208 |             budgetModalOpened: true,
  209 |             priorTicketsLoaded: fixtures.machineTickets.length
  210 |         }
  211 |     };
  212 | 
  213 |     fs.writeFileSync(
  214 |         path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
  215 |         JSON.stringify(artifact, null, 2)
  216 |     );
  217 | }
  218 | 
  219 | test('shared fault-ticket detail desktop validation', async ({ page }) => {
  220 |     await page.setViewportSize({ width: 1440, height: 900 });
  221 |     await runFlow(page, 'desktop');
  222 | });
  223 | 
  224 | test('shared fault-ticket detail mobile validation', async ({ page }) => {
  225 |     await page.setViewportSize({ width: 390, height: 844 });
  226 |     await runFlow(page, 'mobile');
  227 | });
  228 | 
```