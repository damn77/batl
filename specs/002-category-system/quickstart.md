# Quickstart Guide: Tournament Category System

**Feature**: 002-category-system
**Version**: 1.0.0
**Date**: 2025-11-01

## Overview

This guide demonstrates the end-to-end workflows for the tournament category system, from category creation to player registration and ranking viewing. The guide follows the priority order from the specification (P1 → P2 → P3).

## Prerequisites

- BATL backend server running on `http://localhost:3000`
- User authenticated with appropriate role (ADMIN, ORGANIZER, or PLAYER)
- Player profiles with `birthDate` and `gender` fields populated
- Database seeded with test data (run `node backend/prisma/seed.js`)

### Test Accounts (from seed data)

The following test accounts are available after running the seed script:

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| `admin@battle.example.com` | `ChangeMe123!` | ADMIN | System administrator |
| `organizer@batl.example.com` | `Organizer123!` | ORGANIZER | Tournament organizer |
| `player@batl.example.com` | `Player123!` | PLAYER | Test player (M, born 1987-05-15, age 37) |

**Note**: Examples using `player1@batl.com` and `player2@batl.com` are for demonstration purposes. To test multi-player scenarios, you would need to create additional player accounts or use the organizer account to register unlinked player profiles.

**Shell Escaping**: Passwords with special characters (like `!`) may need escaping depending on your shell. On Windows or when using special characters, create a JSON file and use `--data @filename.json` instead of `-d '...'`:
```bash
# login.json
{
  "email": "organizer@batl.example.com",
  "password": "Organizer123!"
}

# Use with curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  --data @login.json \
  -c cookies.txt
```

---

## P1 Workflows: Core Category Management

### Workflow 1: Create Tournament Categories (Organizer)

**User Story**: Tournament organizers create categories for tournaments by combining type, age group, and gender.

**Steps**:

1. **Login as Organizer**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@batl.example.com",
    "password": "Organizer123!"
  }' \
  -c cookies.txt
```

2. **Create Men's Singles 35+ Category**:
```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "type": "SINGLES",
    "ageGroup": "AGE_35",
    "gender": "MEN",
    "description": "Singles competition for men aged 35 and above"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "cat-uuid-1",
    "type": "SINGLES",
    "ageGroup": "AGE_35",
    "gender": "MEN",
    "name": "Men's Singles 35+",
    "description": "Singles competition for men aged 35 and above",
    "createdAt": "2025-11-01T10:00:00Z"
  },
  "message": "Category created successfully"
}
```

3. **Create Mixed Doubles (All ages) Category**:
```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "type": "DOUBLES",
    "ageGroup": "ALL_AGES",
    "gender": "MIXED",
    "description": "Open doubles competition for all ages and genders"
  }'
```

4. **View All Categories**:
```bash
curl -X GET "http://localhost:3000/api/v1/categories" \
  -b cookies.txt
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat-uuid-1",
        "name": "Men's Singles 35+",
        "type": "SINGLES",
        "ageGroup": "AGE_35",
        "gender": "MEN"
      },
      {
        "id": "cat-uuid-2",
        "name": "Mixed Doubles (All ages)",
        "type": "DOUBLES",
        "ageGroup": "ALL_AGES",
        "gender": "MIXED"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "pages": 1
    }
  }
}
```

**Success Criteria**:
- ✅ Categories created in under 1 minute (SC-001)
- ✅ Duplicate prevention works (try creating same category twice → 409 error)
- ✅ Category names auto-generated correctly

---

### Workflow 2: Assign Tournament to Category (Organizer)

**User Story**: Tournament organizers assign each tournament to exactly one category.

**Steps**:

1. **Create Tournament in Men's Singles 35+ Category**:
```bash
curl -X POST http://localhost:3000/api/v1/tournaments \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Spring Championship 2025",
    "categoryId": "cat-uuid-1",
    "description": "Annual spring tournament for men 35+",
    "location": "Central Tennis Courts",
    "startDate": "2025-05-01T09:00:00Z",
    "endDate": "2025-05-03T18:00:00Z"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "tourn-uuid-1",
    "name": "Spring Championship 2025",
    "categoryId": "cat-uuid-1",
    "status": "SCHEDULED",
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

2. **View Tournament with Category Info**:
```bash
curl -X GET "http://localhost:3000/api/v1/tournaments/tourn-uuid-1" \
  -b cookies.txt
```

