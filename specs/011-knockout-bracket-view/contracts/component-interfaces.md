# Component Interfaces: Knockout Tournament Bracket View

**Feature**: 011-knockout-bracket-view
**Date**: 2026-01-14
**Status**: Complete

## Overview

This feature is frontend-focused with no new backend APIs. This document defines the React component interfaces (props, events, hooks) that form the contract between components.

## Components

### 1. KnockoutBracket (Enhanced)

Main bracket visualization component.

**Location**: `frontend/src/components/KnockoutBracket.jsx`

#### Props Interface

```typescript
interface KnockoutBracketProps {
  /**
   * Tournament UUID for fetching match data
   * @required
   */
  tournamentId: string;

  /**
   * Bracket metadata
   * @required
   */
  bracket: {
    id: string;
    name: string;
    bracketType: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
  };

  /**
   * Array of round definitions with their matches
   * @required
   */
  rounds: BracketRound[];

  /**
   * Current user's player profile ID (if logged in and participating)
   * Enables "My Match" functionality
   * @optional
   */
  currentUserPlayerId?: string;

  /**
   * Callback when a match is clicked
   * @optional
   */
  onMatchClick?: (match: BracketMatch) => void;

  /**
   * Initial zoom scale (0.25 - 4.0)
   * @default 1.0
   */
  initialScale?: number;

  /**
   * Initial BYE visibility state
   * @default false
   */
  showByes?: boolean;

  /**
   * Custom color configuration override
   * @optional - uses defaults if not provided
   */
  colors?: Partial<BracketColors>;

  /**
   * Whether this is a doubles tournament
   * @default false
   */
  isDoubles?: boolean;

  /**
   * CSS class name for custom styling
   * @optional
   */
  className?: string;
}
```

#### Events Emitted

| Event | Payload | Description |
|-------|---------|-------------|
| onMatchClick | `BracketMatch` | User clicked on a match |
| onScaleChange | `number` | Zoom scale changed |
| onByeToggle | `boolean` | BYE visibility toggled |

---

### 2. BracketMatch

Individual match display component.

**Location**: `frontend/src/components/BracketMatch.jsx`

#### Props Interface

```typescript
interface BracketMatchProps {
  /**
   * Match data object
   * @required
   */
  match: BracketMatch;

  /**
   * Color configuration
   * @required
   */
  colors: BracketColors;

  /**
   * Whether match is highlighted (My Match feature)
   * @default false
   */
  isHighlighted?: boolean;

  /**
   * Whether this is a doubles match (show 4 names)
   * @default false
   */
  isDoubles?: boolean;

  /**
   * Whether to show compact view (for zoomed out)
   * @default false
   */
  compact?: boolean;

  /**
   * Click handler
   * @optional
   */
  onClick?: (match: BracketMatch) => void;

  /**
   * CSS class name for custom styling
   * @optional
   */
  className?: string;
}
```

#### Render States

| State | Condition | Display |
|-------|-----------|---------|
| Scheduled | `status === 'SCHEDULED'` | Both players, no score, grey border |
| In Progress | `status === 'IN_PROGRESS'` | Both players, partial score, blue border |
| Completed | `status === 'COMPLETED'` | Winner highlighted green, full score |
| BYE | `status === 'BYE'` | Single player, "BYE" text, yellow border |
| Error | Missing data | Red background, "Error" text |
| Empty | No players | "TBD" text, dashed border |

---

### 3. BracketControls

Zoom, pan, and toggle controls.

**Location**: `frontend/src/components/BracketControls.jsx`

#### Props Interface

```typescript
interface BracketControlsProps {
  /**
   * Current zoom scale
   * @required
   */
  scale: number;

  /**
   * Zoom in handler
   * @required
   */
  onZoomIn: () => void;

  /**
   * Zoom out handler
   * @required
   */
  onZoomOut: () => void;

  /**
   * Reset view handler
   * @required
   */
  onReset: () => void;

  /**
   * Toggle BYE visibility handler
   * @required
   */
  onToggleByes: () => void;

  /**
   * Current BYE visibility state
   * @required
   */
  showByes: boolean;

  /**
   * Whether tournament has any first-round BYEs
   * Controls visibility of toggle button
   * @required
   */
  hasByes: boolean;

  /**
   * Color configuration
   * @required
   */
  colors: BracketColors;

  /**
   * Disable all controls
   * @default false
   */
  disabled?: boolean;
}
```

#### Button Specifications

| Button | Icon | Label | Enabled When |
|--------|------|-------|--------------|
| Zoom In | + | "Zoom In" | `scale < 4.0` |
| Zoom Out | - | "Zoom Out" | `scale > 0.25` |
| Reset | ↺ | "Reset View" | Always |
| Toggle BYEs | 👁 | "Show/Hide BYEs" | `hasByes === true` |

---

### 4. BracketMyMatch

"My Match" navigation button.

**Location**: `frontend/src/components/BracketMyMatch.jsx`

#### Props Interface

