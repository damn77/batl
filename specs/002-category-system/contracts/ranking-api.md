# Ranking API Contract

**Feature**: 002-category-system
**Version**: 1.0.0
**Base URL**: `/api/v1/rankings`

## Overview

The Ranking API provides read-only access to category-specific player rankings. Rankings are calculated asynchronously based on tournament results and updated within 5 minutes of result entry (SC-004).

## Authentication

All endpoints require authentication.

## Authorization

All authenticated users have read access to rankings.

## Endpoints

### 1. Get Category Leaderboard

```
GET /api/v1/rankings/category/:categoryId
```

**Description**: Retrieve ranked list of players in a category.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `categoryId` | string (UUID) | Yes | Category unique identifier |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Number of top players (default: 10, max: 200) |
| `offset` | integer | No | Offset for pagination (default: 0) |

**Request Example**:
```http
GET /api/v1/rankings/category/category-uuid-1?limit=10
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "categoryId": "category-uuid-1",
    "categoryName": "Men's Singles 35+",
    "lastUpdated": "2025-01-20T15:30:00Z",
    "rankings": [
      {
        "rank": 1,
        "playerId": "player-uuid-1",
        "playerName": "John Doe",
        "points": 1520,
        "wins": 15,
        "losses": 3,
        "winRate": 0.833
      },
      {
        "rank": 2,
        "playerId": "player-uuid-2",
        "playerName": "Mike Johnson",
        "points": 1480,
        "wins": 14,
        "losses": 4,
        "winRate": 0.778
      }
    ],
    "total": 23
  }
}
```

---

### 2. Get Player's Ranking in Category

```
GET /api/v1/rankings/category/:categoryId/player/:playerId
```

**Description**: Retrieve a specific player's ranking details in a category.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `categoryId` | string (UUID) | Yes | Category unique identifier |
| `playerId` | string (UUID) | Yes | Player unique identifier |

**Request Example**:
```http
GET /api/v1/rankings/category/category-uuid-1/player/player-uuid-1
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "categoryId": "category-uuid-1",
    "categoryName": "Men's Singles 35+",
    "playerId": "player-uuid-1",
    "playerName": "John Doe",
    "rank": 5,
    "points": 1320,
    "wins": 12,
    "losses": 3,
    "winRate": 0.800,
    "lastUpdated": "2025-01-20T15:30:00Z",
    "totalPlayers": 23
  }
}
```

**Response 404 (Not Ranked)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_RANKED",
    "message": "Player is not ranked in this category (no tournament participation yet)"
  }
}
```

---

### 3. Get Player's All Rankings

```
GET /api/v1/rankings/player/:playerId
```

**Description**: Retrieve player's rankings across all categories they're registered for.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `playerId` | string (UUID) | Yes | Player unique identifier |

**Request Example**:
```http
GET /api/v1/rankings/player/player-uuid-1
Authorization: [session cookie]
```

**Response 200 (Success)**:
```json
{
  "success": true,
  "data": {
    "playerId": "player-uuid-1",
    "playerName": "John Doe",
    "rankings": [
      {
        "categoryId": "category-uuid-1",
        "categoryName": "Men's Singles 35+",
        "rank": 5,
        "points": 1320,
        "wins": 12,
        "losses": 3,
        "winRate": 0.800
      },
      {
        "categoryId": "category-uuid-2",
        "categoryName": "Men's Doubles 35+",
        "rank": 8,
        "points": 980,
        "wins": 7,
        "losses": 5,
        "winRate": 0.583
      }
    ],
    "lastUpdated": "2025-01-20T15:30:00Z"
  }
}
```

---

## Business Rules

1. **Independent Rankings** (FR-013): Each category maintains separate rankings
2. **Read-Only**: Rankings cannot be manually edited (calculated from tournament results)
3. **Update Frequency** (SC-004): Rankings update within 5 minutes of tournament completion
4. **Initial State**: Players with no tournament participation are not ranked
5. **Calculation**: Rankings ordered by points (descending), ties broken by wins

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-11-01
**Related Contracts**: category-api.md, registration-api.md
