# Implementation Plan: Tournament Seeding Placement

**Branch**: `010-seeding-placement` | **Date**: 2026-01-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-seeding-placement/spec.md`

## Summary

Implement recursive tournament seeding placement algorithm that positions ranked players/pairs in knockout bracket positions with fair randomization for lower seeds. System supports 2, 4, 8, and 16 seeded players based on tournament size, using category rankings from feature 008 and bracket structures from feature 009. Backend-only implementation with comprehensive test coverage.

## Technical Context

**Language/Version**: Node.js 20+ (ES Modules)
**Primary Dependencies**: Express 5.1.0, Joi 18.0.1 (validation), Jest 30.2.0 (testing)
**Storage**: PostgreSQL via Prisma ORM (queries feature 008 ranking data)
**Testing**: Jest with ES Modules support, deterministic randomization for reproducibility
**Target Platform**: Linux/Windows server (Node.js runtime)
**Project Type**: Web (backend-only, extends existing backend API)
**Performance Goals**: <2 seconds for bracket generation with 128 players and 16 seeds
**Constraints**: Must use deterministic PRNG for testing reproducibility, recursive algorithm required for seeding logic
**Scale/Scope**: 4-128 player tournaments, 2-16 seeded positions, integration with features 008 and 009

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Specification-Driven Development**: ✅ PASS
- Complete specification exists at [spec.md](spec.md) with 4 user stories (P1-P4)
- 20 functional requirements with unique identifiers (FR-001 to FR-020)
- 7 measurable success criteria (SC-001 to SC-007)
- Edge cases identified (7 scenarios)
- All quality checklist items passed

**II. Incremental Delivery**: ✅ PASS
- 4 independently testable user stories with clear priorities:
  - **P1 (MVP)**: 2 seeded players - foundational logic
  - **P2**: 4 seeded players with randomization
  - **P3**: 8 seeded players with quarter segments
  - **P4**: 16 seeded players with eight segments
- Each story builds recursively on previous (2→4→8→16)
- Each story independently testable and deliverable
- Strict priority order enforced by recursive dependencies

**III. Design Before Implementation**: ✅ PASS
- Plan workflow will generate: research.md, data-model.md, contracts/, quickstart.md
- Tasks.md will NOT be generated until design artifacts are complete and approved
- This plan includes Technical Context and Constitution Check before Phase 0 begins

**IV. Test Accountability**: ✅ PASS (Tests explicitly required)
- FR-015: "System MUST include comprehensive automated tests for all seeding variants"
- FR-016: "System MUST test all randomization variants"
- FR-017: "System MUST use deterministic randomization (seeded PRNG) for testing reproducibility"
- Test-first development required per constitution for this feature

**V. Constitution Compliance**: ✅ PASS
- No violations identified
- Complexity Tracking section not needed (no deviations)

## Project Structure

### Documentation (this feature)

```text
specs/010-seeding-placement/
├── spec.md              # Feature specification (completed)
├── checklists/
│   └── requirements.md  # Quality validation checklist (completed)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   └── api-endpoints.md # API contract specification
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/              # (no new models - uses existing from 008/009)
│   ├── services/
│   │   └── seedingPlacementService.js  # Core seeding logic
│   ├── api/
│   │   ├── validators/
│   │   │   └── seedingValidator.js     # Joi validation schemas
│   │   ├── seedingController.js        # Request handlers
│   │   └── routes/
│   │       └── seedingRoutes.js        # Express routes
│   └── index.js             # Register seeding routes
└── __tests__/
    ├── unit/
    │   ├── seedingPlacement2Seed.test.js   # 2-seed placement tests
    │   ├── seedingPlacement4Seed.test.js   # 4-seed placement tests
    │   ├── seedingPlacement8Seed.test.js   # 8-seed placement tests
    │   ├── seedingPlacement16Seed.test.js  # 16-seed placement tests
    │   └── seedingRandomization.test.js    # Randomization fairness tests
    └── integration/
        └── seedingRoutes.test.js           # API integration tests
