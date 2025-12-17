# Double Elimination (Double Knockout) Bracket Algorithm

This document specifies a **double‑elimination (double knockout)** tournament structure compatible with the *Súťažný poriadok* single‑elimination bracket algorithm.

A player is eliminated **only after two losses**:
- First loss → player moves to the **consolation (losers) bracket**
- Second loss → player is eliminated

The structure is deterministic and does not require reseeding.

---

## 1. Scope

- Supported players: **5–16**
- Bracket sizes: **8 or 16** (same as single elimination)
- Uses the **same canonical slot order** as the single‑elimination algorithm
- Consolation bracket is automatically derived

---

## 2. Core Concepts

### Brackets

```text
Winners Bracket (WB) – main bracket
Losers Bracket (LB) – consolation bracket
Grand Final (GF)
```

### Loss accounting

```text
0 losses → Winners Bracket
1 loss  → Losers Bracket
2 losses → Eliminated
```

---

## 3. Canonical Slot Order (Inherited)

The **exact same canonical order** is used as in single elimination.

### 8-slot
```text
[1, 8, 4, 5, 2, 7, 3, 6]
```

### 16-slot
```text
[1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]
```

No modification is allowed.

---

## 4. Winners Bracket Construction

The **Winners Bracket** is generated **exactly** like a single‑elimination tournament:

1. Compute `S = nextPowerOfTwo(N)`
2. Assign players and BYEs using the chosen variant (base / a / b / c)
3. Play rounds until one undefeated player remains

Each loss in WB sends the player to the Losers Bracket.

---

## 5. Losers Bracket Structure

### Fundamental rule

```text
The Losers Bracket mirrors the Winners Bracket by rounds.
Players enter the Losers Bracket in the order they lose.
```

### Entry points

| Winners Bracket Round | Losers Bracket Entry |
|----------------------|----------------------|
| WB Round 1 loss | LB Round 1 |
| WB Round 2 loss | LB Round 2 |
| WB Semifinal loss | LB Semifinal |
| WB Final loss | Losers Final |

---

## 6. Losers Bracket Rounds

The Losers Bracket consists of **interleaved rounds**:

```text
LB Round 1 – players losing in WB Round 1
LB Round 2 – winners of LB R1 vs WB R2 losers
LB Round 3 – progression continues
...
Losers Final – winner faces WB finalist
```

Each match in the Losers Bracket:
- Eliminates the loser (second loss)
- Advances the winner

---

## 7. Round Synchronization Rule

For every Winners Bracket round `R`:

```text
There exists exactly one Losers Bracket round that consumes
all losers from WB round R.
```

This guarantees:
- No idle players
- Deterministic scheduling
- Balanced progression

---

## 8. Grand Final Rule

The **Grand Final** is played between:

```text
WB Champion (0 losses)
LB Champion (1 loss)
```

### Reset rule (optional)

Two supported modes:

#### Mode A – Single Final (no reset)
```text
Winner of Grand Final is Champion
```

#### Mode B – Bracket Reset (standard double elimination)
```text
If LB Champion wins first GF → both players have 1 loss
A second GF is played to determine Champion
```

The reset mode must be chosen explicitly.

---

## 9. BYEs in Double Elimination

BYEs apply **only in the Winners Bracket**.

Rules:

- A BYE does not count as a win or loss
- A player receiving a BYE remains in WB
- No BYEs are created in the Losers Bracket

Losers Bracket size is derived dynamically from WB losses.

---

## 10. Validation Invariants

For a valid double‑elimination bracket:

1. Each player is eliminated after exactly **two losses**
2. No player appears twice in the same round
3. Every WB loss maps to exactly one LB entry
4. Exactly one undefeated WB champion exists
5. Grand Final includes WB champion

---

## 11. Reference Pseudocode

```pseudo
function generateDoubleElim(N, variant, resetFinal):
    WB = generateSingleElim(N, variant)
    LB = empty

    for each round r in WB:
        losers = getLosers(WB, r)
        LB.addRound( pairLosers(losers, LB.previousWinners) )

    WB_champion = WB.finalWinner
    LB_champion = LB.finalWinner

    if resetFinal:
        play GrandFinal1
        if LB_champion wins:
            play GrandFinal2
    else:
        play GrandFinal

    return tournament
```

---

## 12. Guarantees

This structure:

- Preserves fairness of single elimination
- Guarantees exactly two losses per elimination
- Is fully deterministic
- Is compatible with all base bracket formats

---

**End of document**

