/**
 * Point Calculation Service
 * Calculates tournament points using placement-based or round-based methods
 * Feature: 008-tournament-rankings
 */

import prisma from '../lib/prisma.js';
import { getParticipantRange } from '../utils/participantRange.js';
import { getPointsForRound } from './pointTableService.js';
import { getRankingTypesForCategory } from '../utils/categoryHelpers.js';
import { getGroupStandings } from './groupStandingsService.js';

/**
 * Calculate points using placement-based formula
 * Formula: Points = (NumberOfParticipants - Placement + 1) × MultiplicativeValue
 * 
 * @param {number} participantCount - Total number of participants
 * @param {number} placement - Final placement (1 = first, 2 = second, etc.)
 * @param {number} multiplicativeValue - Multiplier (default: 2)
 * @param {boolean} doublePoints - Whether to double the points (default: false)
 * @returns {number} Calculated points
 */
export function calculatePlacementPoints(
    participantCount,
    placement,
    multiplicativeValue = 2,
    doublePoints = false
) {
    if (placement < 1 || placement > participantCount) {
        throw new Error(`Invalid placement: ${placement} for ${participantCount} participants`);
    }

    let points = (participantCount - placement + 1) * multiplicativeValue;

    if (doublePoints) {
        points *= 2;
    }

    return points;
}

/**
 * Calculate points using round-based formula
 * Points are determined by the last round won, based on point tables
 * 
 * @param {string} finalRoundReached - Last round won (e.g., "SEMIFINAL", "QUARTERFINAL")
 * @param {number} participantCount - Total number of participants
 * @param {boolean} isConsolation - Whether this is from consolation bracket
 * @param {boolean} doublePoints - Whether to double the points (default: false)
 * @returns {number} Calculated points
 */
export function calculateRoundPoints(
    finalRoundReached,
    participantCount,
    isConsolation = false,
    doublePoints = false
) {
    if (!finalRoundReached) {
        // No wins = 0 points
        return 0;
    }

    const participantRange = getParticipantRange(participantCount);
    let points = getPointsForRound(participantRange, finalRoundReached, isConsolation);

    if (doublePoints) {
        points *= 2;
    }

    return points;
}

/**
 * Award points for a singles tournament
 * Creates TournamentResult entries and updates RankingEntry for each participant
 * 
 * @param {string} tournamentId - Tournament ID
 * @param {Array} results - Array of {playerId, placement, finalRoundReached}
 * @param {Object} pointConfig - Tournament point configuration
 * @returns {Promise<Array>} Created tournament results
 */
export async function awardPointsSinglesTournament(tournamentId, results, pointConfig) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            category: true,
            tournamentRegistrations: true
        }
    });

    if (!tournament) {
        throw new Error(`Tournament not found: ${tournamentId}`);
    }

    const participantCount = tournament.tournamentRegistrations.length;
    const currentYear = new Date().getFullYear();

    // Get or create ranking for this category/year
    const ranking = await prisma.ranking.upsert({
        where: {
            categoryId_year_type: {
                categoryId: tournament.categoryId,
                year: currentYear,
                type: 'SINGLES'
            }
        },
        update: {},
        create: {
            categoryId: tournament.categoryId,
            year: currentYear,
            type: 'SINGLES'
        }
    });

    const createdResults = [];

    for (const result of results) {
        // Calculate points based on method
        let points = 0;
        if (pointConfig.calculationMethod === 'PLACEMENT') {
            points = calculatePlacementPoints(
                participantCount,
                result.placement,
                pointConfig.multiplicativeValue,
                pointConfig.doublePointsEnabled
            );
        } else if (pointConfig.calculationMethod === 'FINAL_ROUND') {
            points = calculateRoundPoints(
                result.finalRoundReached,
                participantCount,
                result.isConsolation || false,
                pointConfig.doublePointsEnabled
            );
        }

        // Get or create ranking entry
        const rankingEntry = await prisma.rankingEntry.upsert({
            where: {
                rankingId_playerId: {
                    rankingId: ranking.id,
                    playerId: result.playerId
                }
            },
            update: {},
            create: {
                rankingId: ranking.id,
                entityType: 'PLAYER',
                playerId: result.playerId,
                rank: 999 // Temporary rank, will be recalculated
            }
        });

        // Create tournament result
        const tournamentResult = await prisma.tournamentResult.create({
            data: {
                tournamentId,
                rankingEntryId: rankingEntry.id,
                entityType: 'PLAYER',
                playerId: result.playerId,
                placement: result.placement,
                finalRoundReached: result.finalRoundReached,
                pointsAwarded: points
            }
        });

        createdResults.push(tournamentResult);

        // Update ranking entry totals
        await updateRankingEntry(rankingEntry.id);
    }

    // Recalculate all ranks for this ranking
    await recalculateRanks(ranking.id);

    return createdResults;
}

