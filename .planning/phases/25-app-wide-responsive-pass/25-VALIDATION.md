---
phase: 25
slug: app-wide-responsive-pass
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — frontend has no test framework configured |
| **Config file** | None (no vitest.config.*, jest.config.*, or similar in frontend/) |
| **Quick run command** | N/A — visual/manual testing via browser DevTools (375px viewport) |
| **Full suite command** | N/A — manual mobile emulation review |
| **Estimated runtime** | ~2-3 minutes per page (manual inspection) |

---

## Sampling Rate

- **After every task commit:** Open each modified page at 375px in DevTools and confirm no horizontal scrollbar
- **After every plan wave:** Full mobile review of all modified pages (iPhone SE emulation in Chrome DevTools)
- **Before `/gsd:verify-work`:** All 8 RESP requirements verified manually
- **Max feedback latency:** ~3 minutes (manual visual inspection)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | RESP-01 | manual | DevTools 375px viewport check | N/A | ⬜ pending |
| TBD | TBD | TBD | RESP-02 | manual | Resize to 375px, verify columns hidden | N/A | ⬜ pending |
| TBD | TBD | TBD | RESP-03 | manual | DevTools inspect computed height ≥44px | N/A | ⬜ pending |
| TBD | TBD | TBD | RESP-04 | manual | Card layout at 375px, tap navigates | N/A | ⬜ pending |
| TBD | TBD | TBD | RESP-05 | manual | Category selector + table at 375px | N/A | ⬜ pending |
| TBD | TBD | TBD | RESP-06 | manual | Profile readable, edit form no overflow | N/A | ⬜ pending |
| TBD | TBD | TBD | RESP-07 | manual | All 4 organizer pages at 375px | N/A | ⬜ pending |
| TBD | TBD | TBD | RESP-08 | manual | Desktop comparison: spacing, typography | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

No test infrastructure needed — Phase 25 is entirely visual/layout work validated through manual browser DevTools inspection.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No horizontal overflow at 375px | RESP-01 | CSS layout — no programmatic assertion available | Chrome DevTools → Toggle Device Toolbar → iPhone SE (375px) → verify no horizontal scrollbar on every page |
| Table column hiding on mobile | RESP-02 | Visual column visibility check | At 375px, verify non-essential columns (e.g., tournamentCount) are hidden |
| 44px tap targets | RESP-03 | Computed style check | DevTools → Inspect each button/link → verify computed height ≥ 44px |
| Tournament list mobile UX | RESP-04 | Full page usability | At 375px: card layout renders, tournament names readable, tap navigates to detail |
| Rankings page mobile UX | RESP-05 | Full page usability | At 375px: category selector works, table scrolls vertically, ranks visible |
| Player profile mobile UX | RESP-06 | Full page usability | At 375px: profile data readable, edit form fields accessible, no overflow |
| Organizer pages mobile UX | RESP-07 | Full page usability | At 375px: dashboard, players, tournament setup, tournament detail all usable |
| Visual refresh | RESP-08 | Aesthetic judgment | Compare desktop before/after: tighter spacing, consistent typography, color consistency |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: every task includes 375px viewport check
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Phase: 25-app-wide-responsive-pass*
*Validation strategy created: 2026-03-15*
