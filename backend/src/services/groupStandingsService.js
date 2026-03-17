/**
 * groupStandingsService.js — Phase 29 Group Standings & Tiebreakers
 *
 * Provides pure tiebreaker computation functions and a DB-backed wrapper.
 *
 * Tiebreaker chain (6 levels):
 *  1. Wins (descending)
 *  2. Head-to-head mini-table (wins within tied subset); skipped if cyclic
 *  3. Set differential (descending)
 *  4. Game differential (descending)
 *  5. Fewest total games (ascending — rewards efficiency)
 *  6. Manual organizer override (from GroupTieResolution model)
 *     Fallback: alphabetical name (stable, deterministic)
 *
 * Exports:
 *  - buildEntityStats(entities, matches) → Map<id, statsObj>
 *  - detectH2HCycle(subset, h2hWins) → boolean
 *  - sortWithTiebreakers(statsArray, override) → sorted standings array
 *  - computeGroupStandings(entities, matches, override) → standings response
 *  - getGroupStandings(groupId) → full DB-backed response
 */

import prisma from '../lib/prisma.js';

// ─────────────────────────────────────────────────────────
// Pure functions
// ─────────────────────────────────────────────────────────

/**
 * Build a stats map from entity list and completed match records.
 *
 * @param {Array<{id: string, name: string}>} entities
 * @param {Array} matches - DB match records (result field is JSON string)
 * @returns {Map<string, object>} entityId → stats
 */
export function buildEntityStats(entities, matches) {
  const statsMap = new Map();

  for (const entity of entities) {
    statsMap.set(entity.id, {
      entity,
      played: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      setDiff: 0,
      gameDiff: 0,
      totalGames: 0
    });
  }

  for (const match of matches) {
    if (match.status !== 'COMPLETED' || !match.result) continue;

    let result;
    try {
      result = typeof match.result === 'string' ? JSON.parse(match.result) : match.result;
    } catch {
      continue;
    }

    // Resolve which entity is in slot 1 and slot 2
    // Pairs take precedence over players (doubles tournament)
    const id1 = match.pair1Id || match.player1Id;
    const id2 = match.pair2Id || match.player2Id;

    if (!id1 || !id2) continue;

    const stats1 = statsMap.get(id1);
    const stats2 = statsMap.get(id2);

    if (!stats1 || !stats2) continue;

    stats1.played++;
    stats2.played++;

    // Count sets and games
    const sets = result.sets || [];
    let sets1 = 0, sets2 = 0;
    let games1 = 0, games2 = 0;

    for (const set of sets) {
      if (set.player1Score > set.player2Score) {
        sets1++;
      } else {
        sets2++;
      }
      games1 += set.player1Score;
      games2 += set.player2Score;
    }

    stats1.setsWon += sets1;
    stats1.setsLost += sets2;
    stats1.gamesWon += games1;
    stats1.gamesLost += games2;

    stats2.setsWon += sets2;
    stats2.setsLost += sets1;
    stats2.gamesWon += games2;
    stats2.gamesLost += games1;

    // Determine winner
    if (result.winner === 'PLAYER1') {
      stats1.wins++;
      stats2.losses++;
    } else if (result.winner === 'PLAYER2') {
      stats2.wins++;
      stats1.losses++;
    }
  }

  // Compute derived fields
  for (const stats of statsMap.values()) {
    stats.setDiff = stats.setsWon - stats.setsLost;
    stats.gameDiff = stats.gamesWon - stats.gamesLost;
    stats.totalGames = stats.gamesWon + stats.gamesLost;
  }

  return statsMap;
}

/**
 * Detect a cycle in the H2H directed win graph using Kahn's algorithm.
 * Returns true if every entity in the subset has in-degree >= 1 (full cycle).
 *
 * @param {string[]} subset - array of entity IDs
 * @param {Map<string, Set<string>>} h2hWins - winnerId → Set of loser IDs within subset
 * @returns {boolean}
 */
export function detectH2HCycle(subset, h2hWins) {
  const inDegree = new Map(subset.map(id => [id, 0]));

  for (const [, beaten] of h2hWins) {
    for (const loserId of beaten) {
      if (inDegree.has(loserId)) {
        inDegree.set(loserId, inDegree.get(loserId) + 1);
      }
    }
  }

  // If every entity has at least 1 in-degree, there is no source → full cycle
  return [...inDegree.values()].every(d => d >= 1);
}