/**
 * Award points for a doubles tournament
 * Creates results for both the pair and individual players
 * 
 * @param {string} tournamentId - Tournament ID
 * @param {Array} results - Array of {pairId, placement, finalRoundReached}
 * @param {Object} pointConfig - Tournament point configuration
 * @returns {Promise<Array>} Created tournament results
 */
export async function awardPointsDoublesTournament(tournamentId, results, pointConfig) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            category: true,
            pairRegistrations: {
                include: {
                    pair: {
                        include: {
                            player1: true,
                            player2: true
                        }
                    }
                }
            }
        }
    });

    if (!tournament) {
        throw new Error(`Tournament not found: ${tournamentId}`);
    }

    const participantCount = tournament.pairRegistrations.length;
    const currentYear = new Date().getFullYear();

    // Determine which ranking types to create based on category gender
    const rankingTypes = getRankingTypesForCategory(tournament.category);

    // Create/get rankings for each type
    const rankings = {};
    for (const type of rankingTypes) {
        rankings[type] = await prisma.ranking.upsert({
            where: {
                categoryId_year_type: {
                    categoryId: tournament.categoryId,
                    year: currentYear,
                    type
                }
            },
            update: {},
            create: {
                categoryId: tournament.categoryId,
                year: currentYear,
                type
            }
        });
    }

    const createdResults = [];

    for (const result of results) {
        // Calculate points
        let points = 0;
        if (pointConfig.calculationMethod === 'PLACEMENT') {
            points = calculatePlacementPoints(
                participantCount,
                result.placement,
                pointConfig.multiplicativeValue,
                pointConfig.doublePointsEnabled
            );
        } else if (pointConfig.calculationMethod === 'FINAL_ROUND') {
            points = calculateRoundPoints(
                result.finalRoundReached,
                participantCount,
                result.isConsolation || false,
                pointConfig.doublePointsEnabled
            );
        }

        // Get pair details
        const pair = await prisma.doublesPair.findUnique({
            where: { id: result.pairId },
            include: {
                player1: true,
                player2: true
            }
        });

        if (!pair) continue;

        // Award points to PAIR ranking
        const pairRankingEntry = await prisma.rankingEntry.upsert({
            where: {
                rankingId_pairId: {
                    rankingId: rankings.PAIR.id,
                    pairId: result.pairId
                }
            },
            update: {},
            create: {
                rankingId: rankings.PAIR.id,
                entityType: 'PAIR',
                pairId: result.pairId,
                rank: 999
            }
        });

        const pairResult = await prisma.tournamentResult.create({
            data: {
                tournamentId,
                rankingEntryId: pairRankingEntry.id,
                entityType: 'PAIR',
                pairId: result.pairId,
                placement: result.placement,
                finalRoundReached: result.finalRoundReached,
                pointsAwarded: points
            }
        });

        createdResults.push(pairResult);
        await updateRankingEntry(pairRankingEntry.id);

        // Award points to individual player rankings
        if (rankings.MEN && pair.player1.gender === 'MEN') {
            const player1Entry = await prisma.rankingEntry.upsert({
                where: {
                    rankingId_playerId: {
                        rankingId: rankings.MEN.id,
                        playerId: pair.player1Id
                    }
                },
                update: {},
                create: {
                    rankingId: rankings.MEN.id,
                    entityType: 'PLAYER',
                    playerId: pair.player1Id,
                    rank: 999
                }
            });

            const player1Result = await prisma.tournamentResult.create({
                data: {
                    tournamentId,
                    rankingEntryId: player1Entry.id,
                    entityType: 'PLAYER',
                    playerId: pair.player1Id,
                    placement: result.placement,
                    finalRoundReached: result.finalRoundReached,
                    pointsAwarded: points
                }
            });

            createdResults.push(player1Result);
            await updateRankingEntry(player1Entry.id);
        }

        if (rankings.WOMEN && pair.player1.gender === 'WOMEN') {
            const player1Entry = await prisma.rankingEntry.upsert({
                where: {
                    rankingId_playerId: {
                        rankingId: rankings.WOMEN.id,
                        playerId: pair.player1Id
                    }
                },
                update: {},
                create: {
                    rankingId: rankings.WOMEN.id,
                    entityType: 'PLAYER',
                    playerId: pair.player1Id,
                    rank: 999
                }
            });

            const player1Result = await prisma.tournamentResult.create({
                data: {
                    tournamentId,
                    rankingEntryId: player1Entry.id,
                    entityType: 'PLAYER',
                    playerId: pair.player1Id,
                    placement: result.placement,
                    finalRoundReached: result.finalRoundReached,
                    pointsAwarded: points
                }
            });

            createdResults.push(player1Result);
            await updateRankingEntry(player1Entry.id);
        }

        // Player 2
        if (rankings.MEN && pair.player2.gender === 'MEN') {
            const player2Entry = await prisma.rankingEntry.upsert({
                where: {
                    rankingId_playerId: {
                        rankingId: rankings.MEN.id,
                        playerId: pair.player2Id
                    }
                },
                update: {},
                create: {
                    rankingId: rankings.MEN.id,
                    entityType: 'PLAYER',
                    playerId: pair.player2Id,
                    rank: 999
                }
            });

            const player2Result = await prisma.tournamentResult.create({
                data: {
                    tournamentId,
                    rankingEntryId: player2Entry.id,
                    entityType: 'PLAYER',
                    playerId: pair.player2Id,
                    placement: result.placement,
                    finalRoundReached: result.finalRoundReached,
                    pointsAwarded: points
                }
            });

            createdResults.push(player2Result);
            await updateRankingEntry(player2Entry.id);
        }

        if (rankings.WOMEN && pair.player2.gender === 'WOMEN') {
            const player2Entry = await prisma.rankingEntry.upsert({
                where: {
                    rankingId_playerId: {
                        rankingId: rankings.WOMEN.id,
                        playerId: pair.player2Id
                    }
                },
                update: {},
                create: {
                    rankingId: rankings.WOMEN.id,
                    entityType: 'PLAYER',
                    playerId: pair.player2Id,
                    rank: 999
                }
            });

            const player2Result = await prisma.tournamentResult.create({
                data: {
                    tournamentId,
                    rankingEntryId: player2Entry.id,
                    entityType: 'PLAYER',
                    playerId: pair.player2Id,
                    placement: result.placement,
                    finalRoundReached: result.finalRoundReached,
                    pointsAwarded: points
                }
            });

            createdResults.push(player2Result);
            await updateRankingEntry(player2Entry.id);
        }
    }

    // Recalculate ranks for all ranking types
    for (const ranking of Object.values(rankings)) {
        await recalculateRanks(ranking.id);
    }

    return createdResults;
}

