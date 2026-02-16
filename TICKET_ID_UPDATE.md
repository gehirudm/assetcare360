# Fault Ticket ID Format Update

## Summary
Updated the fault_tickets table to use a human-readable ticket ID format (TKT-001, TKT-002, etc.) instead of just numeric IDs.

## Changes Made

### 1. Database Migration
**File:** `migrations/add_ticket_id_to_fault_tickets.php`

- Added new `ticket_id` column (VARCHAR(20), NOT NULL, UNIQUE)
- Generated TKT-001 format IDs for all existing records:
  - TKT-001 through TKT-007 for existing 7 tickets
- Made the column NOT NULL and UNIQUE

### 2. Model Updates
**File:** `app/models/FaultTicket.php`

- Updated schema definition to include `ticket_id` field
- Modified `createTicket()` method to auto-generate ticket_id on insert
- Added `generateNextTicketId()` private method to generate sequential TKT-XXX IDs
- Updated `getAllTickets()` to explicitly select ticket_id column
- Updated `getTicketById()` to explicitly select ticket_id column

### 3. Ticket ID Format
- Format: `TKT-XXX` where XXX is a zero-padded 3-digit number
- Examples: TKT-001, TKT-002, ..., TKT-999
- Auto-increments based on the last ticket in database

## Database Schema
```sql
ticket_id VARCHAR(20) NOT NULL UNIQUE
```

## Testing

### Verified Current Records:
```
+----+-----------+------------+----------+--------+
| id | ticket_id | machine_id | priority | status |
+----+-----------+------------+----------+--------+
|  1 | TKT-001   |          1 | High     | Open   |
|  2 | TKT-002   |          2 | Medium   | Open   |
|  3 | TKT-003   |          2 | Medium   | Open   |
|  4 | TKT-004   |          1 | Medium   | Open   |
|  5 | TKT-005   |          2 | High     | Open   |
|  6 | TKT-006   |          1 | Medium   | Open   |
|  7 | TKT-007   |          1 | Medium   | Open   |
+----+-----------+------------+----------+--------+
```

### API Response:
The `/api/fault-tickets` endpoint now returns ticket_id:
```json
{
    "id": 7,
    "ticket_id": "TKT-007",
    "machine_id": 1,
    "description": "...",
    "priority": "Medium",
    ...
}
```

## How It Works

### Creating New Tickets:
1. When a new ticket is created, `generateNextTicketId()` is called
2. It queries for the last ticket_id with pattern 'TKT-%'
3. Extracts the numeric portion and increments by 1
4. Returns formatted ID (e.g., TKT-008)
5. Inserts the new record with the generated ticket_id

### Auto-Generation Logic:
```php
private function generateNextTicketId() {
    // Get last ticket ID
    $lastTicket = "SELECT ticket_id FROM fault_tickets 
                   WHERE ticket_id LIKE 'TKT-%' 
                   ORDER BY id DESC LIMIT 1";
    
    // Extract number from TKT-XXX and increment
    $lastNumber = intval(substr($lastTicket['ticket_id'], 4));
    $nextNumber = $lastNumber + 1;
    
    // Return formatted: TKT-001, TKT-002, etc.
    return 'TKT-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
}
```

## Backward Compatibility
- The numeric `id` column remains as the primary key
- All foreign keys continue to reference the numeric `id`
- `ticket_id` is an additional display field for user-friendly reference

## Next Steps (Optional)
- Update frontend to display `ticket_id` instead of numeric ID
- Add search functionality by ticket_id
- Consider using ticket_id in URLs/routing
- Update supervisor dashboard to show ticket_id in listings

## Date
February 9, 2026
