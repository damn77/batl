# API Contract: Tournament Lifecycle Management

**Feature**: [../spec.md](../spec.md) | **Data Model**: [../data-model.md](../data-model.md)
**Contract Group**: Tournament Lifecycle (P2)
**Service**: `tournamentService.js` (EXTENDED from 002-category-system)
**Controller**: `tournamentController.js` (EXTENDED)
**Routes**: `tournamentRoutes.js` (EXTENDED)

## Overview

Endpoints for managing tournament status lifecycle: starting, completing, and cancelling tournaments.

**Functional Requirements**: FR-042 to FR-046, FR-017, FR-030
**User Stories**: P2 (Manage Tournament Lifecycle)

---

## Tournament Status Flow

```
SCHEDULED ──┐
            ├──→ IN_PROGRESS ──→ COMPLETED
            └──→ CANCELLED
```

**Valid Transitions**:
- `SCHEDULED → IN_PROGRESS` (start tournament)
- `SCHEDULED → CANCELLED` (cancel before start)
- `IN_PROGRESS → COMPLETED` (finish tournament)
- `IN_PROGRESS → CANCELLED` (cancel during tournament - rare, but allowed)

**Invalid Transitions** (will error):
- Any transition FROM `COMPLETED` or `CANCELLED` (terminal states)
- Any backward transition (e.g., `COMPLETED → IN_PROGRESS`)

---

## POST /api/tournaments/:tournamentId/start

**Purpose**: Start a scheduled tournament (transition to IN_PROGRESS)

**User Story**: P2 - Manage Tournament Lifecycle (FR-042, FR-043)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: ORGANIZER or ADMIN role only

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Request Body**: None

**Example**:
```http
POST /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/start
Authorization: Bearer <token>
```

### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "status": "IN_PROGRESS",
      "lastStatusChange": "2025-07-15T09:00:00.000Z",
      "startDate": "2025-07-15T09:00:00.000Z"
    },
    "participants": {
      "registered": 32,
      "withdrawn": 2,
      "active": 30
    },
    "warnings": []
  },
  "message": "Tournament started successfully with 30 active participants"
}
```

**Success Response with Warnings** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "status": "IN_PROGRESS",
      "lastStatusChange": "2025-07-15T09:00:00.000Z"
    },
    "participants": {
      "registered": 6,
      "withdrawn": 0,
      "active": 6
    },
    "warnings": [
      {
        "code": "BELOW_MINIMUM_PARTICIPANTS",
        "message": "Tournament has fewer participants than minimum requirement",
        "details": {
          "minParticipants": 8,
          "currentActive": 6,
          "note": "Tournament started anyway (organizer decision)"
        }
      }
    ]
  },
  "message": "Tournament started with warnings"
}
```

**Error Responses**:

**400 Bad Request - Invalid Status**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Tournament must be in SCHEDULED status to start",
    "details": {
      "currentStatus": "IN_PROGRESS",
      "requestedTransition": "start",
      "allowedFromStatus": "SCHEDULED"
    }
  }
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Only organizers and admins can start tournaments",
    "details": {
      "requiredRole": "ORGANIZER or ADMIN",
      "userRole": "PLAYER"
    }
  }
}
```

### Business Logic

1. **Authorization check**: Verify user has ORGANIZER or ADMIN role (FR-043)
2. **Get tournament**: Find tournament by ID
3. **Validate current status**: Must be SCHEDULED (FR-042)
4. **Check minimum participants** (optional warning):
   - If `minParticipants` is set
   - Count REGISTERED status registrations
   - If count < minParticipants → add warning (but still allow start)
5. **Update tournament**:
   - Set `status = 'IN_PROGRESS'`
   - Set `lastStatusChange = new Date()`
6. **Close registration** (implicit):
   - All waitlisted players remain waitlisted (no auto-promotion on start)
   - New registrations are prevented (registration closed when status != SCHEDULED)
7. **Return success** with participant counts and warnings

**Implementation Note**: Starting a tournament does NOT close registration explicitly - the registration endpoints check if status is SCHEDULED and reject if not.

---

## POST /api/tournaments/:tournamentId/complete

**Purpose**: Complete an in-progress tournament (transition to COMPLETED)

**User Story**: P2 - Manage Tournament Lifecycle (FR-042, FR-043)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: ORGANIZER or ADMIN role only

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Request Body**: None

**Example**:
```http
POST /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/complete
Authorization: Bearer <token>
```

### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "status": "COMPLETED",
      "lastStatusChange": "2025-07-17T18:00:00.000Z",
      "endDate": "2025-07-17T18:00:00.000Z"
    },
    "participants": {
      "registered": 30,
      "completed": 28,
      "withdrawn": 2
    },
    "categoryUpdates": {
      "playersUpdated": 28,
      "note": "All registered players marked as hasParticipated in category"
    }
  },
  "message": "Tournament completed successfully. Category participation records updated."
}
```

