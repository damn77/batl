# Quickstart Guide: Tournament Registration & Enhanced Tournament Management

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md)
**Created**: 2025-11-02
**Phase**: 1 (Data Model & Contracts)

## Purpose

This guide provides an end-to-end walkthrough of the tournament registration feature, demonstrating the complete user journey from creating a tournament with enhanced details through managing registrations, waitlists, and tournament lifecycle.

---

## Prerequisites

Before starting, ensure you have:

1. **Backend Running**: `cd backend && node src/index.js`
2. **Frontend Running**: `cd frontend && npm run dev`
3. **Database Migrated**: `cd backend && npx prisma migrate dev`
4. **User Accounts Created**:
   - Admin/Organizer account with email/password
   - 3+ Player accounts with completed profiles (name, email, birthDate, gender)

---

## Scenario Overview

This walkthrough demonstrates:

1. **Category Setup** (from 002-category-system) - Organizer creates "Men's Singles 35+" category
2. **Tournament Creation** - Organizer creates tournament with enhanced details and capacity of 2 players
3. **Direct Registration** - Player 1 registers (auto-registered to category, gets REGISTERED status)
4. **Waitlist Registration** - Player 2 registers (auto-registered to category, gets REGISTERED status)
5. **Anti-Spam Protection** - Player 3 (not in category) tries to register → rejected
6. **Category Registration** - Player 3 registers to category manually
7. **Waitlist Join** - Player 3 registers to tournament → gets WAITLISTED status
8. **Unregistration & Auto-Promotion** - Player 1 unregisters → Player 3 auto-promoted
9. **Manual Waitlist Management** - Organizer demotes Player 2 with auto-promotion
10. **Tournament Lifecycle** - Organizer starts, completes tournament
11. **Smart Category Cleanup** - Player withdraws, category membership preserved (hasParticipated = true)

---

## Step-by-Step Walkthrough

### Step 1: Create Category (from 002-category-system)

**Actor**: Organizer
**Goal**: Create "Men's Singles 35+" category

**API Call**:
```http
POST /api/categories
Authorization: Bearer <organizer-token>
Content-Type: application/json

{
  "type": "SINGLES",
  "ageGroup": "AGE_35",
  "gender": "MEN"
}
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "cat-12345678-abcd-1234-abcd-1234567890ab",
      "type": "SINGLES",
      "ageGroup": "AGE_35",
      "gender": "MEN",
      "name": "Men's Singles 35+",
      "createdAt": "2025-11-02T10:00:00.000Z"
    }
  }
}
```

**Save for later**: `categoryId = "cat-12345678-abcd-1234-abcd-1234567890ab"`

---

### Step 2: Create Tournament with Enhanced Details

**Actor**: Organizer
**Goal**: Create tournament with capacity, location, entry fee, and all logistical details

**API Call**:
```http
POST /api/tournaments
Authorization: Bearer <organizer-token>
Content-Type: application/json

{
  "name": "Spring Championship 2025",
  "categoryId": "cat-12345678-abcd-1234-abcd-1234567890ab",
  "description": "Kickoff tournament for the 2025 season",
  "location": "Central Tennis Club, 123 Main St, City",
  "capacity": 2,
  "organizerEmail": "organizer@example.com",
  "organizerPhone": "+1-555-0100",
  "entryFee": 25.00,
  "rulesUrl": "https://example.com/rules",
  "prizeDescription": "1st: $200, 2nd: $100",
  "startDate": "2025-04-15T09:00:00Z",
  "endDate": "2025-04-15T17:00:00Z",
  "registrationOpenDate": "2025-03-01T00:00:00Z",
  "registrationCloseDate": "2025-04-10T23:59:59Z",
  "minParticipants": 2,
  "waitlistDisplayOrder": "REGISTRATION_TIME"
}
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "tourn-87654321-dcba-4321-dcba-0987654321fe",
      "name": "Spring Championship 2025",
      "categoryId": "cat-12345678-abcd-1234-abcd-1234567890ab",
      "location": "Central Tennis Club, 123 Main St, City",
      "capacity": 2,
      "organizerEmail": "organizer@example.com",
      "organizerPhone": "+1-555-0100",
      "entryFee": 25.00,
      "status": "SCHEDULED",
      "createdAt": "2025-11-02T10:30:00.000Z"
    }
  }
}
```

**Save for later**: `tournamentId = "tourn-87654321-dcba-4321-dcba-0987654321fe"`

**Database State**:
- Tournament created with capacity = 2
- No registrations yet
- Spots available: 2/2

---

### Step 3: Player 1 Registers (Direct Registration)

