---
phase: 22
slug: tournament-view-layout
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-07
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No frontend test framework (manual verification) |
| **Config file** | None |
| **Quick run command** | Manual: load tournament page in browser |
| **Full suite command** | Manual: verify all 5 success criteria across SCHEDULED/IN_PROGRESS/COMPLETED |
| **Estimated runtime** | ~120 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Manual smoke test — load tournament page for relevant status
- **After every plan wave:** Manual verification against all 5 success criteria
- **Before `/gsd:verify-work`:** All 5 LAYOUT requirements verified manually
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | LAYOUT-04 | manual | N/A — no frontend test runner | ❌ | ⬜ pending |
| TBD | 01 | 1 | LAYOUT-01 | manual | N/A | ❌ | ⬜ pending |
| TBD | 01 | 1 | LAYOUT-02 | manual | N/A | ❌ | ⬜ pending |
| TBD | 01 | 1 | LAYOUT-03 | manual | N/A | ❌ | ⬜ pending |
| TBD | 01 | 1 | LAYOUT-05 | manual | N/A | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no frontend test framework needed. All LAYOUT requirements are UI layout behaviors verified manually.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bracket visible above accordion for IN_PROGRESS | LAYOUT-01 | UI layout positioning — no test runner | Open IN_PROGRESS tournament on mobile viewport; bracket should be visible without scrolling |
| Accordion items collapsed by default | LAYOUT-02 | Visual state — no test runner | Open IN_PROGRESS tournament; all secondary sections should be collapsed |
| Section expand/collapse toggle | LAYOUT-03 | Interactive UI behavior — no test runner | Tap section header to expand; tap again to collapse |
| Section ordering per status | LAYOUT-04 | Pure function testable if Vitest added; currently manual | Compare section order for SCHEDULED, IN_PROGRESS, COMPLETED tournaments |
| Champion banner prominent for COMPLETED | LAYOUT-05 | Visual positioning — no test runner | Open COMPLETED tournament; champion banner at top, prominent |

---

## Validation Sign-Off

- [x] All tasks have manual verify instructions
- [x] Sampling continuity: manual smoke test after each commit
- [x] No Wave 0 dependencies (no automated tests)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
