## Doubles pair
Doubles pair is identification for 2 player who are playing together in doubles tournament.
All doubles tournaments are using a doubles pair in place of single player for seeding, match entries, etc.

### Creation and registration
- When registering for doubles tournament a pair needs to be defined by naming 2 players
- If pair with these players is not yet registered in the category a new pair is created
- If pair is unregistered from tournament and it has not participated or has active registration in any other tournament in the current season it must be deleted
- When registering pair as a player user, player must be one of the pair members
- Pair cannot be registered if either of the players is already registered in the tournament as part of different pair
- Both players must fulfil all category criteria to allow pair registration
- Organizer/Admin can select both members of pair during registration


### Scoring and seeding
- when pair wins point for participation in tournament these points are assigned to pair itself and each player
- for tournament seeding purposes score of both players is added to determine seeding score
- for pair ranking purposes only points earned by the specific pair is considered
    - reasoning for this is that if a new pair is formed out of high ranked players this new pair is correctly seeded as strong pair but in the yearly ranking they will start from the bottom to encourage fairness and stable pairings

### UI and displaying of pairs
- UI needs to be able to handle displaying both pair information and single players in common structure
    - but not in the same instance of tournament, pairs and single players will never be mixed together in same tournament
- Ranking of pair and both of its players need to be visible in tournament page in both pair list and tournament format display

### Advanced functionality
- Pair not fulfilling category criteria can registered by organizer or admin
    - this is used in case of sudden injuries or to allow entry of pairs that have comparable quality to others even if the aren't mixed

### Demo and testing
- create test data to showcase and manually test all new functionalities