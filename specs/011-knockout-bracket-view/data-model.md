# Data Model: Knockout Tournament Bracket View

**Feature**: 011-knockout-bracket-view
**Date**: 2026-01-14
**Status**: Complete

## Overview

This feature is frontend-focused and does not introduce new database entities. It consumes existing data from Features 005 (tournament-view), 009 (bracket-generation), and 010 (seeding-placement). This document defines the client-side data structures used by React components.

## Client-Side Data Structures

### 1. BracketViewState

State shape for the main KnockoutBracket component.

```typescript
interface BracketViewState {
  // Viewport transformation
  viewport: {
    scale: number;       // 0.25 - 4.0, default 1.0
    translateX: number;  // Pan offset in pixels
    translateY: number;  // Pan offset in pixels
  };

  // Display options
  showFirstRoundByes: boolean;  // default false

  // Interaction state
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;

  // My Match feature
  highlightedMatchIds: string[];  // Matches to highlight
}
```

### 2. BracketMatch

Match data structure received from API (via Feature 005).

```typescript
interface BracketMatch {
  id: string;               // UUID
  roundId: string;          // UUID of parent round
  roundNumber: number;      // 1-based round number
  matchNumber: number;      // Position within round (1-based)
  bracketPosition: number;  // Overall position in bracket

  // Players (singles)
  player1: Player | null;
  player2: Player | null;

  // Players (doubles) - pairs instead of individuals
  pair1: Pair | null;
  pair2: Pair | null;

  // Match result
  matchResult: MatchResult | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BYE';

  // Match details
  court: string | null;     // Court number/name
  scheduledTime: string | null;  // ISO datetime

  // Bracket relationships
  sourceMatch1Id: string | null;  // Winner of this match feeds into current
  sourceMatch2Id: string | null;  // Winner of this match feeds into current
  targetMatchId: string | null;   // Winner advances to this match

  // BYE indicator
  isBye: boolean;
}
```

### 3. Player

Player data structure (from Feature 001).

```typescript
interface Player {
  id: string;         // UUID (playerProfileId)
  name: string;       // Display name
  firstName: string;
  lastName: string;
  ranking?: number;   // Current ranking position
  seed?: number;      // Tournament seed (1-16)
}
```

### 4. Pair

Doubles pair data structure (from Feature 006).

```typescript
interface Pair {
  id: string;         // UUID
  player1: Player;
  player2: Player;
  name: string;       // Combined display name "Player1 / Player2"
  ranking?: number;
  seed?: number;
}
```

### 5. MatchResult

Match result structure (from Feature 004).

```typescript
interface MatchResult {
  winner: 'PLAYER1' | 'PLAYER2' | null;
  sets: SetScore[];
  finalScore: string;  // Formatted score "7:5 2:6 7:6(1)"
}

interface SetScore {
  setNumber: number;
  player1Score: number;
  player2Score: number;
  tiebreakScore?: string;  // e.g., "7:1"
}
```

### 6. BracketRound

Round structure for organizing matches.

```typescript
interface BracketRound {
  id: string;
  roundNumber: number;    // 1 = first round, increases toward final
  name: string;           // "Round of 16", "Quarterfinals", "Semifinals", "Final"
  matchCount: number;     // Number of matches in this round
  matches: BracketMatch[];
}
```

### 7. BracketColors

Configuration structure for customizable colors.

```typescript
interface BracketColors {
  // Player backgrounds
  topPlayer: string;      // HEX, default '#f0f0f0'
  bottomPlayer: string;   // HEX, default '#ffffff'
  winner: string;         // HEX, default '#d1e7dd'
  error: string;          // HEX, default '#f8d7da'

  // Match borders by status
  scheduled: string;      // HEX, default '#6c757d'
  inProgress: string;     // HEX, default '#0d6efd'
  completed: string;      // HEX, default '#198754'
  cancelled: string;      // HEX, default '#dc3545'
  bye: string;            // HEX, default '#ffc107'

  // Connector lines
  connector: string;      // HEX, default '#dee2e6'
  connectorHighlight: string;  // HEX, default '#0d6efd'

  // UI controls
  controlActive: string;    // HEX, default '#0d6efd'
  controlInactive: string;  // HEX, default '#6c757d'
}
```

### 8. ViewportBounds

Calculated bounds for zoom/pan constraints.

```typescript
interface ViewportBounds {
  minScale: number;   // 0.25 (zoom out limit)
  maxScale: number;   // 4.0 (zoom in limit)
  minX: number;       // Left pan limit
  maxX: number;       // Right pan limit
  minY: number;       // Top pan limit
  maxY: number;       // Bottom pan limit
}
```

### 9. MyMatchContext

Context for "My Match" navigation.

