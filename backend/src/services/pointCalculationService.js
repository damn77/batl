/**
 * Point Calculation Service
 * Calculates tournament points using placement-based or round-based methods
 * Feature: 008-tournament-rankings
 */

import { PrismaClient } from '@prisma/client';
import { getParticipantRange } from '../utils/participantRange.js';
import { getPointsForRound } from './pointTableService.js';
import { getRankingTypesForCategory } from '../utils/categoryHelpers.js';

const prisma = new PrismaClient();

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
async function updateRankingEntry(rankingEntryId) {
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
 * Recalculate ranks for all entries in a ranking
 * @param {string} rankingId - Ranking ID
 * @returns {Promise<void>}
 */
async function recalculateRanks(rankingId) {
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
