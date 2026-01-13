# Quickstart Guide: Knockout Bracket Generation

**Feature**: 009-bracket-generation
**Date**: 2026-01-10
**Purpose**: End-to-end walkthrough of using the bracket generation API

---

## Prerequisites

- BATL backend server running on `http://localhost:3000`
- HTTP client (curl, Postman, or web browser)
- Tournament with registered players (player count known)

---

## Quick Start (5 Minutes)

### Step 1: Check Bracket Structure for Your Tournament

Suppose you're organizing a tournament with **11 players**. Find out what bracket structure you need:

```bash
curl http://localhost:3000/api/v1/brackets/structure/11
```

**Response**:
```json
{
  "success": true,
  "data": {
    "playerCount": 11,
    "structure": "1110 0101",
    "preliminaryMatches": 3,
    "byes": 5,
    "bracketSize": 16,
    "interpretation": {
      "0": "Preliminary match required",
      "1": "Bye (automatic advancement to next round)"
    }
  }
}
```

**What this means**:
- You need a **16-slot bracket** (next power of 2 above 11)
- **3 preliminary matches** will be played in round 1 (involving 6 players)
- **5 players** get byes (automatically advance to round 2)
- Structure pattern `"1110 0101"` shows the distribution of byes (1) and matches (0)

---

### Step 2: Determine Seeding Requirements

Check how many players should be seeded for fair bracket distribution:

```bash
curl http://localhost:3000/api/v1/brackets/seeding/11
```

**Response**:
```json
{
  "success": true,
  "data": {
    "playerCount": 11,
    "seededPlayers": 4,
    "range": {
      "min": 10,
      "max": 19
    },
    "note": "Seeding positions within the bracket are determined manually by organizers"
  }
}
```

**What this means**:
- You should seed **4 players** (top 4 ranked)
- For tournaments with 10-19 players, 4 seeds is standard
- Organizers manually assign which bracket positions get the seeded players

---

### Step 3: Interpret the Bracket Structure

The structure `"1110 0101"` tells you the **first-round configuration**:

```
Position 1: 1 (Bye)     → Player advances to round 2
Position 2: 1 (Bye)     → Player advances to round 2
Position 3: 1 (Bye)     → Player advances to round 2
Position 4: 0 (Match)   → Player plays in round 1
Position 5: 0 (Match)   → Player plays in round 1
Position 6: 1 (Bye)     → Player advances to round 2
Position 7: 0 (Match)   → Player plays in round 1
Position 8: 1 (Bye)     → Player advances to round 2
```

**Bracket visualization** (simplified):
```
Round 1                     Round 2         Round 3         Final

Player 1 (Bye) ─────────┐
                         ├─ Winner ─────┐
Player 2 (Bye) ─────────┘               │
                                         ├─ Winner ────┐
Player 3 vs Player 4 ───┐               │              │
                         ├─ Winner ─────┘              │
Player 5 (Bye) ─────────┘                              ├─ Champion
                                                       │
Player 6 vs Player 7 ───┐                              │
                         ├─ Winner ─────┐              │
Player 8 (Bye) ─────────┘               │              │
                                         ├─ Winner ────┘
Player 9 vs Player 10 ──┐               │
                         ├─ Winner ─────┘
Player 11 (Bye) ────────┘
```

---

## Common Scenarios

### Scenario 1: Perfect Power-of-2 Tournament (16 Players)

```bash
# Get bracket structure
curl http://localhost:3000/api/v1/brackets/structure/16

# Response shows no byes needed
{
  "success": true,
  "data": {
    "playerCount": 16,
    "structure": "0000 0000",
    "preliminaryMatches": 8,
    "byes": 0,
    "bracketSize": 16
  }
}

# Get seeding
curl http://localhost:3000/api/v1/brackets/seeding/16

# Response
{
  "success": true,
  "data": {
    "playerCount": 16,
    "seededPlayers": 4,
    "range": {
      "min": 10,
      "max": 19
    }
  }
}
```

**Interpretation**: All 16 players play in round 1 (8 matches). Seed top 4 players.

---

