# Research: Tournament Registration & Enhanced Tournament Management

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)
**Created**: 2025-11-02
**Phase**: 0 (Research & Discovery)

## Purpose

This document resolves technical uncertainties identified in [plan.md](plan.md) and establishes best practices for implementing the tournament registration system with waitlist management, auto-category enrollment, and enhanced tournament details.

## Research Items

### 1. Testing Framework Selection ⚠️ NEEDS CLARIFICATION RESOLUTION

**Context**: Project currently has no testing framework defined. Need to select appropriate framework for Node.js 20+ backend and React 19 frontend.

**Options Evaluated**:

| Framework | Backend Support | Frontend Support | Pros | Cons | Recommendation |
|-----------|----------------|------------------|------|------|----------------|
| **Jest** | ✅ Excellent | ✅ Excellent | Industry standard, mature ecosystem, built-in mocking | Slower than alternatives, requires configuration for ES modules | **Good choice** |
| **Vitest** | ✅ Excellent | ✅ Excellent | Native ES modules support, Vite integration, faster than Jest, Jest-compatible API | Newer/less mature, smaller ecosystem | **Best choice for this project** |
| **Mocha + Chai** | ✅ Excellent | ⚠️ Requires setup | Flexible, established | Requires multiple libraries, more configuration | Not recommended |

**Decision**: **Vitest** is recommended for both backend and frontend testing

**Rationale**:
1. **Native ES Modules Support**: Project uses Node.js 20+ with ES modules - Vitest handles this natively without configuration overhead
2. **Vite Integration**: Frontend already uses Vite 7 - seamless integration with existing build tooling
3. **Performance**: Significantly faster test execution than Jest, important for CI/CD pipelines
4. **Jest Compatibility**: API is compatible with Jest, making migration easy if needed
5. **Modern Stack Alignment**: Better fit for modern JavaScript ecosystem (React 19, Vite 7, ES modules)

**Implementation Notes**:
- Use Vitest for both unit tests and integration tests
- Backend: Test services, controllers, and middleware
- Frontend: Test components with `@testing-library/react`
- Database: Use Prisma's test utilities or in-memory SQLite for isolated tests
- Coverage target: Aim for 80%+ coverage on critical paths (registration logic, waitlist auto-promotion)

**Action Required**: Install Vitest and configure for backend/frontend in Phase 2

---

### 2. Waitlist Auto-Promotion Implementation Patterns

**Context**: FR-021 requires automatic promotion of waitlisted players within 5 seconds when spots become available (SC-011).

**Research Findings**:

#### Pattern 1: Transaction-Based Promotion (RECOMMENDED)
```
When player unregisters:
1. Start database transaction
2. Update player status to WITHDRAWN
3. Query for oldest WAITLISTED player (ORDER BY registrationTimestamp ASC LIMIT 1)
4. If found, update status to REGISTERED
5. Commit transaction
```

**Pros**:
- Atomic operation prevents race conditions
- Guarantees fairness (timestamp ordering)
- Simple to implement and test
- Meets 5-second performance requirement easily

**Cons**:
- Slight performance overhead from transaction (negligible for expected load)

#### Pattern 2: Event-Driven Promotion
```
When player unregisters:
1. Emit "spot_available" event
2. Event handler queries waitlist and promotes
```

**Pros**:
- Decoupled architecture
- Easier to extend with notifications

**Cons**:
- More complex
- Potential for event processing delays
- Harder to test atomicity

**Decision**: Use **Pattern 1 (Transaction-Based Promotion)** for Phase 1 implementation

**Performance Considerations**:
- Expected load: 50+ simultaneous tournaments (from plan.md)
- Average tournament capacity: 16-32 players
- Worst case: 1 unregistration triggers 1 query + 1 update
- Database: SQLite with proper indexing on `tournamentId`, `status`, `registrationTimestamp`
- Expected latency: < 100ms (well under 5-second requirement)

**Indexing Strategy**:
```sql
-- Composite index for efficient waitlist queries
CREATE INDEX idx_waitlist_promotion ON TournamentRegistration(
  tournamentId,
  status,
  registrationTimestamp
) WHERE status = 'WAITLISTED';
```

**Edge Cases to Handle**:
1. Multiple simultaneous unregistrations → Transaction isolation prevents double-promotion
2. Waitlist empty when spot opens → No-op, no error
3. Manual promotion happens during auto-promotion → Last-write-wins or optimistic locking

