# API Endpoints: Knockout Bracket Generation

**Feature**: 009-bracket-generation
**Date**: 2026-01-10
**Base URL**: `/api/v1/brackets`
**Authentication**: Not required (public read-only endpoints)

---

## Endpoints Overview

| Endpoint | Method | Purpose | User Story |
|----------|--------|---------|------------|
| `/structure/:playerCount` | GET | Retrieve bracket structure for player count | P1 |
| `/seeding/:playerCount` | GET | Retrieve seeding configuration for player count | P2 |

---

## Endpoint 1: Get Bracket Structure

### Request

```http
GET /api/v1/brackets/structure/:playerCount
```

**Path Parameters**:

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `playerCount` | Integer | Yes | 4-128 | Number of players in the tournament |

**Query Parameters**: None

**Request Headers**: None required

**Request Body**: None

### Response

**Success Response** (HTTP 200):

```json
{
  "success": true,
  "data": {
    "playerCount": 7,
    "structure": "1000",
    "preliminaryMatches": 3,
    "byes": 1,
    "bracketSize": 8,
    "interpretation": {
      "0": "Preliminary match required",
      "1": "Bye (automatic advancement to next round)"
    }
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Always `true` for successful responses |
| `data.playerCount` | Integer | Number of players (echoed from request) |
| `data.structure` | String | Bracket structure pattern (0s and 1s) |
| `data.preliminaryMatches` | Integer | Number of matches in first round |
| `data.byes` | Integer | Number of byes in first round |
| `data.bracketSize` | Integer | Total bracket slots (power of 2) |
| `data.interpretation` | Object | Explanation of structure format (for P3 user story) |

### Error Responses

**Validation Error** (HTTP 400):

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAYER_COUNT",
    "message": "Player count must be at least 4",
    "details": {
      "playerCount": 3,
      "validRange": { "min": 4, "max": 128 }
    }
  }
}
```

**Not Found** (HTTP 404):

```json
{
  "success": false,
  "error": {
    "code": "BRACKET_NOT_FOUND",
    "message": "No bracket template found for 130 players",
    "details": {
      "playerCount": 130,
      "validRange": { "min": 4, "max": 128 }
    }
  }
}
```

**Server Error** (HTTP 500):

```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_LOAD_ERROR",
    "message": "Failed to load bracket templates",
    "details": {
      "reason": "Template file not found or corrupted"
    }
  }
}
```

### Examples

**Example 1: Small tournament (7 players)**

```bash
curl http://localhost:3000/api/v1/brackets/structure/7
```

Response:
```json
{
  "success": true,
  "data": {
    "playerCount": 7,
    "structure": "1000",
    "preliminaryMatches": 3,
    "byes": 1,
    "bracketSize": 8,
    "interpretation": {
      "0": "Preliminary match required",
      "1": "Bye (automatic advancement to next round)"
    }
  }
}
```

**Example 2: Power-of-2 tournament (16 players)**

```bash
curl http://localhost:3000/api/v1/brackets/structure/16
```

Response:
```json
{
  "success": true,
  "data": {
    "playerCount": 16,
    "structure": "0000 0000",
    "preliminaryMatches": 8,
    "byes": 0,
    "bracketSize": 16,
    "interpretation": {
      "0": "Preliminary match required",
      "1": "Bye (automatic advancement to next round)"
    }
  }
}
```

**Example 3: Invalid player count**

```bash
curl http://localhost:3000/api/v1/brackets/structure/3
```

