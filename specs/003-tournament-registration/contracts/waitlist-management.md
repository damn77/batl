# API Contract: Waitlist Management

**Feature**: [../spec.md](../spec.md) | **Data Model**: [../data-model.md](../data-model.md)
**Contract Group**: Waitlist Management (P2)
**Service**: `tournamentRegistrationService.js`
**Controller**: `registrationController.js`
**Routes**: `registrationRoutes.js`

## Overview

Organizer-facing endpoints for manual waitlist management including promotion, demotion, and display configuration.

**Functional Requirements**: FR-022 to FR-030
**User Stories**: P2 (Waitlist Management)

---

## GET /api/tournaments/:tournamentId/waitlist

**Purpose**: Get all waitlisted players for a tournament with configurable display order

**User Story**: P2 - Waitlist Management (FR-027, FR-028, FR-047, FR-050)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: Any authenticated user (public view)

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Query Parameters**:
```typescript
{
  orderBy?: 'registration' | 'alphabetical'; // Optional: override tournament default
}
```

**Example**:
```http
GET /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/waitlist
Authorization: Bearer <token>
```

```http
GET /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/waitlist?orderBy=alphabetical
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
      "capacity": 32,
      "currentRegistered": 32,
      "waitlistDisplayOrder": "REGISTRATION_TIME"
    },
    "waitlist": [
      {
        "position": 1,
        "registration": {
          "id": "reg-aaaaaaaa-1111-2222-3333-444444444444",
          "status": "WAITLISTED",
          "registrationTimestamp": "2025-11-01T10:00:00.000Z"
        },
        "player": {
          "id": "player-11111111-aaaa-bbbb-cccc-111111111111",
          "name": "Alice Johnson",
          "email": "alice@example.com"
        }
      },
      {
        "position": 2,
        "registration": {
          "id": "reg-bbbbbbbb-2222-3333-4444-555555555555",
          "status": "WAITLISTED",
          "registrationTimestamp": "2025-11-01T14:30:00.123Z"
        },
        "player": {
          "id": "player-22222222-bbbb-cccc-dddd-222222222222",
          "name": "Bob Smith",
          "email": "bob@example.com"
        }
      },
      {
        "position": 3,
        "registration": {
          "id": "reg-cccccccc-3333-4444-5555-666666666666",
          "status": "WAITLISTED",
          "registrationTimestamp": "2025-11-02T09:15:00.789Z"
        },
        "player": {
          "id": "player-33333333-cccc-dddd-eeee-333333333333",
          "name": "Charlie Davis",
          "email": "charlie@example.com"
        }
      }
    ],
    "displayOrder": "REGISTRATION_TIME",
    "metadata": {
      "totalWaitlisted": 3,
      "estimatedWaitTime": "TBD",
      "note": "Position is calculated by registration timestamp for auto-promotion fairness"
    }
  }
}
```

**Empty Waitlist** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "capacity": 32,
      "currentRegistered": 28,
      "waitlistDisplayOrder": "REGISTRATION_TIME"
    },
    "waitlist": [],
    "displayOrder": "REGISTRATION_TIME",
    "metadata": {
      "totalWaitlisted": 0
    }
  }
}
```

### Business Logic

1. **Get tournament** with waitlistDisplayOrder configuration
2. **Determine display order**:
   - If queryParam `orderBy` provided → use it (override)
   - Else → use tournament.waitlistDisplayOrder
3. **Query waitlisted players**:
   - WHERE status = 'WAITLISTED' AND tournamentId = ?
   - ORDER BY: `registrationTimestamp ASC` OR `player.name ASC` (based on display order)
   - INCLUDE: player profile information
4. **Calculate positions**:
   - Position is 1-indexed
   - Based on display order (may differ from auto-promotion order)
5. **Return** waitlist with metadata

### Implementation Notes

**Display vs Promotion Order** (critical distinction):
- **Display order**: Configurable (REGISTRATION_TIME or ALPHABETICAL) - what user sees
- **Promotion order**: Always REGISTRATION_TIME (fairness) - who gets promoted

```javascript
// Display query (respects config)
const displayOrder = orderBy === 'alphabetical'
  ? [{ player: { name: 'asc' } }]
  : [{ registrationTimestamp: 'asc' }];