### Scenario 2: Minimum Tournament (4 Players)

```bash
# Get bracket structure
curl http://localhost:3000/api/v1/brackets/structure/4

# Response
{
  "success": true,
  "data": {
    "playerCount": 4,
    "structure": "00",
    "preliminaryMatches": 2,
    "byes": 0,
    "bracketSize": 4
  }
}

# Get seeding
curl http://localhost:3000/api/v1/brackets/seeding/4

# Response
{
  "success": true,
  "data": {
    "playerCount": 4,
    "seededPlayers": 2,
    "range": {
      "min": 4,
      "max": 9
    }
  }
}
```

**Interpretation**: Classic 4-player bracket with 2 semi-final matches. Seed top 2 players.

---

### Scenario 3: Large Tournament (100 Players)

```bash
# Get bracket structure
curl http://localhost:3000/api/v1/brackets/structure/100

# Response shows 128-slot bracket needed
{
  "success": true,
  "data": {
    "playerCount": 100,
    "structure": "1000 1001 1000 0001 1000 0001 0000 0001 ...",
    "preliminaryMatches": 72,
    "byes": 28,
    "bracketSize": 128
  }
}

# Get seeding
curl http://localhost:3000/api/v1/brackets/seeding/100

# Response
{
  "success": true,
  "data": {
    "playerCount": 100,
    "seededPlayers": 16,
    "range": {
      "min": 40,
      "max": 128
    }
  }
}
```

**Interpretation**: 128-slot bracket with 72 first-round matches. Seed top 16 players.

---

## Error Handling

### Invalid Player Count (Too Low)

```bash
curl http://localhost:3000/api/v1/brackets/structure/2
```

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAYER_COUNT",
    "message": "Player count must be at least 4",
    "details": {
      "playerCount": 2,
      "validRange": { "min": 4, "max": 128 }
    }
  }
}
```

---

### Invalid Player Count (Too High)

```bash
curl http://localhost:3000/api/v1/brackets/structure/200
```

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAYER_COUNT",
    "message": "Player count cannot exceed 128",
    "details": {
      "playerCount": 200,
      "validRange": { "min": 4, "max": 128 }
    }
  }
}
```

---

### Non-Integer Player Count

```bash
curl http://localhost:3000/api/v1/brackets/structure/7.5
```

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAYER_COUNT",
    "message": "Player count must be an integer",
    "details": {
      "playerCount": "7.5",
      "validRange": { "min": 4, "max": 128 }
    }
  }
}
```

---

## Integration Examples

### JavaScript/Frontend Integration

```javascript
// Fetch bracket information for tournament setup
async function getTournamentBracketInfo(playerCount) {
  try {
    // Fetch both structure and seeding in parallel
    const [structureRes, seedingRes] = await Promise.all([
      fetch(`/api/v1/brackets/structure/${playerCount}`),
      fetch(`/api/v1/brackets/seeding/${playerCount}`)
    ]);

    const structure = await structureRes.json();
    const seeding = await seedingRes.json();

    if (!structure.success || !seeding.success) {
      throw new Error('Failed to fetch bracket information');
    }

    return {
      bracket: structure.data,
      seeding: seeding.data
    };
  } catch (error) {
    console.error('Error fetching bracket info:', error);
    throw error;
  }
}

// Usage
const info = await getTournamentBracketInfo(11);
console.log(`Bracket size: ${info.bracket.bracketSize}`);
console.log(`Preliminary matches: ${info.bracket.preliminaryMatches}`);
console.log(`Players to seed: ${info.seeding.seededPlayers}`);
```

---

### Python Integration

```python
import requests

def get_tournament_bracket_info(player_count):
    """Fetch bracket structure and seeding configuration."""
    base_url = "http://localhost:3000/api/v1/brackets"

    # Fetch structure
    structure_res = requests.get(f"{base_url}/structure/{player_count}")
    structure_data = structure_res.json()

    # Fetch seeding
    seeding_res = requests.get(f"{base_url}/seeding/{player_count}")
    seeding_data = seeding_res.json()

    if not structure_data.get('success') or not seeding_data.get('success'):
        raise ValueError("Failed to fetch bracket information")

    return {
        'bracket': structure_data['data'],
        'seeding': seeding_data['data']
    }

