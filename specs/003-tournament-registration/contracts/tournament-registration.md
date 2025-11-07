# API Contract: Tournament Registration

**Feature**: [../spec.md](../spec.md) | **Data Model**: [../data-model.md](../data-model.md)
**Contract Group**: Tournament Registration (Core P1)
**Service**: `tournamentRegistrationService.js`
**Controller**: `registrationController.js`
**Routes**: `registrationRoutes.js`

## Overview

Core registration and unregistration endpoints for tournament participation with automatic category enrollment and waitlist support.

**Functional Requirements**: FR-001 to FR-017
**User Stories**: P1 (Register with Auto-Category, Unregister with Smart Cleanup)

---

## POST /api/tournaments/:tournamentId/register

**Purpose**: Register authenticated player for a tournament with auto-category enrollment

**User Story**: P1 - Register with Auto-Category (FR-001, FR-003, FR-004)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: PLAYER or ORGANIZER role
**Rate Limit**: 10 requests per minute per user

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Request Body**: None (player ID extracted from auth token)

**Example**:
```http
POST /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/register
Authorization: Bearer <token>
```

### Response

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-12345678-abcd-1234-abcd-1234567890ab",
      "playerId": "player-87654321-dcba-4321-dcba-0987654321fe",
      "tournamentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "REGISTERED",
      "registrationTimestamp": "2025-11-02T14:30:00.123Z",
      "createdAt": "2025-11-02T14:30:00.123Z"
    },
    "categoryRegistration": {
      "id": "cat-reg-11111111-2222-3333-4444-555555555555",
      "playerId": "player-87654321-dcba-4321-dcba-0987654321fe",
      "categoryId": "cat-99999999-8888-7777-6666-555555555555",
      "status": "ACTIVE",
      "hasParticipated": false,
      "isNew": true
    },
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "category": {
        "id": "cat-99999999-8888-7777-6666-555555555555",
        "name": "Men's Singles 35+",
        "type": "SINGLES",
        "ageGroup": "AGE_35",
        "gender": "MEN"
      }
    }
  },
  "message": "Successfully registered for tournament and category"
}
```

**Waitlisted Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-12345678-abcd-1234-abcd-1234567890ab",
      "playerId": "player-87654321-dcba-4321-dcba-0987654321fe",
      "tournamentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "WAITLISTED",
      "registrationTimestamp": "2025-11-02T14:30:00.123Z",
      "createdAt": "2025-11-02T14:30:00.123Z"
    },
    "categoryRegistration": {
      "id": "cat-reg-11111111-2222-3333-4444-555555555555",
      "playerId": "player-87654321-dcba-4321-dcba-0987654321fe",
      "categoryId": "cat-99999999-8888-7777-6666-555555555555",
      "status": "ACTIVE",
      "hasParticipated": false,
      "isNew": false
    },
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "capacity": 32,
      "currentRegistered": 32,
      "waitlistPosition": 3
    }
  },
  "message": "Tournament is full. You have been added to the waitlist at position 3"
}
```

**Note**: Waitlist registration requires player to already be registered in the tournament's category (anti-spam protection). The `isNew: false` indicates category registration already existed.

**Error Responses**:

**400 Bad Request - Already Registered**:
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_REGISTERED",
    "message": "You are already registered for this tournament",
    "details": {
      "currentStatus": "REGISTERED",
      "registrationId": "reg-existing-12345"
    }
  }
}
```

**400 Bad Request - Waitlist Requires Category Registration**:
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_REGISTRATION_REQUIRED",
    "message": "You must be registered in the tournament's category before joining the waitlist",
    "details": {
      "tournamentName": "Summer Championship 2025",
      "categoryName": "Men's Singles 35+",
      "categoryId": "cat-99999999-8888-7777-6666-555555555555",
      "reason": "Anti-spam protection: waitlist requires category membership",
      "action": "Please register for the category first, then try again"
    }
  }
}
```