// Auto-promotion query (always timestamp)
const promotionOrder = [{ registrationTimestamp: 'asc' }];
```

---

## POST /api/registrations/:registrationId/promote

**Purpose**: Manually promote a waitlisted player to registered status

**User Story**: P2 - Waitlist Management (FR-022, FR-023, FR-024, FR-025)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: ORGANIZER or ADMIN role only

**URL Parameters**:
```typescript
{
  registrationId: string; // UUID of TournamentRegistration to promote
}
```

**Request Body**:
```typescript
{
  reason?: string; // Optional reason for manual promotion (audit trail)
}
```

**Example**:
```http
POST /api/registrations/reg-aaaaaaaa-1111-2222-3333-444444444444/promote
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Priority player - past champion"
}
```

### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-aaaaaaaa-1111-2222-3333-444444444444",
      "playerId": "player-11111111-aaaa-bbbb-cccc-111111111111",
      "tournamentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "REGISTERED",
      "registrationTimestamp": "2025-11-01T10:00:00.000Z",
      "promotedBy": "user-organizer-1234-5678-90ab-cdef12345678",
      "promotedAt": "2025-11-02T16:00:00.000Z"
    },
    "player": {
      "id": "player-11111111-aaaa-bbbb-cccc-111111111111",
      "name": "Alice Johnson",
      "email": "alice@example.com"
    },
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "capacity": 32,
      "currentRegistered": 32
    }
  },
  "message": "Successfully promoted Alice Johnson from waitlist"
}
```

**Error Responses**:

**400 Bad Request - Not Waitlisted**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "Can only promote registrations with WAITLISTED status",
    "details": {
      "registrationId": "reg-aaaaaaaa-1111-2222-3333-444444444444",
      "currentStatus": "REGISTERED"
    }
  }
}
```

**400 Bad Request - Tournament Full**:
```json
{
  "success": false,
  "error": {
    "code": "TOURNAMENT_FULL",
    "message": "Cannot promote: tournament is at capacity",
    "details": {
      "capacity": 32,
      "currentRegistered": 32,
      "suggestion": "Demote a registered player first or increase tournament capacity"
    }
  }
}
```

**403 Forbidden - Not Organizer**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Only organizers and admins can manually promote players",
    "details": {
      "requiredRole": "ORGANIZER or ADMIN",
      "userRole": "PLAYER"
    }
  }
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_NOT_FOUND",
    "message": "Registration not found",
    "details": {
      "registrationId": "reg-aaaaaaaa-1111-2222-3333-444444444444"
    }
  }
}
```

### Business Logic

1. **Authorization check**: Verify user has ORGANIZER or ADMIN role (FR-024)
2. **Get registration**: Find TournamentRegistration by ID
3. **Validate status**: Must be WAITLISTED (FR-022)
4. **Check tournament capacity**:
   - Count REGISTERED players for tournament
   - If >= capacity → error (must demote someone first or increase capacity)
5. **Update registration**:
   - Set `status = 'REGISTERED'`
   - Set `promotedBy = userId` (from auth token)
   - Set `promotedAt = new Date()`
6. **Audit log**: Record manual promotion with reason (if provided)
7. **Return success** with updated registration

### Implementation Notes

**Service Method**:
```javascript
async promoteFromWaitlist(registrationId, promotedByUserId, reason = null) {
  // Returns { registration, player, tournament }
}
```

**Audit Trail**:
- Store `promotedBy` as User ID (not 'SYSTEM')
- Store `promotedAt` timestamp
- Optional: Log to AuditLog table with reason

---

## POST /api/registrations/:registrationId/demote

**Purpose**: Manually demote a registered player to waitlist with auto-promotion option

**User Story**: P2 - Waitlist Management (FR-023, FR-025)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: ORGANIZER or ADMIN role only

**URL Parameters**:
```typescript
{
  registrationId: string; // UUID of TournamentRegistration to demote
}
```

**Request Body**:
```typescript
{
  autoPromote: boolean;           // If true, auto-promote oldest waitlisted player
  manualPromoteId?: string;       // If provided, manually promote specific registration
  reason?: string;                // Optional reason for demotion (audit trail)
}
```

**Example - Auto-Promote**:
```http
POST /api/registrations/reg-dddddddd-4444-5555-6666-777777777777/demote
Authorization: Bearer <token>
Content-Type: application/json

{
  "autoPromote": true,
  "reason": "Player requested to be moved to waitlist"
}
```

**Example - Manual Promote**:
```http
POST /api/registrations/reg-dddddddd-4444-5555-6666-777777777777/demote
Authorization: Bearer <token>
Content-Type: application/json

{
  "autoPromote": false,
  "manualPromoteId": "reg-aaaaaaaa-1111-2222-3333-444444444444",
  "reason": "Swapping players due to injury"
}
```