/**
 * Build H2H win map for a subset of entities, using only matches between them.
 *
 * @param {string[]} subsetIds
 * @param {Array} allMatches - all match records (with result JSON strings)
 * @returns {Map<string, Set<string>>} winnerId → Set of loserIds within subset
 */
function buildH2HWins(subsetIds, allMatches) {
  const subsetSet = new Set(subsetIds);
  const h2hWins = new Map(subsetIds.map(id => [id, new Set()]));

  for (const match of allMatches) {
    if (match.status !== 'COMPLETED' || !match.result) continue;

    let result;
    try {
      result = typeof match.result === 'string' ? JSON.parse(match.result) : match.result;
    } catch {
      continue;
    }

    const id1 = match.pair1Id || match.player1Id;
    const id2 = match.pair2Id || match.player2Id;

    if (!id1 || !id2) continue;
    if (!subsetSet.has(id1) || !subsetSet.has(id2)) continue; // must be intra-subset

    if (result.winner === 'PLAYER1') {
      h2hWins.get(id1)?.add(id2);
    } else if (result.winner === 'PLAYER2') {
      h2hWins.get(id2)?.add(id1);
    }
  }

  return h2hWins;
}

/**
 * Apply tiebreaker chain to a tied subset. Returns sorted entries with position
 * metadata applied. Mutates the entries' position, tiedRange, tiebreakerCriterion,
 * and isManual fields.
 *
 * @param {object[]} tiedGroup - stats entries (all with equal wins)
 * @param {number} startPos - starting position number for this group
 * @param {Array} allMatches - all match records (for H2H lookup)
 * @param {object|null} overrideParsed - parsed positions array from GroupTieResolution
 * @param {object[]} result - accumulator array to push resolved entries into
 */
function resolveTiedGroup(tiedGroup, startPos, allMatches, overrideParsed, result) {
  if (tiedGroup.length === 1) {
    const entry = tiedGroup[0];
    entry.position = startPos;
    entry.tiedRange = null;
    result.push(entry);
    return;
  }

  const endPos = startPos + tiedGroup.length - 1;
  const subsetIds = tiedGroup.map(e => e.entity.id);

  // ── Level 2: Head-to-head mini-table ──
  const h2hWins = buildH2HWins(subsetIds, allMatches);
  const isCyclic = detectH2HCycle(subsetIds, h2hWins);

  if (!isCyclic) {
    // Count H2H wins per entity within subset
    const h2hWinCounts = new Map(subsetIds.map(id => [id, h2hWins.get(id)?.size ?? 0]));

    // Check if H2H produces unique ordering
    const countValues = [...h2hWinCounts.values()];
    const allUnique = new Set(countValues).size === countValues.length;
    const allSame = countValues.every(v => v === countValues[0]);

    if (!allSame) {
      // Sort by H2H wins within subset
      const h2hSorted = [...tiedGroup].sort((a, b) => {
        const diff = (h2hWinCounts.get(b.entity.id) ?? 0) - (h2hWinCounts.get(a.entity.id) ?? 0);
        if (diff !== 0) return diff;
        return 0;
      });

      if (allUnique) {
        // Fully resolved by H2H
        h2hSorted.forEach((entry, i) => {
          entry.position = startPos + i;
          entry.tiedRange = null;
          entry.tiebreakerCriterion = 'H2H';
          result.push(entry);
        });
        return;
      }

      // Partial H2H resolution — group by h2h win count and recurse
      const groups = groupByKey(h2hSorted, e => h2hWinCounts.get(e.entity.id) ?? 0);
      let pos = startPos;
      for (const group of groups) {
        if (group.length === 1) {
          group[0].position = pos;
          group[0].tiedRange = null;
          group[0].tiebreakerCriterion = 'H2H';
          result.push(group[0]);
          pos++;
        } else {
          // Still tied within this H2H sub-group — continue chain
          resolveTiedGroupFromLevel(group, pos, allMatches, overrideParsed, result, 3);
          pos += group.length;
        }
      }
      return;
    }
  }

  // H2H is cyclic or all same → fall through to Level 3
  resolveTiedGroupFromLevel(tiedGroup, startPos, allMatches, overrideParsed, result, 3);
}

/**
 * Continue tiebreaker chain from a specific level.
 * Levels: 3=setDiff, 4=gameDiff, 5=totalGames, 6=manual/alphabetical
 */
