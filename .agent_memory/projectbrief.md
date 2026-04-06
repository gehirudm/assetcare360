# Project Brief — AssetCare360

## Overview
AssetCare360 is an **Asset & Inventory Management System** for organisations that manage machinery, vehicles, and maintenance operations. It provides a structured fault-ticket workflow so that when equipment breaks down, the full lifecycle (report → assign → budget → spare parts → in-progress → resolve → close) is tracked and audited.

## Core Goals
1. Track machines, vehicles, and spare-parts inventory
2. Manage fault/repair tickets end-to-end with role-gated steps
3. Provide role-based dashboards (7 user roles)
4. Log every API call for auditing
5. Support budget approval workflows with petty-cash limits

## Scope
- Backend: PHP REST API (`/api/…`)
- Frontend: Vanilla HTML/CSS/JS dashboard pages (`/pages/…`)
- Entry point: `public/index.php` (Apache + mod_rewrite)
- Dev server: `php -S localhost:8000` from `public/`

## Out of Scope
- Mobile apps
- External ERP integrations (currently)
