---
status: resolved
trigger: "Investigate why RETIRED is not available in the special match outcome submission UI"
created: 2026-03-03T00:00:00Z
updated: 2026-03-03T00:00:00Z
---

## Current Focus

hypothesis: RETIRED is simply absent from the <Form.Select> options array in MatchResultModal.jsx — no deeper cause.
test: Read both the frontend component and backend validator.
expecting: Frontend options array missing RETIRED; backend schema accepts it.
next_action: COMPLETE — root cause confirmed, fix identified.

## Symptoms

expected: RETIRED appears in the "Outcome type" dropdown alongside WALKOVER, FORFEIT, NO_SHOW.
actual: Only WALKOVER, FORFEIT, and NO_SHOW appear.
errors: None (silent omission).
reproduction: Open MatchResultModal as organizer, toggle "Special outcome" radio, observe dropdown.
started: Unknown — likely never included during initial implementation.

## Eliminated

- hypothesis: Backend validator does not accept RETIRED.
  evidence: matchValidator.js line 64 explicitly includes 'RETIRED' in the valid() list.
  timestamp: 2026-03-03

- hypothesis: Issue is in a page-level component or a separate form, not MatchResultModal.jsx.
  evidence: MatchResultModal.jsx is the sole component that renders the special outcome <Form.Select>. No other file contains the dropdown.
  timestamp: 2026-03-03

## Evidence

- timestamp: 2026-03-03
  checked: frontend/src/components/MatchResultModal.jsx lines 296-303
  found: |
    <Form.Select value={specialOutcome} onChange={(e) => setSpecialOutcome(e.target.value)}>
      <option value="WALKOVER">Walkover (W/O)</option>
      <option value="FORFEIT">Forfeit (FF)</option>
      <option value="NO_SHOW">No-show (N/S)</option>
    </Form.Select>
    RETIRED is absent.
  implication: The omission is purely in the frontend dropdown — no backend or data-flow issues.

- timestamp: 2026-03-03
  checked: backend/src/api/validators/matchValidator.js line 64
  found: Joi.string().valid('WALKOVER', 'FORFEIT', 'NO_SHOW', 'RETIRED').required()
  implication: Backend is fully ready to accept RETIRED submissions.

- timestamp: 2026-03-03
  checked: matchValidator.js lines 56-70 (JSDoc comment for RETIRED)
  found: |
    RETIRED semantics documented:
    - Counts as 1 real match played for both players
    - Retiring player is loser, automatically opted out of consolation
    - winner field indicates the non-retiring player
    - partialScore is OPTIONAL: { player1Games, player2Games }
  implication: |
    Two UI changes are needed:
    1. Add <option value="RETIRED"> to the dropdown.
    2. Conditionally show a partial score input (two integer fields) when specialOutcome === 'RETIRED'.
    The partial score is optional per the schema, so the UI can offer it but not require it.

## Resolution

root_cause: |
  The special outcome <Form.Select> in MatchResultModal.jsx (lines 300-303) contains only three
  <option> elements (WALKOVER, FORFEIT, NO_SHOW). RETIRED was never added, despite the backend
  validator and its JSDoc being written to support it.

fix: |
  File: frontend/src/components/MatchResultModal.jsx

  1. Line 302 — add after the NO_SHOW option:
       <option value="RETIRED">Retired (RET)</option>

  2. Add partialScore state alongside the existing specialOutcome/specialWinner state:
       const [partialScore, setPartialScore] = useState({ player1Games: '', player2Games: '' });

  3. In the handleSubmit special-outcome branch (line 124), include partialScore when outcome is RETIRED:
       if (isOrganizer && mode === 'special') {
         resultData = { outcome: specialOutcome, winner: specialWinner };
         if (specialOutcome === 'RETIRED' && (partialScore.player1Games !== '' || partialScore.player2Games !== '')) {
           resultData.partialScore = {
             player1Games: parseInt(partialScore.player1Games, 10),
             player2Games: parseInt(partialScore.player2Games, 10),
           };
         }
       }

  4. Below the Winner <Form.Group> (after line 315), add a conditional partial score section:
       {specialOutcome === 'RETIRED' && (
         <Form.Group className="mb-3">
           <Form.Label>Partial score at retirement (optional)</Form.Label>
           <div className="d-flex gap-2 align-items-center">
             <Form.Control type="number" min="0" placeholder="P1 games"
               value={partialScore.player1Games}
               onChange={(e) => setPartialScore(p => ({ ...p, player1Games: e.target.value }))} />
             <span>–</span>
             <Form.Control type="number" min="0" placeholder="P2 games"
               value={partialScore.player2Games}
               onChange={(e) => setPartialScore(p => ({ ...p, player2Games: e.target.value }))} />
           </div>
         </Form.Group>
       )}

verification: Root cause confirmed by direct code inspection. Backend already fully supports RETIRED.
files_changed:
  - frontend/src/components/MatchResultModal.jsx
