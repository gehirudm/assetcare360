# TASK062 - Driver Insurance-Claim Status and Supervisor Assignment Option

**Status:** Completed  
**Added:** April 19, 2026  
**Updated:** April 19, 2026

## Original Request
when supervisor clam the warrenty then the driver page under the fault tickets also should update the status...and suprvisor has the option to assign technition if warrenty claim is eligible

## Thought Process
The issue had two parts:
- Driver fault-ticket cards needed explicit handling for `Insurance Claimed` so status rendering and filter behavior stay consistent.
- Supervisor detail-page actions currently hid technician assignment when insurance claim eligibility was true; this was UI gating, not backend enforcement.

The safest approach was to:
- update frontend status mapping helpers for driver ticket-tracking,
- align route workflow status display with insurance-claimed state,
- keep both actions visible for supervisors on eligible tickets,
- extend UI validation coverage for both scenarios.

## Implementation Plan
- [x] Add explicit `Insurance Claimed` support in driver status mapping/filter/update-text helpers.
- [x] Ensure driver route-workflow label mirrors insurance-claimed ticket status.
- [x] Update supervisor action rendering to keep assignment visible when claim is eligible.
- [x] Extend Playwright validations for driver and supervisor flows.
- [x] Run syntax checks and targeted UI validation suites.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 62.1 | Driver status mapping update | Complete | April 19, 2026 | Added explicit `Insurance Claimed` handling in `driver-utils` status helpers and filter normalization. |
| 62.2 | Driver route workflow display alignment | Complete | April 19, 2026 | Route workflow label/class now reflects insurance-claimed ticket state. |
| 62.3 | Supervisor eligible-claim assignment option | Complete | April 19, 2026 | `renderAssignmentAction` now keeps `Assign Technician` visible while also showing `Claim Insurance`. |
| 62.4 | Validation coverage update | Complete | April 19, 2026 | Updated driver/supervisor Playwright specs and reran after-stage validation successfully. |

## Progress Log
### April 19, 2026
- Updated `pages/dashboard/driver/components/driver-utils.js`:
  - added `Insurance Claimed` mapping in `getTicketStatusInfo(...)`
  - added claim-specific update text in `getTicketUpdateText(...)`
  - mapped `insurance claimed` into `in-progress` in `normalizeTicketFilterStatus(...)`
  - treated insurance-claimed as active-style color in `getStatusColor(...)`
- Updated `pages/dashboard/driver/components/driver-ticket-tracking.js`:
  - route workflow resolver now returns `insurance_claimed` when `ticket_status` is `Insurance Claimed`
  - added workflow label/class mapping for `insurance_claimed`
- Updated `pages/view-ticket/script.js`:
  - in claim-eligible branch, kept `Assign Technician` visible and retained `Claim Insurance`
  - updated hint copy to indicate either action can be used
- Updated validation specs:
  - `testing/ui-validation/driver-dashboard/validate-driver-dashboard.spec.js`
  - `testing/ui-validation/supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js`
- Validation evidence:
  - `node --check` passed for all touched source and spec files
  - `VAL_STAGE=after npx playwright test driver-dashboard/validate-driver-dashboard.spec.js supervisor-fault-ticket-tracking/validate-supervisor-fault-ticket-tracking.spec.js --reporter=line` passed (`4/4`)
