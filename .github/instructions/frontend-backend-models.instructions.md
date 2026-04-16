---
description: "Use when implementing frontend pages, forms, tables, or UI that displays or submits data. Covers reading backend models before writing frontend code, matching field names, handling API responses, and avoiding mismatched data structures."
applyTo: "pages/**"
---
# Frontend ↔ Backend Model Alignment

Before writing any frontend code that displays, submits, or processes data, **read the relevant backend model(s)** in `app/models/` to understand the exact database structure.

## Required Steps

1. **Identify which models are involved** — e.g., for a fault tickets page, read `app/models/FaultTicket.php`, `app/models/User.php`, etc.
2. **Check field names exactly** — use the column names as defined in the model, not guesses (e.g., `ticket_id`, not `id` or `ticketId`).
3. **Check relationships** — understand which fields are foreign keys and what they join to.
4. **Read the controller** — check `app/controllers/` to see what the API actually returns (it may include joined fields or computed values not in the model alone).

## Rules

- **Never assume field names** — always verify against the model and/or controller response before using them in JS/HTML.
- **Match the exact response structure** — if the API returns `{ data: [...] }`, don't assume `response.items`.
- **Handle nullable fields** — if a column is nullable in the model, guard against null in the frontend (e.g., `item.field ?? 'N/A'`).
- **Use consistent ID formats** — check the model for ID prefixes (e.g., `TKT-`, `VEH-`) and reflect them accurately in the UI.

## Model Locations

| Model | File |
|-------|------|
| Fault Tickets | `app/models/FaultTicket.php` |
| Users | `app/models/User.php` |
| Machines | `app/models/Machine.php` |
| Vehicles | `app/models/Vehicle.php` |
| Spare Parts | `app/models/Product.php` |
| Spare Part Requests | `app/models/SparePartRequest.php` |
| Trips | `app/models/Trip.php` |
| Vehicle Checks | `app/models/VehicleCheck.php` |
| Ticket Work Updates | `app/models/TicketWorkUpdate.php` |

## Example

Before building a table that lists fault tickets:

```php
// Read app/models/FaultTicket.php first
// Confirm fields: ticket_id, title, status, priority, created_at, assigned_to, machine_id
```

```js
// Then use the exact field names in your frontend
row.innerHTML = `
  <td>${ticket.ticket_id}</td>
  <td>${ticket.title}</td>
  <td>${ticket.status}</td>
`;
```