---

### 3. Registration State Machine Patterns

**Context**: TournamentRegistration entity has 4 states (REGISTERED, WAITLISTED, WITHDRAWN, CANCELLED) with specific transition rules.

**State Transition Rules**:

```
REGISTERED → WITHDRAWN (player action: unregister)
REGISTERED → WAITLISTED (organizer action: manual demotion OR capacity reduction)
REGISTERED → CANCELLED (system action: tournament cancelled)

WAITLISTED → REGISTERED (system action: auto-promotion OR organizer action: manual promotion)
WAITLISTED → WITHDRAWN (player action: withdraw from waitlist)
WAITLISTED → CANCELLED (system action: tournament cancelled)

WITHDRAWN → (terminal state, no transitions)
CANCELLED → (terminal state, no transitions)
```

**Implementation Pattern**: **Explicit State Transition Methods**

**Service Layer Design**:
```javascript
// tournamentRegistrationService.js

async registerPlayer(playerId, tournamentId) {
  // Check capacity → assign REGISTERED or WAITLISTED
  // Handle auto-category registration (FR-003, FR-004)
}

async unregisterPlayer(registrationId) {
  // Set status to WITHDRAWN
  // Trigger auto-promotion if was REGISTERED
  // Handle auto-category unregistration (FR-013, FR-014)
  // Use transaction
}

async promoteFromWaitlist(registrationId, promotedBy = 'SYSTEM') {
  // Validate status is WAITLISTED
  // Update to REGISTERED
  // Record who promoted (system vs organizer)
}

async demoteToWaitlist(registrationId, demoterUserId) {
  // Validate status is REGISTERED
  // Update to WAITLISTED
  // Return modal options for auto-promotion (FR-023)
}

async cancelAllRegistrations(tournamentId) {
  // Bulk update all non-terminal states to CANCELLED
  // No auto-promotion triggers
}
```

**Benefits**:
- Clear business logic encapsulation
- Easy to validate allowed transitions
- Simple to test each transition independently
- Audit trail via promotedBy field

**Validation Strategy**:
- Use Prisma schema enums for status values (prevents invalid states)
- Add validation middleware to check allowed transitions
- Return clear error messages for invalid transitions

---

### 4. Modal Confirmation Workflow Patterns

**Context**: FR-023 requires modal confirmation when organizer manually demotes a player to waitlist, offering auto-promotion or manual selection.

**UX Pattern**: **Two-Step Confirmation with Options**

**Workflow**:
```
1. Organizer clicks "Move to Waitlist" on registered player
2. Modal appears:
   - Title: "Move [Player Name] to Waitlist?"
   - Warning: "This will free up a spot in the tournament"
   - Option A: [Auto-promote next waitlisted player (by registration time)]
   - Option B: [Manually select player to promote]
   - Cancel button
3. If Option A selected:
   - Execute demoteToWaitlist()
   - Execute promoteFromWaitlist() on oldest waitlisted player
   - Show success toast: "[Player 1] moved to waitlist, [Player 2] promoted"
4. If Option B selected:
   - Show second modal with list of waitlisted players
   - Sorted by registrationTimestamp (fair order)
   - Allow single selection
   - Execute both operations
   - Show success toast
```

**Component Structure**:
```
<WaitlistManagementModal>
  ├── <DemoteConfirmationStep>  (Step 1: Choose auto/manual)
  ├── <ManualSelectionStep>      (Step 2: Only if Option B)
  └── <SuccessToast>             (Confirmation feedback)
```

**React Bootstrap Components to Use**:
- `Modal` - Main container
- `Modal.Header` - Title and close button
- `Modal.Body` - Content and options
- `Modal.Footer` - Action buttons
- `ListGroup` - Display waitlisted players in manual selection
- `Toast` - Success feedback

**State Management**:
```javascript
const [modalStep, setModalStep] = useState('confirm'); // 'confirm' | 'manual-select' | 'closed'
const [selectedPromotion, setSelectedPromotion] = useState(null);
const [waitlistedPlayers, setWaitlistedPlayers] = useState([]);
```

**Accessibility Considerations**:
- Focus trap within modal
- ESC key to cancel
- Clear button labels ("Auto-promote" vs "Choose manually")
- Loading states during API calls
- Error handling with inline error messages

---

### 5. Timestamp-Based Queue Ordering

