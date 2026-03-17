---
phase: 30
slug: combined-format-advancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend), Jest 30.x (backend) |
| **Config file** | `frontend/vitest.config.js`, `backend/jest.config.js` |
| **Quick run command** | `cd backend && npx jest --testPathPattern="advancement" --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage && cd ../frontend && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --testPathPattern="advancement" --no-coverage`
- **After every plan wave:** Run `cd backend && npx jest --no-coverage && cd ../frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | ADV-01 | unit | `npx jest advancementService` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 1 | ADV-02 | unit | `npx jest advancementService` | ❌ W0 | ⬜ pending |
| 30-01-03 | 01 | 1 | ADV-03 | unit | `npx jest advancementService` | ❌ W0 | ⬜ pending |
| 30-01-04 | 01 | 1 | ADV-04 | unit | `npx jest advancementService` | ❌ W0 | ⬜ pending |
| 30-02-01 | 02 | 1 | COMB-01 | integration | `npx jest advancementRoutes` | ❌ W0 | ⬜ pending |
| 30-02-02 | 02 | 1 | COMB-02 | integration | `npx jest advancementRoutes` | ❌ W0 | ⬜ pending |
| 30-03-01 | 03 | 2 | COMB-03 | integration | `npx vitest run AdvancementConfig` | ❌ W0 | ⬜ pending |
| 30-03-02 | 03 | 2 | COMB-04, COMB-05 | integration | `npx vitest run AdvancementPreview` | ❌ W0 | ⬜ pending |
| 30-04-01 | 04 | 2 | COMB-06, COMB-07 | integration | `npx vitest run PostAdvancement` | ❌ W0 | ⬜ pending |
| 30-04-02 | 04 | 2 | COMB-08, COMB-09 | integration | `npx vitest run RevertAdvancement` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/__tests__/unit/advancementService.test.js` — stubs for ADV-01 through ADV-04
- [ ] `backend/__tests__/integration/advancementRoutes.test.js` — stubs for COMB-01, COMB-02
- [ ] Frontend test stubs for COMB-03 through COMB-09

*Existing Vitest and Jest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Advancement preview modal UX | COMB-04 | Visual layout and interaction flow | Open combined tournament → configure advancement → click "Generate Knockout Bracket" → verify preview modal shows waterfall table |
| Post-advancement group collapse | COMB-06 | Visual state change | After advancing → verify groups collapse to accordion → verify "Read-only" badge visible |
| Revert confirmation flow | COMB-09 | Multi-step modal interaction | Click "Revert Advancement" → verify warning modal → confirm → verify brackets deleted and groups unlocked |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
