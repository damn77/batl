---
phase: 15
slug: tournament-deletion-and-revert
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend) / Jest 30.2.0 (backend) |
| **Config file** | backend: package.json `jest` field; frontend: vitest.config.js |
| **Quick run command** | `cd backend && npm test -- --testPathPattern=tournamentService` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern=tournamentService --passWithNoTests`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | DEL-01 | integration | `npm test -- --testPathPattern=tournamentRoutes` | ✅ (expand) | ⬜ pending |
| 15-01-02 | 01 | 1 | DEL-02 | unit | `npm test -- --testPathPattern=tournamentService` | ✅ (expand) | ⬜ pending |
| 15-01-03 | 01 | 1 | DEL-05 | unit | `npm test -- --testPathPattern=tournamentService` | ✅ (expand) | ⬜ pending |
| 15-01-04 | 01 | 1 | REVERT-01 | integration | `npm test -- --testPathPattern=tournamentRoutes` | ❌ W0 | ⬜ pending |
| 15-01-05 | 01 | 1 | REVERT-02 | unit | `npm test -- --testPathPattern=tournamentService` | ❌ W0 | ⬜ pending |
| 15-01-06 | 01 | 1 | REVERT-03 | unit | `npm test -- --testPathPattern=tournamentService` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 2 | DEL-03 | manual | Manual UI test | ❌ (UI only) | ⬜ pending |
| 15-02-02 | 02 | 2 | DEL-04 | manual | Manual UI test | ❌ (UI only) | ⬜ pending |
| 15-02-03 | 02 | 2 | REVERT-01 | manual | Manual UI test | ❌ (UI only) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Expand `backend/__tests__/integration/tournamentRoutes.test.js` — stubs for DEL-01 (any-status delete), DEL-02 (cascade verification), DEL-05 (ranking recalc)
- [ ] Add revert endpoint integration tests — stubs for REVERT-01, REVERT-02, REVERT-03, and guard (COMPLETED → 409)
- [ ] Add unit tests for `revertTournament()` service function

*Existing test infrastructure covers framework setup — no new packages needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confirmation dialog shows tournament details | DEL-03 | UI-only, modal rendering | Open tournament list → click three-dot menu → click Delete → verify name, status badge, player count shown |
| Warning banner for active tournaments | DEL-04 | UI-only, conditional rendering | Same as above with IN_PROGRESS or COMPLETED tournament → verify red Alert banner visible |
| Revert button visibility and flow | REVERT-01 | UI-only, contextual button | Navigate to tournament with draw → verify Revert option visible in dropdown and detail page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
