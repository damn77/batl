# Research: Tournament Rules and Formats

**Feature**: 004-tournament-rules | **Date**: 2025-01-07

## Executive Summary

This research covers the implementation of a comprehensive tournament rules and formats system with cascading rule definitions, format-specific configurations, and historical rule preservation. Key technical challenges include efficient rule cascade resolution, group size validation algorithms, and maintaining rule snapshots for completed matches.

## Technical Decisions

### 1. Cascading Rule Pattern

**Decision**: Use **JSON-based rule storage with runtime cascade resolution** instead of denormalized rule storage

**Rationale**:
- Each level (tournament, group, round, match) stores only its overrides as JSON
- Cascade resolution happens at runtime by checking match → round → group → tournament
- This approach is simpler than maintaining denormalized copies and prevents data inconsistency
- Performance is acceptable (<100ms) for the expected scale (50 tournaments, 4 cascade levels)

**Alternatives Considered**:
1. **Denormalized storage**: Store complete rules at every match
   - **Rejected**: Requires complex update logic, high storage overhead, data consistency issues
2. **Separate tables per level**: Tournament_Rules, Group_Rules, Round_Rules, Match_Rules
   - **Rejected**: Overly complex schema, difficult queries, hard to maintain consistency
3. **Inheritance via foreign keys**: Each level references parent level
   - **Rejected**: Complex joins, difficult to query "effective rules" for a match

**Implementation**:
```javascript
// Service function to resolve effective rules for a match
async function getEffectiveRulesForMatch(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      round: { include: { group: { include: { tournament: true } } } }
    }
  });

  // Cascade: match overrides > round overrides > group overrides > tournament defaults
  return {
    ...match.round.group.tournament.defaultRules,
    ...(match.round.group.ruleOverrides || {}),
    ...(match.round.ruleOverrides || {}),
    ...(match.ruleOverrides || {})
  };
}
```

### 2. Match Scoring Rules Representation

**Decision**: Use **structured JSON with enum validation** for match scoring rules

**Rationale**:
- Match rules have a well-defined structure (format type, sets/tiebreaks, advantage, early tiebreak)
- JSON allows flexible storage of varying configurations per format type
- Prisma JSON type with Zod validation provides type safety
- Easier to extend with new rule types in the future

**Alternatives Considered**:
1. **Separate columns**: formatType, setsCount, advantageRule, tiebreakTrigger
   - **Rejected**: Inflexible, requires schema migration for new rule types
2. **EAV pattern**: Entity-Attribute-Value table for rules
   - **Rejected**: Overly complex queries, poor performance, difficult validation
3. **String-based rule notation**: "2S-ADV-TB66"
   - **Rejected**: Hard to parse, validate, and query; not human-readable in database

**Data Structure**:
```json
{
  "formatType": "SETS" | "STANDARD_TIEBREAK" | "BIG_TIEBREAK" | "MIXED",
  "winningSets": 1 | 2,
  "winningTiebreaks": 1 | 2 | 3,
  "advantageRule": "ADVANTAGE" | "NO_ADVANTAGE",
  "tiebreakTrigger": "6-6" | "5-5" | "4-4" | "3-3",
  "finalSetTiebreak": "STANDARD" | "BIG" | null
}
```

### 3. Group Size Validation Algorithm

**Decision**: Use **mathematical validation formula** to check if N players can be divided into groups of size X and X-1

**Rationale**:
- Simple, deterministic algorithm with O(1) complexity
- Validates before group creation to prevent user frustration
- Clear error messages when validation fails

**Algorithm**:
```javascript
function canDivideIntoGroups(totalPlayers, desiredGroupSize) {
  if (desiredGroupSize < 2 || desiredGroupSize > 8) return false;
  if (totalPlayers < desiredGroupSize) return false;

  // Try all combinations of groups with size X and X-1
  for (let groupsOfX = 0; groupsOfX <= Math.floor(totalPlayers / desiredGroupSize); groupsOfX++) {
    const remaining = totalPlayers - (groupsOfX * desiredGroupSize);
    const groupsOfXMinus1 = remaining / (desiredGroupSize - 1);

    // Valid if we can make exact groups of X-1
    if (Number.isInteger(groupsOfXMinus1) && groupsOfXMinus1 >= 0) {
      return {
        valid: true,
        groupsOfSize: groupsOfX,
        groupsOfSizeMinus1: groupsOfXMinus1
      };
    }
  }

  return { valid: false };
}
```

**Alternatives Considered**:
1. **Trial and error**: Try creating groups and handle failures
   - **Rejected**: Poor user experience, wasteful computation
2. **Lookup table**: Pre-compute valid combinations
   - **Rejected**: Limited to pre-defined player counts, inflexible

### 4. Historical Rule Snapshots

**Decision**: Store **immutable rule snapshot** as JSON on match record when match is completed

**Rationale**:
- Preserves exact rules that were active when match was played
- Prevents historical data corruption when tournament rules change
- Simple to implement: copy effective rules to match.completedWithRules on completion
- Query performance is good (no joins needed to see historical rules)

**Alternatives Considered**:
1. **Audit log**: Separate table tracking all rule changes with timestamps
   - **Rejected**: Complex queries to reconstruct historical rules, over-engineering
2. **Versioned rules**: Each rule change creates new version
   - **Rejected**: Complex to query, difficult to associate versions with matches
3. **No preservation**: Just keep current rules
   - **Rejected**: Violates FR-033, FR-037 (preserve rules for completed matches)