**Error Responses**:

**400 Bad Request - Invalid Status**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Tournament must be in IN_PROGRESS status to complete",
    "details": {
      "currentStatus": "SCHEDULED",
      "requestedTransition": "complete",
      "allowedFromStatus": "IN_PROGRESS"
    }
  }
}
```

### Business Logic

1. **Authorization check**: Verify user has ORGANIZER or ADMIN role
2. **Get tournament**: Find tournament by ID with category information
3. **Validate current status**: Must be IN_PROGRESS (FR-042)
4. **Update tournament**:
   - Set `status = 'COMPLETED'`
   - Set `lastStatusChange = new Date()`
5. **Update category participation** (FR-014, FR-029):
   - Get all REGISTERED status registrations for this tournament
   - For each registration:
     - Get player's CategoryRegistration
     - Set `hasParticipated = true`
   - This prevents auto-unregistration from category when players withdraw from future tournaments
6. **Return success** with participant summary and category update count

**Critical**: The `hasParticipated` flag update is essential for FR-014 (smart category cleanup). This ensures players who have participated in at least one tournament remain registered in the category even if they have no active tournament registrations.

---

## POST /api/tournaments/:tournamentId/cancel

**Purpose**: Cancel a tournament (transition to CANCELLED)

**User Story**: P2 - Manage Tournament Lifecycle (FR-042, FR-043, FR-017, FR-030)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: ORGANIZER or ADMIN role only

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Request Body**:
```typescript
{
  reason?: string;           // Optional cancellation reason
  notifyParticipants?: boolean; // If true, trigger notification to all registered/waitlisted players (future feature)
}
```

**Example**:
```http
POST /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Insufficient participants registered",
  "notifyParticipants": true
}
```

### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "status": "CANCELLED",
      "lastStatusChange": "2025-07-10T16:00:00.000Z",
      "cancellationReason": "Insufficient participants registered"
    },
    "registrationUpdates": {
      "totalAffected": 18,
      "registered": 12,
      "waitlisted": 6,
      "allUpdatedTo": "CANCELLED"
    },
    "categoryUpdates": {
      "playersUnregistered": 3,
      "note": "Players with no participation history and no other active tournaments were removed from category"
    }
  },
  "message": "Tournament cancelled. All 18 registrations updated to CANCELLED status. 3 players removed from category."
}
```

**Error Responses**:

**400 Bad Request - Already Terminal**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot cancel tournament - already in terminal status",
    "details": {
      "currentStatus": "COMPLETED",
      "requestedTransition": "cancel",
      "allowedFromStatus": "SCHEDULED or IN_PROGRESS"
    }
  }
}
```

### Business Logic

1. **Authorization check**: Verify user has ORGANIZER or ADMIN role
2. **Get tournament**: Find tournament by ID with category information
3. **Validate current status**: Cannot be COMPLETED or CANCELLED already (FR-042)
4. **Bulk update all registrations** (FR-017, FR-030):
   - Query all TournamentRegistrations for this tournament
   - Filter: status IN ('REGISTERED', 'WAITLISTED') (exclude already WITHDRAWN)
   - Update all to:
     - `status = 'CANCELLED'`
     - `cancelledAt = new Date()`
5. **Update tournament**:
   - Set `status = 'CANCELLED'`
   - Set `lastStatusChange = new Date()`
   - Optionally store cancellation reason (if schema extended)
6. **Smart category cleanup** (FR-013, FR-014):
   - For each affected player:
     - Get their CategoryRegistration for this tournament's category
     - Check if `hasParticipated = false`
     - Count other active TournamentRegistrations (REGISTERED or WAITLISTED) in same category
     - If count = 0 → delete CategoryRegistration
     - If count > 0 → keep CategoryRegistration
7. **Return success** with counts of affected registrations and category cleanups

**Important**: When tournament is cancelled, registrations are NOT deleted - they are updated to CANCELLED status to preserve history (FR-017, FR-030). This allows for reporting and audit trails.

---

## GET /api/tournaments/:tournamentId/status-history

**Purpose**: Get tournament status change history (optional endpoint for audit trail)

**User Story**: P2 - Manage Tournament Lifecycle (audit/reporting)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: Any authenticated user

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Example**:
```http
GET /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/status-history
Authorization: Bearer <token>
```

### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "currentStatus": "COMPLETED"
    },
    "statusHistory": [
      {
        "status": "SCHEDULED",
        "timestamp": "2025-06-01T10:00:00.000Z",
        "triggeredBy": "user-organizer-1234",
        "event": "Tournament created"
      },
      {
        "status": "IN_PROGRESS",
        "timestamp": "2025-07-15T09:00:00.000Z",
        "triggeredBy": "user-organizer-1234",
        "event": "Tournament started"
      },
      {
        "status": "COMPLETED",
        "timestamp": "2025-07-17T18:00:00.000Z",
        "triggeredBy": "user-organizer-1234",
        "event": "Tournament completed"
      }
    ]
  }
}
```

