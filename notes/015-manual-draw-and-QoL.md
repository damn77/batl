## Manual Draw and Quality of Life changes ##
### Manual Draw ###
Allow submission of tournaments that happened in the past or needed to be drawn/seeded manually (to keep flexibility for scenarios not yet implemented in the app)

Add option when drawing tournament "Draw manually".
This would generate the bracket structures but not place any players/pairs into the structure. 

Organizer will select each position from dropdown list of players. 
The list should contain only players not yet placed and option to make place empty again (error correction).

Tournament can't be started until all registered players/pairs are placed.


### Quality of Life improvements ###
#### Copy of existing tournaments ####
Essentially prefill tournament configuration and rules based on existing tournament. Reason for this is that in a category tournament with same rules is often place every month.

All tournament parameters needs to be adjustable after the copy is made. Status should be "scheduled".

Copying reduces a risk of inconsistent rule setup between tournaments.

What should not be copied:
- tournament name
- tournament dates
- player registration
- draw

#### Deleting tournaments ####
Add button for organizer to delete tournament.
Confirmation request with warning should be displayed.
Additional highlighted warning if the tournament is in-progress or completed as deletion will delete match records and might update rankings.

Necessary for clean-up and error correction.
Cascading delete should be triggered deleting player registration, draw and match results if applicable.
For completed tournaments the ranking needs to be recalculated as well.

#### Verify that admin can do everything organizer can ####
So far when defining behavior it was done from perspective of player and organizer. Admin needs to be able to act in the same capacity. Verify if admin access allows access to the same functionalities as organizer.

Also verify users with mixed accesses 
- Player + Organizer
- Player + Admin
- Player + Organizer + Admin

#### Reverting tournament to "scheduled" state####
Side effects 
- unlock registration
- delete draw