**Context**: FR-020 requires recording registration timestamp for all registrations. FR-021 requires auto-promotion by oldest timestamp. FR-026 allows display configuration (time vs alphabetical).

**Best Practices**:

#### Timestamp Storage
- **Field**: `registrationTimestamp` (DateTime, NOT NULL)
- **Precision**: Milliseconds (JavaScript `Date.now()` or Prisma `DateTime @default(now())`)
- **Timezone**: Store in UTC, convert for display
- **Index**: Include in composite index for query performance

#### Fair Queue Ordering
```javascript
// Auto-promotion query (always uses timestamp)
const nextWaitlisted = await prisma.tournamentRegistration.findFirst({
  where: {
    tournamentId: tournamentId,
    status: 'WAITLISTED'
  },
  orderBy: {
    registrationTimestamp: 'asc'  // Oldest first = fair queue
  }
});
```

#### Display Ordering
```javascript
// Display uses tournament config (FR-026)
const displayOrder = tournament.waitlistDisplayOrder === 'ALPHABETICAL'
  ? [{ player: { name: 'asc' } }]
  : [{ registrationTimestamp: 'asc' }];

const waitlist = await prisma.tournamentRegistration.findMany({
  where: { tournamentId, status: 'WAITLISTED' },
  orderBy: displayOrder,
  include: { player: true }
});
```

**Key Principle**: **Auto-promotion logic and display logic are separate**
- Promotion: Always fair (timestamp)
- Display: Organizer preference (timestamp or alphabetical)

**Edge Case: Simultaneous Registrations**:
- Database timestamp precision (milliseconds) sufficient for expected load
- If exact same millisecond (extremely rare): Use ID as tiebreaker
```javascript
orderBy: [
  { registrationTimestamp: 'asc' },
  { id: 'asc' }  // Tiebreaker
]
```

---

### 6. Auto-Category Registration Integration

**Context**: FR-003, FR-004 require automatic category registration when player registers for tournament in new category. FR-013, FR-014 require smart unregistration logic.

**Integration Pattern**: **Service Layer Coordination**

**Registration Flow**:
```javascript
// tournamentRegistrationService.js
async registerPlayer(playerId, tournamentId) {
  const tournament = await getTournamentWithCategory(tournamentId);
  const categoryId = tournament.categoryId;

  // Step 1: Check if player already registered in category
  const existingCategoryReg = await categoryService.getPlayerCategoryRegistration(
    playerId,
    categoryId
  );

  // Step 2: If not, auto-register to category
  if (!existingCategoryReg) {
    await categoryService.registerPlayerToCategory(playerId, categoryId);
  }

  // Step 3: Register to tournament (with capacity check)
  const registration = await createTournamentRegistration({
    playerId,
    tournamentId,
    status: determineStatus(tournament), // REGISTERED or WAITLISTED
    registrationTimestamp: new Date()
  });

  return registration;
}
```

**Unregistration Flow with Smart Cleanup**:
```javascript
async unregisterPlayer(registrationId) {
  const registration = await getRegistration(registrationId);
  const { playerId, tournamentId } = registration;
  const tournament = await getTournamentWithCategory(tournamentId);

  // Step 1: Update registration status to WITHDRAWN
  await updateRegistrationStatus(registrationId, 'WITHDRAWN');

  // Step 2: Trigger waitlist auto-promotion if needed
  await autoPromoteFromWaitlist(tournamentId);

  // Step 3: Check if should unregister from category
  const shouldUnregisterCategory = await categoryService.shouldUnregisterFromCategory(
    playerId,
    tournament.categoryId
  );

  if (shouldUnregisterCategory) {
    await categoryService.unregisterPlayerFromCategory(playerId, tournament.categoryId);
  }

  return { success: true };
}
```

**Category Service - Participation Check** (FR-014):
```javascript
// categoryService.js
async shouldUnregisterFromCategory(playerId, categoryId) {
  // Check if player has:
  // 1. hasParticipated flag set (any completed tournament)
  // 2. Any active tournament registrations (REGISTERED or WAITLISTED)

  const categoryReg = await prisma.categoryRegistration.findUnique({
    where: { playerId_categoryId: { playerId, categoryId } },
    include: {
      tournamentRegistrations: {
        where: {
          status: { in: ['REGISTERED', 'WAITLISTED'] }
        }
      }
    }
  });

  // Keep category registration if has participation history OR active tournaments
  return !categoryReg.hasParticipated && categoryReg.tournamentRegistrations.length === 0;
}
```