# Usage
info = get_tournament_bracket_info(11)
print(f"Bracket size: {info['bracket']['bracketSize']}")
print(f"Preliminary matches: {info['bracket']['preliminaryMatches']}")
print(f"Players to seed: {info['seeding']['seededPlayers']}")
```

---

## Seeding Reference Table

Quick reference for tournament organizers:

| Player Count | Bracket Size | Seeded Players | Notes |
|--------------|--------------|----------------|-------|
| 4-9 | 8 | 2 | Small tournament |
| 10-19 | 16 | 4 | Medium tournament |
| 20-39 | 32 | 8 | Large tournament |
| 40-128 | 64 or 128 | 16 | Very large tournament |

---

## Next Steps After Getting Bracket Info

1. **Assign Seeded Positions** (Manual):
   - Top ranked players get bye positions (1s in structure)
   - Standard seeding: Seeds 1-2 in opposite halves, Seeds 3-4 distributed
   - Specific positions determined by organizer

2. **Assign Unseeded Players**:
   - Randomly assign remaining players to match positions (0s in structure)
   - Or use ranked assignment for all players

3. **Create Match Schedule**:
   - Use `preliminaryMatches` count to plan first-round scheduling
   - Calculate total rounds: `log2(bracketSize)`

4. **Display Bracket to Participants**:
   - Frontend visualization (out of scope for this feature)
   - Print bracket diagram (out of scope for this feature)

---

## Testing the API

### Automated Test (curl script)

```bash
#!/bin/bash
# Test bracket API for various player counts

echo "Testing bracket generation API..."

# Test valid player counts
for count in 4 7 11 16 32 64 128; do
  echo "\nTesting $count players:"
  curl -s "http://localhost:3000/api/v1/brackets/structure/$count" | jq '.data | {playerCount, preliminaryMatches, byes}'
done

# Test invalid player counts
echo "\nTesting invalid player count (3):"
curl -s "http://localhost:3000/api/v1/brackets/structure/3" | jq '.error.message'

echo "\nTesting invalid player count (200):"
curl -s "http://localhost:3000/api/v1/brackets/structure/200" | jq '.error.message'

echo "\nDone!"
```

---

## Performance Expectations

- **Response Time**: < 10ms (data is cached in memory)
- **Availability**: 100% (read-only, no dependencies)
- **Throughput**: 1000+ requests/second (static data)
- **Startup Time**: ~1ms to load all 125 templates

---

## Troubleshooting

### API Returns 500 Error

**Symptom**: All requests return `TEMPLATE_LOAD_ERROR`

**Cause**: `docs/bracket-templates-all.json` file is missing or corrupted

**Solution**:
1. Check file exists: `ls docs/bracket-templates-all.json`
2. Validate JSON: `cat docs/bracket-templates-all.json | jq`
3. Restart backend server after fixing file

---

### Bracket Structure Doesn't Match Documentation

**Symptom**: Structure pattern seems incorrect

**Cause**: Misunderstanding of structure format

**Solution**: Remember that:
- `0` = preliminary match (2 players compete)
- `1` = bye (1 player advances automatically)
- Spaces in structure are for readability (e.g., `"1110 0101"` groups by bracket halves)

---

### Seeding Number Seems Wrong

**Symptom**: Expected different number of seeded players

**Cause**: Seeding ranges are fixed per tournament regulations

**Solution**: Refer to seeding ranges table:
- 4-9 players: Always 2 seeds
- 10-19 players: Always 4 seeds
- 20-39 players: Always 8 seeds
- 40-128 players: Always 16 seeds

These ranges cannot be customized in this phase (per FR-013).

---

## API Documentation

For detailed API specification, see:
- [API Endpoints Documentation](contracts/api-endpoints.md)
- [Data Model](data-model.md)
- [Implementation Plan](plan.md)

---

**Quickstart Complete**: You're now ready to integrate bracket generation into your tournament workflows!