function resolveTiedGroupFromLevel(tiedGroup, startPos, allMatches, overrideParsed, result, level) {
  if (tiedGroup.length === 1) {
    const entry = tiedGroup[0];
    entry.position = startPos;
    entry.tiedRange = null;
    result.push(entry);
    return;
  }

  const endPos = startPos + tiedGroup.length - 1;

  if (level === 3) {
    // ── Level 3: Set differential ──
    const key = e => e.setDiff;
    const { resolved, stillTied } = tryResolveByKey(tiedGroup, key, true /* desc */);

    if (resolved.length > 0 && stillTied.length === 0) {
      // Fully resolved by set diff
      resolved.forEach((entry, i) => {
        entry.position = startPos + i;
        entry.tiedRange = null;
        entry.tiebreakerCriterion = 'Set diff';
        result.push(entry);
      });
      return;
    }

    if (resolved.length > 0) {
      // Partial: some resolved, recurse for still-tied
      let pos = startPos;
      // resolved here contains groups sorted by setDiff
      const sortedGroups = groupByKey(
        [...tiedGroup].sort((a, b) => b.setDiff - a.setDiff),
        e => e.setDiff
      );
      for (const group of sortedGroups) {
        if (group.length === 1) {
          group[0].position = pos;
          group[0].tiedRange = null;
          group[0].tiebreakerCriterion = 'Set diff';
          result.push(group[0]);
          pos++;
        } else {
          resolveTiedGroupFromLevel(group, pos, allMatches, overrideParsed, result, 4);
          pos += group.length;
        }
      }
      return;
    }

    // All same set diff — fall through
    resolveTiedGroupFromLevel(tiedGroup, startPos, allMatches, overrideParsed, result, 4);
    return;
  }

  if (level === 4) {
    // ── Level 4: Game differential ──
    const sortedGroups = groupByKey(
      [...tiedGroup].sort((a, b) => b.gameDiff - a.gameDiff),
      e => e.gameDiff
    );

    if (sortedGroups.length > 1) {
      let pos = startPos;
      for (const group of sortedGroups) {
        if (group.length === 1) {
          group[0].position = pos;
          group[0].tiedRange = null;
          group[0].tiebreakerCriterion = 'Game diff';
          result.push(group[0]);
          pos++;
        } else {
          resolveTiedGroupFromLevel(group, pos, allMatches, overrideParsed, result, 5);
          pos += group.length;
        }
      }
      return;
    }

    // All same gameDiff — fall through
    resolveTiedGroupFromLevel(tiedGroup, startPos, allMatches, overrideParsed, result, 5);
    return;
  }

  if (level === 5) {
    // ── Level 5: Fewest total games (ascending — fewer is better) ──
    const sortedGroups = groupByKey(
      [...tiedGroup].sort((a, b) => a.totalGames - b.totalGames),
      e => e.totalGames
    );

    if (sortedGroups.length > 1) {
      let pos = startPos;
      for (const group of sortedGroups) {
        if (group.length === 1) {
          group[0].position = pos;
          group[0].tiedRange = null;
          group[0].tiebreakerCriterion = 'Fewest games';
          result.push(group[0]);
          pos++;
        } else {
          resolveTiedGroupFromLevel(group, pos, allMatches, overrideParsed, result, 6);
          pos += group.length;
        }
      }
      return;
    }

    // All same totalGames — fall through
    resolveTiedGroupFromLevel(tiedGroup, startPos, allMatches, overrideParsed, result, 6);
    return;
  }

  if (level === 6) {
    // ── Level 6: Manual override ──
    if (overrideParsed && overrideParsed.length > 0) {
      const overrideMap = new Map(overrideParsed.map(p => [p.entityId, p.position]));
      const subsetIds = new Set(tiedGroup.map(e => e.entity.id));
      const allCovered = [...subsetIds].every(id => overrideMap.has(id));

      if (allCovered) {
        const overrideSorted = [...tiedGroup].sort((a, b) => {
          return (overrideMap.get(a.entity.id) ?? 999) - (overrideMap.get(b.entity.id) ?? 999);
        });
        overrideSorted.forEach((entry, i) => {
          entry.position = startPos + i;
          entry.tiedRange = null;
          entry.tiebreakerCriterion = 'Manual';
          entry.isManual = true;
          result.push(entry);
        });
        return;
      }
    }

    // ── Final fallback: alphabetical (deterministic, stable) ──
    const alphaSorted = [...tiedGroup].sort((a, b) =>
      a.entity.name.localeCompare(b.entity.name)
    );

    // Check if names are all unique — if so, we can assign sequential positions
    // but semantically they are still "tied" (no sporting criterion resolved it)
    const tiedRange = `${startPos}-${endPos}`;
    alphaSorted.forEach(entry => {
      entry.tiedRange = tiedRange;
      entry.tiebreakerCriterion = null;
      // Keep position as the start of tied range for display purposes
      // (consumer uses tiedRange for display)
      entry.position = startPos;
      result.push(entry);
    });
    return;
  }
}

