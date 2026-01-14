## Seeding rules ##

This feature handles new rules and functionality for determining seeding of players in tournament.
Term player is used to describe tournament participant but for doubles tournament same behavior is used for Player Pairs.

Contains:
- seeding position in brackets
- which players should be considered for seeding
- update of APIs
- update of tests
- update of DB seeding scripts for manual testing purposes(if needed)

Doesn't contain:
- UI or any graphical changes

### Seed position in bracket ###

Rules depend on number of seeded players (2,4,8,16)
Rules are recursive i.e. when determining seeding for 8 players first seeding for 4 players is used (1-4 seeded) and then new rules for remaining 4 are used (5-8)

#### 2 seeded players ####
1st ranked player is placed at the 1st position the bracket.
2nd ranked player is placed at the bottom of the bracket.

No randomization of drawing is used.

#### 4 seeded players ####
First seeding for 2 players is used.
Order of seeding 3rd and 4th player is randomized.

One player is placed at the bottom of the first half of the bracket, the other player is placed at the top of the second half of the bracket.

Example: For 15 player bracket these position are 3rd and 4th preliminary matches (because first seeded player has bye so he continues to next round).

#### 8 seeded players ####
First seeding for 4 players is used.
Order of seeding 5th and 8th player is randomized.

Bracket is separated into quarters. Ether top or bottom position of each quarter will be already filled by seeded player. Next seeded player (randomized) will be placed in the free spot (there always has to be a free spot).

#### 16 seeded players ####
First seeding for 8 players is used.
Order of seeding 9th and 16th player is randomized.

Bracket is separated into eight segments. Ether top or bottom position of each segment will be already filled by seeded player. Next seeded player (randomized) will be placed in the free spot.

### Determining seeding ###
Order of seeded players is determined based on ranking for given category.
This is already defined and implemented.

### Testing ###
Create tests for verifying seeding position.
Test all variants for 4 seeded player tournaments.
Only smaller test sample is needed for 8 and 16 seeded variants.