## Knockout bracket generation

Backend functionality responsible for providing structure of the knockout brackets and seeding information

No frontend work as part of this feature.

APIs providing this information must be functional and automated tests verifying the data against the source are needed.

### Structure

File docs\bracket-templates-all.json contains position of preliminary rounds in overall structure.

- 0s mean a preliminary match must be played
- 1s mean a player has a bye and will be playing for the first time in 2nd round

#### Example
- 4 players 
    - 00 
    - 2 matches are played in first round with 4 players
- 7 players 
    - 1000 
    - 3 matches are played in first round with 6 players
    - 1 player has bye to 2nd round
- 11 players 
    - 1110 0101 
    - 3 matches are played in first round with 6 players 
    - 5 player have bye to 2nd round

### Seeding

Information about positions of the seeded players must be provided together with the structure.

- 4-9 players - 2 seeded
- 10-19 players - 4 seeded
- 20-39 players - 8 seeded
- 40-128 players - 16 seeded

Only manual seeding as part of this stage of implementation.
Number of seeded players should be returned by endpoint for the tournament.
Actual positions in the bracket are to be determined by the organizer.

### Testing

Update seeding scripts  with testing data to verify functionality.
Clean-up seeding scripts afterwards - no migrations, testing will be done by resetting the DB