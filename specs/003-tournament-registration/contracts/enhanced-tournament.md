# API Contract: Enhanced Tournament Management

**Feature**: [../spec.md](../spec.md) | **Data Model**: [../data-model.md](../data-model.md)
**Contract Group**: Enhanced Tournament Data (P2)
**Service**: `tournamentService.js` (EXTENDED from 002-category-system)
**Controller**: `tournamentController.js` (EXTENDED)
**Routes**: `tournamentRoutes.js` (EXTENDED)

## Overview

Extended tournament creation and update endpoints with enhanced logistics fields: location, capacity, organizer contacts, entry fees, registration windows, and prize information.

**Functional Requirements**: FR-031 to FR-041
**User Stories**: P2 (Create Tournament with Enhanced Details), P3 (View Participants and Manage Capacity)

---

## POST /api/tournaments

**Purpose**: Create a new tournament with enhanced logistical details

**User Story**: P2 - Create Tournament with Enhanced Details (FR-031 to FR-041)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: ORGANIZER or ADMIN role only

**Request Body**:
```typescript
{
  // REQUIRED FIELDS (from 002-category-system)
  name: string;              // Tournament display name
  categoryId: string;        // UUID of category
  startDate: string;         // ISO 8601 datetime
  endDate: string;           // ISO 8601 datetime

  // OPTIONAL FIELDS (existing)
  description?: string;      // Tournament description

  // OPTIONAL FIELDS (NEW - Enhanced Details)
  location?: string;         // Physical location or "Online"
  capacity?: number;         // Max registered players (null = unlimited)
  organizerEmail?: string;   // Organizer contact email
  organizerPhone?: string;   // Organizer contact phone
  entryFee?: number;         // Entry fee in local currency (null = free)
  rulesUrl?: string;         // URL to tournament-specific rules
  prizeDescription?: string; // Text description of prizes
  registrationOpenDate?: string;  // ISO 8601 datetime (null = open immediately)
  registrationCloseDate?: string; // ISO 8601 datetime (null = open until tournament starts)
  minParticipants?: number;       // Minimum required participants
  waitlistDisplayOrder?: 'REGISTRATION_TIME' | 'ALPHABETICAL'; // Default: REGISTRATION_TIME
}
```

**Example**:
```http
POST /api/tournaments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Summer Championship 2025",
  "categoryId": "cat-99999999-8888-7777-6666-555555555555",
  "startDate": "2025-07-15T09:00:00Z",
  "endDate": "2025-07-17T18:00:00Z",
  "description": "Annual summer tournament featuring top players in the region",
  "location": "Central Sports Complex, Court 1-4",
  "capacity": 32,
  "organizerEmail": "organizer@example.com",
  "organizerPhone": "+1-555-0100",
  "entryFee": 50.00,
  "rulesUrl": "https://example.com/tournaments/summer-2025/rules",
  "prizeDescription": "1st: $1000, 2nd: $500, 3rd: $250",
  "registrationOpenDate": "2025-06-01T00:00:00Z",
  "registrationCloseDate": "2025-07-10T23:59:59Z",
  "minParticipants": 8,
  "waitlistDisplayOrder": "REGISTRATION_TIME"
}
```

### Response

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "categoryId": "cat-99999999-8888-7777-6666-555555555555",
      "category": {
        "id": "cat-99999999-8888-7777-6666-555555555555",
        "name": "Men's Singles 35+",
        "type": "SINGLES",
        "ageGroup": "AGE_35",
        "gender": "MEN"
      },
      "startDate": "2025-07-15T09:00:00.000Z",
      "endDate": "2025-07-17T18:00:00.000Z",
      "description": "Annual summer tournament featuring top players in the region",
      "location": "Central Sports Complex, Court 1-4",
      "capacity": 32,
      "organizerEmail": "organizer@example.com",
      "organizerPhone": "+1-555-0100",
      "entryFee": 50.00,
      "rulesUrl": "https://example.com/tournaments/summer-2025/rules",
      "prizeDescription": "1st: $1000, 2nd: $500, 3rd: $250",
      "registrationOpenDate": "2025-06-01T00:00:00.000Z",
      "registrationCloseDate": "2025-07-10T23:59:59.000Z",
      "minParticipants": 8,
      "waitlistDisplayOrder": "REGISTRATION_TIME",
      "status": "SCHEDULED",
      "createdAt": "2025-11-02T10:00:00.000Z",
      "updatedAt": "2025-11-02T10:00:00.000Z"
    }
  },
  "message": "Tournament created successfully"
}
```

**Error Responses**:

**400 Bad Request - Validation Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Tournament validation failed",
    "details": {
      "errors": [
        {
          "field": "capacity",
          "message": "Capacity must be a positive integer",
          "value": -10
        },
        {
          "field": "startDate",
          "message": "Start date must be in the future",
          "value": "2024-01-01T00:00:00Z"
        },
        {
          "field": "endDate",
          "message": "End date must be after start date",
          "value": "2024-01-01T00:00:00Z"
        }
      ]
    }
  }
}
```

