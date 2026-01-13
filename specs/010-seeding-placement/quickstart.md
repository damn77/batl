# Quickstart: Tournament Seeding Placement

**Feature**: 010-seeding-placement
**Date**: 2026-01-13
**Purpose**: End-to-end guide for using tournament seeding placement API

## Prerequisites

Before using seeding placement, ensure:
1. ✅ Feature 008 (tournament-rankings) is deployed with valid category rankings
2. ✅ Feature 009 (bracket-generation) is deployed and accessible
3. ✅ You have ORGANIZER or ADMIN authentication token
4. ✅ Tournament category has at least N ranked players (where N = required seeds for size)

---

## Quick Start: Generate a Seeded Bracket

### Step 1: Get Category ID

First, identify which category your tournament belongs to:

```bash
curl -X GET "https://api.batl.com/api/v1/categories" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_men_open",
        "name": "Men's Open Singles",
        "type": "SINGLES",
        "gender": "MEN"
      }
    ]
  }
}
```

### Step 2: Generate Seeded Bracket

Call the seeding placement endpoint with your category and player count:

```bash
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_men_open",
    "playerCount": 15
  }'
```

**Response** (15 players → 4 seeds):
```json
{
  "success": true,
  "data": {
    "bracket": {
      "categoryId": "cat_men_open",
      "playerCount": 15,
      "bracketSize": 16,
      "structure": "1000 0000 1100 1101",
      "seedCount": 4,
      "positions": [
        {
          "positionNumber": 1,
          "positionIndex": 0,
          "seed": 1,
          "entityId": "player_john",
          "entityType": "PLAYER",
          "entityName": "John Smith",
          "isBye": true,
          "isPreliminary": false
        },
        {
          "positionNumber": 2,
          "positionIndex": 1,
          "seed": null,
          "entityId": null,
          "entityType": null,
          "entityName": null,
          "isBye": false,
          "isPreliminary": true
        },
        // ... positions 3-15 ...
        {
          "positionNumber": 16,
          "positionIndex": 15,
          "seed": 2,
          "entityId": "player_mike",
          "entityType": "PLAYER",
          "entityName": "Mike Johnson",
          "isBye": true,
          "isPreliminary": false
        }
      ],
      "randomSeed": "a7f3c9e1b2d4",
      "generatedAt": "2026-01-13T10:30:00Z"
    },
    "seedingInfo": {
      "seedCount": 4,
      "seedRange": { "min": 10, "max": 19 },
      "note": "Seeding positions are determined by category rankings. Positions 3 and 4 are randomized for fairness."
    }
  }
}
```

### Step 3: Use the Bracket

The API returns a complete bracket structure with:
- **Seeded positions**: Top N players placed according to rules
- **Empty positions**: Remaining positions for unseeded players (manual draw)
- **Bye information**: Which positions skip first round
- **Preliminary matches**: Which positions must play first round

---

## Usage Examples by Tournament Size

### Example 1: Small Tournament (7 Players → 2 Seeds)

```bash
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_women_senior",
    "playerCount": 7
  }'
```

**Result**:
- Bracket size: 8
- Seeds: 2
- Placement:
  - Seed 1 → Position 1 (top)
  - Seed 2 → Position 8 (bottom)
- Remaining 5 positions: Unseeded (manual draw)

### Example 2: Medium Tournament (15 Players → 4 Seeds)

```bash
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_mixed_open",
    "playerCount": 15
  }'
```

**Result**:
- Bracket size: 16
- Seeds: 4
- Placement:
  - Seed 1 → Position 1 (top)
  - Seed 2 → Position 16 (bottom)
  - Seeds 3 & 4 → Positions 8 & 9 (randomized order)
- Remaining 11 positions: Unseeded

### Example 3: Large Tournament (32 Players → 8 Seeds)

```bash
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_men_open",
    "playerCount": 32
  }'
```

**Result**:
- Bracket size: 32 (power of 2, no byes!)
- Seeds: 8
- Placement:
  - Seeds 1-4 → Recursive 4-seed placement
  - Seeds 5-8 → Randomized in quarter positions
- Remaining 24 positions: Unseeded

### Example 4: Maximum Tournament (128 Players → 16 Seeds)