/**
 * Update ranking entry totals (points, tournament count, last date, seeding score)
 * @param {string} rankingEntryId - Ranking entry ID
 * @returns {Promise<Object>} Updated ranking entry
 */
export async function updateRankingEntry(rankingEntryId) {
    const entry = await prisma.rankingEntry.findUnique({
        where: { id: rankingEntryId },
        include: {
            tournamentResults: {
                orderBy: { awardDate: 'desc' }
            },
            ranking: {
                include: {
                    category: true
                }
            }
        }
    });

    if (!entry) {
        throw new Error(`Ranking entry not found: ${rankingEntryId}`);
    }

    const totalPoints = entry.tournamentResults.reduce(
        (sum, result) => sum + result.pointsAwarded,
        0
    );

    const tournamentCount = entry.tournamentResults.length;

    const lastTournamentDate = entry.tournamentResults.length > 0
        ? entry.tournamentResults[0].awardDate
        : null;

    // Calculate seeding score (sum of best N tournaments)
    const countedLimit = entry.ranking.category.countedTournamentsLimit || 7;
    const topResults = entry.tournamentResults
        .sort((a, b) => b.pointsAwarded - a.pointsAwarded)
        .slice(0, countedLimit);
    const seedingScore = topResults.reduce((sum, result) => sum + result.pointsAwarded, 0);

    return await prisma.rankingEntry.update({
        where: { id: rankingEntryId },
        data: {
            totalPoints,
            tournamentCount,
            lastTournamentDate,
            seedingScore
        }
    });
}

