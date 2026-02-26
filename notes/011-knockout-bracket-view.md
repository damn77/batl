## Knockout tournament view ##

UI enhancement of knockout tournament view defined in 005-tournament-view
Uses data defined in features 009-knockout-bracket-generation and 010-seeding-rules

Tournament brackets need to be displayable in tournament view and as standalone page.

This functionality is focused on displaying structure of knockout tournaments between 4-128 players.
It focuses on read-only aspects - no modifications, submitting of results or any other advanced actions as part of this feature.

### Basic shape ###

The bracket must be displayed in triangular shape with base (1st round) on the left and point (final) on the right.
In later rounds spacing/position of matches needs to be calculated for each match to be positioned vertically between preceding matches i.e. matches the participants played before.

Winner of match is placed in corresponding match in next round.
e.g. winners of match 2*N and 2*N+1 are placed in match N of next round

### Match object design ###

Match must contain following information:
- player names
    - in case of doubles match 4 names are present
    - backgrounds of player/pair names should be light grey (top player/pair) and white until match is finished (final score or bye) than the winners background is changed to light green
- match result
    - score (e.g. "7:5 2:6 7:6 (7:1)") or 
    - "BYE" or
    - "-" i.e. match not played yet
- court number (if available)

If match information isn't available in data retrieved from API, the match background is changed to red. (debugging functionality, should not occur on PRODUCTION)

Note: Colors used in design should be configurable in yaml file as HEX values

### 1st round - BYE matches ###
If number of players is not exactly power of 2 then in the first round some matches would have only 1 player.

These matches should contain 1 player/pair in top position with bottom position empty.
They are automatically marked as BYE and the player/pair is placed in second round corresponding match.
- By default these matches should be hidden. 
- A toggle button can change visibility of these matches for entire tournament.

Important! - only first round BYE matches should be hidden. If BYE happens in later round it should always be visible

### Advanced UI functionalities ###
- Larger size brackets will not fit on most screens.
- User must be able to zoom and move around the bracket.
- "Reset" button to return bracket to default zoom and position.
- "My Match" button 
    - will set position and zoom in such way that players next unplayed match is shown along with previously played match and the opponent's previous match.
    - In case the player already played their final match (winning tournament or loosing) that match and it's predecessors are shown
    - if match doesn't have predecessors only that one match is shown