**Implementation Note**: This endpoint requires extending the data model to track status history. Currently `lastStatusChange` only tracks the most recent change. For full audit trail, consider:
- Option A: Query AuditLog table for tournament status changes
- Option B: Create StatusHistory table with foreign key to Tournament
- Option C: Store history as JSON in Tournament table

For MVP, this endpoint can be marked as **FUTURE** and omitted from initial implementation.

---

## Error Handling Standards

**All endpoints follow standard error format**:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional context-specific information
    }
  }
}
```

**HTTP Status Codes**:
- `200 OK` - Successful status transition
- `400 Bad Request` - Invalid status transition, business rule violations
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but insufficient permissions
- `404 Not Found` - Tournament doesn't exist
- `500 Internal Server Error` - Unexpected server error

---

## Testing Checklist

### Unit Tests (Service Layer)

- [ ] Start tournament: SCHEDULED → IN_PROGRESS succeeds
- [ ] Start tournament: IN_PROGRESS → error (already started)
- [ ] Start tournament: COMPLETED → error (terminal state)
- [ ] Start tournament: CANCELLED → error (terminal state)
- [ ] Start tournament: warns if below minimum participants
- [ ] Complete tournament: IN_PROGRESS → COMPLETED succeeds
- [ ] Complete tournament: sets hasParticipated = true for all registered players
- [ ] Complete tournament: SCHEDULED → error (not started)
- [ ] Complete tournament: COMPLETED → error (already completed)
- [ ] Cancel tournament: SCHEDULED → CANCELLED succeeds
- [ ] Cancel tournament: IN_PROGRESS → CANCELLED succeeds
- [ ] Cancel tournament: updates all registrations to CANCELLED
- [ ] Cancel tournament: triggers smart category cleanup
- [ ] Cancel tournament: COMPLETED → error (cannot cancel completed)
- [ ] Cancel tournament: CANCELLED → error (already cancelled)

### Integration Tests (Controller + Service)

- [ ] POST /start returns 200 with status IN_PROGRESS
- [ ] POST /start returns 403 for non-organizer
- [ ] POST /start returns 400 for invalid status
- [ ] POST /start includes warnings if below minimum participants
- [ ] POST /complete returns 200 with status COMPLETED
- [ ] POST /complete returns 400 for invalid status
- [ ] POST /complete updates category participation for all registered players
- [ ] POST /cancel returns 200 with status CANCELLED
- [ ] POST /cancel updates all registrations to CANCELLED
- [ ] POST /cancel returns count of category cleanups
- [ ] GET /status-history returns status change timeline (if implemented)

### End-to-End Tests

- [ ] Organizer starts tournament → status changes to IN_PROGRESS
- [ ] Organizer starts tournament → new registrations are rejected
- [ ] Organizer completes tournament → all registered players get hasParticipated = true
- [ ] Organizer completes tournament → future unregistrations preserve category membership
- [ ] Organizer cancels tournament → all registrations marked CANCELLED
- [ ] Organizer cancels tournament → players with no history removed from category
- [ ] Organizer cancels tournament → players with history kept in category

---

## Summary

**Lifecycle Endpoints**:
- `POST /tournaments/:id/start` - Begin tournament (SCHEDULED → IN_PROGRESS)
- `POST /tournaments/:id/complete` - Finish tournament (IN_PROGRESS → COMPLETED)
- `POST /tournaments/:id/cancel` - Cancel tournament (ANY → CANCELLED)
- `GET /tournaments/:id/status-history` - View status changes (FUTURE)

**Key Business Rules**:
- Only ORGANIZER and ADMIN can change tournament status
- Status transitions are strictly controlled (state machine)
- Completing tournament sets `hasParticipated = true` for all registered players
- Cancelling tournament updates all registrations to CANCELLED (preserves history)
- Cancelling tournament triggers smart category cleanup

**Critical for Feature Success**:
- `hasParticipated` flag update on completion (enables FR-014 smart cleanup)
- Bulk registration status update on cancellation (preserves history per FR-017, FR-030)
- Status validation prevents invalid transitions

---

**Contract Status**: ✅ **COMPLETE**
**All Contracts Complete**: ✅ Ready for [quickstart.md](../quickstart.md)
