/**
 * advancementService.js - Phase 30 Combined Format Advancement
 *
 * Core service for group-to-knockout advancement in COMBINED format tournaments.
 *
 * Exports (async):
 *   - computeAdvancementPreview(tournamentId)
 *   - confirmAdvancement(tournamentId)
 *   - revertAdvancement(tournamentId)
 *
 * Exports (pure, for unit tests):
 *   - computeWaterfall(allGroupStandings, mainN, secondaryM)
 *   - crossGroupRank(players)
 */

import prisma from '../lib/prisma.js';
import { getGroupStandings } from './groupStandingsService.js';
import { getBracketByPlayerCount } from './bracketService.js';
import {
  getSeedCount,
  createRandomSeed,
  shuffle,
  placeTwoSeeds,
  placeFourSeeds,
  placeEightSeeds,
  placeSixteenSeeds
} from './seedingPlacementService.js';

function makeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function crossGroupRank(players) {
  return [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
    if (a.totalGames !== b.totalGames) return a.totalGames - b.totalGames;
    return a.entity.name.localeCompare(b.entity.name);
  });
}

export function computeWaterfall(allGroupStandings, mainN, secondaryM) {
  const byPosition = new Map();

  for (const gs of allGroupStandings) {
    for (const entry of gs.standings) {
      if (!byPosition.has(entry.position)) byPosition.set(entry.position, []);
      byPosition.get(entry.position).push({
        entity: entry.entity,
        groupId: gs.groupId,
        groupNumber: gs.groupNumber,
        position: entry.position,
        wins: entry.wins,
        setDiff: entry.setDiff,
        gameDiff: entry.gameDiff,
        totalGames: entry.totalGames
      });
    }
  }

  const mainSlots = [];
  const secondarySlots = [];
  const eliminated = [];
  let mainRemaining = mainN;
  let secondaryRemaining = secondaryM;

  const sortedPositions = [...byPosition.keys()].sort((a, b) => a - b);

  for (const position of sortedPositions) {
    const playersAtPosition = byPosition.get(position);

    if (mainRemaining > 0) {
      if (playersAtPosition.length <= mainRemaining) {
        mainSlots.push(...playersAtPosition.map(p => ({ ...p, isSpillover: false, bracket: 'main' })));
        mainRemaining -= playersAtPosition.length;
      } else {
        const ranked = crossGroupRank(playersAtPosition);
        const toMain = ranked.slice(0, mainRemaining);
        const remainder = ranked.slice(mainRemaining);
        mainRemaining = 0;
        mainSlots.push(...toMain.map(p => ({ ...p, isSpillover: true, bracket: 'main' })));

        if (secondaryRemaining > 0) {
          if (remainder.length <= secondaryRemaining) {
            secondarySlots.push(...remainder.map(p => ({ ...p, isSpillover: true, bracket: 'secondary' })));
            secondaryRemaining -= remainder.length;
          } else {
            secondarySlots.push(...remainder.slice(0, secondaryRemaining).map(p => ({ ...p, isSpillover: true, bracket: 'secondary' })));
            eliminated.push(...remainder.slice(secondaryRemaining).map(p => ({ ...p, bracket: null })));
            secondaryRemaining = 0;
          }
        } else {
          eliminated.push(...remainder.map(p => ({ ...p, bracket: null })));
        }
      }
    } else if (secondaryRemaining > 0) {
      if (playersAtPosition.length <= secondaryRemaining) {
        secondarySlots.push(...playersAtPosition.map(p => ({ ...p, isSpillover: false, bracket: 'secondary' })));
        secondaryRemaining -= playersAtPosition.length;
      } else {
        const ranked = crossGroupRank(playersAtPosition);
        secondarySlots.push(...ranked.slice(0, secondaryRemaining).map(p => ({ ...p, isSpillover: true, bracket: 'secondary' })));
        eliminated.push(...ranked.slice(secondaryRemaining).map(p => ({ ...p, bracket: null })));
        secondaryRemaining = 0;
      }
    } else {
      eliminated.push(...playersAtPosition.map(p => ({ ...p, bracket: null })));
    }
  }

  return { mainSlots, secondarySlots, eliminated };
}

function buildSeedList(slots) {
  return slots.map((slot, index) => ({
    seed: index + 1,
    entityId: slot.entity.id,
    entityType: 'PLAYER',
    entityName: slot.entity.name
  }));
}