```typescript
interface BracketMyMatchProps {
  /**
   * My match context with relevant matches
   * @required
   */
  context: MyMatchContext;

  /**
   * Handler to navigate to match IDs
   * @required
   */
  onNavigate: (matchIds: string[]) => void;

  /**
   * Color configuration
   * @required
   */
  colors: BracketColors;

  /**
   * Custom button text
   * @default "My Match"
   */
  label?: string;
}
```

#### Button States

| State | Condition | Display |
|-------|-----------|---------|
| Hidden | `!context.isParticipant` | Not rendered |
| Active | Has upcoming/current match | Primary button |
| Completed | Player eliminated or won | Secondary button with status text |
| Disabled | No matches found | Disabled state |

---

## Hooks

### useBracketNavigation

Custom hook for viewport state management.

**Location**: `frontend/src/hooks/useBracketNavigation.js`

#### Interface

```typescript
interface UseBracketNavigationOptions {
  initialScale?: number;    // Default 1.0
  minScale?: number;        // Default 0.25
  maxScale?: number;        // Default 4.0
  zoomStep?: number;        // Default 0.25
  containerRef: RefObject<HTMLDivElement>;
}

interface UseBracketNavigationReturn {
  // Current state
  scale: number;
  translateX: number;
  translateY: number;
  isDragging: boolean;

  // Actions
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  panTo: (x: number, y: number) => void;
  centerOnElement: (elementId: string) => void;

  // Event handlers (attach to container)
  handleWheel: (e: WheelEvent) => void;
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: () => void;
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: () => void;

  // CSS transform string
  transform: string;
}
```

#### Usage Example

```jsx
const containerRef = useRef(null);
const {
  scale,
  zoomIn,
  zoomOut,
  reset,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  transform
} = useBracketNavigation({ containerRef });

return (
  <div
    ref={containerRef}
    onWheel={handleWheel}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    style={{ transform }}
  >
    {/* Bracket content */}
  </div>
);
```

---

## Configuration

### bracketColors.js

Color configuration module.

**Location**: `frontend/src/config/bracketColors.js`

#### Interface

```typescript
interface BracketColors {
  // Player slot backgrounds
  topPlayer: string;      // Default: '#f0f0f0' (light grey)
  bottomPlayer: string;   // Default: '#ffffff' (white)
  winner: string;         // Default: '#d1e7dd' (Bootstrap success-bg)
  error: string;          // Default: '#f8d7da' (Bootstrap danger-bg)

  // Match border colors by status
  scheduled: string;      // Default: '#6c757d' (Bootstrap secondary)
  inProgress: string;     // Default: '#0d6efd' (Bootstrap primary)
  completed: string;      // Default: '#198754' (Bootstrap success)
  cancelled: string;      // Default: '#dc3545' (Bootstrap danger)
  bye: string;            // Default: '#ffc107' (Bootstrap warning)

  // Connector lines between matches
  connector: string;           // Default: '#dee2e6' (Bootstrap border)
  connectorHighlight: string;  // Default: '#0d6efd' (Bootstrap primary)

  // Control buttons
  controlActive: string;    // Default: '#0d6efd' (Bootstrap primary)
  controlInactive: string;  // Default: '#6c757d' (Bootstrap secondary)
}
```

#### Usage

```javascript
// Default export with all colors
import { bracketColors } from '../config/bracketColors';

// Merge with custom overrides
const colors = {
  ...bracketColors,
  ...props.colors
};
```

---

## Data Dependencies

### Consumed APIs (No Changes Required)

| Endpoint | Method | Feature | Used For |
|----------|--------|---------|----------|
| `/api/v1/tournaments/:id/matches` | GET | 005 | Match list with results |
| `/api/v1/tournaments/:id/brackets` | GET | 005 | Bracket structure |
| `/api/v1/brackets/structure/:count` | GET | 009 | Bracket template |
| `/api/v1/auth/session` | GET | 001 | Current user context |

### Expected Response Shapes

See [data-model.md](../data-model.md) for complete type definitions.

---

## CSS Classes

### BEM Naming Convention

```css
/* Block */
.bracket { }

/* Elements */
.bracket__viewport { }
.bracket__grid { }
.bracket__round { }
.bracket__match { }
.bracket__player { }
.bracket__controls { }
.bracket__connector { }

/* Modifiers */
.bracket__match--scheduled { }
.bracket__match--completed { }
.bracket__match--bye { }
.bracket__match--highlighted { }
.bracket__player--winner { }
.bracket__player--top { }
.bracket__player--bottom { }
```

### CSS Custom Properties

```css
:root {
  /* Spacing */
  --bracket-match-gap: 2rem;
  --bracket-round-gap: 3rem;
  --bracket-match-min-width: 200px;
  --bracket-match-min-height: 80px;

  /* Animation */
  --bracket-zoom-duration: 0.15s;
  --bracket-pan-duration: 0.1s;
  --bracket-highlight-duration: 0.3s;

  /* Colors (can be overridden by config) */
  --bracket-color-top-player: #f0f0f0;
  --bracket-color-bottom-player: #ffffff;
  --bracket-color-winner: #d1e7dd;
  --bracket-color-connector: #dee2e6;
}
```