/**
 * Maps a consolation bracket round number to a standard round name.
 * The last round is always FINAL, counting back from there:
 *   totalRounds → FINAL
 *   totalRounds - 1 → SEMIFINAL
 *   totalRounds - 2 → QUARTERFINAL
 *   totalRounds - 3 → SECOND_ROUND
 *   totalRounds - 4 or earlier → FIRST_ROUND
 *
 * @param {number} roundNumber - 1-based round number within the consolation bracket
 * @param {number} totalRounds - Total number of rounds in the consolation bracket
 * @returns {string} Standard round name
 */
export function roundNumberToName(roundNumber, totalRounds) {
    const fromEnd = totalRounds - roundNumber; // 0 = last round (FINAL)
    if (fromEnd === 0) return 'FINAL';
    if (fromEnd === 1) return 'SEMIFINAL';
    if (fromEnd === 2) return 'QUARTERFINAL';
    if (fromEnd === 3) return 'FIRST_ROUND';
    return 'FIRST_ROUND';
}

/**
 * Derive consolation bracket results for a tournament.
 * Returns one entry per player/pair who won at least one consolation match,
 * with their highest round reached (the highest round number they won in).
 *
 * Players/pairs with zero consolation wins are not included.
 *
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Array<{playerId?: string, pairId?: string, finalRoundReached: string, isConsolation: true}>>}
 */
export async function deriveConsolationResults(tournamentId) {
    // Find the CONSOLATION bracket for this tournament
    const consolationBracket = await prisma.bracket.findFirst({
        where: { tournamentId, bracketType: 'CONSOLATION' }
    });

    if (!consolationBracket) {
        return [];
    }

    // Get all rounds in the consolation bracket, ordered by round number
    const rounds = await prisma.round.findMany({
        where: { bracketId: consolationBracket.id },
        orderBy: { roundNumber: 'asc' }
    });

    if (rounds.length === 0) {
        return [];
    }

    const totalRounds = rounds.length;

    // Build a map of roundId → roundNumber for fast lookup
    const roundIdToNumber = {};
    for (const round of rounds) {
        roundIdToNumber[round.id] = round.roundNumber;
    }

    // Get all completed (non-bye) matches in this consolation bracket
    const matches = await prisma.match.findMany({
        where: {
            bracketId: consolationBracket.id,
            status: 'COMPLETED',
            isBye: false
        }
    });

    // Determine tournament type (singles vs doubles)
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { category: { select: { type: true } } }
    });

    const isDoubles = tournament?.category?.type && tournament.category.type !== 'SINGLES';

    // Track each winner's highest round number won
    // key: playerId or pairId, value: highest round number
    const winnerHighestRound = {};

    for (const match of matches) {
        const resultJson = typeof match.result === 'string'
            ? JSON.parse(match.result)
            : match.result;

        if (!resultJson?.winner) continue;

        const roundNumber = roundIdToNumber[match.roundId];
        if (roundNumber === undefined) continue;

        let winnerId;
        if (isDoubles) {
            winnerId = resultJson.winner === 'PLAYER1' ? match.pair1Id : match.pair2Id;
        } else {
            winnerId = resultJson.winner === 'PLAYER1' ? match.player1Id : match.player2Id;
        }

        if (!winnerId) continue;

        // Record highest round number won by this player/pair
        if (winnerHighestRound[winnerId] === undefined || roundNumber > winnerHighestRound[winnerId]) {
            winnerHighestRound[winnerId] = roundNumber;
        }
    }

    // Build result entries
    const results = [];
    for (const [id, highestRound] of Object.entries(winnerHighestRound)) {
        const finalRoundReached = roundNumberToName(highestRound, totalRounds);
        const entry = isDoubles
            ? { pairId: id, finalRoundReached, isConsolation: true }
            : { playerId: id, finalRoundReached, isConsolation: true };
        results.push(entry);
    }

    return results;
}

/**
 * Recalculate ranks for all entries in a ranking
 * @param {string} rankingId - Ranking ID
 * @returns {Promise<void>}
 */
