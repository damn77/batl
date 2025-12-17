# Tournament Bracket Generation Algorithm

This document describes a **deterministic algorithm** for generating tournament brackets used in the *Súťažný poriadok* system. The algorithm reconstructs all bracket shapes (formats 5–16, including variants a/b/c) **without hard‑coded diagrams**, relying only on rules.

---

## 1. Scope

Supported number of players:

- Minimum: **5**
- Maximum: **16**

Bracket sizes:

- **8-slot bracket** (for 5–8 players)
- **16-slot bracket** (for 9–16 players)

All tournaments are **single-elimination**, without reseeding.

---

## 2. Core Definitions

```text
N = number of players
S = bracket size (smallest power of 2 ≥ N)
B = number of byes = S − N
```

A **BYE** represents an automatic advancement to the next round.

---

## 3. Canonical Slot Order (Foundation Rule)

All formats rely on a **fixed canonical slot permutation**. This permutation defines:

- First-round matchups
- Tournament balance
- Advancement paths

### 3.1 Canonical order for 8-slot bracket

```text
[1, 8, 4, 5, 2, 7, 3, 6]
```

### 3.2 Canonical order for 16-slot bracket

```text
[1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]
```

> **Invariant:** This order must never be modified. All variants operate solely by changing **which slots receive BYEs**.

### Why This Order?
The canonical order ensures:
- Seed 1 and Seed 2 cannot meet until the finals
- Seeds 1-4 occupy different quarter-brackets
- Balanced competitive distribution across rounds

---

## 4. Base Assignment Rule

1. Select canonical slot order for size `S`
2. Assign players `P1 … PN` sequentially to slots
3. Remaining slots are marked as `BYE`

This rule produces the **base variants**:

```text
5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
```

---

## 5. Variant Rules (a / b / c)

Variants modify **only the distribution of BYEs**. The bracket topology remains unchanged.

### Variant taxonomy

| Variant | Meaning |
|-------|--------|
| base | BYEs packed at end |
| a | distributed |
| b | balanced / mirrored |
| c | bottom-loaded |

---

## 5.1 Variant "a" — Distributed BYEs

**Used by:**
```text
9a, 10a, 11a, 12a, 13a, 14a, 15a
```

### Rule

```text
Distribute BYEs evenly across bracket halves.
```

### Algorithm

1. Split canonical slots into top and bottom halves
2. Alternate assigning BYEs between halves
3. Assign players to remaining slots in order

### Effect

- Matches occur earlier in both halves
- Avoids an empty half of the bracket

### Example (10 players, 6 BYEs):
- Top half slots: [1, 16, 8, 9, 4, 13, 5, 12]
- Bottom half slots: [2, 15, 7, 10, 3, 14, 6, 11]
- BYE assignment: Top[0], Bottom[0], Top[1], Bottom[1], Top[2], Bottom[2]
- BYEs go to: 1, 2, 16, 15, 8, 7

---

## 5.2 Variant "b" — Balanced / Mirrored BYEs

**Used by:**
```text
9b, 10b, 11b, 13b, 14b
```

### Rule

```text
Assign BYEs symmetrically from outermost slots inward.
```

### Algorithm

1. Pair slots mirrored around the bracket center
2. Assign BYEs to mirrored pairs
3. Fill remaining slots with players

Mirrored pairs for 16-slot bracket:
(1,16), (2,15), (3,14), (4,13), (5,12), (6,11), (7,10), (8,9)

Assign B BYEs to first B/2 pairs (rounded up)

### Effect

- Maximum visual and competitive symmetry
- Equal number of first-round matches per half

---

## 5.3 Variant "c" — Bottom-Loaded BYEs

**Used by:**
```text
10c
```

### Rule

```text
All BYEs are placed into the bottom half of the bracket.
```

### Algorithm

1. Reverse canonical slot order
2. Apply base bye assignment
3. Restore original slot indices

---

## 6. Round Construction (Universal)

Once slots are filled with players and BYEs:

### 6.1 First round

```text
Pair slots sequentially:
(1 vs 2), (3 vs 4), (5 vs 6), ...
```

### 6.2 Advancement

```text
If opponent = BYE → automatic advancement
Else → winner advances
```

### 6.3 Subsequent rounds

```text
Repeat pairing of winners until a single champion remains
```

No reseeding is ever performed.

---

## 7. Validation Invariants

For every generated bracket, the following must hold:

1. `players + byes = S`
2. Each player appears exactly once
3. Each match produces exactly one winner
4. Number of rounds = `log2(S)`
5. Variants differ **only** by bye placement

Violation of any invariant indicates an invalid bracket.

---

## 8. Reference Pseudocode

```pseudo
function generateBracket(N, variant):
    S = nextPowerOfTwo(N)
    slots = canonicalOrder(S)
    B = S - N

    if variant == "base":
        byeSlots = slots[-B:]
    else if variant == "a":
        byeSlots = distributeAlternating(slots, B)
    else if variant == "b":
        byeSlots = distributeMirrored(slots, B)
    else if variant == "c":
        byeSlots = bottomLoaded(slots, B)

    assign players P1..PN to remaining slots
    mark byeSlots as BYE
    build rounds by pairing adjacent slots
    return bracket
```

---

## 9. Guarantees

This algorithm:

- Reproduces all official bracket shapes
- Requires no diagram hardcoding
- Is deterministic and auditable
- Can be extended to 32, 64, or higher player counts

---

**End of document**

