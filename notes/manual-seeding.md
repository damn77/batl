## Manual Seeding

MVP for seeding logic to unblock E2E tournament functionality testing.
Will remain available in future for use by organizers and admins for edge case resolution and to maintain fairness in case of presence of high-ability guest players

Note: In specification "player" means individual player in Singles tournament and pair in Doubles tournament

### Tournament page
- button that redirect user to seeding creation page
    - only organizers and admins have access
- button that cancels current seeding and allow registrations again is available

**Once seeding is submitted**
- seeding should be visible in relevant tournament format elements
- no new registrations are allowed
- match list should be generated
- all matches where both players are known are visible
    - implement Round-robin scheduling for group matches
- matches where 1 player is identified should be visible
    - valid only for knockout/combined formats
    - e.g. one player already progressed to next round but their potential opponents' match isn't finished yet

### Seeding page
- list of all registered/seeded players needs to be visible
    - list is sorted by seeding score of players
    - player status switches between registered/seeded when put into or taken out of seeding structure 
- list attributes
    - player name
    - player ranking position
    - player seeding score
    - player status
- tournament structure
    - based on number of currently registered players and tournament format empty structure is created
    - by clicking on valid positions in the structure modal with registered players appears for inputting into structure
    - if position is already occupied warning message should be visible in modal
    - if position is already occupied old player is replaced
        - status of both players changes
- button for submitting seeding is available
    - on button click validation of structure is executed
    - if not all players are placed in structure show warning and request confirmation
    - after confirmation all players not placed change status from registered to cancelled