export async function recalculateRanks(rankingId) {
    const entries = await prisma.rankingEntry.findMany({
        where: { rankingId },
        include: {
            player: true,
            pair: {
                include: {
                    player1: true,
                    player2: true
                }
            }
        },
        orderBy: [
            { totalPoints: 'desc' },
            { lastTournamentDate: 'desc' },
            { tournamentCount: 'asc' }
        ]
    });

    // Update ranks
    for (let i = 0; i < entries.length; i++) {
        await prisma.rankingEntry.update({
            where: { id: entries[i].id },
            data: { rank: i + 1 }
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP / COMBINED format point calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive placement results from group standings for a tournament.
 *
 * Reads group standings via getGroupStandings() for each group of the tournament.
 * Throws UNRESOLVED_TIES if any group has unresolved tied positions (D-11).
 *
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Array<{groupId, groupSize, results: Array<{playerId?, pairId?, placement}>}>>}
 */
export async function deriveGroupResults(tournamentId) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { category: { select: { type: true } } }
    });

    if (!tournament) {
        throw new Error(`Tournament not found: ${tournamentId}`);
    }

    const isDoubles = tournament.category.type !== 'SINGLES';

    const groups = await prisma.group.findMany({
        where: { tournamentId },
        select: { id: true, groupSize: true }
    });

    const groupResults = [];

    for (const group of groups) {
        const { standings, unresolvedTies } = await getGroupStandings(group.id);

        if (unresolvedTies && unresolvedTies.length > 0) {
            const err = new Error(
                `Cannot calculate points: unresolved tied positions exist in one or more groups. ` +
                `Resolve ties using the manual override before calculating points.`
            );
            err.code = 'UNRESOLVED_TIES';
            err.details = { groups: unresolvedTies };
            throw err;
        }

        const results = standings.map(entry => ({
            [isDoubles ? 'pairId' : 'playerId']: entry.entity.id,
            placement: entry.position
        }));

        groupResults.push({
            groupId: group.id,
            groupSize: group.groupSize,
            results
        });
    }

    return groupResults;
}

/**
 * Compute tier offsets for COMBINED tournament point hierarchy (D-07).
 *
 * Guarantees: worst main bracket result > best secondary bracket result > best group-only result.
 *
 * @param {number} largestGroupSize - Size of the largest group (use max group.groupSize)
 * @param {Object} pointConfig - { multiplicativeValue, doublePointsEnabled }
 * @param {number} secondaryBracketSize - Number of participants in the secondary bracket (0 if none)
 * @returns {{ mainOffset: number, secondaryOffset: number }}
 */
export function computeTierOffsets(largestGroupSize, pointConfig, secondaryBracketSize) {
    const { multiplicativeValue = 2, doublePointsEnabled = false } = pointConfig;

    // Max points possible from group placement = 1st in the largest group
    const maxGroupPoints = calculatePlacementPoints(largestGroupSize, 1, multiplicativeValue, doublePointsEnabled);

    // Secondary bracket offset: any secondary bracket result exceeds best group result
    const secondaryOffset = maxGroupPoints + 1;

    // Max points in secondary bracket = 1st place in secondary + secondaryOffset
    const maxSecondaryPoints = secondaryBracketSize > 0
        ? calculatePlacementPoints(secondaryBracketSize, 1, multiplicativeValue, doublePointsEnabled) + secondaryOffset
        : secondaryOffset;

    // Main bracket offset: any main bracket result exceeds best secondary result
    const mainOffset = maxSecondaryPoints + 1;

    return { mainOffset, secondaryOffset };
}

/**
 * Award ranking points to singles players from group results.
 *
 * Uses group.groupSize as the participant count for calculatePlacementPoints (D-02).
 * An optional offset is added to all points (for COMBINED tournament tier hierarchy, D-07).
 *
 * @param {string} tournamentId - Tournament ID
 * @param {Array<{groupId, groupSize, results: Array<{playerId, placement}>}>} groupResults - From deriveGroupResults
 * @param {Object} pointConfig - { calculationMethod, multiplicativeValue, doublePointsEnabled }
 * @param {number} [offset=0] - Additional points offset (for COMBINED tier hierarchy)
 * @returns {Promise<Array>} Created TournamentResult records
 */
