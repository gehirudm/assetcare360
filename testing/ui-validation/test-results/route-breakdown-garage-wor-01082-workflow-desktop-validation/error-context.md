# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: route-breakdown-garage-workflow/validate-route-breakdown-garage-workflow.spec.js >> route breakdown garage workflow desktop validation
- Location: route-breakdown-garage-workflow/validate-route-breakdown-garage-workflow.spec.js:978:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#supervisorFaultTicketList .inventory-item').filter({ hasText: 'RBD-701' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('#supervisorFaultTicketList .inventory-item').filter({ hasText: 'RBD-701' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic "Supervisor Dashboard" [ref=e2]:
    - generic "Supervisor Dashboard" [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e6]: AssetCare360
        - heading "Supervisor Dashboard" [level=1] [ref=e8]: Supervisor Dashboard
      - button "SO" [ref=e12] [cursor=pointer]:
        - generic [ref=e13]: SO
    - generic [ref=e15]:
      - navigation [ref=e17]:
        - generic [ref=e20] [cursor=pointer]: Dashboard
        - generic [ref=e23] [cursor=pointer]: Analytics
        - generic [ref=e26] [cursor=pointer]: Weekly Check Reports
        - generic [ref=e29] [cursor=pointer]: Fault Tickets
        - generic [ref=e32] [cursor=pointer]: Repair Management
        - generic [ref=e35] [cursor=pointer]: Budget Approval
        - generic [ref=e38] [cursor=pointer]: Asset Status
        - generic [ref=e41] [cursor=pointer]: Technicians
      - main [ref=e42]:
        - generic [ref=e44]:
          - generic [ref=e45]:
            - heading "Technician Assignment for Fault Tickets" [level=2] [ref=e46]: Technician Assignment for Fault Tickets
            - paragraph [ref=e48]: Assign technicians and track fault ticket progress
          - generic [ref=e49]:
            - button "All" [ref=e50] [cursor=pointer]
            - button "Unassigned" [ref=e51] [cursor=pointer]
            - button "Assigned" [ref=e52] [cursor=pointer]
            - button "In Progress" [ref=e53] [cursor=pointer]
            - button "Completed" [ref=e54] [cursor=pointer]
          - generic [ref=e55]:
            - button "All Sources" [ref=e56] [cursor=pointer]
            - button "Driver" [ref=e57] [cursor=pointer]
            - button "Operator" [ref=e58] [cursor=pointer]
            - button "System" [ref=e59] [cursor=pointer]
          - button "Create New Ticket" [ref=e60] [cursor=pointer]: Create New Ticket
          - generic [ref=e62]:
            - generic [ref=e63]: Unassigned Tickets & Breakdown Reports
            - generic [ref=e66] [cursor=pointer]:
              - generic [ref=e67]:
                - strong [ref=e68]: RBD-701 Route
                - generic [ref=e70]: WP-CAB-7001
                - generic [ref=e72]:
                  - text: engine |
                  - generic [ref=e74]: HIGH
                  - text: "|"
                  - text: N/A
              - generic [ref=e77]:
                - button "VIEW TICKET" [ref=e78]: VIEW TICKET
                - button [ref=e81]
          - generic [ref=e83]:
            - generic [ref=e84]: Assigned Tickets
            - paragraph [ref=e87]: No assigned tickets match the current filters
          - generic [ref=e88]:
            - generic [ref=e89]: Resolved / Finished Tickets
            - paragraph [ref=e92]: No resolved tickets
  - generic: No photos uploaded yet
  - text:   