### Response

**Success Response - With Auto-Promotion** (200 OK):
```json
{
  "success": true,
  "data": {
    "demoted": {
      "registration": {
        "id": "reg-dddddddd-4444-5555-6666-777777777777",
        "status": "WAITLISTED",
        "demotedBy": "user-organizer-1234-5678-90ab-cdef12345678",
        "demotedAt": "2025-11-02T16:15:00.000Z"
      },
      "player": {
        "id": "player-44444444-dddd-eeee-ffff-444444444444",
        "name": "David Wilson"
      }
    },
    "promoted": {
      "registration": {
        "id": "reg-aaaaaaaa-1111-2222-3333-444444444444",
        "status": "REGISTERED",
        "promotedBy": "SYSTEM",
        "promotedAt": "2025-11-02T16:15:00.000Z"
      },
      "player": {
        "id": "player-11111111-aaaa-bbbb-cccc-111111111111",
        "name": "Alice Johnson"
      }
    }
  },
  "message": "Successfully demoted David Wilson to waitlist. Alice Johnson has been automatically promoted."
}
```

**Success Response - Manual Promotion** (200 OK):
```json
{
  "success": true,
  "data": {
    "demoted": {
      "registration": {
        "id": "reg-dddddddd-4444-5555-6666-777777777777",
        "status": "WAITLISTED",
        "demotedBy": "user-organizer-1234-5678-90ab-cdef12345678",
        "demotedAt": "2025-11-02T16:15:00.000Z"
      },
      "player": {
        "id": "player-44444444-dddd-eeee-ffff-444444444444",
        "name": "David Wilson"
      }
    },
    "promoted": {
      "registration": {
        "id": "reg-aaaaaaaa-1111-2222-3333-444444444444",
        "status": "REGISTERED",
        "promotedBy": "user-organizer-1234-5678-90ab-cdef12345678",
        "promotedAt": "2025-11-02T16:15:00.000Z"
      },
      "player": {
        "id": "player-11111111-aaaa-bbbb-cccc-111111111111",
        "name": "Alice Johnson"
      }
    }
  },
  "message": "Successfully demoted David Wilson to waitlist. Manually promoted Alice Johnson."
}
```

**Success Response - No Promotion** (200 OK):
```json
{
  "success": true,
  "data": {
    "demoted": {
      "registration": {
        "id": "reg-dddddddd-4444-5555-6666-777777777777",
        "status": "WAITLISTED",
        "demotedBy": "user-organizer-1234-5678-90ab-cdef12345678",
        "demotedAt": "2025-11-02T16:15:00.000Z"
      },
      "player": {
        "id": "player-44444444-dddd-eeee-ffff-444444444444",
        "name": "David Wilson"
      }
    },
    "promoted": null
  },
  "message": "Successfully demoted David Wilson to waitlist. No waitlisted players to promote."
}
```

**Error Responses**:

**400 Bad Request - Not Registered**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "Can only demote registrations with REGISTERED status",
    "details": {
      "registrationId": "reg-dddddddd-4444-5555-6666-777777777777",
      "currentStatus": "WAITLISTED"
    }
  }
}
```

**400 Bad Request - Invalid Manual Promote**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_MANUAL_PROMOTION",
    "message": "Specified registration for manual promotion is not waitlisted",
    "details": {
      "manualPromoteId": "reg-aaaaaaaa-1111-2222-3333-444444444444",
      "currentStatus": "REGISTERED"
    }
  }
}
```

**400 Bad Request - Missing Promotion Choice**:
```json
{
  "success": false,
  "error": {
    "code": "MISSING_PROMOTION_CHOICE",
    "message": "Must specify either autoPromote: true or provide manualPromoteId",
    "details": {
      "autoPromote": false,
      "manualPromoteId": null
    }
  }
}
```

### Business Logic

1. **Authorization check**: Verify user has ORGANIZER or ADMIN role
2. **Get registration**: Find TournamentRegistration by ID
3. **Validate status**: Must be REGISTERED
4. **Validate promotion choice** (FR-023):
   - If `autoPromote = true` → prepare to promote oldest waitlisted
   - If `manualPromoteId` provided → validate it's a valid waitlisted registration for same tournament
   - If neither → error
5. **Use transaction** to ensure atomicity:
   - Update demoted registration: `status = 'WAITLISTED'`, set demotedBy/demotedAt
   - If auto-promotion:
     - Find oldest WAITLISTED (ORDER BY registrationTimestamp ASC)
     - Update to REGISTERED, set promotedBy = 'SYSTEM'
   - If manual promotion:
     - Find specified registration
     - Update to REGISTERED, set promotedBy = userId
