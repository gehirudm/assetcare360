# TASK030 - Currency Normalization to LKR Across Dashboards

**Status:** Completed  
**Added:** April 9, 2026  
**Updated:** April 9, 2026

## Original Request
All dashboard-facing monetary values must consistently display as Sri Lankan Rupees (LKR), including admin and all other dashboard pages.

## Thought Process
Dashboard content currently mixes $, Rs., and ₹ in static labels and sample text. Standardization should enforce LKR prefixes and avoid mixed symbols.

## Implementation Plan
- [x] Audit dashboard pages/scripts for non-LKR currency representations
- [x] Replace symbols/text with LKR-consistent formatting
- [x] Ensure dynamic values use a single LKR formatter utility where practical
- [x] Validate key role dashboards after updates

## Progress Tracking
**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 30.1 | Inventory all non-LKR occurrences in dashboard files | Complete | 2026-04-09 | Used repo-wide dashboard scans for `$` and `₹` monetary literals |
| 30.2 | Apply LKR normalization fixes | Complete | 2026-04-09 | Updated maintenance/supervisor/auction/sysadmin dashboard literals to LKR |
| 30.3 | Validate no regressions in UI text/formatting | Complete | 2026-04-09 | Re-ran currency scans to confirm no `$<digit>` and no `₹` remain in dashboards |

## Progress Log
### 2026-04-09
- Task created from dashboard currency scan. Implementation pending.

### 2026-04-09 (implementation)
- Added `formatLkrCurrency` helper for maintenance cost approval rendering.
- Updated dynamic supervisor budget summary and detail views to LKR formatting.
- Normalized dashboard literals from `$`/`₹` to `LKR` in maintenance, supervisor samples, auction, and sysadministration dashboard pages/scripts.
- Verified with repo scans: no `₹` and no `$` immediately followed by digits remain under `pages/dashboard/**`.
