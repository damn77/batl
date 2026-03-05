---
phase: 19
slug: integration-bug-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 (backend) / Manual (frontend) |
| **Config file** | `backend/package.json` scripts |
| **Quick run command** | `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/integration/tournamentRoutes.test.js -t "formatType"` |
| **Full suite command** | `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (format filter test)
- **After every plan wave:** Run full backend Jest suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 0 | COPY-05 | integration | `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/integration/tournamentRoutes.test.js -t "formatType"` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | COPY-05 | code fix | Manual: select format filter, verify list updates | N/A | ⬜ pending |
| 19-01-03 | 01 | 1 | COPY-05 | code fix | Manual: verify Joi schema accepts formatType | N/A | ⬜ pending |
| 19-01-04 | 01 | 1 | DRAW-06 | code fix | Manual: verify button disabled with < 4 players | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/__tests__/integration/tournamentRoutes.test.js` — add test for `GET /api/v1/tournaments?formatType=KNOCKOUT` verifying schema accepts formatType and service filters correctly

*Frontend component tests for BracketGenerationSection are manual-only — no frontend test infrastructure exists in this project.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Generate button disabled when < 4 players | DRAW-06 | No frontend test infra | 1. Open tournament with 2-3 registered players 2. Verify Generate Draw button is disabled 3. Verify warning message says "At least 4 players" |
| Format filter filters tournament list | COPY-05 | E2E browser interaction | 1. Open TournamentSetupPage 2. Select format from dropdown 3. Verify tournament list filters correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
