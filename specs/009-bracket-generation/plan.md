# Implementation Plan: Knockout Bracket Generation

**Branch**: `009-bracket-generation` | **Date**: 2026-01-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-bracket-generation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Backend API functionality to provide knockout tournament bracket structures and seeding configuration for single-elimination tournaments with 4-128 players. The system will load bracket templates from a predefined JSON file and expose RESTful endpoints for organizers to retrieve bracket structure patterns (indicating preliminary matches vs. byes) and determine the number of seeded players required based on tournament size.

## Technical Context

**Language/Version**: Node.js 20+ (ES Modules)
**Primary Dependencies**: Express 5.1.0, fs/promises (file operations), Joi (validation)
**Storage**: JSON file (bracket-templates-all.json) - read-only, no database persistence needed
**Testing**: Vitest (Jest-compatible API, native ES modules support)
**Target Platform**: Node.js server (backend API only)
**Project Type**: Web application (backend only - no frontend work in this feature)
**Performance Goals**: Sub-second response time for bracket structure retrieval (<100ms expected)
**Constraints**: Immutable bracket templates, 4-128 player range only, single-elimination format only
**Scale/Scope**: 125 bracket templates (4-128 players), 2 API endpoints, minimal backend logic

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Specification-Driven Development ✅ PASS
- Complete specification exists at [spec.md](spec.md)
- User stories with clear priorities (P1, P2, P3)
- 13 functional requirements with unique identifiers (FR-001 to FR-013)
- 6 measurable, technology-agnostic success criteria
- Edge cases documented (boundary conditions, error scenarios)

### II. Incremental Delivery ✅ PASS
- 3 independently testable user stories:
  - **P1**: Retrieve Bracket Structure - Core API functionality delivering immediate value
  - **P2**: Determine Seeding Requirements - Independent seeding configuration endpoint
  - **P3**: Understand Bracket Structure Format - Documentation and interpretation guidance
- Each story can be implemented, tested, and deployed independently
- Clear priority ordering with P1 as MVP

### III. Design Before Implementation ✅ PASS (in progress)
- Planning phase will produce:
  - research.md: File I/O patterns, validation approach, error handling strategy
  - data-model.md: Bracket structure entity, seeding configuration rules
  - contracts/: OpenAPI specification for 2 API endpoints
  - quickstart.md: API usage examples with curl/HTTP client
- Tasks will NOT be generated until design artifacts are complete and reviewed

### IV. Test Accountability ⚠️ CONDITIONAL
- Feature specification explicitly requires automated tests (FR-012: "System MUST provide automated tests that verify bracket templates against source documentation")
- Tests MUST be written first before implementation
- Tests MUST verify bracket templates match source data
- Red-Green-Refactor cycle will be enforced for template validation tests

### V. Constitution Compliance ✅ PASS
- No violations identified
- Standard REST API pattern (no architectural complexity)
- Straightforward file reading and validation logic
- No complexity justification needed

## Project Structure

### Documentation (this feature)

```text
specs/009-bracket-generation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api-endpoints.md # OpenAPI/REST endpoint definitions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── BracketStructure.js         # Bracket template entity (if needed for validation)
│   ├── services/
│   │   ├── bracketService.js           # Core bracket loading and retrieval logic
│   │   └── seedingService.js           # Seeding configuration calculation
│   └── api/
│       ├── routes/
│       │   └── bracketRoutes.js        # Express routes for bracket endpoints
│       └── validators/
│           └── bracketValidator.js     # Joi validation schemas for requests
└── tests/
    ├── unit/
    │   ├── bracketService.test.js      # Unit tests for bracket service
    │   └── seedingService.test.js      # Unit tests for seeding service
    └── integration/
        └── bracketRoutes.test.js       # API integration tests

docs/
└── bracket-templates-all.json          # Source data (existing file, read-only)
```

**Structure Decision**: Web application (backend only). This feature adds new backend services and API routes to the existing Express application. No frontend work is included. The bracket templates JSON file already exists in the docs/ directory and will be read by the backend services. No database models needed as bracket data is read-only from JSON.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - complexity tracking not needed.

---

## Phase 0: Research (COMPLETED)

**Status**: ✅ Complete
**Artifact**: [research.md](research.md)

### Research Topics Resolved

1. ✅ **JSON File Loading Strategy**: fs/promises with in-memory caching
2. ✅ **Joi Validation Patterns**: Request validation with custom error messages
3. ✅ **Express Route Organization**: Dedicated router module with controller pattern
4. ✅ **Error Handling Strategy**: Consistent JSON format following existing API patterns
5. ✅ **Vitest Testing Strategy**: Test-first development with unit and integration tests

### Key Decisions

- **File Loading**: Async file reading with startup caching (prevents blocking)
- **Validation**: Joi schemas for player count validation (4-128 range)
- **Routing**: `/api/v1/brackets/structure/:playerCount` and `/api/v1/brackets/seeding/:playerCount`
- **Error Format**: Consistent with existing BATL API (`{ success, data/error }`)
- **Testing**: Test-first approach per Constitution requirement (FR-012)

---

## Phase 1: Design & Contracts (COMPLETED)

**Status**: ✅ Complete
**Artifacts**:
- [data-model.md](data-model.md) - Entity definitions and validation rules
- [contracts/api-endpoints.md](contracts/api-endpoints.md) - API specifications with OpenAPI schema
- [quickstart.md](quickstart.md) - End-to-end usage guide