**400 Bad Request - Not Eligible**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_ELIGIBLE",
    "message": "You do not meet the eligibility requirements for this tournament's category",
    "details": {
      "categoryName": "Men's Singles 35+",
      "requirements": {
        "minAge": 35,
        "gender": "MEN"
      },
      "playerInfo": {
        "age": 32,
        "gender": "MEN"
      },
      "violations": ["Age below minimum requirement (32 < 35)"]
    }
  }
}
```

**400 Bad Request - Registration Closed**:
```json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_CLOSED",
    "message": "Registration for this tournament is closed",
    "details": {
      "registrationCloseDate": "2025-10-31T23:59:59Z",
      "now": "2025-11-02T14:30:00Z"
    }
  }
}
```

**404 Not Found - Tournament**:
```json
{
  "success": false,
  "error": {
    "code": "TOURNAMENT_NOT_FOUND",
    "message": "Tournament not found",
    "details": {
      "tournamentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  }
}
```

**409 Conflict - Tournament Not Scheduled**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOURNAMENT_STATUS",
    "message": "Cannot register for tournament with status: IN_PROGRESS",
    "details": {
      "currentStatus": "IN_PROGRESS",
      "allowedStatus": "SCHEDULED"
    }
  }
}
```

### Business Logic

1. **Validate tournament exists and status is SCHEDULED** (FR-010, FR-011)
2. **Check registration window** (FR-038, FR-039):
   - If `registrationOpenDate` set and not yet reached → error
   - If `registrationCloseDate` set and passed → error
3. **Check duplicate registration** (FR-009):
   - Query for existing registration with same playerId + tournamentId
   - If found with status REGISTERED or WAITLISTED → error
   - If found with status WITHDRAWN → allow re-registration (create new record)
4. **Validate player eligibility** (via categoryService):
   - Check age requirements (if not ALL_AGES category)
   - Check gender requirements
   - Return detailed error if not eligible
5. **Check tournament capacity to determine status** (FR-018):
   - Count REGISTERED status registrations
   - If count < capacity OR capacity is null → will assign REGISTERED
   - If count >= capacity → will assign WAITLISTED (proceed to step 6)
   - If count < capacity → proceed to step 7
6. **Waitlist-specific validation** (FR-029, FR-030):
   - Query for existing CategoryRegistration for this player + category
   - If NOT found → error with code CATEGORY_REGISTRATION_REQUIRED (anti-spam protection)
   - If found → proceed to step 8 (create with WAITLISTED status)
7. **Check or create category registration for REGISTERED status** (FR-003, FR-004, FR-030):
   - Query for existing CategoryRegistration
   - If not found → create new with `hasParticipated = false`
   - If found with status WITHDRAWN → reactivate
8. **Create TournamentRegistration** with appropriate status (REGISTERED or WAITLISTED)
9. **Return success** with registration details and category info

### Implementation Notes

**Transaction Boundary**:
```javascript
// Use Prisma transaction for atomicity
await prisma.$transaction(async (tx) => {
  // 1. Create or update CategoryRegistration
  // 2. Create TournamentRegistration
  // If either fails, rollback both
});
```

**Service Method**:
```javascript
async registerPlayer(playerId, tournamentId) {
  // Validation and business logic as described above
  // Returns { registration, categoryRegistration, tournament }
}
```

---

## DELETE /api/tournaments/:tournamentId/register

**Purpose**: Unregister authenticated player from tournament with smart category cleanup

**User Story**: P1 - Unregister with Smart Cleanup (FR-012, FR-013, FR-014, FR-015, FR-016)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: PLAYER or ORGANIZER role (player can only unregister themselves)

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Request Body**: None

**Example**:
```http
DELETE /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/register
Authorization: Bearer <token>
```

### Response

**Success Response - Unregistered with Auto-Promotion** (200 OK):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-12345678-abcd-1234-abcd-1234567890ab",
      "status": "WITHDRAWN",
      "withdrawnAt": "2025-11-02T15:45:00.456Z"
    },
    "autoPromotion": {
      "promoted": true,
      "promotedPlayer": {
        "id": "player-99999999-aaaa-bbbb-cccc-dddddddddddd",
        "name": "Jane Smith",
        "registrationId": "reg-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "originalWaitlistPosition": 1,
        "registrationTimestamp": "2025-11-01T10:00:00.000Z"
      }
    },
    "categoryAction": "KEPT",
    "categoryReason": "Player has participated in other tournaments in this category"
  },
  "message": "Successfully unregistered from tournament. Jane Smith has been promoted from the waitlist."
}
```

**Success Response - Unregistered without Auto-Promotion** (200 OK):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-12345678-abcd-1234-abcd-1234567890ab",
      "status": "WITHDRAWN",
      "withdrawnAt": "2025-11-02T15:45:00.456Z"
    },
    "autoPromotion": {
      "promoted": false,
      "reason": "No players on waitlist"
    },
    "categoryAction": "REMOVED",
    "categoryReason": "No participation history and no other active tournaments in category"
  },
  "message": "Successfully unregistered from tournament and removed from category"
}
```