3. **Filter Tournaments by Category**:
```bash
curl -X GET "http://localhost:3000/api/v1/tournaments?categoryId=cat-uuid-1" \
  -b cookies.txt
```

**Success Criteria**:
- ✅ Tournament linked to exactly one category (FR-006)
- ✅ Category information displayed with tournament
- ✅ Cannot change categoryId after creation (FR-006)

---

## P2 Workflows: Player Registration & Validation

### Workflow 3: Validate Player Eligibility (Player)

**User Story**: Players register for tournaments with automatic validation based on age and gender.

**Steps**:

1. **Login as Player**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@batl.example.com",
    "password": "Player123!"
  }' \
  -c player-cookies.txt
```

2. **Check Player Profile Has Required Data**:
```bash
curl -X GET "http://localhost:3000/api/v1/players/me" \
  -b player-cookies.txt
```

**Expected Response** (must have birthDate and gender):
```json
{
  "success": true,
  "data": {
    "id": "player-uuid-1",
    "name": "John Doe",
    "email": "player@batl.example.com",
    "birthDate": "1987-05-15",
    "gender": "MEN"
  }
}
```

3. **Check Eligibility Before Registration**:
```bash
curl -X POST http://localhost:3000/api/v1/registrations/check-eligibility \
  -H "Content-Type: application/json" \
  -b player-cookies.txt \
  -d '{
    "playerId": "player-uuid-1",
    "categoryId": "cat-uuid-1"
  }'
```

**Expected Response (Eligible - Age 37 for 35+ category)**:
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
      }
    }
  }
}
```

4. **Register for Category**:
```bash
curl -X POST http://localhost:3000/api/v1/registrations \
  -H "Content-Type: application/json" \
  -b player-cookies.txt \
  -d '{
    "playerId": "player-uuid-1",
    "categoryId": "cat-uuid-1"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "reg-uuid-1",
    "playerId": "player-uuid-1",
    "categoryId": "cat-uuid-1",
    "status": "ACTIVE",
    "registeredAt": "2025-11-01T11:00:00Z",
    "category": {
      "name": "Men's Singles 35+"
    }
  },
  "message": "Player registered successfully for Men's Singles 35+"
}
```

**Success Criteria**:
- ✅ 100% accurate eligibility validation (SC-002)
- ✅ Age validation works (player age >= category minimum)
- ✅ Gender validation works
- ✅ Zero ineligible registrations (SC-007)

---

### Workflow 4: Test Edge Cases (Validation)

**Test Case 1: Player Too Young**:
```bash
# Assume player is age 32, trying to register for 35+ category
curl -X POST http://localhost:3000/api/v1/registrations \
  -H "Content-Type: application/json" \
  -b player-cookies.txt \
  -d '{
    "playerId": "player-uuid-2",
    "categoryId": "cat-uuid-1"
  }'
```

**Expected Response (400 Error)**:
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

**Test Case 2: Gender Mismatch**:
```bash
# Female player trying to register for Men's category
curl -X POST http://localhost:3000/api/v1/registrations \
  -H "Content-Type: application/json" \
  -b player-cookies.txt \
  -d '{
    "playerId": "player-uuid-3",
    "categoryId": "cat-uuid-1"
  }'
```

**Expected Response (400 Error)**:
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

**Test Case 3: "All Ages" Bypasses Age Validation**:
```bash
# 18-year-old player registering for "All Ages" category
curl -X POST http://localhost:3000/api/v1/registrations \
  -H "Content-Type: application/json" \
  -b player-cookies.txt \
  -d '{
    "playerId": "player-uuid-4",
    "categoryId": "cat-uuid-2"
  }'
```

**Expected Response (Success - FR-012)**:
```json
{
  "success": true,
  "data": {
    "id": "reg-uuid-2",
    "playerId": "player-uuid-4",
    "categoryId": "cat-uuid-2",
    "status": "ACTIVE",
    "category": {
      "name": "Mixed Doubles (All ages)"
    }
  },
  "message": "Player registered successfully for Mixed Doubles (All ages)"
}
```

---

### Workflow 5: Multi-Category Registration (Player)

**User Story**: Players register for multiple categories simultaneously.

**Steps**:

