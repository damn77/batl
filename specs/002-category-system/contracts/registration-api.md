# Registration API Contract

**Feature**: 002-category-system
**Version**: 1.0.0
**Base URL**: `/api/v1/registrations`

## Overview

The Registration API manages player registrations to tournament categories with automatic eligibility validation based on age and gender rules. Each player can register for multiple categories, but only once per category.

## Authentication

All endpoints require authentication via session cookie.

## Authorization

- **ADMIN**: Full access to all registrations
- **ORGANIZER**: Can register players and view all registrations
- **PLAYER**: Can register themselves and view their own registrations

## Endpoints

### 1. Register Player for Category

```
POST /api/v1/registrations
```

**Description**: Register a player for a category with automatic eligibility validation.

**Authorization**: ADMIN, ORGANIZER, or PLAYER (self-registration only)

**Request Body**:
```json
{
  "playerId": "player-uuid-1",
  "categoryId": "category-uuid-1"
}
```

**Field Validations**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `playerId` | string (UUID) | Yes | Must exist in PlayerProfile table |
| `categoryId` | string (UUID) | Yes | Must exist in Category table |

**Eligibility Validation** (automatic):
1. Player must have `birthDate` and `gender` set in profile
2. Age validation (FR-008, FR-009, FR-010):
   - Age calculated as: `current year - birth year` (players eligible from Jan 1 of year they turn required age)
   - If category.ageGroup ≠ ALL_AGES: player age >= minimum age
   - Players can register for categories at or below their age
   - Example: Player born Dec 31, 1988 is 37 years old for entire 2025 calendar year
3. Gender validation (FR-011):
   - If category.gender ≠ MIXED: player.gender must match category.gender
4. No duplicate registration (FR-007)

**Request Example**:
```http
POST /api/v1/registrations
Authorization: [session cookie]
Content-Type: application/json

{
  "playerId": "player-uuid-1",
  "categoryId": "category-uuid-1"
}
```

**Response 201 (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "registration-uuid-1",
    "playerId": "player-uuid-1",
    "categoryId": "category-uuid-1",
    "status": "ACTIVE",
    "registeredAt": "2025-01-15T10:00:00Z",
    "player": {
      "name": "John Doe",
      "age": 37,
      "gender": "MEN"
    },
    "category": {
      "name": "Men's Singles 35+",
      "type": "SINGLES",
      "ageGroup": "AGE_35",
      "gender": "MEN"
    }
  },
  "message": "Player registered successfully for Men's Singles 35+"
}
```

**Response 409 (Duplicate Registration)**:
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_REGISTERED",
    "message": "Player is already registered for this category",
    "details": {
      "existingRegistrationId": "registration-uuid-2",
      "registeredAt": "2025-01-10T08:00:00Z",
      "status": "ACTIVE"
    }
  }
}
```

**Response 400 (Eligibility Failure - Age)**:
```json
{
  "success": false,
  "error": {
    "code": "INELIGIBLE_AGE",
    "message": "Player does not meet age requirements",
    "details": {
      "playerAge": 32,
      "requiredMinimumAge": 35,
      "categoryName": "Men's Singles 35+"
    }
  }
}
```

**Response 400 (Eligibility Failure - Gender)**:
```json
{
  "success": false,
  "error": {
    "code": "INELIGIBLE_GENDER",
    "message": "Player gender does not match category requirements",
    "details": {
      "playerGender": "WOMEN",
      "requiredGender": "MEN",
      "categoryName": "Men's Singles 35+"
    }
  }
}
```

**Response 400 (Missing Profile Data)**:
```json
{
  "success": false,
  "error": {
    "code": "INCOMPLETE_PROFILE",
    "message": "Player profile is missing required information",
    "details": {
      "missingFields": ["birthDate", "gender"],
      "message": "Please complete your profile before registering for categories"
    }
  }
}
```