**Actor**: Player 1 (John, age 37, male)
**Goal**: Register for tournament
**Expected**: Auto-registered to category, gets REGISTERED status (spot 1/2)

**API Call**:
```http
POST /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/register
Authorization: Bearer <player1-token>
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-player1-aaaa-bbbb-cccc-dddddddddddd",
      "playerId": "player-john-1111-2222-3333-444444444444",
      "tournamentId": "tourn-87654321-dcba-4321-dcba-0987654321fe",
      "status": "REGISTERED",
      "registrationTimestamp": "2025-11-02T11:00:00.000Z"
    },
    "categoryRegistration": {
      "id": "cat-reg-john-5555-6666-7777-888888888888",
      "playerId": "player-john-1111-2222-3333-444444444444",
      "categoryId": "cat-12345678-abcd-1234-abcd-1234567890ab",
      "status": "ACTIVE",
      "hasParticipated": false,
      "isNew": true
    },
    "tournament": {
      "name": "Spring Championship 2025",
      "category": {
        "name": "Men's Singles 35+"
      }
    }
  },
  "message": "Successfully registered for tournament and category"
}
```

**Key Observations**:
- ✅ Player auto-registered to category (isNew: true)
- ✅ Status: REGISTERED (tournament has capacity)
- ✅ hasParticipated: false (no tournaments completed yet)

**Database State**:
- Player 1: REGISTERED
- Spots available: 1/2
- CategoryRegistration created for Player 1

---

### Step 4: Player 2 Registers (Fills Capacity)

**Actor**: Player 2 (Bob, age 40, male)
**Goal**: Register for tournament
**Expected**: Auto-registered to category, gets REGISTERED status (spot 2/2 - capacity filled)

**API Call**:
```http
POST /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/register
Authorization: Bearer <player2-token>
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-player2-bbbb-cccc-dddd-eeeeeeeeeeee",
      "playerId": "player-bob-2222-3333-4444-555555555555",
      "tournamentId": "tourn-87654321-dcba-4321-dcba-0987654321fe",
      "status": "REGISTERED",
      "registrationTimestamp": "2025-11-02T11:15:00.000Z"
    },
    "categoryRegistration": {
      "id": "cat-reg-bob-6666-7777-8888-999999999999",
      "playerId": "player-bob-2222-3333-4444-555555555555",
      "categoryId": "cat-12345678-abcd-1234-abcd-1234567890ab",
      "status": "ACTIVE",
      "hasParticipated": false,
      "isNew": true
    }
  },
  "message": "Successfully registered for tournament and category"
}
```

**Database State**:
- Player 1: REGISTERED
- Player 2: REGISTERED
- Spots available: 0/2 (FULL)
- Next registration will be WAITLISTED

---

### Step 5: Player 3 Tries to Register (Anti-Spam Protection Triggered)

**Actor**: Player 3 (Alice, age 38, female)
**Goal**: Try to register for full tournament
**Expected**: REJECTED - not registered in category yet (anti-spam protection)

**API Call**:
```http
POST /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/register
Authorization: Bearer <player3-token>
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_REGISTRATION_REQUIRED",
    "message": "You must be registered in the tournament's category before joining the waitlist",
    "details": {
      "tournamentName": "Spring Championship 2025",
      "categoryName": "Men's Singles 35+",
      "categoryId": "cat-12345678-abcd-1234-abcd-1234567890ab",
      "reason": "Anti-spam protection: waitlist requires category membership",
      "action": "Please register for the category first, then try again"
    }
  }
}
```

**Key Observations**:
- ✅ **Anti-spam protection working** - Player 3 cannot spam waitlist without category membership
- ✅ Clear error message guides user to register for category first
- ✅ Prevents malicious actors from flooding waitlists with fake accounts

**Database State**: No changes (registration rejected)

---

### Step 6: Player 3 Registers to Category Manually

**Actor**: Player 3 (Alice, age 38, female)
**Goal**: Register to category so they can join tournament waitlist

**Note**: This would normally fail because Alice is female and the category is "Men's Singles 35+". For this demo, assume the category is actually "Mixed Singles 35+" or we use a male player (Charlie, age 38).

**Corrected Demo Player**: Charlie (age 38, male)

**API Call** (using 002-category-system endpoint):
```http
POST /api/categories/cat-12345678-abcd-1234-abcd-1234567890ab/register
Authorization: Bearer <player3-token>
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "categoryRegistration": {
      "id": "cat-reg-charlie-7777-8888-9999-aaaaaaaaaaaa",
      "playerId": "player-charlie-3333-4444-5555-666666666666",
      "categoryId": "cat-12345678-abcd-1234-abcd-1234567890ab",
      "status": "ACTIVE",
      "hasParticipated": false
    }
  }
}
```

