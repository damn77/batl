# Implementation Plan: Technical Initiative - Code Quality & Optimization

**Branch**: `007-code-quality-optimization` | **Date**: 2025-11-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-code-quality-optimization/spec.md`

## Summary

This initiative aims to improve code quality, reduce duplication, and introduce automated testing to the BATL project. Key goals include setting up CI/CD, refactoring duplicated registration/ranking logic, and improving frontend component structure.

## Technical Context

**Language/Version**: Node.js (Backend), React (Frontend)
**Primary Dependencies**: Express, Prisma, React-Bootstrap
**Storage**: PostgreSQL
**Testing**: Jest, Supertest
**Target Platform**: Render (Production)
**Project Type**: Web Application (Monorepo-style)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Breaking Changes**: Refactoring should maintain existing API contracts.
- [x] **Test Coverage**: New code must be tested.
- [x] **Documentation**: Changes must be documented.

## Project Structure

### Documentation (this feature)

```text
specs/007-code-quality-optimization/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/          # Quality checklists
└── tasks.md             # Implementation tasks
```

## Proposed Changes

### Phase 1: Tools & CI/CD Setup

#### [NEW] [TESTING.md](file:///D:/Workspace/BATL/TESTING.md)
- Create documentation for running tests locally.
- Define test structure and commands.

#### [NEW] [.github/workflows/ci.yml](file:///D:/Workspace/BATL/.github/workflows/ci.yml)
- Create GitHub Actions workflow for Pull Requests.
- Steps: Checkout, Setup Node, Install Deps, Lint, Test, Build.

#### [MODIFY] [package.json](file:///D:/Workspace/BATL/package.json)
- Add scripts for `lint`, `test:ci`, `test:coverage`.
- Add devDependencies: `eslint`, `prettier`, `jest` (if not present), `supertest`.

### Phase 2: Backend Refactoring

#### [NEW] [sharedTournamentService.js](file:///D:/Workspace/BATL/backend/src/services/sharedTournamentService.js)
- Abstract common logic for tournament operations.

#### [MODIFY] [tournamentRegistrationService.js](file:///D:/Workspace/BATL/backend/src/services/tournamentRegistrationService.js)
- Refactor to use `registrationService` validation logic instead of duplicating it.
- Remove redundant duplicate checks where covered by `registrationService`.

#### [MODIFY] [rankingService.js](file:///D:/Workspace/BATL/backend/src/services/rankingService.js)
- Implement `updateCategoryRankings` (currently placeholder).
- Abstract leaderboard calculation logic to be reusable.

#### [MODIFY] [pairRankingService.js](file:///D:/Workspace/BATL/backend/src/services/pairRankingService.js)
- Refactor to use shared logic from `rankingService` (or a new `sharedRankingService`).

### Phase 3: Frontend Refactoring

#### [MODIFY] [OrganizerRegistrationPanel.jsx](file:///D:/Workspace/BATL/frontend/src/components/OrganizerRegistrationPanel.jsx)
- Extract `RegistrationForm` component to handle Single/Double logic internally.
- Create `useRegistration` hook to unify API calls.
- Reduce cyclomatic complexity by removing nested `if(isDoubles)` blocks.

## Verification Plan

### Automated Tests
- **Linting**: Run `npm run lint` to verify code style and potential errors.
- **Unit Tests**: Run `npm test` to execute backend unit tests.
- **CI Pipeline**: Open a Draft PR to verify the GitHub Actions workflow triggers and passes.

### Manual Verification
1. **Registration Flow**:
   - Register a Single Player for a tournament.
   - Register a Pair for a tournament.
   - Verify validation errors appear correctly for both.
   - Verify successful registration updates the list.
2. **Waitlist Logic**:
   - Fill a tournament capacity.
   - Attempt to register another player/pair.
   - Verify the "Add to Waitlist" modal appears and functions correctly.
3. **Rankings**:
   - View Singles Leaderboard.
   - View Doubles Leaderboard.
   - Verify stats (wins/losses/points) are displayed correctly.