**Response 403 (Unauthorized - Player Registering Others)**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Players can only register themselves. Organizers can register other players."
  }
}
```

---

### 2. Get Player's Registrations

```
GET /api/v1/registrations/player/:playerId
```

**Description**: Retrieve all category registrations for a specific player.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `playerId` | string (UUID) | Yes | Player unique identifier |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: `ACTIVE`, `WITHDRAWN`, `SUSPENDED` |
| `include` | string | No | Include related data: `category`, `ranking` (comma-separated) |

**Authorization**:
- ADMIN/ORGANIZER: Can view any player's registrations
- PLAYER: Can only view their own registrations

**Request Example**:
```http
GET /api/v1/registrations/player/player-uuid-1?status=ACTIVE&include=category,ranking
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "playerId": "player-uuid-1",
    "playerName": "John Doe",
    "registrations": [
      {
        "id": "registration-uuid-1",
        "categoryId": "category-uuid-1",
        "status": "ACTIVE",
        "registeredAt": "2025-01-10T08:00:00Z",
        "category": {
          "name": "Men's Singles 35+",
          "type": "SINGLES",
          "ageGroup": "AGE_35",
          "gender": "MEN"
        },
        "ranking": {
          "rank": 5,
          "points": 1320,
          "wins": 12,
          "losses": 3
        }
      },
      {
        "id": "registration-uuid-2",
        "categoryId": "category-uuid-2",
        "status": "ACTIVE",
        "registeredAt": "2025-01-12T09:30:00Z",
        "category": {
          "name": "Men's Doubles 35+",
          "type": "DOUBLES",
          "ageGroup": "AGE_35",
          "gender": "MEN"
        },
        "ranking": {
          "rank": 8,
          "points": 980,
          "wins": 7,
          "losses": 5
        }
      }
    ],
    "counts": {
      "total": 2,
      "active": 2,
      "withdrawn": 0,
      "suspended": 0
    }
  }
}
```

---

### 3. Get Category's Registrations

```
GET /api/v1/registrations/category/:categoryId
```

**Description**: Retrieve all player registrations for a specific category.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `categoryId` | string (UUID) | Yes | Category unique identifier |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: `ACTIVE`, `WITHDRAWN`, `SUSPENDED` |
| `include` | string | No | Include `player` details (default: true) |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 50, max: 200) |

**Request Example**:
```http
GET /api/v1/registrations/category/category-uuid-1?status=ACTIVE
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "categoryId": "category-uuid-1",
    "categoryName": "Men's Singles 35+",
    "registrations": [
      {
        "id": "registration-uuid-1",
        "playerId": "player-uuid-1",
        "status": "ACTIVE",
        "registeredAt": "2025-01-10T08:00:00Z",
        "player": {
          "name": "John Doe",
          "age": 37,
          "email": "john.doe@example.com"
        }
      },
      {
        "id": "registration-uuid-2",
        "playerId": "player-uuid-2",
        "status": "ACTIVE",
        "registeredAt": "2025-01-11T09:15:00Z",
        "player": {
          "name": "Mike Johnson",
          "age": 42,
          "email": "mike.j@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 23,
      "pages": 1
    },
    "counts": {
      "total": 25,
      "active": 23,
      "withdrawn": 2,
      "suspended": 0
    }
  }
}
```

---

### 4. Withdraw from Category

```
PATCH /api/v1/registrations/:id/withdraw
```

**Description**: Withdraw a player's registration from a category (soft delete).

**Authorization**:
- ADMIN/ORGANIZER: Can withdraw any registration
- PLAYER: Can only withdraw their own registrations

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Registration unique identifier |

**Request Body** (optional):
```json
{
  "notes": "Player requested withdrawal due to injury"
}
```

**Request Example**:
```http
PATCH /api/v1/registrations/registration-uuid-1/withdraw
Authorization: [session cookie]
Content-Type: application/json

{
  "notes": "Player requested withdrawal due to injury"
}
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "registration-uuid-1",
    "playerId": "player-uuid-1",
    "categoryId": "category-uuid-1",
    "status": "WITHDRAWN",
    "registeredAt": "2025-01-10T08:00:00Z",
    "withdrawnAt": "2025-01-20T14:30:00Z",
    "notes": "Player requested withdrawal due to injury"
  },
  "message": "Registration withdrawn successfully"
}
```

**Response 400 (Already Withdrawn)**:
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_WITHDRAWN",
    "message": "Registration is already withdrawn",
    "details": {
      "withdrawnAt": "2025-01-15T10:00:00Z"
    }
  }
}
```

---

### 5. Reactivate Registration

```
PATCH /api/v1/registrations/:id/reactivate
```

**Description**: Reactivate a withdrawn or suspended registration (with eligibility revalidation).

**Authorization**: ADMIN or ORGANIZER only

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Registration unique identifier |

**Request Example**:
```http
PATCH /api/v1/registrations/registration-uuid-1/reactivate
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "registration-uuid-1",
    "playerId": "player-uuid-1",
    "categoryId": "category-uuid-1",
    "status": "ACTIVE",
    "registeredAt": "2025-01-10T08:00:00Z",
    "withdrawnAt": null
  },
  "message": "Registration reactivated successfully"
}
```

**Response 400 (Eligibility Changed)**:
```json
{
  "success": false,
  "error": {
    "code": "NO_LONGER_ELIGIBLE",
    "message": "Player no longer meets eligibility requirements",
    "details": {
      "reason": "Player's age (34) is now below minimum age (35) for category"
    }
  }
}
```

---

### 6. Check Eligibility (Preview)

```
POST /api/v1/registrations/check-eligibility
```

**Description**: Check if a player is eligible for a category without creating a registration.

**Request Body**:
```json
{
  "playerId": "player-uuid-1",
  "categoryId": "category-uuid-1"
}
```

**Request Example**:
```http
POST /api/v1/registrations/check-eligibility
Authorization: [session cookie]
Content-Type: application/json

{
  "playerId": "player-uuid-1",
  "categoryId": "category-uuid-1"
}
```