```typescript
interface MyMatchContext {
  playerProfileId: string | null;  // Current user's player ID
  currentMatch: BracketMatch | null;  // Next unplayed match
  previousMatch: BracketMatch | null; // Last completed match
  opponentPreviousMatch: BracketMatch | null;  // Opponent's last match
  isParticipant: boolean;  // User is in this tournament
  tournamentStatus: 'UPCOMING' | 'ELIMINATED' | 'WINNER' | 'SPECTATOR';
}
```

## Component Props

### KnockoutBracket (Enhanced)

```typescript
interface KnockoutBracketProps {
  tournamentId: string;
  bracket: {
    id: string;
    name: string;
    bracketType: string;
  };
  rounds: BracketRound[];
  currentUserPlayerId?: string;  // For "My Match" feature
  onMatchClick?: (match: BracketMatch) => void;  // Optional callback
  initialScale?: number;  // Default 1.0
  showByes?: boolean;     // Initial BYE visibility
}
```

### BracketMatch (New Component)

```typescript
interface BracketMatchProps {
  match: BracketMatch;
  colors: BracketColors;
  isHighlighted?: boolean;
  isDoublesMatch?: boolean;
  onClick?: (match: BracketMatch) => void;
}
```

### BracketControls (New Component)

```typescript
interface BracketControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleByes: () => void;
  showByes: boolean;
  hasByes: boolean;  // Whether tournament has any BYEs
  colors: BracketColors;
}
```

### BracketMyMatch (New Component)

```typescript
interface BracketMyMatchProps {
  context: MyMatchContext;
  onNavigate: (matchIds: string[]) => void;
  colors: BracketColors;
}
```

## Derived Data

### Match Grid Position

Calculate CSS Grid position for each match.

```typescript
function calculateMatchPosition(
  roundNumber: number,
  matchNumber: number,
  totalRounds: number
): { gridColumn: number; gridRowStart: number; gridRowEnd: number } {
  // Column is round number
  const gridColumn = roundNumber;

  // Row spacing doubles with each round
  // Round 1: matches at rows 1, 2, 3, 4, ...
  // Round 2: matches at rows 1.5, 3.5, 5.5, ...
  // Round 3: matches at rows 2.5, 6.5, ...
  const spacing = Math.pow(2, roundNumber - 1);
  const offset = spacing / 2;

  const gridRowStart = (matchNumber - 1) * spacing * 2 + offset;
  const gridRowEnd = gridRowStart + spacing;

  return { gridColumn, gridRowStart, gridRowEnd };
}
```

### BYE Detection

Determine if a match is a first-round BYE.

```typescript
function isFirstRoundBye(match: BracketMatch): boolean {
  return match.roundNumber === 1 && match.isBye === true;
}

function hasFirstRoundByes(matches: BracketMatch[]): boolean {
  return matches.some(isFirstRoundBye);
}
```

### Winner Determination

Determine winner display state.

```typescript
function getPlayerState(
  match: BracketMatch,
  position: 'top' | 'bottom'
): 'normal' | 'winner' | 'loser' | 'tbd' {
  if (match.status !== 'COMPLETED') return 'tbd';

  const winnerPosition = match.matchResult?.winner;
  if (!winnerPosition) return 'tbd';

  const isWinner =
    (position === 'top' && winnerPosition === 'PLAYER1') ||
    (position === 'bottom' && winnerPosition === 'PLAYER2');

  return isWinner ? 'winner' : 'loser';
}
```

## Validation Rules

### Viewport Constraints

```typescript
const VIEWPORT_CONSTRAINTS = {
  MIN_SCALE: 0.25,
  MAX_SCALE: 4.0,
  DEFAULT_SCALE: 1.0,
  ZOOM_STEP: 0.25,
  PAN_SPEED: 1.0,
};
```

### Color Validation

```typescript
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}
```

## State Transitions

### Viewport State Machine

```
INITIAL → ZOOMING → IDLE
       ↘ PANNING ↗

States:
- INITIAL: scale=1, translate=(0,0)
- ZOOMING: Transitioning scale value
- PANNING: Transitioning translate values
- IDLE: No active transformation

Events:
- WHEEL_SCROLL → ZOOMING
- MOUSE_DOWN → PANNING
- MOUSE_UP → IDLE
- RESET_CLICK → INITIAL
```

### BYE Toggle State

```
HIDDEN (default) ↔ VISIBLE

Events:
- TOGGLE_CLICK: Switch between states
- Initial load: Always HIDDEN
```

## Integration with Existing APIs

This feature consumes data from existing endpoints:

| Endpoint | Feature | Data Used |
|----------|---------|-----------|
| GET /api/v1/tournaments/:id/matches | 005 | Match list with results |
| GET /api/v1/brackets/structure/:playerCount | 009 | Bracket structure info |
| GET /api/v1/seeding/generate-bracket | 010 | Seeded positions |
| GET /api/v1/auth/session | 001 | Current user context |

No new database entities or API endpoints required.