# TASK025 - Add Notifications API Endpoints

**Status:** Pending  
**Added:** April 7, 2026  
**Updated:** April 7, 2026

**Linked Beads Issue:** assetcare-backend-new-1ew

## Original Request
Expose notifications via backend API and add mark-as-read endpoint for frontend use.

## Thought Process
Queue consumers should never be queried directly by the frontend; notifications must be read from backend-owned persistence.

## Implementation Plan
- [ ] Add notifications controller/model methods for listing and mark-as-read
- [ ] Register `GET /api/notifications` route
- [ ] Register `POST /api/notifications/read` route
- [ ] Enforce auth scoping to current user
- [ ] Update OpenAPI spec for new endpoints

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 25.1 | Notifications API contract implemented | Not Started | Apr 7, 2026 | List + read endpoints |
| 25.2 | Auth and validation handling added | Not Started | Apr 7, 2026 | User-scoped access |
| 25.3 | Routes registered | Not Started | Apr 7, 2026 | `public/index.php` |
| 25.4 | OpenAPI updated | Not Started | Apr 7, 2026 | Required by repo rules |

## Progress Log
### April 7, 2026
- Task created and linked to Beads issue `assetcare-backend-new-1ew`.
- Sequenced after notification consumer implementation.