```bash
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_men_open",
    "playerCount": 128
  }'
```

**Result**:
- Bracket size: 128 (maximum supported)
- Seeds: 16
- Placement:
  - Seeds 1-8 → Recursive 8-seed placement
  - Seeds 9-16 → Randomized in eighth positions
- Remaining 112 positions: Unseeded
- Performance: < 2 seconds (guaranteed)

---

## Testing: Deterministic Randomization

For automated testing, use the `randomSeed` parameter for reproducible results:

```bash
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_men_open",
    "playerCount": 15,
    "randomSeed": "test-seed-123"
  }'
```

**Guarantee**: Multiple calls with same `categoryId`, `playerCount`, and `randomSeed` will produce **identical bracket positions**.

**Use Cases**:
- Automated testing (verify seeding logic)
- Debugging specific bracket configurations
- Reproducing reported issues
- Test fairness across multiple random configurations

---

## Understanding the Response

### Bracket Structure

The `structure` field is a string from feature 009:
- `"0"` = Preliminary match required (both players play first round)
- `"1"` = Bye (player advances to second round automatically)

**Example**: `"1000 0000 1100 1101"`
- Position 1: Bye (seed 1 gets automatic advancement)
- Positions 2-4: Preliminary matches
- Positions 5-8: Preliminary matches
- Positions 9-10: Byes
- Positions 11-12: Preliminary matches
- Position 13: Bye
- Position 14: Preliminary match
- Position 15: Bye
- Position 16: Bye (seed 2 gets automatic advancement)

### Position Numbers vs Indices

- **positionNumber**: 1-based, user-friendly (1 = top of bracket)
- **positionIndex**: 0-based, maps to structure string index

**Example**:
```
Position 1 → Index 0 → structure[0] = '1' → isBye = true
Position 2 → Index 1 → structure[1] = '0' → isPreliminary = true
```

### Seeded vs Unseeded Positions

```javascript
// Seeded position (seed 1)
{
  "seed": 1,
  "entityId": "player_john",
  "entityName": "John Smith"
}

// Unseeded position (to be filled manually)
{
  "seed": null,
  "entityId": null,
  "entityName": null
}
```

Unseeded positions should be filled via manual draw or external tournament management system (out of scope for this feature).

---

## Integration with Features 008 & 009

### How Seeding Uses Feature 008 (Rankings)

1. Query `RankingEntry` table for category
2. Order by `rank` ASC
3. Limit to required seed count (2/4/8/16)
4. Extract player/pair IDs and names

**SQL Example**:
```sql
SELECT playerId, pairId, rank, totalPoints, seedingScore
FROM RankingEntry
WHERE rankingId = (SELECT id FROM Ranking WHERE categoryId = ?)
ORDER BY rank ASC
LIMIT 4;
```

### How Seeding Uses Feature 009 (Bracket Structure)

1. Call `bracketService.getBracketStructure(playerCount)`
2. Receive `{ bracketSize, structure, byes, preliminaryMatches }`
3. Use `bracketSize` to determine bracket positions
4. Use `structure` to identify bye positions

**Example**:
```javascript
const structure = await bracketService.getBracketStructure(15);
// Returns: {
//   bracketSize: 16,
//   structure: "1000 0000 1100 1101",
//   preliminaryMatches: 7,
//   byes: 9
// }
```

---

## Error Handling

### Error 1: Invalid Player Count
```bash
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"categoryId": "cat_men_open", "playerCount": 3}'
```

**Response (400)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAYER_COUNT",
    "message": "Player count must be between 4 and 128"
  }
}
```

### Error 2: Category Not Found
```bash
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"categoryId": "invalid_id", "playerCount": 15}'
```

**Response (404)**:
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Category with ID 'invalid_id' not found"
  }
}
```

### Error 3: Insufficient Rankings
```bash
# Tournament requires 4 seeds, but only 2 players ranked in category
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"categoryId": "cat_new_category", "playerCount": 15}'
```

