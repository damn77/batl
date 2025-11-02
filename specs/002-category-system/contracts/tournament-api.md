# Tournament API Contract

**Feature**: 002-category-system
**Version**: 1.0.0 (Minimal - Category Assignment Only)
**Base URL**: `/api/v1/tournaments`

## Overview

This contract defines the minimal tournament endpoints required for category system integration. Full tournament management features will be implemented in a future feature specification.

**Current Scope**: Tournament creation and category assignment (FR-006)
**Future Scope**: Brackets, scheduling, results, scoring

## Authentication

All endpoints require authentication.

## Authorization

- **ADMIN**: Full access
- **ORGANIZER**: Can create and manage tournaments
- **PLAYER**: Read-only access

## Endpoints

### 1. Create Tournament

```
POST /api/v1/tournaments
```

**Description**: Create a tournament and assign it to a category.

**Authorization**: ADMIN or ORGANIZER

**Request Body**:
```json
{
  "name": "Spring Championship 2025",
  "categoryId": "category-uuid-1",
  "description": "Annual spring tournament for 35+ players",
  "location": "Central Tennis Courts",
  "startDate": "2025-05-01T09:00:00Z",
  "endDate": "2025-05-03T18:00:00Z"
}
```

**Field Validations**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 3-200 characters |
| `categoryId` | string (UUID) | Yes | Must exist (FR-006) |
| `description` | string | No | Max 1000 characters |
| `location` | string | No | Max 200 characters |
| `startDate` | DateTime | Yes | Future date |
| `endDate` | DateTime | Yes | >= startDate |

**Response 201 (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "tournament-uuid-1",
    "name": "Spring Championship 2025",
    "categoryId": "category-uuid-1",
    "description": "Annual spring tournament for 35+ players",
    "location": "Central Tennis Courts",
    "startDate": "2025-05-01T09:00:00Z",
    "endDate": "2025-05-03T18:00:00Z",
    "status": "SCHEDULED",
    "createdAt": "2025-01-15T10:00:00Z",
    "category": {
      "name": "Men's Singles 35+",
      "type": "SINGLES",
      "ageGroup": "AGE_35",
      "gender": "MEN"
    }
  },
  "message": "Tournament created successfully"
}
```

---

### 2. Get Tournament by ID

```
GET /api/v1/tournaments/:id
```

**Description**: Retrieve tournament details including category information.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Tournament unique identifier |

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "tournament-uuid-1",
    "name": "Spring Championship 2025",
    "categoryId": "category-uuid-1",
    "description": "Annual spring tournament for 35+ players",
    "location": "Central Tennis Courts",
    "startDate": "2025-05-01T09:00:00Z",
    "endDate": "2025-05-03T18:00:00Z",
    "status": "SCHEDULED",
    "createdAt": "2025-01-15T10:00:00Z",
    "category": {
      "id": "category-uuid-1",
      "name": "Men's Singles 35+",
      "type": "SINGLES",
      "ageGroup": "AGE_35",
      "gender": "MEN"
    }
  }
}
```

---

### 3. List Tournaments

```
GET /api/v1/tournaments
```

**Description**: List all tournaments with optional filtering.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `categoryId` | string (UUID) | No | Filter by category |
| `status` | string | No | Filter by status: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `startDate` | DateTime | No | Filter tournaments starting after this date |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20) |

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "tournaments": [
      {
        "id": "tournament-uuid-1",
        "name": "Spring Championship 2025",
        "categoryId": "category-uuid-1",
        "startDate": "2025-05-01T09:00:00Z",
        "endDate": "2025-05-03T18:00:00Z",
        "status": "SCHEDULED",
        "category": {
          "name": "Men's Singles 35+"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### 4. Update Tournament

```
PATCH /api/v1/tournaments/:id
```

**Description**: Update tournament details including category assignment (with validation).

**Authorization**: ADMIN or ORGANIZER

**Request Body** (all fields optional):
```json
{
  "name": "Updated Tournament Name",
  "categoryId": "new-category-uuid",
  "description": "Updated description",
  "location": "New location",
  "startDate": "2025-05-02T09:00:00Z",
  "endDate": "2025-05-04T18:00:00Z"
}
```

**Category Change Validation** (FR-006):
- `categoryId` **can be changed** if all registered players are eligible for the new category
- System validates age and gender requirements for all active/suspended registrations
- Use case: Adjust category due to low participation or injuries
- If any registered player is ineligible, update is rejected with detailed error

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "tournament-uuid-1",
    "name": "Updated Tournament Name",
    "categoryId": "category-uuid-1",
    "description": "Updated description",
    "location": "New location",
    "startDate": "2025-05-02T09:00:00Z",
    "endDate": "2025-05-04T18:00:00Z",
    "status": "SCHEDULED",
    "updatedAt": "2025-01-20T14:00:00Z",
    "category": {
      "name": "Men's Singles 40+",
      "type": "SINGLES",
      "ageGroup": "AGE_40",
      "gender": "MEN"
    }
  },
  "message": "Tournament updated successfully"
}
```

**Response 400 (Category Change - Ineligible Players)**:
```json
{
  "success": false,
  "error": {
    "code": "PLAYERS_INELIGIBLE_FOR_NEW_CATEGORY",
    "message": "Cannot change category: some registered players are ineligible for the new category",
    "details": {
      "ineligiblePlayers": [
        {
          "playerId": "player-uuid-1",
          "playerName": "John Doe",
          "reason": "INELIGIBLE_AGE",
          "details": "Player does not meet age requirements"
        },
        {
          "playerId": "player-uuid-2",
          "playerName": "Mike Smith",
          "reason": "INELIGIBLE_GENDER",
          "details": "Player gender does not match category requirements"
        }
      ]
    }
  }
}
```

---

### 5. Delete Tournament

```
DELETE /api/v1/tournaments/:id
```

**Description**: Delete a tournament (only if status is SCHEDULED).

**Authorization**: ADMIN only

**Response 200 (Success)**:
```json
{
  "success": true,
  "message": "Tournament deleted successfully"
}
```

**Response 409 (Conflict)**:
```json
{
  "success": false,
  "error": {
    "code": "TOURNAMENT_STARTED",
    "message": "Cannot delete tournament that is IN_PROGRESS or COMPLETED"
  }
}
```

---

## Business Rules

1. **Required Category Assignment** (FR-006): Every tournament MUST have a categoryId
2. **Conditional Category Change** (FR-006): categoryId can be changed if all registered players (ACTIVE or SUSPENDED status) are eligible for the new category. Allows organizer flexibility for low participation or injuries.
3. **Cascade Protection**: Deleting a category is blocked if tournaments exist
4. **Status Transitions**: SCHEDULED → IN_PROGRESS → COMPLETED (or CANCELLED)

---

## Future Enhancements (Out of Scope)

The following will be implemented in a separate tournament management feature:
- Participant management (player entries)
- Bracket/draw generation
- Match scheduling
- Score/result tracking
- Tournament standings
- Prize/ranking point allocation

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-11-01
**Related Contracts**: category-api.md
**Note**: This is a minimal contract focusing on category integration. Full tournament API will be designed separately.