/**
 * Group sorted array by key function, preserving order within each group.
 * Returns array of groups (each group is an array of entries with same key).
 */
function groupByKey(sortedArr, keyFn) {
  if (sortedArr.length === 0) return [];
  const groups = [];
  let currentGroup = [sortedArr[0]];
  let currentKey = keyFn(sortedArr[0]);

  for (let i = 1; i < sortedArr.length; i++) {
    const k = keyFn(sortedArr[i]);
    if (k === currentKey) {
      currentGroup.push(sortedArr[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sortedArr[i]];
      currentKey = k;
    }
  }
  groups.push(currentGroup);
  return groups;
}

/**
 * Try to resolve a group by a specific key.
 * Returns { resolved: entries[], stillTied: entries[] }
 * If all have the same value → resolved=[], stillTied=all
 * If some have different values → partial or full resolution
 */
function tryResolveByKey(group, keyFn, descending = true) {
  const values = group.map(e => keyFn(e));
  const allSame = values.every(v => v === values[0]);

  if (allSame) {
    return { resolved: [], stillTied: group };
  }

  // At least some differ — sort descending (or ascending)
  const sorted = [...group].sort((a, b) =>
    descending ? keyFn(b) - keyFn(a) : keyFn(a) - keyFn(b)
  );

  // Find which are still tied (same key as next)
  const stillTied = [];
  const resolved = [];

  const grouped = groupByKey(sorted, keyFn);
  for (const g of grouped) {
    if (g.length > 1) {
      stillTied.push(...g);
    } else {
      resolved.push(...g);
    }
  }

  return { resolved, stillTied };
}

/**
 * Sort an array of stats objects applying the full tiebreaker chain.
 *
 * @param {object[]} statsArray - entities with stats fields
 * @param {object|null} override - GroupTieResolution record (raw from DB) or null
 * @returns {object[]} sorted standings entries with position/tiedRange/tiebreakerCriterion/isManual
 */
export function sortWithTiebreakers(statsArray, override) {
  // Parse the override positions once
  let overrideParsed = null;
  if (override && override.positions) {
    try {
      overrideParsed = typeof override.positions === 'string'
        ? JSON.parse(override.positions)
        : override.positions;
    } catch {
      overrideParsed = null;
    }
  }

  // Initialize metadata fields
  const entries = statsArray.map(s => ({
    ...s,
    position: 1,
    tiedRange: null,
    tiebreakerCriterion: null,
    isManual: false
  }));

  // ── Level 1: Sort by wins descending ──
  const sortedByWins = [...entries].sort((a, b) => b.wins - a.wins);

  // Group into win-tied subsets
  const winGroups = groupByKey(sortedByWins, e => e.wins);

  const result = [];
  let pos = 1;

  for (const winGroup of winGroups) {
    if (winGroup.length === 1) {
      winGroup[0].position = pos;
      winGroup[0].tiedRange = null;
      result.push(winGroup[0]);
      pos++;
    } else {
      // Apply tiebreaker chain to tied subset
      // We pass all entries (not just group) as allMatches context is handled via h2h
      // The matches are not available here — this is called from computeGroupStandings
      // For H2H, we need matches. Pass empty array here; caller should use computeGroupStandings.
      resolveTiedGroup(winGroup, pos, [], overrideParsed, result);
      pos += winGroup.length;
    }
  }

  return result;
}

/**
 * Orchestrator: build stats from entities + matches, then sort with tiebreakers.
 *
 * @param {Array<{id: string, name: string}>} entities
 * @param {Array} matches - DB match records
 * @param {object|null} override - GroupTieResolution record or null
 * @returns {{ standings, unresolvedTies, hasManualOverride, overrideIsStale }}
 */
export function computeGroupStandings(entities, matches, override) {
  const hasManualOverride = !!override;

  // Parse override positions
  let overrideParsed = null;
  if (override && override.positions) {
    try {
      overrideParsed = typeof override.positions === 'string'
        ? JSON.parse(override.positions)
        : override.positions;
    } catch {
      overrideParsed = null;
    }
  }

  // Detect stale override: any match completed strictly after resultSnapshotAt
  let overrideIsStale = false;
  if (override && override.resultSnapshotAt) {
    const snapshotTime = new Date(override.resultSnapshotAt).getTime();
    for (const match of matches) {
      if (match.completedAt) {
        const completedTime = new Date(match.completedAt).getTime();
        if (completedTime > snapshotTime) {
          overrideIsStale = true;
          break;
        }
      }
    }
  }

  // Build stats map
  const statsMap = buildEntityStats(entities, matches);
  const statsArray = [...statsMap.values()];

  // Sort by wins descending first
  const sortedByWins = [...statsArray].sort((a, b) => b.wins - a.wins);
  const winGroups = groupByKey(sortedByWins, e => e.wins);

  // Initialize metadata
  const entries = sortedByWins.map(s => ({
    ...s,
    position: 1,
    tiedRange: null,
    tiebreakerCriterion: null,
    isManual: false
  }));

  // Re-sort entries by wins (they already are from sortedByWins)
  const winGroupsWithMeta = groupByKey(entries, e => e.wins);

  const result = [];
  let pos = 1;

  for (const winGroup of winGroupsWithMeta) {
    if (winGroup.length === 1) {
      winGroup[0].position = pos;
      winGroup[0].tiedRange = null;
      result.push(winGroup[0]);
      pos++;
    } else {
      resolveTiedGroup(winGroup, pos, matches, overrideParsed, result);
      pos += winGroup.length;
    }
  }

  // Collect unresolved ties (tiedRange !== null)
  const unresolvedMap = new Map();
  for (const entry of result) {
    if (entry.tiedRange) {
      if (!unresolvedMap.has(entry.tiedRange)) {
        unresolvedMap.set(entry.tiedRange, []);
      }
      unresolvedMap.get(entry.tiedRange).push(entry.entity.id);
    }
  }

  const unresolvedTies = [...unresolvedMap.entries()].map(([range, entityIds]) => ({
    range,
    entityIds
  }));

  return {
    standings: result,
    unresolvedTies,
    hasManualOverride,
    overrideIsStale
  };
}

// ─────────────────────────────────────────────────────────
// DB-backed function
// ─────────────────────────────────────────────────────────

/**
 * Fetch group data from the database and compute standings.
 *
 * @param {string} groupId
 * @returns {Promise<{ standings, unresolvedTies, hasManualOverride, overrideIsStale }>}
 */
export async function getGroupStandings(groupId) {
  // Fetch group with participants (player or pair relations)
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      groupParticipants: {
        include: {
          player: {
            select: { id: true, firstName: true, lastName: true }
          },
          pair: {
            select: {
              id: true,
              player1: { select: { id: true, firstName: true, lastName: true } },
              player2: { select: { id: true, firstName: true, lastName: true } }
            }
          }
        }
      }
    }
  });

  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // Build entity list from participants
  const entities = group.groupParticipants.map(gp => {
    if (gp.pair) {
      const p1Name = `${gp.pair.player1.firstName} ${gp.pair.player1.lastName}`.trim();
      const p2Name = `${gp.pair.player2.firstName} ${gp.pair.player2.lastName}`.trim();
      return { id: gp.pair.id, name: `${p1Name} / ${p2Name}` };
    } else if (gp.player) {
      return {
        id: gp.player.id,
        name: `${gp.player.firstName} ${gp.player.lastName}`.trim()
      };
    }
    return null;
  }).filter(Boolean);

  // Fetch completed matches for this group
  const matches = await prisma.match.findMany({
    where: {
      groupId,
      status: 'COMPLETED'
    },
    select: {
      id: true,
      status: true,
      player1Id: true,
      player2Id: true,
      pair1Id: true,
      pair2Id: true,
      result: true,
      completedAt: true
    }
  });

  // Fetch manual override for this group
  const tieResolution = await prisma.groupTieResolution.findUnique({
    where: { groupId }
  });

  return computeGroupStandings(entities, matches, tieResolution);
}
