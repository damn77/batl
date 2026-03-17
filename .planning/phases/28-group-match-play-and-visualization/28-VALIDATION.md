---
phase: 28
slug: group-match-play-and-visualization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x (backend) — no frontend test framework configured |
| **Config file** | `backend/jest.config.js` |
| **Quick run command** | `cd backend && npm test -- --testPathPattern="groupMatch\|combinedLifecycle"` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern="groupMatch|combinedLifecycle"`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | GPLAY-02 | unit | `cd backend && npm test -- --testPathPattern=groupMatch` | ❌ W0 | ⬜ pending |
| 28-01-02 | 01 | 1 | GPLAY-03 | unit | `cd backend && npm test -- --testPathPattern=groupMatch` | ❌ W0 | ⬜ pending |
| 28-01-03 | 01 | 1 | GPLAY-04 | unit | `cd backend && npm test -- --testPathPattern=groupMatch` | ❌ W0 | ⬜ pending |
| 28-01-04 | 01 | 1 | GVIEW-01 | unit | `cd backend && npm test -- --testPathPattern=combinedLifecycle` | ❌ W0 | ⬜ pending |
| 28-02-01 | 02 | 2 | GVIEW-02 | manual | N/A (frontend) | N/A | ⬜ pending |
| 28-02-02 | 02 | 2 | GVIEW-03 | manual | N/A (frontend) | N/A | ⬜ pending |
| 28-02-03 | 02 | 2 | GVIEW-04 | manual | N/A (frontend) | N/A | ⬜ pending |
| 28-02-04 | 02 | 2 | GPLAY-01 | manual | N/A (frontend) | N/A | ⬜ pending |
| 28-02-05 | 02 | 2 | GPLAY-05 | manual | N/A (frontend) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/__tests__/unit/groupMatchResult.test.js` — stubs for GPLAY-02, GPLAY-03, GPLAY-04: group match submission with no cascade, organizer correction, scoring rules
- [ ] `backend/__tests__/unit/combinedLifecycleGuard.test.js` — stubs for GVIEW-01: COMBINED + no bracket = IN_PROGRESS stays, GROUP format completion

*Existing infrastructure covers framework and fixture setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Accordion layout with progress bars | GVIEW-02 | Visual/layout verification | Open tournament page, verify groups in accordion, progress bar fills as matches complete |
| Standings table columns at 375px | GVIEW-03, GVIEW-04 | Responsive visual check | Open Chrome DevTools, set viewport to 375px, verify secondary columns hidden |
| Match row click opens MatchResultModal | GPLAY-01 | UI interaction flow | Click a group match row, verify MatchResultModal opens with correct match data |
| COMBINED placeholder message | GVIEW-02 | Visual/text verification | View COMBINED tournament in group stage, verify "Knockout bracket will appear after group stage" |
| Doubles pair names in standings | GPLAY-05 | Data display format | Open doubles GROUP tournament, verify standings show "Player A / Player B" format |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