### Data Model Summary

**Entities**:
1. **BracketTemplate**: Bracket structure for specific player count
   - Attributes: playerCount, structure, preliminaryMatches, byes, bracketSize
   - Source: docs/bracket-templates-all.json (125 templates)

2. **SeedingConfiguration**: Seeding requirements based on tournament size
   - Attributes: playerCount, seededPlayers, range
   - Rules: 2/4/8/16 seeds based on player count ranges

### API Endpoints Summary

1. **GET /api/v1/brackets/structure/:playerCount**
   - Returns bracket structure pattern and derived fields
   - Validation: playerCount 4-128, integer
   - Response: structure, preliminaryMatches, byes, bracketSize

2. **GET /api/v1/brackets/seeding/:playerCount**
   - Returns seeding configuration
   - Validation: playerCount 4-128, integer
   - Response: seededPlayers, range

### Agent Context Update

✅ CLAUDE.md updated with:
- Language: Node.js 20+ (ES Modules)
- Framework: Express 5.1.0, fs/promises, Joi
- Database: JSON file (read-only)

---

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design completion*

### I. Specification-Driven Development ✅ PASS
- Design artifacts align with specification requirements
- All 13 functional requirements addressable with design
- Success criteria measurable with implemented design

### II. Incremental Delivery ✅ PASS
- Design supports independent implementation of P1, P2, P3 user stories
- P1 (bracket structure) delivers core value independently
- P2 (seeding config) is separate endpoint, independently testable
- P3 (documentation) embedded in API responses

### III. Design Before Implementation ✅ PASS
- All required design artifacts completed:
  - ✅ research.md (technical decisions documented)
  - ✅ data-model.md (entities and validation defined)
  - ✅ contracts/api-endpoints.md (API specification complete)
  - ✅ quickstart.md (usage walkthrough with examples)
- Ready for task generation

### IV. Test Accountability ✅ PASS
- Test-first approach defined in research.md
- Template validation tests specified (FR-012)
- Unit tests for services, integration tests for API endpoints
- Red-Green-Refactor cycle planned

### V. Constitution Compliance ✅ PASS
- No violations introduced during design phase
- Simple service and controller pattern
- No architectural complexity added
- Aligns with existing backend structure

---

## Implementation Readiness

### Ready to Proceed

✅ **Phase 0 Complete**: All technical research resolved
✅ **Phase 1 Complete**: All design artifacts created and reviewed
✅ **Constitution Check**: Passed (pre and post-design)
✅ **Agent Context**: Updated with feature technologies

### Next Steps

1. **`/speckit.tasks`** - Generate actionable task list organized by user story
2. **`/speckit.implement`** - Execute tasks in dependency order

### Estimated Implementation Effort

Based on design artifacts:

**P1 - Bracket Structure Retrieval** (MVP):
- bracketService.js (file loading, caching, retrieval logic)
- bracketController.js (API handler)
- bracketValidator.js (Joi schemas)
- bracketRoutes.js (Express routes)
- Unit tests (service) + integration tests (API)
- **Estimated**: 4-6 hours

**P2 - Seeding Configuration**:
- seedingService.js (range calculation logic)
- Add endpoint to controller/routes
- Unit tests
- **Estimated**: 2-3 hours

**P3 - Documentation**:
- API response includes interpretation field
- quickstart.md already complete
- **Estimated**: 1 hour

**Template Validation Tests** (FR-012):
- Test all 125 templates present
- Test structure format validity
- **Estimated**: 1-2 hours

**Total Estimated Implementation**: 8-12 hours

### File Manifest

Files to be created during implementation:

```
backend/src/
├── services/
│   ├── bracketService.js           [P1] Core bracket logic
│   └── seedingService.js           [P2] Seeding calculation
├── api/
│   ├── controllers/
│   │   └── bracketController.js    [P1] API handlers
│   ├── routes/
│   │   └── bracketRoutes.js        [P1] Route definitions
│   └── validators/
│       └── bracketValidator.js     [P1] Joi schemas

backend/tests/
├── unit/
│   ├── bracketService.test.js      [P1] Service unit tests
│   ├── seedingService.test.js      [P2] Service unit tests
│   └── bracketTemplates.test.js    [FR-012] Template validation
└── integration/
    └── bracketRoutes.test.js       [P1+P2] API integration tests
```

### Dependencies Check

No new npm packages required:
- ✅ express@5.1.0 (already in project)
- ✅ joi (already in project)
- ✅ vitest (already in project)
- ✅ fs/promises (Node.js built-in)
- ✅ path (Node.js built-in)

### Risk Assessment

**Low Risk**:
- Read-only data (no database mutations)
- Small scope (2 endpoints, minimal logic)
- Static templates (no runtime changes)
- No external dependencies

**Potential Issues**:
- Template file corruption → Mitigated by validation tests (FR-12)
- Invalid player count inputs → Mitigated by Joi validation
- Performance concerns → Mitigated by in-memory caching

---

## Plan Complete

**Planning Status**: ✅ COMPLETE
**Branch**: 009-bracket-generation
**Spec**: [spec.md](spec.md)
**Next Command**: `/speckit.tasks`

All design artifacts are complete and ready for task generation. The feature is well-scoped, follows constitution principles, and has clear implementation guidance.