function generateSeededPositions(seedList, bracketTemplate) {
  const { bracketSize, structure } = bracketTemplate;
  const seedCount = getSeedCount(seedList.length);
  const seeds = seedList.slice(0, seedCount);
  const randomSeed = createRandomSeed();

  let positions;
  if (seedCount <= 2) {
    positions = placeTwoSeeds(bracketSize, seeds, structure);
  } else if (seedCount <= 4) {
    positions = placeFourSeeds(bracketSize, seeds, randomSeed, structure);
  } else if (seedCount <= 8) {
    positions = placeEightSeeds(bracketSize, seeds, randomSeed, structure);
  } else {
    positions = placeSixteenSeeds(bracketSize, seeds, randomSeed, structure);
  }

  const unseeded = seedList.slice(seedCount);
  const emptyPositionIndices = positions
    .map((p, i) => ({ ...p, index: i }))
    .filter(p => !p.entityId && !p.isBye)
    .map(p => p.index);
  const shuffledEmpty = shuffle(emptyPositionIndices, randomSeed + '-unseeded');

  for (let i = 0; i < unseeded.length && i < shuffledEmpty.length; i++) {
    const idx = shuffledEmpty[i];
    positions[idx] = { ...positions[idx], entityId: unseeded[i].entityId, seed: null };
  }

  return { positions, randomSeed };
}

async function createBracketFromSlots(tx, tournamentId, bracketType, placementRangeLabel, slots, isDoubles, matchNumberOffset) {
  const bracketTemplate = await getBracketByPlayerCount(slots.length);
  const { bracketSize, structure } = bracketTemplate;
  const seedList = buildSeedList(slots);
  const { positions } = generateSeededPositions(seedList, bracketTemplate);

  const bracket = await tx.bracket.create({
    data: { tournamentId, bracketType, matchGuarantee: 'MATCH_1', drawMode: 'SEEDED', placementRange: placementRangeLabel }
  });

  const totalRounds = Math.log2(bracketSize);
  let matchNumber = matchNumberOffset + 1;
  let matchCount = 0;
  const byeInfo = [];
  const round2MatchIds = [];

  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const round = await tx.round.create({
      data: { tournamentId, bracketId: bracket.id, roundNumber: roundNum }
    });

    if (roundNum === 1) {
      const matchesInRound = bracketSize / 2;
      for (let i = 0; i < matchesInRound; i++) {
        const pos1 = positions[i * 2];
        const pos2 = positions[i * 2 + 1];
        const isByeMatch = structure ? structure[i] === '1' : false;

        const matchData = isDoubles
          ? { tournamentId, bracketId: bracket.id, roundId: round.id, matchNumber: matchNumber++, isBye: isByeMatch, status: isByeMatch ? 'BYE' : 'SCHEDULED', pair1Id: pos1?.entityId || null, pair2Id: pos2?.entityId || null, player1Id: null, player2Id: null, pair1Seed: pos1?.seed || null, pair2Seed: pos2?.seed || null }
          : { tournamentId, bracketId: bracket.id, roundId: round.id, matchNumber: matchNumber++, isBye: isByeMatch, status: isByeMatch ? 'BYE' : 'SCHEDULED', player1Id: pos1?.entityId || null, player2Id: pos2?.entityId || null, player1Seed: pos1?.seed || null, player2Seed: pos2?.seed || null };

        await tx.match.create({ data: matchData });
        matchCount++;

        if (isByeMatch) {
          byeInfo.push({ posInRound: i, entityId: pos1?.entityId || null, seed: pos1?.seed || null });
        }
      }
    } else {
      const matchesInRound = bracketSize / Math.pow(2, roundNum);
      for (let i = 0; i < matchesInRound; i++) {
        const created = await tx.match.create({
          data: { tournamentId, bracketId: bracket.id, roundId: round.id, matchNumber: matchNumber++, isBye: false, status: 'SCHEDULED', player1Id: null, player2Id: null }
        });
        if (roundNum === 2) round2MatchIds.push(created.id);
        matchCount++;
      }
    }
  }

  for (const bye of byeInfo) {
    const round2Idx = Math.floor(bye.posInRound / 2);
    const isSlot1 = bye.posInRound % 2 === 0;
    const targetMatchId = round2MatchIds[round2Idx];
    if (!targetMatchId) continue;
    const updateData = {};
    if (isDoubles) {
      if (isSlot1) { updateData.pair1Id = bye.entityId; updateData.pair1Seed = bye.seed; }
      else { updateData.pair2Id = bye.entityId; updateData.pair2Seed = bye.seed; }
    } else {
      if (isSlot1) { updateData.player1Id = bye.entityId; updateData.player1Seed = bye.seed; }
      else { updateData.player2Id = bye.entityId; updateData.player2Seed = bye.seed; }
    }
    await tx.match.update({ where: { id: targetMatchId }, data: updateData });
  }

  return { bracketId: bracket.id, matchCount };
}

