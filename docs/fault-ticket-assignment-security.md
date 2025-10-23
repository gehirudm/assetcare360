# Fault Ticket Assignment Security & Validation

## Overview
This document outlines the multi-layer security and validation measures implemented for fault ticket assignment and editing functionality in the Supervisor Dashboard.

## Security Layers

### 1. Frontend UI Layer
**Location**: `pages/dashboard/supervisor/script.js` (lines 310-345)

**Implementation**:
- Edit button is conditionally rendered based on ticket status
- Only tickets with status "Assigned" show an enabled edit button
- Non-editable tickets show a disabled button with explanatory tooltip

**Code**:
```javascript
const canEdit = ticket.status && ticket.status.toLowerCase() === 'assigned';
const editButton = canEdit 
    ? `<button class="btn btn-small btn-primary" onclick="editTicketAssignment(${ticket.id})">
           <i class="fas fa-edit"></i> Edit
       </button>`
    : `<button class="btn btn-small btn-secondary" disabled 
           title="Only tickets with 'Assigned' status can be edited">
           <i class="fas fa-edit"></i> Edit
       </button>`;
```

### 2. JavaScript Function Layer
**Location**: `pages/dashboard/supervisor/script.js` (loadTicketForAssignment function)

**Implementation**:
- Additional check when edit mode is initiated
- Prevents modal from opening if ticket status is not "Assigned"
- Shows error toast to user

**Code**:
```javascript
if (isEdit && ticket.status && ticket.status.toLowerCase() !== 'assigned') {
    showToast('Only tickets with "Assigned" status can be edited', 'error');
    return;
}
```

### 3. Backend Service Layer
**Location**: `app/services/FaultTicketService.php` (assignTechnicians method)

**Implementation**:
- Server-side validation of ticket status
- Prevents any modifications to tickets in non-editable states
- Returns descriptive error message with current status

**Editable Statuses**:
- `Open` - Unassigned tickets can be assigned
- `Assigned` - Already assigned tickets can be edited

**Non-Editable Statuses**:
- `In Progress` - Being actively worked on by technicians
- `Completed` - Work finished, historical record
- `Closed` - Archived, no modifications allowed

**Code**:
```php
$currentStatus = strtolower($ticket['status'] ?? 'open');
$editableStatuses = ['open', 'assigned'];

if (!in_array($currentStatus, $editableStatuses)) {
    return [
        'success' => false,
        'message' => 'This ticket cannot be modified. Only tickets with "Open" or "Assigned" status can be edited. Current status: ' . ucfirst($ticket['status'])
    ];
}
```

## Authorization Checks

### Role-Based Access Control
**Location**: `app/services/FaultTicketService.php`

Only users with the following roles can assign/edit tickets:
- `Supervisor`
- `Admin`

```php
$userRole = $user['role'] ?? null;
if (!in_array($userRole, ['Supervisor', 'Admin'])) {
    return [
        'success' => false,
        'message' => 'You do not have permission to assign tickets'
    ];
}
```

## Workflow Protection

### Status Transition Rules

| Current Status | Can Assign? | Can Edit? | Action Result |
|---------------|-------------|-----------|---------------|
| Open | ✅ Yes | ❌ N/A | Status → Assigned |
| Assigned | ✅ Yes | ✅ Yes | Update assignments |
| Assigned (no techs) | ✅ Yes | ✅ Yes | Status → Open |
| In Progress | ❌ No | ❌ No | Error returned |
| Completed | ❌ No | ❌ No | Error returned |
| Closed | ❌ No | ❌ No | Error returned |

### Unassignment Workflow
**Location**: Frontend & Backend

When all technicians are deselected in edit mode:

1. **Frontend Warning**: Visual yellow banner appears in modal
   ```html
   <div id="noTechnicianWarning">
       ⚠️ Warning: No technicians selected. 
       This will move the ticket back to Unassigned status.
   </div>
   ```

2. **Backend Processing**:
   - Removes all active assignments (sets status to 'Removed')
   - Updates ticket status back to 'Open'
   - Returns success message

## Attack Vectors Mitigated

### 1. Direct API Calls
**Threat**: Bypassing frontend to call `/fault-tickets/:id/assign` endpoint directly

**Mitigation**: Backend validates ticket status before processing any assignment changes

### 2. Status Manipulation
**Threat**: Attempting to modify tickets in protected states (In Progress, Completed, Closed)

**Mitigation**: Server-side whitelist of editable statuses enforced at service layer

### 3. Privilege Escalation
**Threat**: Non-supervisor users attempting to assign tickets

**Mitigation**: Role-based access control at service layer checks user permissions

### 4. Browser Console Manipulation
**Threat**: Modifying JavaScript to enable disabled buttons

**Mitigation**: Function-level check validates status before opening modal + backend validation

## Testing Recommendations

### Frontend Tests
1. Verify edit button is disabled for non-"Assigned" tickets
2. Check tooltip appears on hover for disabled buttons
3. Confirm modal doesn't open for non-editable tickets
4. Test warning banner appears/disappears when selecting/deselecting all technicians

### Backend Tests
1. Test API call with "In Progress" ticket returns error
2. Test API call with "Completed" ticket returns error
3. Test API call with "Closed" ticket returns error
4. Verify role-based access control rejects non-supervisor users
5. Test unassignment workflow (empty technician array) works correctly

### Integration Tests
1. Full workflow: Open → Assigned → In Progress (technician updates) → attempt edit (should fail)
2. Unassignment workflow: Assigned → deselect all technicians → verify status becomes Open
3. Permission workflow: Login as different roles, verify only Supervisor/Admin can edit

## Error Messages

### Frontend
- `"Only tickets with 'Assigned' status can be edited"` - Toast notification
- Tooltip on disabled button: `"Only tickets with 'Assigned' status can be edited"`

### Backend
- `"This ticket cannot be modified. Only tickets with 'Open' or 'Assigned' status can be edited. Current status: {status}"`
- `"You do not have permission to assign tickets"`
- `"Fault ticket not found"`

## Related Files

### Frontend
- `pages/dashboard/supervisor/index.html` - Modal and warning banner HTML
- `pages/dashboard/supervisor/script.js` - UI logic and validation
- `pages/dashboard/supervisor/style.css` - Button and warning styles

### Backend
- `app/services/FaultTicketService.php` - Business logic and validation
- `app/models/FaultTicketAssignment.php` - Assignment data operations
- `app/controllers/FaultTicketController.php` - API endpoint handling

## Changelog

### October 23, 2025
- Added backend status validation to prevent editing non-"Assigned" tickets
- Implemented frontend disabled button state for non-editable tickets
- Added JavaScript function-level validation check
- Created warning banner for unassignment scenario
- Updated backend to support unassignment workflow (empty technician array)
- Documented complete security implementation

---

**Last Updated**: October 23, 2025
**Implemented By**: System
**Reviewed By**: Pending
