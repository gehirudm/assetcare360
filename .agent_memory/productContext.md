# Product Context

## Why This Project Exists
Organisations with heavy machinery and vehicle fleets struggle to manage breakdown reports, maintenance budgets, and spare-parts usage in spreadsheets. AssetCare360 centralises this into a structured digital workflow that enforces approvals and keeps an audit trail.

## Problems It Solves
- Equipment breakdowns not tracked systematically → fault ticket system
- Budget over-spending → petty-cash limit (SystemSetting) routes to Supervisor or Maintenance Manager
- Spare-parts stock untracked → spare-part request & usage tables
- Work done without proof → ticket work-update record required before ticket can close
- No single view per role → separate dashboards per role

## User Roles (hierarchy)
1. **Admin** — full system access, user management, logs
2. **Maintenance Manager** — approves large-budget reports, oversees workflow
3. **Inventory Manager** — manages spare parts stock
4. **Technical Officer** — raises budget reports, submits work updates, closes tickets
5. **Supervisor** — approves small-budget reports, oversees TOs
6. **Driver** — logs trips, vehicle checks
7. **Machinery Operator** — raises machine breakdown reports

## Fault Ticket Status Flow
```
Open → Assigned → Waiting for Budget Approval → Waiting for Spare Parts
     → Parts Approved → In Progress → Resolved → Closed
```
- Budget approval: `pending` budget report blocks work-update submission
- Work update created → ticket moves toward Resolved
- After budget review (approve/reject) → ticket moves back to Assigned for next step