export async function awardGroupPointsSingles(tournamentId, groupResults, pointConfig, offset = 0) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { categoryId: true, category: true }
    });

    if (!tournament) {
        throw new Error(`Tournament not found: ${tournamentId}`);
    }

    const currentYear = new Date().getFullYear();

    // Get or create SINGLES ranking for this category/year
    const ranking = await prisma.ranking.upsert({
        where: {
            categoryId_year_type: {
                categoryId: tournament.categoryId,
                year: currentYear,
                type: 'SINGLES'
            }
        },
        update: {},
        create: {
            categoryId: tournament.categoryId,
            year: currentYear,
            type: 'SINGLES'
        }
    });

    const createdResults = [];

    for (const group of groupResults) {
        const participantCount = group.groupSize;

        for (const result of group.results) {
            // Always use PLACEMENT formula for group points (D-01)
            const basePoints = calculatePlacementPoints(
                participantCount,
                result.placement,
                pointConfig.multiplicativeValue,
                pointConfig.doublePointsEnabled
            );
            const points = basePoints + offset;

            const rankingEntry = await prisma.rankingEntry.upsert({
                where: {
                    rankingId_playerId: {
                        rankingId: ranking.id,
                        playerId: result.playerId
                    }
                },
                update: {},
                create: {
                    rankingId: ranking.id,
                    entityType: 'PLAYER',
                    playerId: result.playerId,
                    rank: 999
                }
            });

            const tournamentResult = await prisma.tournamentResult.create({
                data: {
                    tournamentId,
                    rankingEntryId: rankingEntry.id,
                    entityType: 'PLAYER',
                    playerId: result.playerId,
                    placement: result.placement,
                    pointsAwarded: points
                }
            });

            createdResults.push(tournamentResult);
            await updateRankingEntry(rankingEntry.id);
        }
    }

    await recalculateRanks(ranking.id);

    return createdResults;
}

/**
 * Award ranking points to doubles pairs and individual players from group results.
 *
 * Follows the same structure as awardPointsDoublesTournament but uses group.groupSize
 * as the participant count (D-02) and supports an offset (D-07).
 *
 * @param {string} tournamentId - Tournament ID
 * @param {Array<{groupId, groupSize, results: Array<{pairId, placement}>}>} groupResults - From deriveGroupResults
 * @param {Object} pointConfig - { calculationMethod, multiplicativeValue, doublePointsEnabled }
 * @param {number} [offset=0] - Additional points offset (for COMBINED tier hierarchy)
 * @returns {Promise<Array>} Created TournamentResult records
 */
export async function awardGroupPointsDoubles(tournamentId, groupResults, pointConfig, offset = 0) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { categoryId: true, category: true }
    });

    if (!tournament) {
        throw new Error(`Tournament not found: ${tournamentId}`);
    }

    const currentYear = new Date().getFullYear();
    const rankingTypes = getRankingTypesForCategory(tournament.category);

    // Create/get rankings for each type
    const rankings = {};
    for (const type of rankingTypes) {
        rankings[type] = await prisma.ranking.upsert({
            where: {
                categoryId_year_type: {
                    categoryId: tournament.categoryId,
                    year: currentYear,
                    type
                }
            },
            update: {},
            create: {
                categoryId: tournament.categoryId,
                year: currentYear,
                type
            }
        });
    }

    const createdResults = [];

    for (const group of groupResults) {
        const participantCount = group.groupSize;

        for (const result of group.results) {
            // Always use PLACEMENT formula for group points (D-01)
            const basePoints = calculatePlacementPoints(
                participantCount,
                result.placement,
                pointConfig.multiplicativeValue,
                pointConfig.doublePointsEnabled
            );
            const points = basePoints + offset;

            // Get pair details for individual player rankings
            const pair = await prisma.doublesPair.findUnique({
                where: { id: result.pairId },
                include: {
                    player1: true,
                    player2: true
                }
            });

            if (!pair) continue;

            // Award PAIR ranking points
            const pairRankingEntry = await prisma.rankingEntry.upsert({
                where: {
                    rankingId_pairId: {
                        rankingId: rankings.PAIR.id,
                        pairId: result.pairId
                    }
                },
                update: {},
                create: {
                    rankingId: rankings.PAIR.id,
                    entityType: 'PAIR',
                    pairId: result.pairId,
                    rank: 999
                }
            });

            const pairTournamentResult = await prisma.tournamentResult.create({
                data: {
                    tournamentId,
                    rankingEntryId: pairRankingEntry.id,
                    entityType: 'PAIR',
                    pairId: result.pairId,
                    placement: result.placement,
                    pointsAwarded: points
                }
            });

            createdResults.push(pairTournamentResult);
            await updateRankingEntry(pairRankingEntry.id);

            // Award individual player ranking points
            const players = [
                { id: pair.player1Id, gender: pair.player1.gender },
                { id: pair.player2Id, gender: pair.player2.gender }
            ];

            for (const player of players) {
                // Determine which ranking this player belongs to (MEN or WOMEN)
                const playerRankingType = player.gender === 'MEN' ? 'MEN' : 'WOMEN';
                if (!rankings[playerRankingType]) continue;

                const playerEntry = await prisma.rankingEntry.upsert({
                    where: {
                        rankingId_playerId: {
                            rankingId: rankings[playerRankingType].id,
                            playerId: player.id
                        }
                    },
                    update: {},
                    create: {
                        rankingId: rankings[playerRankingType].id,
                        entityType: 'PLAYER',
                        playerId: player.id,
                        rank: 999
                    }
                });

                const playerResult = await prisma.tournamentResult.create({
                    data: {
                        tournamentId,
                        rankingEntryId: playerEntry.id,
                        entityType: 'PLAYER',
                        playerId: player.id,
                        placement: result.placement,
                        pointsAwarded: points
                    }
                });

                createdResults.push(playerResult);
                await updateRankingEntry(playerEntry.id);
            }
        }
    }

    // Recalculate ranks for all ranking types
    for (const ranking of Object.values(rankings)) {
        await recalculateRanks(ranking.id);
    }

    return createdResults;
}

