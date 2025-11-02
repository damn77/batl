# Category API Contract

**Feature**: 002-category-system
**Version**: 1.0.0
**Base URL**: `/api/v1/categories`

## Overview

The Category API provides endpoints for creating, reading, updating, and deleting tournament categories. Categories are defined by combining type (Singles/Doubles), age group (20+-80+ or All ages), and gender (Men/Women/Mixed).

## Authentication

All endpoints require authentication via session cookie (established in 001-user-management).

## Authorization

- **ADMIN**: Full access (CRUD operations)
- **ORGANIZER**: Read + Create categories
- **PLAYER**: Read-only access

## Endpoints

### 1. List All Categories

```
GET /api/v1/categories
```

**Description**: Retrieve a list of all categories with optional filtering.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter by category type: `SINGLES` or `DOUBLES` |
| `ageGroup` | string | No | Filter by age group: `ALL_AGES`, `AGE_20`, ..., `AGE_80` |
| `gender` | string | No | Filter by gender: `MEN`, `WOMEN`, `MIXED` |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |

**Request Example**:
```http
GET /api/v1/categories?type=SINGLES&gender=MEN
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid-1",
        "type": "SINGLES",
        "ageGroup": "AGE_35",
        "gender": "MEN",
        "name": "Men's Singles 35+",
        "description": "Singles competition for men aged 35 and above",
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-15T10:00:00Z",
        "_counts": {
          "tournaments": 5,
          "registrations": 23,
          "rankings": 23
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}
```

**Response 401 (Unauthorized)**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

### 2. Get Category by ID

```
GET /api/v1/categories/:id
```

**Description**: Retrieve detailed information about a specific category.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Category unique identifier |

**Request Example**:
```http
GET /api/v1/categories/uuid-1
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "type": "SINGLES",
    "ageGroup": "AGE_35",
    "gender": "MEN",
    "name": "Men's Singles 35+",
    "description": "Singles competition for men aged 35 and above",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z",
    "_counts": {
      "tournaments": 5,
      "registrations": 23,
      "rankings": 23
    }
  }
}
```

**Response 404 (Not Found)**:
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Category with ID uuid-1 not found"
  }
}
```

---

### 3. Create Category

```
POST /api/v1/categories
```

**Description**: Create a new category with unique type/ageGroup/gender combination.

**Authorization**: ADMIN or ORGANIZER roles required

**Request Body**:
```json
{
  "type": "SINGLES",
  "ageGroup": "AGE_35",
  "gender": "MEN",
  "description": "Singles competition for men aged 35 and above"
}
```

**Field Validations**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `type` | string | Yes | Must be `SINGLES` or `DOUBLES` |
| `ageGroup` | string | Yes | Must be `ALL_AGES`, `AGE_20`, ..., `AGE_80` |
| `gender` | string | Yes | Must be `MEN`, `WOMEN`, or `MIXED` |
| `description` | string | No | Max 500 characters |

**Request Example**:
```http
POST /api/v1/categories
Authorization: [session cookie]
Content-Type: application/json

{
  "type": "SINGLES",
  "ageGroup": "AGE_35",
  "gender": "MEN",
  "description": "Singles competition for men aged 35 and above"
}
```

**Response 201 (Created)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "type": "SINGLES",
    "ageGroup": "AGE_35",
    "gender": "MEN",
    "name": "Men's Singles 35+",
    "description": "Singles competition for men aged 35 and above",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  },
  "message": "Category created successfully"
}
```

**Response 409 (Conflict)**:
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_CATEGORY",
    "message": "Category with type=SINGLES, ageGroup=AGE_35, gender=MEN already exists",
    "details": {
      "existingCategoryId": "uuid-2"
    }
  }
}
```

**Response 403 (Forbidden)**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions. ADMIN or ORGANIZER role required."
  }
}
```