**400 Bad Request - Registration Window Invalid**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REGISTRATION_WINDOW",
    "message": "Registration close date must be before tournament start date",
    "details": {
      "registrationCloseDate": "2025-07-20T23:59:59Z",
      "startDate": "2025-07-15T09:00:00Z"
    }
  }
}
```

**404 Not Found - Category**:
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Category not found",
    "details": {
      "categoryId": "cat-invalid-id"
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
    "message": "Only organizers and admins can create tournaments",
    "details": {
      "requiredRole": "ORGANIZER or ADMIN",
      "userRole": "PLAYER"
    }
  }
}
```

### Validation Rules

**Required Fields**:
- `name`: Non-empty string, max 200 characters
- `categoryId`: Valid UUID, category must exist
- `startDate`: ISO 8601 datetime, must be in the future
- `endDate`: ISO 8601 datetime, must be after startDate

**Optional Field Validation**:
- `capacity`: Integer >= 1 or null
- `entryFee`: Number >= 0 or null
- `organizerEmail`: Valid email format or null
- `organizerPhone`: Valid phone format or null (flexible international formats)
- `rulesUrl`: Valid URL or null
- `registrationOpenDate`: ISO 8601 datetime or null, must be before startDate
- `registrationCloseDate`: ISO 8601 datetime or null, must be before startDate, must be after registrationOpenDate
- `minParticipants`: Integer >= 1 or null, should be <= capacity if both set
- `waitlistDisplayOrder`: Enum value ('REGISTRATION_TIME' or 'ALPHABETICAL')

**Business Rules**:
- `registrationCloseDate` must be before `startDate` (FR-039)
- `registrationOpenDate` must be before `registrationCloseDate` (if both set) (FR-038)
- `minParticipants` should be <= `capacity` (warning, not error)

---

## PATCH /api/tournaments/:tournamentId

**Purpose**: Update tournament details (extends existing endpoint from 002-category-system)

**User Story**: P2 - Manage Tournament Lifecycle (FR-044)

### Request

**Authentication**: Required (Bearer token)
**Authorization**: ORGANIZER or ADMIN role only

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Request Body** (all fields optional):
```typescript
{
  name?: string;
  description?: string;
  location?: string;
  capacity?: number | null;          // Can set to null for unlimited
  organizerEmail?: string | null;
  organizerPhone?: string | null;
  entryFee?: number | null;
  rulesUrl?: string | null;
  prizeDescription?: string | null;
  registrationOpenDate?: string | null;
  registrationCloseDate?: string | null;
  minParticipants?: number | null;
  waitlistDisplayOrder?: 'REGISTRATION_TIME' | 'ALPHABETICAL';
  startDate?: string;
  endDate?: string;
}
```

**Example**:
```http
PATCH /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <token>
Content-Type: application/json

{
  "capacity": 48,
  "prizeDescription": "1st: $1500, 2nd: $750, 3rd: $350 (increased prizes!)",
  "registrationCloseDate": "2025-07-12T23:59:59Z"
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
      "capacity": 48,
      "prizeDescription": "1st: $1500, 2nd: $750, 3rd: $350 (increased prizes!)",
      "registrationCloseDate": "2025-07-12T23:59:59.000Z",
      "updatedAt": "2025-11-02T14:00:00.000Z"
    },
    "changes": {
      "capacity": {
        "from": 32,
        "to": 48,
        "note": "16 new spots opened"
      },
      "prizeDescription": {
        "from": "1st: $1000, 2nd: $500, 3rd: $250",
        "to": "1st: $1500, 2nd: $750, 3rd: $350 (increased prizes!)"
      },
      "registrationCloseDate": {
        "from": "2025-07-10T23:59:59.000Z",
        "to": "2025-07-12T23:59:59.000Z"
      }
    }
  },
  "message": "Tournament updated successfully"
}
```