export async function computeAdvancementPreview(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, formatType: true, formatConfig: true, status: true, category: { select: { type: true } } }
  });

  if (!tournament) throw makeError('TOURNAMENT_NOT_FOUND', 'Tournament not found: ' + tournamentId);
  if (tournament.formatType !== 'COMBINED') throw makeError('NOT_COMBINED', 'Tournament must be COMBINED format for advancement');
  if (tournament.status !== 'IN_PROGRESS') throw makeError('NOT_IN_PROGRESS', 'Tournament must be IN_PROGRESS to advance');

  let parsedConfig = {};
  if (tournament.formatConfig) { try { parsedConfig = JSON.parse(tournament.formatConfig); } catch (_) {} }

  const mainN = parsedConfig.mainBracketSize || 0;
  const secondaryM = parsedConfig.secondaryBracketSize || 0;
  if (!mainN || mainN < 4) throw makeError('INVALID_CONFIG', 'mainBracketSize must be at least 4');

  const existingBracket = await prisma.bracket.findFirst({ where: { tournamentId }, select: { id: true } });
  if (existingBracket) throw makeError('ALREADY_ADVANCED', 'Tournament already has knockout brackets');

  const groups = await prisma.group.findMany({ where: { tournamentId }, orderBy: { groupNumber: 'asc' } });
  if (groups.length === 0) throw makeError('NO_GROUPS', 'Tournament has no groups');

  const allGroupStandings = await Promise.all(
    groups.map(async (group) => {
      const result = await getGroupStandings(group.id);
      return { groupId: group.id, groupNumber: group.groupNumber, standings: result.standings, unresolvedTies: result.unresolvedTies };
    })
  );

  if (allGroupStandings.some(gs => gs.unresolvedTies && gs.unresolvedTies.length > 0)) {
    throw makeError('UNRESOLVED_TIES', 'All group ties must be resolved before advancing');
  }

  const { mainSlots, secondarySlots, eliminated } = computeWaterfall(allGroupStandings, mainN, secondaryM);
  const mainBracketInfo = mainSlots.length > 0 ? await getBracketByPlayerCount(mainSlots.length) : null;
  const secondaryBracketInfo = secondarySlots.length > 0 ? await getBracketByPlayerCount(secondarySlots.length) : null;

  return { mainSlots, secondarySlots, eliminated, mainBracketInfo, secondaryBracketInfo };
}

export async function confirmAdvancement(tournamentId) {
  const preview = await computeAdvancementPreview(tournamentId);
  const { mainSlots, secondarySlots } = preview;

  if (mainSlots.length < 4 || mainSlots.length > 128) throw makeError('INVALID_MAIN_SIZE', 'Main bracket size ' + mainSlots.length + ' is outside valid range 4-128');
  if (secondarySlots.length > 0 && (secondarySlots.length < 4 || secondarySlots.length > 128)) throw makeError('INVALID_SECONDARY_SIZE', 'Secondary bracket size ' + secondarySlots.length + ' is outside valid range 4-128');

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { formatConfig: true, category: { select: { type: true } } }
  });
  const isDoubles = tournament.category.type === 'DOUBLES';

  const result = await prisma.$transaction(async (tx) => {
    const mainResult = await createBracketFromSlots(tx, tournamentId, 'MAIN', 'Main Bracket', mainSlots, isDoubles, 0);
    let secondaryResult = null;
    if (secondarySlots.length > 0) {
      secondaryResult = await createBracketFromSlots(tx, tournamentId, 'SECONDARY', 'Secondary Bracket', secondarySlots, isDoubles, 1000);
    }
    const lockedAt = new Date().toISOString();
    await tx.group.updateMany({ where: { tournamentId }, data: { advancementCriteria: JSON.stringify({ locked: true, lockedAt }) } });
    let parsedConfig = {};
    if (tournament.formatConfig) { try { parsedConfig = JSON.parse(tournament.formatConfig); } catch (_) {} }
    parsedConfig.advancedAt = lockedAt;
    await tx.tournament.update({ where: { id: tournamentId }, data: { formatConfig: JSON.stringify(parsedConfig) } });
    return { mainResult, secondaryResult };
  });

  return {
    success: true,
    mainBracket: { id: result.mainResult.bracketId, matchCount: result.mainResult.matchCount },
    secondaryBracket: result.secondaryResult ? { id: result.secondaryResult.bracketId, matchCount: result.secondaryResult.matchCount } : null
  };
}

export async function revertAdvancement(tournamentId) {
  const completedMatchCount = await prisma.match.count({
    where: { tournamentId, bracketId: { not: null }, status: 'COMPLETED' }
  });
  if (completedMatchCount > 0) throw makeError('MATCHES_HAVE_RESULTS', 'Cannot revert -- knockout match results exist');

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { tournamentId, bracketId: { not: null } } });
    await tx.round.deleteMany({ where: { tournamentId, bracketId: { not: null } } });
    await tx.bracket.deleteMany({ where: { tournamentId } });
    await tx.group.updateMany({ where: { tournamentId }, data: { advancementCriteria: null } });
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId }, select: { formatConfig: true } });
    let parsedConfig = {};
    if (tournament?.formatConfig) { try { parsedConfig = JSON.parse(tournament.formatConfig); } catch (_) {} }
    delete parsedConfig.advancedAt;
    await tx.tournament.update({ where: { id: tournamentId }, data: { formatConfig: JSON.stringify(parsedConfig) } });
  });

  return { success: true };
}
