---
phase: 31
slug: points-integration-and-group-only-format
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), jest 30.2.0 (backend) |
| **Config file** | `backend/jest.config.cjs`, `frontend/vite.config.js` |
| **Quick run command** | `cd backend && npx jest --testPathPattern="groupPointCalculation|groupCalculatePoints" --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --testPathPattern="groupPointCalculation|groupCalculatePoints" --no-coverage`
- **After every plan wave:** Run `cd backend && npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | PTS-01, PTS-03, PTS-04 | unit | `npx jest --testPathPattern=groupPointCalculation` | N W0 | pending |
| 31-01-02 | 01 | 1 | PTS-02, PTS-03, D-08 | integration | `npx jest --testPathPattern=groupCalculatePoints` | N W0 | pending |
| 31-02-01 | 02 | 1 | GVIEW-05 | manual + build | `cd frontend && npx vite build` | N/A | pending |
| 31-02-02 | 02 | 1 | PTS-03 (frontend trigger) | manual + build | `cd frontend && npx vite build` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `backend/__tests__/unit/groupPointCalculation.test.js` — stubs for PTS-01, PTS-02, PTS-03, PTS-04 (deriveGroupResults, computeTierOffsets, deriveKnockoutResults, awardGroupPoints)
- [ ] `backend/__tests__/integration/groupCalculatePoints.test.js` — stubs for calculate-points GROUP/COMBINED flow + GROUP auto-completion lifecycle

*Existing test infrastructure covers framework setup — no new installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Advancement badges on standings | GVIEW-05 | Visual UI element; useMemo logic is a simple position threshold — accepted as manual-only (see Plan 31-02 verification note) | Navigate to COMBINED tournament with complete group -> verify Main/Secondary badges appear next to advancing players |
| GROUP-only tournament page layout | PTS-03 | Visual layout | Create GROUP tournament -> verify no bracket section rendered |
| Calculate Points button visibility | PTS-01 | UI interaction | Complete GROUP tournament -> navigate to point config -> verify Calculate Points button is enabled |
| Calculate Points blocked state | D-11 | UI interaction | Tournament with unresolved ties -> button disabled, danger alert shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