**Implementation**:
```javascript
async function completeMatch(matchId, result) {
  const effectiveRules = await getEffectiveRulesForMatch(matchId);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      result,
      status: 'COMPLETED',
      completedAt: new Date(),
      completedWithRules: effectiveRules  // Immutable snapshot
    }
  });
}
```

### 5. Format-Specific Configurations

**Decision**: Store format config as **polymorphic JSON field** on Tournament with format type discriminator

**Rationale**:
- Different formats require different configurations (knockout: match guarantees, group: group size, etc.)
- Single formatConfig JSON field with formatType discriminator is simpler than separate tables
- Validation enforced at application layer based on formatType
- Easier to add new format types in the future

**Structure**:
```json
// Knockout format
{
  "formatType": "KNOCKOUT",
  "matchGuarantee": "1_MATCH" | "2_MATCH" | "UNTIL_PLACEMENT"
}

// Group format
{
  "formatType": "GROUP",
  "groupSize": 4,
  "singleGroup": false
}

// Combined format
{
  "formatType": "COMBINED",
  "groupSize": 4,
  "advancementRules": [
    { "position": 1, "bracket": "MAIN" },
    { "position": 2, "bracket": "MAIN" },
    { "position": 3, "bracket": "CONSOLATION" },
    { "position": 4, "bracket": "NONE" }
  ]
}

// Swiss format
{
  "formatType": "SWISS",
  "rounds": 5
}
```

**Alternatives Considered**:
1. **Separate tables**: TournamentFormat_Knockout, TournamentFormat_Group, etc.
   - **Rejected**: Schema complexity, requires joins, harder to extend
2. **Nullable columns**: groupSize (nullable), matchGuarantee (nullable), etc.
   - **Rejected**: Confusing which fields apply to which format, validation complexity

## Best Practices

### Node.js / Prisma

**Enums in Prisma**:
- Define enums in schema.prisma for type safety
- Use string-based enums for readability in database
- Validate enum values at controller layer

**JSON Fields**:
- Use Prisma's `Json` type for structured data
- Validate JSON structure with Zod schemas
- Index JSON fields if frequently queried (Prisma supports JSON path indexing)

**Service Layer Pattern**:
- Keep controllers thin (validation, error handling only)
- Business logic in services (rule cascade, format validation)
- Use dependency injection for testability

### React / Frontend

**Rule Display Components**:
- Create reusable components for each rule type (sets, tiebreaks, etc.)
- Use conditional rendering based on formatType
- Display cascade levels clearly (tournament default vs overrides)

**Form Validation**:
- Use React Hook Form for complex rule configuration forms
- Validate format-specific configs client-side before submission
- Show validation errors inline for better UX

**State Management**:
- Use React Context for tournament rules in rule setup flow
- Local state for individual rule overrides
- React Query for fetching and caching rule data

## Integration Patterns

### With Existing Features

**001-user-management**:
- Use existing ORGANIZER role for rule configuration permissions
- Use PLAYER role for read-only rule viewing

**002-category-system**:
- Tournament model already exists - extend with formatType and formatConfig
- No changes needed to Category model

**003-tournament-registration**:
- No changes to TournamentRegistration model
- Tournament rules affect match generation (future feature), not registration

### New Endpoints

**Tournament Rules API**:
```
PATCH /api/v1/tournaments/:id/rules/format     # Update format and format config
PATCH /api/v1/tournaments/:id/rules/scoring    # Update default scoring rules
PATCH /api/v1/groups/:id/rules                 # Override group rules
PATCH /api/v1/rounds/:id/rules                 # Override round rules
PATCH /api/v1/matches/:id/rules                # Override match rules
GET   /api/v1/matches/:id/effective-rules      # Get resolved rules for match
```

## Performance Considerations

**Rule Cascade Resolution**:
- Expected: 4 levels max (tournament → group → round → match)
- Database queries: 1-2 queries with includes (match with nested tournament)
- In-memory merge: O(1) for JSON object spread
- Total time: <100ms for worst case

**Group Size Validation**:
- O(N) where N = totalPlayers / groupSize
- Typically N < 20, so <1ms execution time

**Rule Snapshots**:
- Written once per match on completion
- No performance impact on reads (already on match record)
- Storage: ~500 bytes per match (JSON rules)

## Security Considerations

**Authorization**:
- Only ORGANIZER and ADMIN can modify tournament rules
- All users can view tournament rules
- Validate tournament ownership before allowing rule changes

**Validation**:
- Validate all rule fields against enums and ranges
- Prevent invalid JSON in rule fields
- Check format-specific config matches formatType

**Data Integrity**:
- Use database transactions for rule updates
- Prevent rule changes for completed matches
- Validate cascade integrity (no orphaned overrides)

## Testing Strategy

**Unit Tests** (Optional per constitution):
- Rule cascade resolution logic
- Group size validation algorithm
- Format config validation
- Rule snapshot preservation

**Integration Tests** (Optional):
- API endpoints for rule CRUD
- Rule cascade through all 4 levels
- Historical rule preservation after changes

**Manual Testing** (Required):
- User story acceptance scenarios
- Edge cases from spec (invalid group sizes, mid-match rule changes, etc.)

## Open Questions & Decisions

None - all technical decisions resolved during research phase.

## References

- Prisma JSON fields: https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#json
- React Hook Form: https://react-hook-form.com/
- Zod validation: https://zod.dev/
- Cascading configuration patterns: https://martinfowler.com/bliki/ConfigurationComplexity.html