Response:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAYER_COUNT",
    "message": "Player count must be at least 4",
    "details": {
      "playerCount": 3,
      "validRange": { "min": 4, "max": 128 }
    }
  }
}
```

---

## Endpoint 2: Get Seeding Configuration

### Request

```http
GET /api/v1/brackets/seeding/:playerCount
```

**Path Parameters**:

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `playerCount` | Integer | Yes | 4-128 | Number of players in the tournament |

**Query Parameters**: None

**Request Headers**: None required

**Request Body**: None

### Response

**Success Response** (HTTP 200):

```json
{
  "success": true,
  "data": {
    "playerCount": 15,
    "seededPlayers": 4,
    "range": {
      "min": 10,
      "max": 19
    },
    "note": "Seeding positions within the bracket are determined manually by organizers"
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Always `true` for successful responses |
| `data.playerCount` | Integer | Number of players (echoed from request) |
| `data.seededPlayers` | Integer | Number of players that should be seeded |
| `data.range` | Object | Player count range for this seeding level |
| `data.range.min` | Integer | Minimum player count for this seeding level |
| `data.range.max` | Integer | Maximum player count for this seeding level |
| `data.note` | String | Reminder about manual seeding (FR-013) |

### Error Responses

**Validation Error** (HTTP 400):

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAYER_COUNT",
    "message": "Player count must be at least 4",
    "details": {
      "playerCount": 2,
      "validRange": { "min": 4, "max": 128 }
    }
  }
}
```

**Server Error** (HTTP 500):

```json
{
  "success": false,
  "error": {
    "code": "SEEDING_CONFIG_ERROR",
    "message": "Failed to calculate seeding configuration",
    "details": {
      "reason": "Internal error"
    }
  }
}
```

### Examples

**Example 1: Small tournament (7 players)**

```bash
curl http://localhost:3000/api/v1/brackets/seeding/7
```

Response:
```json
{
  "success": true,
  "data": {
    "playerCount": 7,
    "seededPlayers": 2,
    "range": {
      "min": 4,
      "max": 9
    },
    "note": "Seeding positions within the bracket are determined manually by organizers"
  }
}
```

**Example 2: Large tournament (100 players)**

```bash
curl http://localhost:3000/api/v1/brackets/seeding/100
```

Response:
```json
{
  "success": true,
  "data": {
    "playerCount": 100,
    "seededPlayers": 16,
    "range": {
      "min": 40,
      "max": 128
    },
    "note": "Seeding positions within the bracket are determined manually by organizers"
  }
}
```

---

## Common Error Codes

| Error Code | HTTP Status | Description | User Action |
|------------|-------------|-------------|-------------|
| `INVALID_PLAYER_COUNT` | 400 | Player count is outside valid range (4-128) or not an integer | Provide valid player count |
| `BRACKET_NOT_FOUND` | 404 | No template exists for the requested player count (shouldn't happen for 4-128) | Check player count is valid |
| `TEMPLATE_LOAD_ERROR` | 500 | Failed to load bracket templates from file | Contact system administrator |
| `SEEDING_CONFIG_ERROR` | 500 | Failed to calculate seeding configuration | Contact system administrator |

---

## Seeding Ranges Reference

For quick reference, the seeding configuration follows these ranges:

| Player Count Range | Seeded Players |
|-------------------|----------------|
| 4-9 | 2 |
| 10-19 | 4 |
| 20-39 | 8 |
| 40-128 | 16 |

---

## Response Format Consistency

All endpoints follow the existing BATL API response format:

**Success**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

This aligns with the error handling pattern documented in CLAUDE.md.

---

## Rate Limiting

**Not Applicable**: These endpoints serve static, cached data and do not require rate limiting.

---

## CORS Configuration

**Required**: Endpoints should be accessible from frontend applications running on different origins.

```javascript
// CORS should allow:
// - Origin: Frontend domain (e.g., http://localhost:5173 for development)
// - Methods: GET
// - Headers: Content-Type
```

---

## OpenAPI Specification

```yaml
openapi: 3.0.0
info:
  title: Knockout Bracket Generation API
  version: 1.0.0
  description: API for retrieving tournament bracket structures and seeding configurations

servers:
  - url: http://localhost:3000/api/v1
    description: Development server

paths:
  /brackets/structure/{playerCount}:
    get:
      summary: Get bracket structure
      description: Retrieve the bracket structure template for a specific player count
      operationId: getBracketStructure
      tags:
        - Brackets
      parameters:
        - name: playerCount
          in: path
          required: true
          schema:
            type: integer
            minimum: 4
            maximum: 128
          description: Number of players in the tournament
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      playerCount:
                        type: integer
                        example: 7
                      structure:
                        type: string
                        example: "1000"
                      preliminaryMatches:
                        type: integer
                        example: 3
                      byes:
                        type: integer
                        example: 1
                      bracketSize:
                        type: integer
                        example: 8
                      interpretation:
                        type: object
                        properties:
                          "0":
                            type: string
                            example: "Preliminary match required"
                          "1":
                            type: string
                            example: "Bye (automatic advancement to next round)"
        '400':
          description: Invalid player count
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: Bracket not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /brackets/seeding/{playerCount}:
    get:
      summary: Get seeding configuration
      description: Retrieve the seeding configuration for a specific player count
      operationId: getSeedingConfiguration
      tags:
        - Brackets
      parameters:
        - name: playerCount
          in: path
          required: true
          schema:
            type: integer
            minimum: 4
            maximum: 128
          description: Number of players in the tournament
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      playerCount:
                        type: integer
                        example: 15
                      seededPlayers:
                        type: integer
                        example: 4
                      range:
                        type: object
                        properties:
                          min:
                            type: integer
                            example: 10
                          max:
                            type: integer
                            example: 19
                      note:
                        type: string
                        example: "Seeding positions within the bracket are determined manually by organizers"
        '400':
          description: Invalid player count
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: "INVALID_PLAYER_COUNT"
            message:
              type: string
              example: "Player count must be at least 4"
            details:
              type: object
              additionalProperties: true
```

---

**API Contracts Complete**: All endpoints defined with request/response formats, examples, and OpenAPI specification.