**Response (404)**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_RANKINGS",
    "message": "Not enough ranked players for seeding",
    "details": {
      "requiredSeeds": 4,
      "availableRankings": 2
    }
  }
}
```

---

## Common Workflows

### Workflow 1: Tournament Setup with Seeding

1. **Create Tournament** (feature TBD - tournament management)
2. **Finalize Registrations** (close registration)
3. **Generate Seeded Bracket** (this feature)
   ```bash
   POST /api/v1/seeding/generate-bracket
   ```
4. **Fill Unseeded Positions** (manual draw or external system)
5. **Publish Bracket** (feature TBD - bracket display)

### Workflow 2: Preview Seeding Before Tournament

```bash
# Preview what bracket would look like with current rankings
curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "categoryId": "cat_men_open",
    "playerCount": 24
  }'
```

Use response to:
- Show organizers how seeds would be placed
- Verify top players are in correct positions
- Test different player counts (what if 2 more players register?)

### Workflow 3: Testing Randomization Fairness

```bash
# Generate 100 brackets with different random seeds
for i in {1..100}; do
  curl -X POST "https://api.batl.com/api/v1/seeding/generate-bracket" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"categoryId\": \"cat_men_open\",
      \"playerCount\": 15,
      \"randomSeed\": \"test-$i\"
    }" | jq '.data.bracket.positions[] | select(.seed == 3) | .positionNumber'
done | sort | uniq -c
```

**Expected Output** (approximately 50/50 distribution):
```
  48    8
  52    9
```

---

## Performance Expectations

| Players | Seeds | Bracket Size | Expected Time | Guarantee |
|---------|-------|--------------|---------------|-----------|
| 4-9     | 2     | 8            | < 100ms       | < 2s      |
| 10-19   | 4     | 16-32        | < 200ms       | < 2s      |
| 20-39   | 8     | 32-64        | < 500ms       | < 2s      |
| 40-128  | 16    | 64-128       | < 1s          | < 2s      |

**Performance Guarantee** (from SC-004): All bracket generations complete in under 2 seconds, regardless of size.

---

## Development Quick Reference

### Seed Count Rules
```
 4-9  players → 2 seeds
10-19 players → 4 seeds
20-39 players → 8 seeds
40-128 players → 16 seeds
```

### Recursive Seeding Order
```
placeTwoSeeds(1, 2)
  ↓
placeFourSeeds(1, 2, 3, 4)  ← calls placeTwoSeeds first
  ↓
placeEightSeeds(1-8)        ← calls placeFourSeeds first
  ↓
placeSixteenSeeds(1-16)     ← calls placeEightSeeds first
```

### API Response Structure
```
{
  success: true,
  data: {
    bracket: { /* SeededBracket object */ },
    seedingInfo: { /* metadata */ }
  }
}
```

---

## Next Steps

After generating a seeded bracket:

1. **Manual Draw**: Fill unseeded positions (out of scope - external system)
2. **Bracket Display**: Show bracket to organizers/players (future feature)
3. **Tournament Execution**: Record match results (future feature)
4. **Rankings Update**: Update rankings after tournament (feature 008)

---

## FAQ

**Q: Can I override seeding positions?**
A: Not in this feature. Seeding is automatic based on rankings. Manual overrides are out of scope (per FR-013).

**Q: What if two players have the same rank?**
A: Rankings from feature 008 use tiebreaker logic (totalPoints → lastTournamentDate). Seeds are ordered by `rank` field which is unique.

**Q: Can I regenerate the same bracket?**
A: Only if you use the same `randomSeed`. Otherwise, randomization produces different results each time.

**Q: How do I fill unseeded positions?**
A: Out of scope for this feature. Use manual draw or external tournament management system.

**Q: Can seeded players get byes?**
A: Yes! Seeded players can have bye positions (automatically advance). This is expected and fair.

**Q: What happens if I have 10 ranked players but only 8 register?**
A: Adjust `playerCount` to 8. System will use 2 seeds instead of 4.

---

## Support

For issues or questions:
- **API Errors**: Check error code and details in response
- **Ranking Issues**: See feature 008 (tournament-rankings) documentation
- **Bracket Structure Issues**: See feature 009 (bracket-generation) documentation
- **Integration Help**: Contact development team

---

**Version**: 1.0 (2026-01-13)
**Feature**: 010-seeding-placement
**Dependencies**: Features 001, 006, 008, 009