**Transaction Boundary**:
- Use database transaction for registration + category auto-register
- Use transaction for unregistration + auto-promotion + category cleanup
- Ensures data consistency across related operations

**Error Handling**:
- If category registration fails → rollback tournament registration
- If tournament registration fails → rollback category registration (if newly created)
- Return clear error messages for validation failures

---

### 7. Existing Codebase Integration Points

**Context**: Feature 003 extends Feature 002 (Category System). Need to identify integration points.

**Integration Analysis**:

#### Backend Integration Points

**Existing Services to Extend**:
1. `backend/src/services/tournamentService.js` (from 002-category-system)
   - Already handles tournament CRUD
   - Need to add: capacity, location, entry fee fields (FR-031 through FR-041)
   - Need to add: status lifecycle (SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED) (FR-042 through FR-046)

2. `backend/src/services/categoryService.js` (from 002-category-system)
   - Already handles category registration
   - Need to add: `hasParticipated` tracking (FR-014)
   - Need to add: `shouldUnregisterFromCategory()` method

**Existing Controllers to Extend**:
1. `backend/src/api/tournamentController.js`
   - Add endpoints for enhanced tournament fields
   - Add lifecycle management endpoints (start, complete, cancel)

**Existing Routes to Extend**:
1. `backend/src/api/routes/tournamentRoutes.js`
   - Add routes for new tournament operations

**New Services Required**:
1. `backend/src/services/tournamentRegistrationService.js`
   - Core registration logic
   - Waitlist management
   - Auto-promotion logic

**New Controllers Required**:
1. `backend/src/api/registrationController.js`
   - Registration endpoints
   - Waitlist endpoints

**New Routes Required**:
1. `backend/src/api/routes/registrationRoutes.js`
   - `/api/tournaments/:id/register`
   - `/api/tournaments/:id/unregister`
   - `/api/tournaments/:id/participants`
   - `/api/tournaments/:id/waitlist`
   - `/api/registrations/:id/promote`
   - `/api/registrations/:id/demote`

#### Frontend Integration Points

**Existing Services to Extend**:
1. `frontend/src/services/tournamentService.js`
   - Add methods for enhanced tournament fields
   - Add lifecycle methods (start, complete, cancel)

**New Services Required**:
1. `frontend/src/services/tournamentRegistrationService.js`
   - API client for registration operations

**New Pages Required**:
1. `frontend/src/pages/TournamentSetupPage.jsx`
   - Enhanced form with location, capacity, entry fee
2. `frontend/src/pages/TournamentRegistrationPage.jsx`
   - Player registration interface
3. `frontend/src/pages/TournamentDetailPage.jsx`
   - View participants, waitlist, manage

**New Components Required**:
1. `frontend/src/components/WaitlistManagementModal.jsx`
   - Organizer waitlist promotion UI
2. `frontend/src/components/RegistrationStatusBadge.jsx`
   - Display REGISTERED/WAITLISTED/WITHDRAWN/CANCELLED status

---

## Summary of Decisions

| Item | Decision | Rationale |
|------|----------|-----------|
| **Testing Framework** | Vitest | Native ES modules support, Vite integration, performance, Jest compatibility |
| **Waitlist Promotion** | Transaction-based, timestamp-ordered | Atomic, fair, simple, meets performance requirements |
| **State Machine** | Explicit service methods | Clear business logic, testable, maintainable |
| **Modal Workflow** | Two-step confirmation | Clear UX, prevents accidents, offers flexibility |
| **Queue Ordering** | Timestamp for promotion, configurable for display | Fair promotion, organizer preference for display |
| **Category Integration** | Service layer coordination with transactions | Data consistency, clear separation of concerns |

---

## Next Steps

**Phase 1 Requirements** (per plan.md):
1. Generate `data-model.md` with complete Prisma schema definitions
2. Generate `contracts/` directory with API endpoint contracts
3. Generate `quickstart.md` with end-to-end usage walkthrough
4. Update agent context (CLAUDE.md) with Vitest testing framework

**Phase 2 Requirements** (via `/speckit.tasks`):
- Not started until Phase 1 complete (per Principle III)

---

**Research Status**: ✅ **COMPLETE**
**Next Phase**: Phase 1 (Data Model & Contracts)