```

# Test source

```ts
  802 | 
  803 |     await page.locator('[data-action="capture-location"]').click();
  804 |     await expect(page.locator('#routeBreakdownCoordinateStatus')).toHaveText(/captured successfully/i, { timeout: 10000 });
  805 | 
  806 |     await page.locator('#breakdownInRouteForm button[type="submit"]').click();
  807 |     await expect.poll(() => state.createCalls).toBe(1);
  808 |     expect(state.createdPayload).toBeTruthy();
  809 |     expect(Number(state.createdPayload.breakdown_latitude)).toBeCloseTo(6.9271, 3);
  810 |     expect(Number(state.createdPayload.breakdown_longitude)).toBeCloseTo(79.8612, 3);
  811 |     if (STAGE === 'after') {
  812 |         expect(state.createContentType).toContain('multipart/form-data');
  813 |         expect(state.createImageCount).toBe(2);
  814 |     } else {
  815 |         expect(state.createImageCount).toBe(0);
  816 |     }
  817 | 
  818 |     await page.evaluate(() => {
  819 |         const layout = document.querySelector('ac-layout');
  820 |         if (layout && typeof layout.navigateTo === 'function') {
  821 |             layout.navigateTo('ticket-tracking');
  822 |         }
  823 |     });
  824 | 
  825 |     await expect(page.locator('#ticket-tracking')).toHaveClass(/active/, { timeout: 10000 });
  826 |     await expect(page.getByRole('heading', { name: 'Ticket Tracking' })).toBeVisible({ timeout: 10000 });
  827 | 
  828 |     const inProgressCard = page.locator('#driverTicketTrackingList .inventory-item').filter({ hasText: 'RBD-503' });
  829 |     await expect(inProgressCard).toBeVisible({ timeout: 10000 });
  830 | 
  831 |     await inProgressCard.locator('[data-action="toggle-actions-menu"]').click();
  832 |     await inProgressCard.locator('[data-action="add-garage-progress"]').click();
  833 |     await expect(page.locator('#garageProgressModal')).toHaveClass(/active/, { timeout: 10000 });
  834 |     await page.fill('#garageProgressNote', 'Completed electrical diagnostics and replaced damaged relay.');
  835 |     await page.setInputFiles('#garageProgressImages', [{
  836 |         name: 'progress.jpg',
  837 |         mimeType: 'image/jpeg',
  838 |         buffer: Buffer.from('fake-jpg-content'),
  839 |     }]);
  840 |     await page.locator('#garageProgressForm button[type="submit"]').click();
  841 |     await expect.poll(() => state.progressCalls).toBe(1);
  842 | 
  843 |     await inProgressCard.locator('[data-action="toggle-actions-menu"]').click();
  844 |     await inProgressCard.locator('[data-action="complete-garage-breakdown"]').click();
  845 |     await expect(page.locator('#completeBreakdownModal')).toHaveClass(/active/, { timeout: 10000 });
  846 |     await page.fill('#completeBillAmount', '12500');
  847 |     await page.fill('#completeRemarks', 'Repair completed and vehicle test run passed.');
  848 |     await page.setInputFiles('#completeBillImage', [{
  849 |         name: 'bill.jpg',
  850 |         mimeType: 'image/jpeg',
  851 |         buffer: Buffer.from('fake-bill-content'),
  852 |     }]);
  853 |     await page.locator('#completeBreakdownForm button[type="submit"]').click();
  854 |     await expect.poll(() => state.completeCalls).toBe(1);
  855 | 
  856 |     await page.screenshot({
  857 |         path: path.join(OUT_DIR, `${STAGE}-${viewportName}-driver.png`),
  858 |         fullPage: true,
  859 |     });
  860 | 
  861 |     artifact.driver = {
  862 |         url: page.url(),
  863 |         actions: {
  864 |             createCalls: state.createCalls,
  865 |             createImageCount: state.createImageCount,
  866 |             entryCalls: state.entryCalls,
  867 |             progressCalls: state.progressCalls,
  868 |             completeCalls: state.completeCalls,
  869 |         },
  870 |         createdPayload: state.createdPayload,
  871 |         ui: await page.evaluate(() => ({
  872 |             activeSection: document.querySelector('.content-section.active')?.id || null,
  873 |             ticketRows: document.querySelectorAll('#driverTicketTrackingList .inventory-item').length,
  874 |             openModalCount: document.querySelectorAll('.modal.active').length,
  875 |         })),
  876 |     };
  877 | }
  878 | 
  879 | async function runSupervisorFlow(page, viewportName, artifact) {
  880 |     const state = {
  881 |         approvalCalls: 0,
  882 |     };
  883 | 
  884 |     await installLeafletStub(page);
  885 |     await mockSupervisorApi(page, state);
  886 |     attachMonitors(page, artifact, 'supervisor');
  887 | 
  888 |     await page.goto(`${BASE_URL}/dashboard/supervisor/index.html`, { waitUntil: 'domcontentloaded' });
  889 |     await expect(page.locator('ac-layout')).toBeVisible({ timeout: 15000 });
  890 | 
  891 |     await page.evaluate(() => {
  892 |         const layout = document.querySelector('ac-layout');
  893 |         if (layout && typeof layout.navigateTo === 'function') {
  894 |             layout.navigateTo('fault-ticket-tracking');
  895 |         }
  896 |     });
  897 | 
  898 |     await expect(page.locator('#fault-ticket-tracking')).toHaveClass(/active/, { timeout: 10000 });
  899 |     await expect(page.getByRole('heading', { name: 'Fault Tickets' })).toBeVisible({ timeout: 10000 });
  900 | 
  901 |     const routeCard = page.locator('#supervisorFaultTicketList .inventory-item').filter({ hasText: 'RBD-701' });
> 902 |     await expect(routeCard).toBeVisible({ timeout: 10000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
  903 |     await routeCard.locator('[data-action="view-ticket"]').click();
  904 | 
  905 |     await expect(page.locator('#ticket-details')).toHaveClass(/active/, { timeout: 15000 });
  906 |     await expect(page.locator('#ovTicketId')).toContainText('RBD-701', { timeout: 15000 });
  907 | 
  908 |     const routeBreakdownImages = page.locator('#routeBreakdownImagesGrid .route-breakdown-image-item');
  909 |     if (STAGE === 'after') {
  910 |         await expect(routeBreakdownImages).toHaveCount(2, { timeout: 15000 });
  911 |         const firstImageHref = await routeBreakdownImages.first().getAttribute('href');
  912 |         expect(String(firstImageHref || '')).toContain('/uploads/route-breakdowns/reports/');
  913 |     } else {
  914 |         const imageCount = await routeBreakdownImages.count();
  915 |         expect(imageCount).toBeGreaterThanOrEqual(0);
  916 |     }
  917 | 
  918 |     await page.screenshot({
  919 |         path: path.join(OUT_DIR, `${STAGE}-${viewportName}-supervisor.png`),
  920 |         fullPage: true,
  921 |     });
  922 | 
  923 |     artifact.supervisor = {
  924 |         url: page.url(),
  925 |         actions: {
  926 |             approvalCalls: state.approvalCalls,
  927 |         },
  928 |         ui: await page.evaluate(() => ({
  929 |             activeSection: document.querySelector('.content-section.active')?.id || null,
  930 |             ticketRows: document.querySelectorAll('#supervisorFaultTicketList .inventory-item').length,
  931 |             routeBreakdownImageCount: document.querySelectorAll('#routeBreakdownImagesGrid .route-breakdown-image-item').length,
  932 |             routeBreakdownImagesPanelVisible: (() => {
  933 |                 const panel = document.getElementById('routeBreakdownImagesPanel');
  934 |                 if (!panel) {
  935 |                     return false;
  936 |                 }
  937 |                 return panel.style.display !== 'none';
  938 |             })(),
  939 |         })),
  940 |     };
  941 | }
  942 | 
  943 | async function runValidation(browser, viewportName, viewport) {
  944 |     const artifact = {
  945 |         stage: STAGE,
  946 |         viewport: viewportName,
  947 |         title: null,
  948 |         console: [],
  949 |         failedRequests: [],
  950 |         driver: null,
  951 |         supervisor: null,
  952 |     };
  953 | 
  954 |     const driverContext = await browser.newContext({
  955 |         viewport,
  956 |         geolocation: {
  957 |             latitude: 6.9271,
  958 |             longitude: 79.8612,
  959 |         },
  960 |     });
  961 |     await driverContext.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
  962 |     const driverPage = await driverContext.newPage();
  963 |     await runDriverFlow(driverPage, viewportName, artifact);
  964 |     artifact.title = await driverPage.title();
  965 |     await driverContext.close();
  966 | 
  967 |     const supervisorContext = await browser.newContext({ viewport });
  968 |     const supervisorPage = await supervisorContext.newPage();
  969 |     await runSupervisorFlow(supervisorPage, viewportName, artifact);
  970 |     await supervisorContext.close();
  971 | 
  972 |     fs.writeFileSync(
  973 |         path.join(OUT_DIR, `${STAGE}-${viewportName}.json`),
  974 |         JSON.stringify(artifact, null, 2)
  975 |     );
  976 | }
  977 | 
  978 | test('route breakdown garage workflow desktop validation', async ({ browser }) => {
  979 |     await runValidation(browser, 'desktop', { width: 1440, height: 900 });
  980 | });
  981 | 
  982 | test('route breakdown garage workflow mobile validation', async ({ browser }) => {
  983 |     await runValidation(browser, 'mobile', { width: 390, height: 844 });
  984 | });
  985 | 
```