1. **Register for Multiple Categories at Once**:
```bash
curl -X POST http://localhost:3000/api/v1/registrations/bulk \
  -H "Content-Type: application/json" \
  -b player-cookies.txt \
  -d '{
    "playerId": "player-uuid-1",
    "categoryIds": [
      "cat-uuid-1",
      "cat-uuid-2",
      "cat-uuid-3"
    ]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "results": {
      "successful": [
        {
          "registrationId": "reg-uuid-1",
          "categoryId": "cat-uuid-1",
          "categoryName": "Men's Singles 35+"
        },
        {
          "registrationId": "reg-uuid-2",
          "categoryId": "cat-uuid-2",
          "categoryName": "Mixed Doubles (All ages)"
        }
      ],
      "failed": [
        {
          "categoryId": "cat-uuid-3",
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

2. **View All Player's Registrations**:
```bash
curl -X GET "http://localhost:3000/api/v1/registrations/player/player-uuid-1?status=ACTIVE" \
  -b player-cookies.txt
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "playerId": "player-uuid-1",
    "playerName": "John Doe",
    "registrations": [
      {
        "id": "reg-uuid-1",
        "categoryId": "cat-uuid-1",
        "status": "ACTIVE",
        "category": {
          "name": "Men's Singles 35+",
          "type": "SINGLES"
        }
      },
      {
        "id": "reg-uuid-2",
        "categoryId": "cat-uuid-2",
        "status": "ACTIVE",
        "category": {
          "name": "Mixed Doubles (All ages)",
          "type": "DOUBLES"
        }
      }
    ],
    "counts": {
      "total": 2,
      "active": 2
    }
  }
}
```

**Success Criteria**:
- ✅ Players can register for multiple categories (FR-007)
- ✅ Each registration validated independently
- ✅ No duplicate registrations (same player/category)

---

## P3 Workflows: Category-Specific Rankings

### Workflow 6: View Category Rankings (All Users)

**User Story**: Players and organizers view rankings specific to each category.

**Steps**:

1. **View Category Leaderboard (Top 10)**:
```bash
curl -X GET "http://localhost:3000/api/v1/rankings/category/cat-uuid-1?limit=10" \
  -b cookies.txt
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "categoryId": "cat-uuid-1",
    "categoryName": "Men's Singles 35+",
    "lastUpdated": "2025-11-01T15:30:00Z",
    "rankings": [
      {
        "rank": 1,
        "playerId": "player-uuid-5",
        "playerName": "Mike Champion",
        "points": 1520,
        "wins": 15,
        "losses": 3,
        "winRate": 0.833
      },
      {
        "rank": 2,
        "playerId": "player-uuid-1",
        "playerName": "John Doe",
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

2. **View Player's Ranking in Specific Category**:
```bash
curl -X GET "http://localhost:3000/api/v1/rankings/category/cat-uuid-1/player/player-uuid-1" \
  -b cookies.txt
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "categoryId": "cat-uuid-1",
    "categoryName": "Men's Singles 35+",
    "playerId": "player-uuid-1",
    "playerName": "John Doe",
    "rank": 2,
    "points": 1480,
    "wins": 14,
    "losses": 4,
    "winRate": 0.778,
    "lastUpdated": "2025-11-01T15:30:00Z",
    "totalPlayers": 23
  }
}
```

3. **View Player's Rankings Across All Categories**:
```bash
curl -X GET "http://localhost:3000/api/v1/rankings/player/player-uuid-1" \
  -b cookies.txt
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "playerId": "player-uuid-1",
    "playerName": "John Doe",
    "rankings": [
      {
        "categoryId": "cat-uuid-1",
        "categoryName": "Men's Singles 35+",
        "rank": 2,
        "points": 1480,
        "wins": 14,
        "losses": 4
      },
      {
        "categoryId": "cat-uuid-2",
        "categoryName": "Mixed Doubles (All ages)",
        "rank": 8,
        "points": 980,
        "wins": 7,
        "losses": 5
      }
    ],
    "lastUpdated": "2025-11-01T15:30:00Z"
  }
}
```

**Success Criteria**:
- ✅ Each category maintains independent rankings (FR-013, SC-004)
- ✅ Rankings display correctly (FR-014)
- ✅ Rankings updated within 5 minutes of results (SC-004)

---

## Complete User Journey Example

### Scenario: Organizer Sets Up Tournament & Players Register

**Step 1: Organizer Creates Categories**
```bash
# Login as organizer
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "organizer@batl.example.com", "password": "Organizer123!"}' \
  -c org-cookies.txt

# Create Men's Singles 35+ category
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Content-Type: application/json" \
  -b org-cookies.txt \
  -d '{"type": "SINGLES", "ageGroup": "AGE_35", "gender": "MEN"}'

# Response: { "data": { "id": "cat-uuid-1", "name": "Men's Singles 35+" } }
```

**Step 2: Organizer Creates Tournament**
```bash
curl -X POST http://localhost:3000/api/v1/tournaments \
  -H "Content-Type: application/json" \
  -b org-cookies.txt \
  -d '{
    "name": "Summer Open 2025",
    "categoryId": "cat-uuid-1",
    "startDate": "2025-06-15T09:00:00Z",
    "endDate": "2025-06-16T18:00:00Z"
  }'

# Response: { "data": { "id": "tourn-uuid-1", "category": { "name": "Men's Singles 35+" } } }
```

**Step 3: Player 1 Registers (Eligible)**
```bash
# Login as player 1 (age 37, male)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "player1@batl.com", "password": "password123"}' \
  -c player1-cookies.txt

# Register for category
curl -X POST http://localhost:3000/api/v1/registrations \
  -H "Content-Type: application/json" \
  -b player1-cookies.txt \
  -d '{"playerId": "player-uuid-1", "categoryId": "cat-uuid-1"}'

# Response: { "success": true, "message": "Player registered successfully" }
```

**Step 4: Player 2 Attempts Registration (Ineligible - Too Young)**
```bash
# Login as player 2 (age 32, male)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "player2@batl.com", "password": "password123"}' \
  -c player2-cookies.txt

# Attempt registration
curl -X POST http://localhost:3000/api/v1/registrations \
  -H "Content-Type: application/json" \
  -b player2-cookies.txt \
  -d '{"playerId": "player-uuid-2", "categoryId": "cat-uuid-1"}'

# Response: { "success": false, "error": { "code": "INELIGIBLE_AGE", "message": "Player age 32 is below minimum age 35" } }
```

**Step 5: Organizer Views Registered Players**
```bash
curl -X GET "http://localhost:3000/api/v1/registrations/category/cat-uuid-1?status=ACTIVE" \
  -b org-cookies.txt

# Response: { "data": { "registrations": [ { "player": { "name": "Player 1" } } ], "counts": { "active": 1 } } }
```

---

## Testing Checklist

### P1: Core Category Management
- [ ] Create category with valid type/age/gender
- [ ] Auto-generated category name is correct
- [ ] Cannot create duplicate category (409 error)
- [ ] Category creation under 1 minute
- [ ] Create tournament with category assignment
- [ ] Tournament displays category information
- [ ] Cannot change tournament's categoryId after creation

### P2: Player Registration & Validation
- [ ] Player profile has birthDate and gender
- [ ] Eligible player can register (age and gender match)
- [ ] Ineligible player rejected - age too low
- [ ] Ineligible player rejected - gender mismatch
- [ ] "All ages" category bypasses age validation
- [ ] Cannot register for same category twice
- [ ] Player can register for multiple different categories
- [ ] Bulk registration works with partial failures
- [ ] Player can view their own registrations
- [ ] Organizer can view category's registrations

### P3: Category-Specific Rankings
- [ ] Category leaderboard displays top players
- [ ] Player's ranking shown in specific category
- [ ] Player's rankings across all categories
- [ ] Rankings are independent per category
- [ ] Rankings update within 5 minutes of results

---

## Troubleshooting

### Issue: "INCOMPLETE_PROFILE" error when registering
**Solution**: Ensure player has `birthDate` and `gender` set:
```bash
curl -X PATCH http://localhost:3000/api/v1/players/me \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "birthDate": "1987-03-15",
    "gender": "MEN"
  }'
```

### Issue: "ALREADY_REGISTERED" error
**Solution**: Player is already registered for this category. Check status:
```bash
curl -X GET "http://localhost:3000/api/v1/registrations/player/{playerId}?status=ACTIVE" \
  -b cookies.txt
```

### Issue: Cannot delete category
**Solution**: Category has active tournaments. Delete tournaments first or keep category.

---

## Next Steps

After completing this quickstart:

1. **Generate Tasks** (`/speckit.tasks`): Convert user stories into implementation tasks
2. **Implement P1**: Start with category creation and tournament assignment
3. **Implement P2**: Add registration validation
4. **Implement P3**: Add ranking system
5. **Frontend Integration**: Build React UI components (see research.md)

---

**Quickstart Version**: 1.0.0
**Last Updated**: 2025-11-01
**Related Documentation**: spec.md, data-model.md, contracts/
