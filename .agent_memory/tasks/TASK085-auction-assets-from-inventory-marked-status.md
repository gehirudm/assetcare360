# [TASK085] - Auction Assets From Inventory-Marked Status

**Status:** Completed  
**Added:** 2026-04-20  
**Updated:** 2026-04-20

## Original Request
- Assets that are marked from Inventory manager dashboard should appear in the Assets for Auction section in the Auction Manager dashboard.

## Thought Process
- Inventory Manager already marks assets for auction by updating machine/vehicle `status` to `For Auction` via existing `/machines/:id` and `/vehicles/:id` update calls.
- Auction Assets section was still static mock markup and did not consume backend data.
- The fix should connect Auction Assets to the same machine/vehicle status data source and filter by `For Auction` so the two dashboards stay synchronized.

## Implementation Plan
- Replace static Auction Assets cards with API-backed loading from vehicles/machines filtered by `status=For Auction`.
- Normalize machine/vehicle rows into one render model and preserve existing filtering/actions.
- Update Auction UI validation to stub vehicles/machines API responses and assert rendered assets originate from API data.
- Run diagnostics and Auction Playwright validation.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Wire Auction Assets to live API data | Complete | 2026-04-20 | Replaced static cards with dynamic `/vehicles` + `/machines` loading filtered to `For Auction`. |
| 1.2 | Keep UI behavior consistent | Complete | 2026-04-20 | Preserved filters, view/schedule actions, and badge count with normalized row rendering. |
| 1.3 | Add and run regression validation | Complete | 2026-04-20 | Added API stubs + assertions for rendered assets and count; desktop/mobile suite passed. |

## Progress Log
### 2026-04-20
- Updated `pages/dashboard/auction/components/assets.js`:
  - added API-backed `refresh()` to load `GET /vehicles?status=For%20Auction&per_page=200` and `GET /machines?status=For%20Auction&per_page=200`.
  - replaced hardcoded asset cards with normalized machine/vehicle render pipeline.
  - added availability badge updates, list extraction helpers, and safe fallback empty/error states.
  - retained filter controls and action button events while applying filter state after data load.
- Updated `testing/ui-validation/auction-dashboard/validate-auction-dashboard.spec.js`:
  - added deterministic route stubs for `/api/vehicles*` and `/api/machines*` with `For Auction` sample assets.
  - added assertions for API-rendered asset names and availability count in Assets section.
  - kept existing cross-section flow validation and added visible-count check after Good Condition filter.
- Validation evidence:
  - diagnostics clean for touched files.
  - `VAL_STAGE=after npx playwright test auction-dashboard/validate-auction-dashboard.spec.js --reporter=line` passed (desktop/mobile, 2/2).
