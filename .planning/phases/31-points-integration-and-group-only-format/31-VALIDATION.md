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
| **Quick run command** | `cd backend && npx jest --testPathPattern="point|group|advancement" --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --testPathPattern="point|group|advancement" --no-coverage`
- **After every plan wave:** Run `cd backend && npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | PTS-01, PTS-03 | unit | `npx jest --testPathPattern="groupPoints"` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | PTS-02 | unit | `npx jest --testPathPattern="groupPoints"` | ❌ W0 | ⬜ pending |
| 31-02-01 | 02 | 1 | PTS-01, PTS-03 | integration | `npx jest --testPathPattern="pointCalculation"` | ❌ W0 | ⬜ pending |
| 31-03-01 | 03 | 2 | GVIEW-05 | manual | Browser check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/__tests__/unit/groupPointCalculation.test.js` — stubs for PTS-01, PTS-02, PTS-03, PTS-04
- [ ] `backend/__tests__/integration/groupPointRoutes.test.js` — stubs for calculate-points GROUP/COMBINED flow

*Existing test infrastructure covers framework setup — no new installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Advancement badges on standings | GVIEW-05 | Visual UI element | Navigate to COMBINED tournament → complete group → verify Main/Secondary badges appear next to advancing players |
| GROUP-only tournament page layout | PTS-03 | Visual layout | Create GROUP tournament → verify no bracket section rendered |
| Calculate Points button visibility | PTS-01 | UI interaction | Complete GROUP tournament → navigate to point config → verify Calculate Points button is enabled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