**Response 200 (Eligible)**:
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "player": {
      "name": "John Doe",
      "age": 37,
      "gender": "MEN"
    },
    "category": {
      "name": "Men's Singles 35+",
      "type": "SINGLES",
      "ageGroup": "AGE_35",
      "gender": "MEN"
    },
    "validations": {
      "age": {
        "passed": true,
        "playerAge": 37,
        "requiredAge": 35
      },
      "gender": {
        "passed": true,
        "playerGender": "MEN",
        "requiredGender": "MEN"
      },
      "duplicate": {
        "passed": true
      }
    }
  }
}
```

**Response 200 (Not Eligible)**:
```json
{
  "success": true,
  "data": {
    "eligible": false,
    "player": {
      "name": "John Doe",
      "age": 32,
      "gender": "MEN"
    },
    "category": {
      "name": "Men's Singles 35+",
      "type": "SINGLES",
      "ageGroup": "AGE_35",
      "gender": "MEN"
    },
    "validations": {
      "age": {
        "passed": false,
        "playerAge": 32,
        "requiredAge": 35,
        "error": "Player age 32 is below minimum age 35"
      },
      "gender": {
        "passed": true,
        "playerGender": "MEN",
        "requiredGender": "MEN"
      },
      "duplicate": {
        "passed": true
      }
    },
    "errors": [
      "Player age 32 is below minimum age 35"
    ]
  }
}
```

---

### 7. Bulk Register Player

```
POST /api/v1/registrations/bulk
```

**Description**: Register a player for multiple categories at once (atomic operation).

**Authorization**: ADMIN, ORGANIZER, or PLAYER (self-registration only)

**Request Body**:
```json
{
  "playerId": "player-uuid-1",
  "categoryIds": [
    "category-uuid-1",
    "category-uuid-2",
    "category-uuid-3"
  ]
}
```

**Request Example**:
```http
POST /api/v1/registrations/bulk
Authorization: [session cookie]
Content-Type: application/json

{
  "playerId": "player-uuid-1",
  "categoryIds": ["category-uuid-1", "category-uuid-2", "category-uuid-3"]
}
```

**Response 201 (All Successful)**:
```json
{
  "success": true,
  "data": {
    "playerId": "player-uuid-1",
    "playerName": "John Doe",
    "results": {
      "successful": [
        {
          "registrationId": "registration-uuid-1",
          "categoryId": "category-uuid-1",
          "categoryName": "Men's Singles 35+"
        },
        {
          "registrationId": "registration-uuid-2",
          "categoryId": "category-uuid-2",
          "categoryName": "Men's Doubles 35+"
        }
      ],
      "failed": [
        {
          "categoryId": "category-uuid-3",
          "categoryName": "Men's Singles 50+",
          "error": {
            "code": "INELIGIBLE_AGE",
            "message": "Player age 37 is below minimum age 50"
          }
        }
      ]
    },
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1
    }
  },
  "message": "Registered for 2 out of 3 categories"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `REGISTRATION_NOT_FOUND` | 404 | Registration ID does not exist |
| `PLAYER_NOT_FOUND` | 404 | Player ID does not exist |
| `CATEGORY_NOT_FOUND` | 404 | Category ID does not exist |
| `ALREADY_REGISTERED` | 409 | Player already registered for category |
| `INELIGIBLE_AGE` | 400 | Player does not meet age requirements |
| `INELIGIBLE_GENDER` | 400 | Player gender does not match category |
| `INCOMPLETE_PROFILE` | 400 | Player missing birthDate or gender |
| `ALREADY_WITHDRAWN` | 400 | Registration is already withdrawn |
| `NO_LONGER_ELIGIBLE` | 400 | Player no longer meets eligibility |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Business Rules

1. **Eligibility Validation** (FR-008 to FR-012): Automatic validation on registration
   - Age: Calculated as `current year - birth year`. Player age >= category minimum age (or ALL_AGES bypasses). Players are eligible from January 1st of the year they turn the required age.
   - Gender: Player gender must match category gender (or MIXED allows all)
   - Profile: Player must have birthDate and gender set

2. **One Registration Per Category** (FR-007): Unique constraint on [playerId, categoryId]

3. **Multi-Category Support** (FR-007): Players can register for multiple different categories

4. **Soft Deletion**: Withdrawals change status to WITHDRAWN, preserve history

5. **Authorization**:
   - Players can only register/withdraw themselves
   - Organizers/Admins can register/withdraw any player

---

## Usage Examples

### Player Self-Registration Flow

```javascript
// 1. Check eligibility before showing registration button
const checkEligibility = async (playerId, categoryId) => {
  const response = await fetch('/api/v1/registrations/check-eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ playerId, categoryId })
  });

  const { data } = await response.json();
  return data.eligible;
};

// 2. Register if eligible
if (await checkEligibility(playerId, categoryId)) {
  await fetch('/api/v1/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ playerId, categoryId })
  });
}
```

### Organizer Registering Multiple Players

```javascript
// Register multiple players for a tournament category
const players = ['player-1', 'player-2', 'player-3'];
const categoryId = 'category-uuid-1';

for (const playerId of players) {
  try {
    await fetch('/api/v1/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ playerId, categoryId })
    });
  } catch (error) {
    console.error(`Failed to register ${playerId}:`, error);
  }
}
```

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-11-01
**Related Contracts**: category-api.md, ranking-api.md
