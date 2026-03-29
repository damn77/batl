---
phase: 27
slug: group-formation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 (backend, ES modules via `--experimental-vm-modules`) |
| **Config file** | `backend/package.json` scripts |
| **Quick run command** | `cd backend && npm test -- --testPathPattern="groupPersistence\|circleMethod"` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern="groupPersistence|circleMethod"`
- **After every plan wave:** Run `cd backend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | GFORM-01 | unit | `npm test -- groupPersistence` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | GFORM-02 | unit | `npm test -- groupPersistence` | ❌ W0 | ⬜ pending |
| 27-01-03 | 01 | 1 | GFORM-03 | unit | `npm test -- groupPersistence` | ❌ W0 | ⬜ pending |
| 27-01-04 | 01 | 1 | GFORM-04 | unit | `npm test -- groupPersistence` | ❌ W0 | ⬜ pending |
| 27-01-05 | 01 | 1 | GFORM-05 | unit | `npm test -- groupPersistence` | ❌ W0 | ⬜ pending |
| 27-02-01 | 02 | 2 | GFORM-06 | integration | `npm test -- groupDrawRoutes` | ❌ W0 | ⬜ pending |
| 27-02-02 | 02 | 2 | GFORM-07 | integration | `npm test -- groupDrawRoutes` | ❌ W0 | ⬜ pending |
| 27-01-06 | 01 | 1 | Round-robin | unit | `npm test -- circleMethod` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/__tests__/unit/groupPersistenceService.test.js` — stubs for GFORM-01 through GFORM-05, round-robin generation
- [ ] `backend/__tests__/integration/groupDrawRoutes.test.js` — stubs for GFORM-06, GFORM-07, full API flow

*Existing infrastructure covers framework installation (Jest already configured).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Group draw UI renders correctly | GFORM-01 | No frontend test framework | Open tournament page → verify "Generate Group Draw" section visible |
| Swap UI shows seed positions | GFORM-06 | No frontend test framework | Generate draw → swap players → verify seed numbers display |
| GroupStandingsTable displays after draw | GFORM-01 | No frontend test framework | Generate draw → verify group tables render with players |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