/**
 * Derive placement results from completed bracket matches for a COMBINED tournament.
 *
 * Reads all completed matches in the given bracket and derives final placements:
 *   - Winner of the highest round = placement 1
 *   - Loser of the highest round = placement 2
 *   - Losers of round (highestRound - 1) = placement 3
 *   - Losers of round R get placement = 2^(highestRound - R) + 1
 *
 * @param {string} tournamentId - Tournament ID
 * @param {string} bracketId - Bracket ID to read matches from
 * @param {boolean} isDoubles - Whether to use pairId (true) or playerId (false)
 * @returns {Promise<Array<{playerId?, pairId?, placement}>>}
 */
export async function deriveKnockoutResults(tournamentId, bracketId, isDoubles) {
    const matches = await prisma.match.findMany({
        where: {
            bracketId,
            status: 'COMPLETED',
            isBye: { not: true }
        },
        orderBy: { roundNumber: 'desc' },
        select: {
            roundNumber: true,
            player1Id: true,
            player2Id: true,
            pair1Id: true,
            pair2Id: true,
            winnerId: true,
            winnerPairId: true,
            result: true
        }
    });

    if (matches.length === 0) {
        return [];
    }

    // Find the highest round number (the final round)
    const highestRound = matches[0].roundNumber;

    // Track placements: entityId → placement
    const placements = {};

    for (const match of matches) {
        // Parse result to find winner
        let resultData;
        try {
            resultData = typeof match.result === 'string'
                ? JSON.parse(match.result)
                : match.result;
        } catch {
            continue;
        }

        if (!resultData?.winner) continue;

        // Determine entity IDs for this match
        let entity1Id, entity2Id, winnerId;
        if (isDoubles) {
            entity1Id = match.pair1Id;
            entity2Id = match.pair2Id;
            winnerId = resultData.winner === 'PLAYER1' ? entity1Id : entity2Id;
        } else {
            entity1Id = match.player1Id;
            entity2Id = match.player2Id;
            winnerId = resultData.winner === 'PLAYER1' ? entity1Id : entity2Id;
        }

        if (!entity1Id || !entity2Id) continue;

        const loserId = winnerId === entity1Id ? entity2Id : entity1Id;

        // Winner of final = placement 1
        if (match.roundNumber === highestRound) {
            placements[winnerId] = 1;
            placements[loserId] = 2;
        } else {
            // Loser in round R gets placement: 2^(highestRound - R) + 1
            const roundsFromFinal = highestRound - match.roundNumber;
            const loserPlacement = Math.pow(2, roundsFromFinal) + 1;
            // Only set placement if not already set by a later round (later rounds have priority)
            if (placements[loserId] === undefined) {
                placements[loserId] = loserPlacement;
            }
        }

        // Winners in non-final rounds advance — their placement is set when they eventually lose
        // (or win the final). Only set winner placement if not already determined.
        if (match.roundNumber < highestRound && placements[winnerId] === undefined) {
            // Will be resolved by a later match — leave undefined for now
        }
    }

    // Build results array
    const results = Object.entries(placements).map(([entityId, placement]) => ({
        [isDoubles ? 'pairId' : 'playerId']: entityId,
        placement
    }));

    return results;
}
