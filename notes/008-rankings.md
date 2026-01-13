## Ranking ##
- points from tournament are awarded to respective category rankings
- ranking are always defined per calendar year
- every ranking belongs to single category
- category can have multiple rankings
    - e.g. Mixed doubles have 3 rankings
        - pair ranking
        - men ranking
        - women ranking
    - this allows for better seeding calculation when player pair changes
- rules of calculations are defined per ranking
    - e.g. how many best tournament results can count into the yearly ranking
    - default value of counted tournaments is 7
    - seeding score needs to take this limit into account

### Tournament points
Points are awarded for placement or for round reached

#### Points calculation for PLACEMENT ####
Based on number of players or payers and multiplicative value set by organizer
- Default multiplicative value is 2

Example:
For doubles tournament with 10 pairs and multiplicative value 2
- 1st place receives 20 points
- 2nd place receives 18 points
- Last place receives 2 points

Equation: Points = (NumberOfParticipants - Placement + 1) * MultiplicativeValue

#### Points calculation for FINAL ROUND ####
Each round has assigned value based on the number of participants.
Participant receives points based on the last round they won.
Point values for round per participant count need to be stored and editable by admin
Tournament uses correct points table based on number of participants
Organizer can choose for the tournament to receive double points - e.g. Masters (end of the year tournament)
Participants must win at least 1 match during tournament to be awarded points

##### Number of participants 2-4 #####
Final - 10
Semifinal - 7

Consolation Final - 5

##### Number of participants 5-8 #####
Final - 13
Semifinal - 10
Quarterfinal - 7

Consolation Final - 5
Consolation Semifinal - 4

##### Number of participants 9-16 #####
Final - 16
Semifinal - 13
Quarterfinal - 10
1st round - 7

Consolation Final - 6
Consolation Semifinal - 5
Consolation Quarterfinal - 4

##### Number of participants 17-32 #####
Final - 19
Semifinal - 16
Quarterfinal - 13
2nd round - 10
1st round - 7

Consolation Final - 6
Consolation Semifinal - 5
Consolation Quarterfinal - 4
Consolation 1st round - 3

### Testing
- update seed script with test data to allow for demo and testing in UI