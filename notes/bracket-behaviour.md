## Bracket behavior on match submission ##

### Rules for entering into consolation bracket ###
All must be true:
- tournament has consolation matches/bracket
- player played less matches then guaranteed by consolation rules
- player didn't opt-out of consolation
- player didn't loose because of special result - forfeit

### Main bracket ###

**Given**: Player/Organizer submits result of match
**When**: this is the first submission of the match result
**Then**: winner progresses to next round
**Then**: looser progresses to consolation bracket if applicable and their name must be visible in the consolation bracket

**Given**: Player/Organizer submits result of match
**When**: this is NOT the first submission of this match result
**When**: winner remains the same
**Then**: only score is updated and no update rest of the brackets is needed

**Given**: Organizer submits result of match
**When**: this is NOT the first submission of this match result
**When**: winner changes
**Then**: Submission is blocked and warning message appears informing only organizer can make such update

**Given**: Organizer submits result of match
**When**: this is NOT the first submission of this match result
**When**: winner changes
**When**: players impacted DID NOT finish playing later stages of brackets
**Then**: recalculation of both brackets must be initiated based on new results

**Given**: Organizer submits result of match
**When**: this is NOT the first submission of this match result
**When**: winner changes
**When**: players impacted DID finish playing later stages of brackets
**Then**: verification popup must appear for organizer
**Then**: recalculation of both brackets must be initiated based on new results
**Then**: later stages of brackets need to be cleared if change impacts them

### Consolation bracket ###

**Given**: Player enters consolation bracket
**When**: Other player in the match is already set
**Then**: Match result submission is unblocked and visual of the match changes in UI

**Given**: Player enters consolation bracket
**When**: Other player in the match is NOT already set
**When**: Other player is still eligible for consolation bracket
**Then**: Other player name in match remains as TBD

**Given**: Player enters consolation bracket
**When**: Other player in the match is NOT already set
**When**: Other player is still NOT eligible for consolation bracket
**Then**: Other player name in match changes to BYE (position of player name and BYE must correspond to correct position of the players)
**Then**: Consolation bracket is recalculated and the player advances to next round

**Given**: Player is NOT eligible for consolation bracket
**When**: Player lost in main bracket
**When**: Other player in the consolation match is already set
**Then**: Match must be updated with BYE result and the other player progresses

**Given**: Player is NOT eligible for consolation bracket
**When**: Player lost in main bracket
**When**: Other player in the consolation match is NOT already set
**Then**: Do not update consolation match

**Given**: Organizer submits result of match
**When**: This is NOT the first submission of this match result
**When**: wWinner changes
**Then**: Impacted matches (1 per round) are identified and recalculated