**Error Responses**:

**404 Not Found - Registration**:
```json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_NOT_FOUND",
    "message": "You are not registered for this tournament",
    "details": {
      "tournamentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "playerId": "player-87654321-dcba-4321-dcba-0987654321fe"
    }
  }
}
```

**400 Bad Request - Already Withdrawn**:
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_WITHDRAWN",
    "message": "You have already withdrawn from this tournament",
    "details": {
      "registrationId": "reg-12345678-abcd-1234-abcd-1234567890ab",
      "withdrawnAt": "2025-11-01T12:00:00.000Z"
    }
  }
}
```

### Business Logic

1. **Find existing registration** (FR-012):
   - Query TournamentRegistration by playerId + tournamentId
   - If not found → 404 error
   - If status is WITHDRAWN or CANCELLED → 400 error
2. **Update registration status to WITHDRAWN** (FR-015):
   - Set `status = 'WITHDRAWN'`
   - Set `withdrawnAt = new Date()`
3. **Auto-promote from waitlist if needed** (FR-021):
   - If original status was REGISTERED (not WAITLISTED):
     - Query for oldest waitlisted player (ORDER BY registrationTimestamp ASC)
     - If found → update to REGISTERED, set promotedBy = 'SYSTEM', set promotedAt
     - Return promotion details in response
4. **Check category cleanup** (FR-013, FR-014):
   - Get CategoryRegistration for this player + category
   - If `hasParticipated = true` → keep CategoryRegistration
   - If `hasParticipated = false`:
     - Count other active TournamentRegistrations (REGISTERED or WAITLISTED) for same category
     - If count = 0 → delete CategoryRegistration
     - If count > 0 → keep CategoryRegistration
5. **Return success** with details about auto-promotion and category action

### Implementation Notes

**Transaction Boundary**:
```javascript
await prisma.$transaction(async (tx) => {
  // 1. Update TournamentRegistration to WITHDRAWN
  // 2. Auto-promote waitlisted player (if applicable)
  // 3. Delete CategoryRegistration (if applicable)
  // Atomic operation ensures consistency
});
```

**Service Method**:
```javascript
async unregisterPlayer(playerId, tournamentId) {
  // Returns {
  //   registration: { id, status, withdrawnAt },
  //   autoPromotion: { promoted, promotedPlayer?, reason? },
  //   categoryAction: 'KEPT' | 'REMOVED',
  //   categoryReason: string
  // }
}
```

---

## GET /api/tournaments/:tournamentId/registration/status

**Purpose**: Get authenticated player's registration status for a tournament

**User Story**: P1 - Register with Auto-Category (FR-047)

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
GET /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/registration/status
Authorization: Bearer <token>
```

### Response

