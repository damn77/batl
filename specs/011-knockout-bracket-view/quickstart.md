# Quickstart: Knockout Tournament Bracket View

**Feature**: 011-knockout-bracket-view
**Date**: 2026-01-14

This guide walks through the end-to-end usage of the knockout bracket view feature.

## Prerequisites

- BATL application running (frontend + backend)
- At least one tournament with knockout bracket created
- Test data with matches (optional but recommended)

## Quick Start

### 1. Navigate to Tournament

```
Open browser → http://localhost:5173
Navigate to: Tournaments → Select a tournament with knockout format
```

The bracket view is displayed within the tournament details page.

### 2. View Basic Bracket

**What you'll see:**
- Triangular bracket layout with rounds left-to-right
- First round on the left, Final on the right
- Match cards showing:
  - Player names (top and bottom positions)
  - Score for completed matches
  - Court number (if assigned)
  - Status indicator (scheduled/in progress/completed)

**Visual indicators:**
- **Light grey background**: Top player/pair
- **White background**: Bottom player/pair
- **Light green background**: Match winner
- **Red background**: Error state (missing data)

### 3. Navigate Large Brackets

For tournaments with 32+ players:

**Zoom In/Out:**
- Mouse: Scroll wheel up/down
- Touch: Pinch gesture
- Buttons: Click + or - in controls panel

**Pan:**
- Mouse: Click and drag on empty space
- Touch: Single finger drag

**Reset View:**
- Click "Reset" button to return to default zoom/position

### 4. Toggle BYE Visibility

For tournaments with non-power-of-2 players:

**Default state:** First-round BYE matches are hidden

**To show BYEs:**
1. Look for the "Show BYEs" toggle button in controls
2. Click to reveal first-round BYE matches
3. BYE matches show one player with "BYE" indicator

**Note:** BYEs in rounds 2+ are always visible regardless of toggle state.

### 5. Find "My Match" (Logged-in Players)

If you're a participant in the tournament:

1. Log in to your account
2. Navigate to the tournament bracket
3. Click "My Match" button
4. The view automatically zooms and centers on:
   - Your next unplayed match
   - Your most recent match (if applicable)
   - Your opponent's most recent match (if applicable)

**Button states:**
- **Primary (blue)**: You have an upcoming match
- **Secondary**: You've been eliminated or won the tournament
- **Hidden**: You're not a participant in this tournament

## Code Examples

### Basic Usage

```jsx
import KnockoutBracket from '../components/KnockoutBracket';

function TournamentView({ tournament }) {
  return (
    <KnockoutBracket
      tournamentId={tournament.id}
      bracket={tournament.bracket}
      rounds={tournament.rounds}
    />
  );
}
```

### With User Context

```jsx
import { useAuth } from '../hooks/useAuth';

function TournamentView({ tournament }) {
  const { user } = useAuth();

  return (
    <KnockoutBracket
      tournamentId={tournament.id}
      bracket={tournament.bracket}
      rounds={tournament.rounds}
      currentUserPlayerId={user?.playerProfileId}
    />
  );
}
```

### With Custom Colors

```jsx
function TournamentView({ tournament }) {
  const customColors = {
    winner: '#90EE90',  // Lighter green
    inProgress: '#FFD700',  // Gold for active matches
  };

  return (
    <KnockoutBracket
      tournamentId={tournament.id}
      bracket={tournament.bracket}
      rounds={tournament.rounds}
      colors={customColors}
    />
  );
}
```

### With Match Click Handler

```jsx
function TournamentView({ tournament }) {
  const handleMatchClick = (match) => {
    console.log('Match clicked:', match.id);
    // Navigate to match detail, open modal, etc.
  };

  return (
    <KnockoutBracket
      tournamentId={tournament.id}
      bracket={tournament.bracket}
      rounds={tournament.rounds}
      onMatchClick={handleMatchClick}
    />
  );
}
```

## Configuration

### Color Configuration File

Edit `frontend/src/config/bracketColors.js`:

```javascript
export const bracketColors = {
  // Player backgrounds
  topPlayer: '#f0f0f0',
  bottomPlayer: '#ffffff',
  winner: '#d1e7dd',
  error: '#f8d7da',

  // Match borders
  scheduled: '#6c757d',
  inProgress: '#0d6efd',
  completed: '#198754',
  cancelled: '#dc3545',
  bye: '#ffc107',

  // Connector lines
  connector: '#dee2e6',
  connectorHighlight: '#0d6efd',
};
```

All values are HEX color codes. Changes take effect after page refresh.

## Testing Scenarios

### Scenario 1: 8-Player Tournament (No BYEs)

1. Create tournament with exactly 8 players
2. View bracket → Should show 3 rounds (QF, SF, Final)
3. BYE toggle should be hidden or disabled
4. Complete some matches → Winners highlighted green

### Scenario 2: 11-Player Tournament (With BYEs)

1. Create tournament with 11 players
2. View bracket → First-round BYEs hidden by default
3. Click "Show BYEs" → 5 BYE matches appear in round 1
4. Toggle again → BYEs hidden

### Scenario 3: Large Tournament Navigation

1. Load 64-player tournament
2. Use scroll wheel to zoom out → See full bracket
3. Zoom in → Individual matches readable
4. Pan to different areas
5. Click Reset → Return to default view

### Scenario 4: My Match Navigation

1. Log in as a player registered in tournament
2. View bracket
3. Click "My Match" → View centers on your match
4. If eliminated, shows your last match

### Scenario 5: Doubles Tournament

1. Create doubles tournament with pairs
2. View bracket → Each match shows 4 player names (2 per side)
3. Pair names displayed as "Player 1 / Player 2"

## Troubleshooting

### Bracket Not Displaying

**Symptoms:** Empty container or spinner stuck

**Solutions:**
1. Check browser console for errors
2. Verify tournament has bracket data
3. Check API response in Network tab
4. Ensure matches are loaded (`useMatches` hook)

### Zoom/Pan Not Working

**Symptoms:** Controls unresponsive

**Solutions:**
1. Check if container has `touch-action: none` CSS
2. Verify event handlers are attached
3. Test with mouse if touch not working
4. Check for CSS pointer-events conflicts

### Colors Not Applying

**Symptoms:** Default colors despite config changes

**Solutions:**
1. Verify `bracketColors.js` syntax
2. Clear browser cache
3. Check for CSS specificity issues
4. Ensure colors are valid HEX format

### "My Match" Button Missing

**Symptoms:** Button not visible

**Solutions:**
1. Verify you're logged in
2. Check if `currentUserPlayerId` prop is passed
3. Confirm you're registered in this tournament
4. Check console for auth errors

## Performance Tips

- For 128-player brackets, initial load may take 2-3 seconds
- Avoid excessive zoom/pan during data loading
- Close DevTools when testing performance
- Use production build for accurate timing

## Next Steps

- See [spec.md](spec.md) for complete requirements
- See [data-model.md](data-model.md) for data structures
- See [contracts/component-interfaces.md](contracts/component-interfaces.md) for component APIs