```

**Structure Decision**: Web application structure (Option 2). Backend-only implementation extending existing backend API. No frontend changes per feature spec out-of-scope section. Reuses existing Prisma models (Player, PlayerPair, CategoryRanking, TournamentResult from feature 008). Integrates with bracket structure service from feature 009.

## Complexity Tracking

> **No constitution violations** - This section intentionally left empty.

All constitution principles satisfied:
- Complete specification-driven approach
- Four independently deliverable user stories
- Test-first development explicitly required
- Design artifacts will be generated before task creation
- No architectural deviations requiring justification

---

## Phase 0: Research (COMPLETED)

**Status**: ✅ Complete
**Output**: [research.md](research.md)

**Key Decisions**:
1. **Recursive Seeding Algorithm**: Implemented as placeTwoSeeds → placeFourSeeds → placeEightSeeds → placeSixteenSeeds
2. **Deterministic Randomization**: Using `seedrandom` npm package for reproducible tests
3. **Integration Pattern**: Service-to-service calls (rankingService, bracketService)
4. **Fairness Validation**: Chi-square goodness-of-fit test with 1000+ iterations
5. **Position Calculation**: Direct mapping to bracket structure string indices from feature 009

**Feasibility**: ✅ All technical challenges resolved, clear implementation path

---

## Phase 1: Design & Contracts (COMPLETED)

**Status**: ✅ Complete
**Outputs**:
- [data-model.md](data-model.md) - Entity definitions (reuses existing models from 008/009)
- [contracts/api-endpoints.md](contracts/api-endpoints.md) - API specification for POST /api/v1/seeding/generate-bracket
- [quickstart.md](quickstart.md) - End-to-end usage guide with examples

**Key Design Points**:
- **No new database entities** - operates on existing data from features 008/009
- **Stateless API** - computes and returns seeded bracket without persistence
- **Single endpoint** - POST /api/v1/seeding/generate-bracket
- **Runtime data structures** - SeededBracket, Position, SeedingConfiguration (in-memory only)
- **Integration verified** - Clear service boundaries with features 008 (rankings) and 009 (bracket structure)

**Agent Context Updated**: ✅ CLAUDE.md updated with seedrandom dependency

---

## Constitution Check (Post-Design Re-Evaluation)

**I. Specification-Driven Development**: ✅ PASS
- Complete specification maintained throughout design
- All design artifacts reference back to functional requirements
- No scope creep introduced during design phase

**II. Incremental Delivery**: ✅ PASS
- 4 user stories remain independently deliverable
- Each can be implemented and tested in isolation
- P1 (2-seed) provides immediate MVP value
- P2-P4 build recursively on previous stories

**III. Design Before Implementation**: ✅ PASS
- All required design artifacts completed:
  - ✅ research.md: Technical decisions documented
  - ✅ data-model.md: Entities and relationships defined
  - ✅ contracts/: API contract specification complete
  - ✅ quickstart.md: End-to-end usage documented
- Ready for task generation (/speckit.tasks command)

**IV. Test Accountability**: ✅ PASS
- Test requirements maintained in design
- Test strategy defined in research.md (deterministic randomization, fairness validation)
- API contract includes test scenarios
- Quickstart includes testing examples

**V. Constitution Compliance**: ✅ PASS
- All principles satisfied
- No violations introduced during design
- Complexity tracking remains empty (no deviations needed)

**GATE STATUS**: ✅ **APPROVED FOR TASK GENERATION**

All design artifacts complete and compliant. Ready to proceed with `/speckit.tasks` command to generate actionable task list.

---

## Next Steps

1. **Review design artifacts** (research.md, data-model.md, contracts/, quickstart.md)
2. **Approve design** (confirm all artifacts meet requirements)
3. **Generate tasks** using `/speckit.tasks` command
4. **Implement** using `/speckit.implement` command (executes tasks in dependency order)

**Note**: Tasks.md will NOT be generated until design is explicitly approved per Constitution Principle III.
