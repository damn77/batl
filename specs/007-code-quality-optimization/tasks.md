# Tasks: Code Quality & Optimization

**Feature**: `007-code-quality-optimization`
**Status**: Planning

## Phase 1: Setup Tools & CI/CD
- [ ] T001 Create `TESTING.md` documentation in `TESTING.md`
- [ ] T002 Configure root `package.json` for monorepo scripts in `package.json`
- [ ] T003 Configure backend `package.json` with test scripts and dependencies in `backend/package.json`
- [ ] T004 Create backend Jest configuration in `backend/jest.config.js`
- [ ] T005 Create GitHub Actions CI workflow in `.github/workflows/ci.yml`
- [ ] T006 [P] Configure ESLint/Prettier for backend in `backend/.eslintrc.json` (if needed)

## Phase 2: Backend Refactoring
### Shared Logic
- [ ] T007 Create `SharedTournamentService` in `backend/src/services/sharedTournamentService.js`
- [ ] T008 Create `SharedRankingService` in `backend/src/services/sharedRankingService.js`

### Tournament Registration Refactoring
- [ ] T009 Refactor `checkCapacity` in `backend/src/services/tournamentRegistrationService.js` to use shared service
- [ ] T010 Refactor waitlist promotion logic in `backend/src/services/tournamentRegistrationService.js` to use shared service
- [ ] T011 Verify `tournamentRegistrationService` functionality with tests

### Ranking Service Refactoring
- [ ] T012 Refactor `rankingService.js` to use `SharedRankingService` in `backend/src/services/rankingService.js`
- [ ] T013 Refactor `pairRankingService.js` to use `SharedRankingService` in `backend/src/services/pairRankingService.js`
- [ ] T014 Implement `updateCategoryRankings` in `backend/src/services/rankingService.js`

## Phase 3: Frontend Refactoring
- [ ] T015 Extract `RegistrationForm` component in `frontend/src/components/RegistrationForm.jsx`
- [ ] T016 Create `useRegistration` hook in `frontend/src/hooks/useRegistration.js`
- [ ] T017 Refactor `OrganizerRegistrationPanel` to use new component and hook in `frontend/src/components/OrganizerRegistrationPanel.jsx`

## Phase 4: Verification & Polish
- [ ] T018 Run full test suite and verify coverage
- [ ] T019 Verify CI/CD pipeline execution
- [ ] T020 Perform manual regression testing of registration flows