**Database State**:
- Charlie now registered in "Men's Singles 35+" category
- Charlie has NO tournament registrations yet
- Charlie can now join tournament waitlist

---

### Step 7: Player 3 Joins Waitlist (Now Allowed)

**Actor**: Player 3 (Charlie, age 38, male)
**Goal**: Register for full tournament
**Expected**: Added to waitlist with WAITLISTED status (anti-spam check passes)

**API Call**:
```http
POST /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/register
Authorization: Bearer <player3-token>
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-player3-cccc-dddd-eeee-ffffffffffff",
      "playerId": "player-charlie-3333-4444-5555-666666666666",
      "tournamentId": "tourn-87654321-dcba-4321-dcba-0987654321fe",
      "status": "WAITLISTED",
      "registrationTimestamp": "2025-11-02T11:45:00.000Z"
    },
    "categoryRegistration": {
      "id": "cat-reg-charlie-7777-8888-9999-aaaaaaaaaaaa",
      "playerId": "player-charlie-3333-4444-5555-666666666666",
      "categoryId": "cat-12345678-abcd-1234-abcd-1234567890ab",
      "status": "ACTIVE",
      "hasParticipated": false,
      "isNew": false
    },
    "tournament": {
      "name": "Spring Championship 2025",
      "capacity": 2,
      "currentRegistered": 2,
      "waitlistPosition": 1
    }
  },
  "message": "Tournament is full. You have been added to the waitlist at position 1"
}
```

**Key Observations**:
- ✅ Registration succeeds because Charlie is already in category (isNew: false)
- ✅ Status: WAITLISTED (tournament at capacity)
- ✅ Waitlist position: 1
- ✅ NO auto-category registration for waitlisted players (anti-spam protection)

**Database State**:
- Player 1: REGISTERED
- Player 2: REGISTERED
- Player 3 (Charlie): WAITLISTED (position 1)

---

### Step 8: Player 1 Unregisters (Triggers Auto-Promotion)

**Actor**: Player 1 (John)
**Goal**: Withdraw from tournament
**Expected**: Charlie auto-promoted from waitlist to registered

**API Call**:
```http
DELETE /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/register
Authorization: Bearer <player1-token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-player1-aaaa-bbbb-cccc-dddddddddddd",
      "status": "WITHDRAWN",
      "withdrawnAt": "2025-11-02T12:00:00.000Z"
    },
    "autoPromotion": {
      "promoted": true,
      "promotedPlayer": {
        "id": "player-charlie-3333-4444-5555-666666666666",
        "name": "Charlie Davis",
        "registrationId": "reg-player3-cccc-dddd-eeee-ffffffffffff",
        "originalWaitlistPosition": 1,
        "registrationTimestamp": "2025-11-02T11:45:00.000Z"
      }
    },
    "categoryAction": "KEPT",
    "categoryReason": "Player has participated in other tournaments in this category"
  },
  "message": "Successfully unregistered from tournament. Charlie Davis has been promoted from the waitlist."
}
```

**Key Observations**:
- ✅ John's status → WITHDRAWN
- ✅ Charlie auto-promoted (WAITLISTED → REGISTERED)
- ✅ Promotion by registration timestamp (fairness)
- ✅ John kept in category (assuming hasParticipated = true)

**Database State**:
- Player 1 (John): WITHDRAWN
- Player 2 (Bob): REGISTERED
- Player 3 (Charlie): REGISTERED (promoted from waitlist)
- Spots available: 0/2 (full again)

---

### Step 9: View Waitlist

**Actor**: Anyone (public endpoint)
**Goal**: See current waitlist
**Expected**: Empty waitlist (Charlie was promoted)

