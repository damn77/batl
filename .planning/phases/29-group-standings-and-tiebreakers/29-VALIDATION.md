---
phase: 29
slug: group-standings-and-tiebreakers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / jest 30.2.0 (backend) |
| **Config file** | `backend/jest.config.cjs` / `frontend/vitest.config.js` |
| **Quick run command** | `cd backend && npx jest --testPathPattern="groupStandings" --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage && cd ../frontend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --testPathPattern="groupStandings" --no-coverage`
- **After every plan wave:** Run `cd backend && npx jest --no-coverage && cd ../frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | GSTAND-01 | unit | `npx jest --testPathPattern="groupStandingsService" --no-coverage` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | GSTAND-02 | unit | `npx jest --testPathPattern="groupStandingsService" --no-coverage` | ❌ W0 | ⬜ pending |
| 29-01-03 | 01 | 1 | GSTAND-03 | unit | `npx jest --testPathPattern="groupStandingsService" --no-coverage` | ❌ W0 | ⬜ pending |
| 29-01-04 | 01 | 1 | GSTAND-04 | unit | `npx jest --testPathPattern="groupStandingsService" --no-coverage` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 1 | GSTAND-01 | integration | `npx jest --testPathPattern="groupStandingsRoutes" --no-coverage` | ❌ W0 | ⬜ pending |
| 29-03-01 | 03 | 2 | GSTAND-05 | component | `npx vitest run --reporter=verbose GroupStandingsTable` | ❌ W0 | ⬜ pending |
| 29-03-02 | 03 | 2 | GSTAND-06 | component | `npx vitest run --reporter=verbose GroupStandingsTable` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/__tests__/unit/groupStandingsService.test.js` — stubs for GSTAND-01 through GSTAND-04 (tiebreaker chain, cycle detection, manual override)
- [ ] `backend/__tests__/integration/groupStandingsRoutes.test.js` — stubs for API endpoint tests
- [ ] `frontend/src/components/__tests__/GroupStandingsTable.test.jsx` — stubs for GSTAND-05, GSTAND-06 (tooltip, doubles display)

*Existing test infrastructure (jest, vitest) covers all framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tooltip on hover/tap shows tiebreaker criterion | GSTAND-05 | Visual interaction | Hover over rank in standings table, verify tooltip shows "Resolved by: Head-to-head" or equivalent |
| Manual resolution dropdown UX | GSTAND-04 | Interactive flow | As organizer, click "Resolve tie" button, use dropdown to assign positions, verify persistence |
| "2-3" tied range display | GSTAND-05 | Visual rendering | Create tied standings, verify positions show as "2-3" range |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