**Success Response - Registered** (200 OK):
```json
{
  "success": true,
  "data": {
    "isRegistered": true,
    "registration": {
      "id": "reg-12345678-abcd-1234-abcd-1234567890ab",
      "status": "REGISTERED",
      "registrationTimestamp": "2025-11-02T14:30:00.123Z"
    }
  }
}
```

**Success Response - Waitlisted** (200 OK):
```json
{
  "success": true,
  "data": {
    "isRegistered": true,
    "registration": {
      "id": "reg-12345678-abcd-1234-abcd-1234567890ab",
      "status": "WAITLISTED",
      "registrationTimestamp": "2025-11-02T14:30:00.123Z",
      "waitlistPosition": 5
    }
  }
}
```

**Success Response - Not Registered** (200 OK):
```json
{
  "success": true,
  "data": {
    "isRegistered": false,
    "canRegister": true,
    "eligibility": {
      "meetsRequirements": true,
      "categoryName": "Men's Singles 35+"
    }
  }
}
```

**Success Response - Not Eligible** (200 OK):
```json
{
  "success": true,
  "data": {
    "isRegistered": false,
    "canRegister": false,
    "eligibility": {
      "meetsRequirements": false,
      "categoryName": "Men's Singles 35+",
      "violations": ["Age below minimum requirement (32 < 35)"]
    }
  }
}
```

### Business Logic

1. **Query for registration**: Find TournamentRegistration by playerId + tournamentId
2. **If found**: Return registration details with status
   - If WAITLISTED: Calculate waitlist position by counting registrations with earlier timestamp
3. **If not found**: Check eligibility using categoryService
4. **Return**: Registration status or eligibility information

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
- `200 OK` - Successful GET request
- `201 Created` - Successful POST (registration created)
- `400 Bad Request` - Validation errors, business rule violations
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - State conflict (e.g., tournament not in SCHEDULED status)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Unexpected server error

---

## Testing Checklist

### Unit Tests (Service Layer)

- [ ] Registration with empty tournament capacity → status REGISTERED
- [ ] Registration when under capacity → status REGISTERED
- [ ] Registration when at capacity AND player in category → status WAITLISTED
- [ ] Registration when at capacity AND player NOT in category → error CATEGORY_REGISTRATION_REQUIRED
- [ ] Duplicate registration prevention (same player, same tournament)
- [ ] Re-registration after withdrawal (should work)
- [ ] Auto-category registration when player not in category (REGISTERED status only)
- [ ] Skip auto-category registration for WAITLISTED status
- [ ] Skip category registration when player already in category
- [ ] Unregistration triggers auto-promotion from waitlist
- [ ] Unregistration with no waitlist (no auto-promotion)
- [ ] Category cleanup when hasParticipated = false and no other active tournaments
- [ ] Category kept when hasParticipated = true
- [ ] Category kept when other active tournaments exist

### Integration Tests (Controller + Service)

- [ ] POST /register returns 201 with correct status (REGISTERED)
- [ ] POST /register returns 201 with WAITLISTED when full AND player in category
- [ ] POST /register returns 400 CATEGORY_REGISTRATION_REQUIRED when full AND player NOT in category
- [ ] POST /register returns 400 when already registered
- [ ] POST /register returns 400 when not eligible (age)
- [ ] POST /register returns 400 when not eligible (gender)
- [ ] POST /register returns 400 when registration closed
- [ ] DELETE /register returns 200 with auto-promotion details
- [ ] DELETE /register returns 404 when not registered
- [ ] GET /registration/status returns correct status
- [ ] GET /registration/status calculates waitlist position correctly

### End-to-End Tests

- [ ] Player registers → appears in tournament participant list
- [ ] Player registers → auto-added to category
- [ ] Player unregisters → removed from participant list
- [ ] Player unregisters → next waitlisted player promoted automatically
- [ ] Player unregisters → removed from category (if no participation history)

---

**Contract Status**: ✅ **COMPLETE**
**Next Contract**: [waitlist-management.md](waitlist-management.md)