**Success Response with Capacity Reduction** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "capacity": 24,
      "updatedAt": "2025-11-02T14:00:00.000Z"
    },
    "changes": {
      "capacity": {
        "from": 32,
        "to": 24,
        "note": "Capacity reduced"
      }
    },
    "warnings": [
      {
        "code": "CAPACITY_REDUCTION_DEMOTED_PLAYERS",
        "message": "8 registered players were automatically moved to waitlist due to capacity reduction",
        "details": {
          "demotedCount": 8,
          "demotedPlayers": [
            { "id": "player-1", "name": "Player One", "registrationTimestamp": "2025-11-02T12:00:00Z" },
            { "id": "player-2", "name": "Player Two", "registrationTimestamp": "2025-11-02T13:00:00Z" }
          ],
          "note": "Last registered players were demoted first"
        }
      }
    ]
  },
  "message": "Tournament capacity reduced. 8 players moved to waitlist."
}
```

**Error Responses**:

**400 Bad Request - Capacity Below Registered**:
```json
{
  "success": false,
  "error": {
    "code": "CAPACITY_TOO_LOW",
    "message": "Cannot reduce capacity below current registered count",
    "details": {
      "requestedCapacity": 10,
      "currentRegistered": 24,
      "suggestion": "Current registered players will be automatically moved to waitlist if capacity is reduced"
    }
  }
}
```

**Note**: Actually, based on the spec, we should allow this and auto-demote players. The error above might not be needed. Let me reconsider:

**Correction**: Capacity reduction should auto-demote excess players (FR-041). No error needed, just warning in response.

### Business Logic - Capacity Changes

**When Increasing Capacity**:
1. Update capacity value
2. Trigger auto-promotion for waitlisted players (up to new capacity)
3. Return list of auto-promoted players

**When Decreasing Capacity**:
1. Count current REGISTERED players
2. If new capacity < current registered:
   - Calculate excess count
   - Query REGISTERED players ORDER BY registrationTimestamp DESC (last registered first)
   - Update excess players to WAITLISTED status
   - Set demotedBy = 'SYSTEM' (due to capacity reduction)
3. Update capacity value
4. Return warning with list of demoted players

---

## GET /api/tournaments/:tournamentId

**Purpose**: Get tournament details with all enhanced fields (extends existing endpoint)

**User Story**: P3 - View Participants and Manage Capacity (FR-047, FR-048, FR-049)

### Request

**Authentication**: Optional (public view, but auth enables additional data)
**Authorization**: Public

**URL Parameters**:
```typescript
{
  tournamentId: string; // UUID of tournament
}
```

**Query Parameters**:
```typescript
{
  include?: string; // Comma-separated: 'participants', 'waitlist', 'category', 'stats'
}
```

**Example**:
```http
GET /api/tournaments/a1b2c3d4-e5f6-7890-abcd-ef1234567890?include=participants,waitlist,stats
Authorization: Bearer <token> (optional)
```

### Response

**Success Response - Full Details** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Summer Championship 2025",
      "categoryId": "cat-99999999-8888-7777-6666-555555555555",
      "category": {
        "id": "cat-99999999-8888-7777-6666-555555555555",
        "name": "Men's Singles 35+",
        "type": "SINGLES",
        "ageGroup": "AGE_35",
        "gender": "MEN"
      },
      "description": "Annual summer tournament featuring top players in the region",
      "location": "Central Sports Complex, Court 1-4",
      "capacity": 32,
      "organizerEmail": "organizer@example.com",
      "organizerPhone": "+1-555-0100",
      "entryFee": 50.00,
      "rulesUrl": "https://example.com/tournaments/summer-2025/rules",
      "prizeDescription": "1st: $1000, 2nd: $500, 3rd: $250",
      "registrationOpenDate": "2025-06-01T00:00:00.000Z",
      "registrationCloseDate": "2025-07-10T23:59:59.000Z",
      "minParticipants": 8,
      "waitlistDisplayOrder": "REGISTRATION_TIME",
      "startDate": "2025-07-15T09:00:00.000Z",
      "endDate": "2025-07-17T18:00:00.000Z",
      "status": "SCHEDULED",
      "createdAt": "2025-11-02T10:00:00.000Z",
      "updatedAt": "2025-11-02T14:00:00.000Z"
    },
    "stats": {
      "totalRegistered": 32,
      "totalWaitlisted": 8,
      "spotsAvailable": 0,
      "registrationStatus": "FULL",
      "daysUntilStart": 254,
      "registrationWindowStatus": "OPEN"
    },
    "participants": [
      {
        "id": "reg-11111111-aaaa-bbbb-cccc-111111111111",
        "player": {
          "id": "player-11111111-aaaa-bbbb-cccc-111111111111",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "status": "REGISTERED",
        "registrationTimestamp": "2025-11-01T10:00:00.000Z"
      }
      // ... more registered players
    ],
    "waitlist": [
      {
        "position": 1,
        "registration": {
          "id": "reg-aaaaaaaa-1111-2222-3333-444444444444",
          "status": "WAITLISTED",
          "registrationTimestamp": "2025-11-02T09:00:00.000Z"
        },
        "player": {
          "id": "player-aaaaaaaa-1111-2222-3333-444444444444",
          "name": "Alice Johnson",
          "email": "alice@example.com"
        }
      }
      // ... more waitlisted players
    ]
  }
}
```