**API Call**:
```http
GET /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/waitlist
Authorization: Bearer <any-token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "tourn-87654321-dcba-4321-dcba-0987654321fe",
      "name": "Spring Championship 2025",
      "capacity": 2,
      "currentRegistered": 2,
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

---

### Step 10: Organizer Manually Demotes Player with Auto-Promotion

**Actor**: Organizer
**Goal**: Move Bob to waitlist and auto-promote next player (but waitlist is empty)
**Expected**: Bob demoted, no one to promote

**First, let's add Player 4 to category and waitlist**:

#### Step 10a: Player 4 Registers to Category

**API Call**:
```http
POST /api/categories/cat-12345678-abcd-1234-abcd-1234567890ab/register
Authorization: Bearer <player4-token>
```

**Expected Response**: 201 Created (categoryRegistration created)

#### Step 10b: Player 4 Joins Waitlist

**API Call**:
```http
POST /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/register
Authorization: Bearer <player4-token>
```

**Expected Response**: 201 Created with status WAITLISTED

**Database State**:
- Player 2 (Bob): REGISTERED
- Player 3 (Charlie): REGISTERED
- Player 4 (David): WAITLISTED

#### Step 10c: Organizer Demotes Bob with Auto-Promotion

**API Call**:
```http
POST /api/registrations/reg-player2-bbbb-cccc-dddd-eeeeeeeeeeee/demote
Authorization: Bearer <organizer-token>
Content-Type: application/json