**Response 400 (Validation Error)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "type": "Must be SINGLES or DOUBLES",
      "ageGroup": "Must be a valid age group (ALL_AGES, AGE_20...AGE_80)"
    }
  }
}
```

---

### 4. Update Category

```
PATCH /api/v1/categories/:id
```

**Description**: Update category description (type/ageGroup/gender cannot be changed).

**Authorization**: ADMIN or ORGANIZER roles required

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Category unique identifier |

**Request Body**:
```json
{
  "description": "Updated description for this category"
}
```

**Field Validations**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `description` | string | No | Max 500 characters |

**Note**: type, ageGroup, and gender are immutable after creation (business rule to maintain data integrity).

**Request Example**:
```http
PATCH /api/v1/categories/uuid-1
Authorization: [session cookie]
Content-Type: application/json

{
  "description": "Updated description for this category"
}
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "type": "SINGLES",
    "ageGroup": "AGE_35",
    "gender": "MEN",
    "name": "Men's Singles 35+",
    "description": "Updated description for this category",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-16T14:30:00Z"
  },
  "message": "Category updated successfully"
}
```

**Response 403 (Forbidden)**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions. ADMIN or ORGANIZER role required."
  }
}
```

---

### 5. Delete Category

```
DELETE /api/v1/categories/:id
```

**Description**: Delete a category (only if no tournaments are assigned).

**Authorization**: ADMIN role required

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Category unique identifier |

**Request Example**:
```http
DELETE /api/v1/categories/uuid-1
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

**Response 409 (Conflict)**:
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_IN_USE",
    "message": "Cannot delete category with active tournaments",
    "details": {
      "tournamentCount": 3,
      "registrationCount": 15
    }
  }
}
```

**Response 403 (Forbidden)**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions. ADMIN role required."
  }
}
```

---

### 6. Get Category Statistics

```
GET /api/v1/categories/:id/stats
```

**Description**: Retrieve statistics for a category (tournaments, registrations, rankings).

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Category unique identifier |

**Request Example**:
```http
GET /api/v1/categories/uuid-1/stats
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "categoryId": "uuid-1",
    "categoryName": "Men's Singles 35+",
    "tournaments": {
      "total": 5,
      "scheduled": 2,
      "inProgress": 1,
      "completed": 2
    },
    "registrations": {
      "active": 23,
      "withdrawn": 2,
      "suspended": 0
    },
    "rankings": {
      "total": 23,
      "topPlayers": [
        {
          "rank": 1,
          "playerId": "player-uuid-1",
          "playerName": "John Doe",
          "points": 1520,
          "wins": 15,
          "losses": 3
        },
        {
          "rank": 2,
          "playerId": "player-uuid-2",
          "playerName": "Jane Smith",
          "points": 1480,
          "wins": 14,
          "losses": 4
        }
      ]
    }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `CATEGORY_NOT_FOUND` | 404 | Category ID does not exist |
| `DUPLICATE_CATEGORY` | 409 | Category with same type/age/gender exists |
| `CATEGORY_IN_USE` | 409 | Cannot delete category with active tournaments |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Business Rules

1. **Unique Categories** (FR-005): Cannot create duplicate category with same [type, ageGroup, gender]
2. **Deletion Restriction**: Categories with active tournaments cannot be deleted
3. **Immutable Fields**: type, ageGroup, gender cannot be changed after creation
4. **Auto-generated Names**: Category name is auto-generated from type + ageGroup + gender
5. **Authorization**: Only ADMIN and ORGANIZER roles can create/update categories

---

## Usage Examples

### Create Multiple Categories for Tournament Setup

```javascript
// Create Men's Singles categories for all age groups
const ageGroups = ['ALL_AGES', 'AGE_20', 'AGE_35', 'AGE_50', 'AGE_65'];

for (const ageGroup of ageGroups) {
  await fetch('/api/v1/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      type: 'SINGLES',
      ageGroup,
      gender: 'MEN'
    })
  });
}
```

### Filter Categories for Player Registration

```javascript
// Get all Mixed Doubles categories (player can register regardless of gender)
const response = await fetch('/api/v1/categories?type=DOUBLES&gender=MIXED', {
  credentials: 'include'
});

const { data } = await response.json();
// Display categories for player to choose from
```

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-11-01
**Related Contracts**: tournament-api.md, registration-api.md