### Query Includes

**`include=participants`**: Include list of registered players (REGISTERED status only)
**`include=waitlist`**: Include waitlist (WAITLISTED status only)
**`include=category`**: Include full category details
**`include=stats`**: Include computed statistics (registered count, spots available, etc.)

---

## GET /api/tournaments

**Purpose**: List tournaments with filtering and pagination (extends existing endpoint)

**User Story**: P3 - View Participants and Manage Capacity (FR-051, FR-052, FR-053)

### Request

**Authentication**: Optional
**Authorization**: Public

**Query Parameters**:
```typescript
{
  categoryId?: string;           // Filter by category
  status?: string;               // Filter by status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
  location?: string;             // Filter by location (partial match)
  minEntryFee?: number;          // Filter by minimum entry fee
  maxEntryFee?: number;          // Filter by maximum entry fee
  registrationOpen?: boolean;    // Filter by registration window (true = currently accepting registrations)
  hasCapacity?: boolean;         // Filter by availability (true = has spots available)
  startDateFrom?: string;        // ISO 8601 - tournaments starting on or after this date
  startDateTo?: string;          // ISO 8601 - tournaments starting on or before this date
  page?: number;                 // Page number (1-indexed), default: 1
  limit?: number;                // Results per page, default: 20, max: 100
  orderBy?: string;              // Sort field: 'startDate', 'name', 'createdAt', default: 'startDate'
  orderDir?: 'asc' | 'desc';     // Sort direction, default: 'asc'
}
```

**Example**:
```http
GET /api/tournaments?status=SCHEDULED&registrationOpen=true&hasCapacity=true&page=1&limit=10
```

### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournaments": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Summer Championship 2025",
        "category": {
          "name": "Men's Singles 35+"
        },
        "location": "Central Sports Complex",
        "capacity": 32,
        "currentRegistered": 28,
        "spotsAvailable": 4,
        "entryFee": 50.00,
        "startDate": "2025-07-15T09:00:00.000Z",
        "status": "SCHEDULED",
        "registrationStatus": "OPEN"
      }
      // ... more tournaments
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalResults": 45,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "status": "SCHEDULED",
      "registrationOpen": true,
      "hasCapacity": true
    }
  }
}
```

---

## Testing Checklist

### Unit Tests (Service Layer)

- [ ] Create tournament with all enhanced fields succeeds
- [ ] Create tournament with minimal fields succeeds (all optional fields null)
- [ ] Update tournament with capacity increase triggers auto-promotion
- [ ] Update tournament with capacity decrease demotes excess players (last registered first)
- [ ] Validate registrationCloseDate must be before startDate
- [ ] Validate registrationOpenDate must be before registrationCloseDate
- [ ] Validate capacity must be positive integer or null
- [ ] Validate entryFee must be non-negative or null

### Integration Tests (Controller + Service)

- [ ] POST /tournaments returns 201 with all fields
- [ ] POST /tournaments returns 400 for invalid registration window
- [ ] POST /tournaments returns 403 for non-organizer
- [ ] PATCH /tournaments returns 200 with updated fields
- [ ] PATCH /tournaments with capacity increase auto-promotes waitlisted players
- [ ] PATCH /tournaments with capacity decrease demotes registered players
- [ ] GET /tournaments/:id returns full tournament details
- [ ] GET /tournaments/:id?include=participants returns participants
- [ ] GET /tournaments/:id?include=waitlist returns waitlist
- [ ] GET /tournaments?registrationOpen=true filters correctly
- [ ] GET /tournaments?hasCapacity=true filters correctly

### End-to-End Tests

- [ ] Organizer creates tournament with capacity → capacity enforced on registration
- [ ] Organizer updates capacity upward → waitlisted players auto-promoted
- [ ] Organizer updates capacity downward → excess registered players demoted
- [ ] Public user views tournament → sees all enhanced fields
- [ ] Public user filters tournaments by registration status

---

**Contract Status**: ✅ **COMPLETE**
**Next Contract**: [tournament-lifecycle.md](tournament-lifecycle.md)
