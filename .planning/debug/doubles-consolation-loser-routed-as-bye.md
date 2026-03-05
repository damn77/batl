---
status: investigating
trigger: "doubles-consolation-loser-routed-as-bye"
created: 2026-03-03T00:00:00Z
updated: 2026-03-03T00:00:00Z
---

## Current Focus

hypothesis: unknown — gathering initial evidence
test: read key service files to understand the loser routing + consolation slot filling flow
expecting: identify where the BYE is being set instead of the loser pair
next_action: read bracketPersistenceService.js, tournamentRulesService.js, matchResultService.js

## Symptoms

expected: After a doubles match result is submitted, the losing pair is routed into the consolation bracket and placed into an open slot in the consolation match awaiting them.
actual: The consolation match that the loser should be placed into gets marked as BYE instead of having the loser placed into it.
errors: No visible error — the result submission succeeds. The BYE marking is a silent incorrect behavior.
reproduction: Submit a result for a doubles knockout match where consolation is enabled. Check the consolation bracket — the loser's slot becomes a BYE.
timeline: Discovered during testing after Phase 5.2 (doubles backend fixes). Phase 5.2 specifically fixed winnerId derivation for doubles pairs and advanceBracketSlot direction when called without a match result.

## Eliminated

(none yet)

## Evidence

(none yet)

## Resolution

root_cause:
fix:
verification:
files_changed: []