6. **Return success** with both demoted and promoted details

### Implementation Notes

**Modal Workflow** (Frontend):
```
User clicks "Move to Waitlist" → Modal appears with:
- Option 1: Auto-promote next player (shows who will be promoted)
- Option 2: Choose player manually (shows list of waitlisted players)
- Cancel button

User selects option → Calls this endpoint with appropriate params
```

**Service Method**:
```javascript
async demoteToWaitlist(registrationId, options) {
  // options: { autoPromote, manualPromoteId, demotedByUserId, reason }
  // Returns { demoted, promoted }
}
```

---

## PATCH /api/tournaments/:tournamentId/waitlist-display

**Purpose**: Update tournament's waitlist display order configuration

**User Story**: P2 - Waitlist Management (FR-026, FR-027)

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
  waitlistDisplayOrder: 'REGISTRATION_TIME' | 'ALPHABETICAL';
}
```

**Example**:
```http
PATCH /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/waitlist-display
Authorization: Bearer <token>
Content-Type: application/json

{
  "waitlistDisplayOrder": "ALPHABETICAL"
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
      "waitlistDisplayOrder": "ALPHABETICAL",
      "updatedAt": "2025-11-02T16:30:00.000Z"
    },
    "note": "This only affects display order. Auto-promotion still uses registration timestamp for fairness."
  },
  "message": "Waitlist display order updated to alphabetical"
}
```

**Error Responses**:

**400 Bad Request - Invalid Value**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ENUM_VALUE",
    "message": "Invalid waitlistDisplayOrder value",
    "details": {
      "provided": "RANDOM",
      "allowed": ["REGISTRATION_TIME", "ALPHABETICAL"]
    }
  }
}
```

### Business Logic

1. **Authorization check**: Verify user has ORGANIZER or ADMIN role
2. **Validate enum value**: Must be 'REGISTRATION_TIME' or 'ALPHABETICAL'
3. **Update tournament**: Set waitlistDisplayOrder field
4. **Return success** with updated tournament

**Note**: This only affects GET /waitlist endpoint display order. Auto-promotion logic always uses registrationTimestamp.

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
- `200 OK` - Successful operation
- `400 Bad Request` - Validation errors, invalid state transitions
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but insufficient permissions (not ORGANIZER/ADMIN)
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Unexpected server error

---

## Testing Checklist

### Unit Tests (Service Layer)

- [ ] Manual promote changes status from WAITLISTED to REGISTERED
- [ ] Manual promote records promotedBy as user ID
- [ ] Manual promote fails when status is not WAITLISTED
- [ ] Manual promote fails when tournament is at capacity
- [ ] Demote with auto-promote promotes oldest by timestamp
- [ ] Demote with manual promote promotes specified registration
- [ ] Demote with neither auto nor manual ID returns error
- [ ] Demote + promote are atomic (transaction rollback on failure)
- [ ] Waitlist query respects display order (REGISTRATION_TIME)
- [ ] Waitlist query respects display order (ALPHABETICAL)
- [ ] Waitlist display order update succeeds
- [ ] Waitlist display order validation rejects invalid values

### Integration Tests (Controller + Service)

- [ ] GET /waitlist returns players in registration time order (default)
- [ ] GET /waitlist?orderBy=alphabetical returns players alphabetically
- [ ] GET /waitlist returns empty array when no waitlisted players
- [ ] POST /promote returns 200 with updated registration
- [ ] POST /promote returns 403 when user is not organizer
- [ ] POST /promote returns 400 when status is not WAITLISTED
- [ ] POST /demote with autoPromote returns both demoted and promoted
- [ ] POST /demote with manualPromoteId returns both demoted and promoted
- [ ] POST /demote returns 400 when invalid promotion choice
- [ ] PATCH /waitlist-display returns 200 with updated tournament
- [ ] PATCH /waitlist-display returns 400 for invalid enum value

### End-to-End Tests

- [ ] Organizer views waitlist in configured display order
- [ ] Organizer manually promotes player → player appears in registered list
- [ ] Organizer demotes player with auto-promote → oldest waitlisted promoted
- [ ] Organizer changes display order → waitlist re-renders in new order
- [ ] Auto-promotion still uses timestamp order regardless of display setting

---

**Contract Status**: ✅ **COMPLETE**
**Next Contract**: [enhanced-tournament.md](enhanced-tournament.md)