{
  "autoPromote": true,
  "reason": "Player requested to be moved to waitlist"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "demoted": {
      "registration": {
        "id": "reg-player2-bbbb-cccc-dddd-eeeeeeeeeeee",
        "status": "WAITLISTED",
        "demotedBy": "user-organizer-1234-5678-90ab-cdef12345678",
        "demotedAt": "2025-11-02T13:00:00.000Z"
      },
      "player": {
        "id": "player-bob-2222-3333-4444-555555555555",
        "name": "Bob Smith"
      }
    },
    "promoted": {
      "registration": {
        "id": "reg-player4-dddd-eeee-ffff-gggggggggggg",
        "status": "REGISTERED",
        "promotedBy": "SYSTEM",
        "promotedAt": "2025-11-02T13:00:00.000Z"
      },
      "player": {
        "id": "player-david-4444-5555-6666-777777777777",
        "name": "David Wilson"
      }
    }
  },
  "message": "Successfully demoted Bob Smith to waitlist. David Wilson has been automatically promoted."
}
```

**Key Observations**:
- ✅ Bob demoted to WAITLISTED
- ✅ David auto-promoted (WAITLISTED → REGISTERED)
- ✅ promotedBy: "SYSTEM" (auto-promotion)
- ✅ demotedBy: organizer user ID (manual action)

**Database State**:
- Player 2 (Bob): WAITLISTED
- Player 3 (Charlie): REGISTERED
- Player 4 (David): REGISTERED

---

### Step 11: Start Tournament

**Actor**: Organizer
**Goal**: Start the tournament (SCHEDULED → IN_PROGRESS)
**Expected**: Status changes, registration closes

**API Call**:
```http
POST /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/start
Authorization: Bearer <organizer-token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "tourn-87654321-dcba-4321-dcba-0987654321fe",
      "name": "Spring Championship 2025",
      "status": "IN_PROGRESS",
      "lastStatusChange": "2025-04-15T09:00:00.000Z"
    },
    "participants": {
      "registered": 2,
      "withdrawn": 1,
      "active": 2
    },
    "warnings": []
  },
  "message": "Tournament started successfully with 2 active participants"
}
```

**Key Observations**:
- ✅ Status: IN_PROGRESS
- ✅ Registration now closed (cannot register for in-progress tournament)
- ✅ 2 active participants (Charlie, David)
- ✅ Bob still WAITLISTED (remains in that status)

---

### Step 12: Complete Tournament

**Actor**: Organizer
**Goal**: Mark tournament as completed
**Expected**: Status changes, all REGISTERED players marked as hasParticipated = true

**API Call**:
```http
POST /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/complete
Authorization: Bearer <organizer-token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tournament": {
      "id": "tourn-87654321-dcba-4321-dcba-0987654321fe",
      "name": "Spring Championship 2025",
      "status": "COMPLETED",
      "lastStatusChange": "2025-04-15T17:00:00.000Z"
    },
    "participants": {
      "registered": 2,
      "completed": 2,
      "withdrawn": 1
    },
    "categoryUpdates": {
      "playersUpdated": 2,
      "note": "All registered players marked as hasParticipated in category"
    }
  },
  "message": "Tournament completed successfully. Category participation records updated."
}
```

**Key Observations**:
- ✅ Status: COMPLETED
- ✅ Charlie and David: hasParticipated = true (permanent category membership)
- ✅ Bob (WAITLISTED, never participated): hasParticipated = false

**Database State**:
- CategoryRegistration for Charlie: hasParticipated = true
- CategoryRegistration for David: hasParticipated = true
- CategoryRegistration for Bob: hasParticipated = false
- CategoryRegistration for John: hasParticipated = true (from previous tournaments)

---

### Step 13: Smart Category Cleanup Demo

**Actor**: Player 3 (Charlie)
**Goal**: Unregister from completed tournament
**Expected**: Category registration KEPT (hasParticipated = true)

**API Call**:
```http
DELETE /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/register
Authorization: Bearer <player3-token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-player3-cccc-dddd-eeee-ffffffffffff",
      "status": "WITHDRAWN",
      "withdrawnAt": "2025-04-20T10:00:00.000Z"
    },
    "autoPromotion": {
      "promoted": false,
      "reason": "Tournament is completed, no auto-promotion"
    },
    "categoryAction": "KEPT",
    "categoryReason": "Player has participated in tournaments in this category"
  },
  "message": "Successfully unregistered from tournament"
}
```

**Key Observations**:
- ✅ Charlie's tournament registration: WITHDRAWN
- ✅ Charlie's category registration: **KEPT** (hasParticipated = true)
- ✅ Smart cleanup preserves participation history

**Contrast with Bob** (never participated):

**API Call**:
```http
DELETE /api/tournaments/tourn-87654321-dcba-4321-dcba-0987654321fe/register
Authorization: Bearer <player2-token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "registration": {
      "id": "reg-player2-bbbb-cccc-dddd-eeeeeeeeeeee",
      "status": "WITHDRAWN",
      "withdrawnAt": "2025-04-20T10:05:00.000Z"
    },
    "categoryAction": "REMOVED",
    "categoryReason": "No participation history and no other active tournaments in category"
  },
  "message": "Successfully unregistered from tournament and removed from category"
}
```

**Key Observations**:
- ✅ Bob's tournament registration: WITHDRAWN
- ✅ Bob's category registration: **REMOVED** (hasParticipated = false, no active tournaments)
- ✅ Smart cleanup removes players who never participated

---

## Feature Highlights Demonstrated

### ✅ Auto-Category Registration
- Players automatically registered to category when joining tournament (if they get REGISTERED status)
- **Anti-spam protection**: Players must be in category before joining waitlist

### ✅ Waitlist Management
- Automatic waitlist when tournament reaches capacity
- **Anti-spam protection**: Only category members can join waitlist
- Auto-promotion by registration timestamp (fairness)
- Manual promotion/demotion by organizer

### ✅ Enhanced Tournament Details
- Location, capacity, entry fee, organizer contacts all stored and displayed
- Registration windows (open/close dates)
- Minimum participants

### ✅ Tournament Lifecycle
- SCHEDULED → IN_PROGRESS → COMPLETED
- Status changes control registration availability
- Completing tournament sets hasParticipated = true

### ✅ Smart Category Cleanup
- hasParticipated = true → category membership preserved
- hasParticipated = false AND no active tournaments → auto-removed from category

### ✅ Anti-Spam Protection (New!)
- Players must register to category before joining waitlist
- Prevents malicious actors from flooding waitlists with fake accounts
- Clear error messages guide users to register for category first

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/categories` | POST | Create category |
| `/api/categories/:id/register` | POST | Register to category |
| `/api/tournaments` | POST | Create tournament |
| `/api/tournaments/:id/register` | POST | Register for tournament |
| `/api/tournaments/:id/register` | DELETE | Unregister from tournament |
| `/api/tournaments/:id/waitlist` | GET | View waitlist |
| `/api/registrations/:id/promote` | POST | Manually promote from waitlist |
| `/api/registrations/:id/demote` | POST | Manually demote to waitlist |
| `/api/tournaments/:id/start` | POST | Start tournament |
| `/api/tournaments/:id/complete` | POST | Complete tournament |

---

## Testing Scenarios Covered

- ✅ Direct registration with auto-category creation
- ✅ Waitlist registration when tournament full
- ✅ **Anti-spam protection** (CATEGORY_REGISTRATION_REQUIRED error)
- ✅ Auto-promotion from waitlist by timestamp
- ✅ Manual promotion/demotion by organizer
- ✅ Tournament lifecycle transitions
- ✅ Smart category cleanup based on participation history
- ✅ Registration status preservation (WITHDRAWN, CANCELLED)

---

## Next Steps

After completing this walkthrough, try:

1. **Cancelling a tournament** - See all registrations marked as CANCELLED
2. **Changing tournament capacity** - See excess players demoted or waitlisted players promoted
3. **Manual waitlist selection** - Use manualPromoteId instead of autoPromote
4. **Registration window validation** - Try registering before registrationOpenDate or after registrationCloseDate
5. **Eligibility validation** - Try registering players who don't meet age/gender requirements

---

**Quickstart Status**: ✅ **COMPLETE**
**Phase 1 Complete**: Ready for `/speckit.tasks` command to generate implementation tasks
