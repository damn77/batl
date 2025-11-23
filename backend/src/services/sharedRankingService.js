// Shared Ranking Service
// Abstracts common logic for ranking calculations (Singles & Doubles)

/**
 * Calculate win rate from wins and losses
 * @param {number} wins
 * @param {number} losses
 * @returns {number} Win rate as decimal (0.0 to 1.0)
 */
export function calculateWinRate(wins, losses) {
    const totalMatches = wins + losses;
    if (totalMatches === 0) return 0;
    return Number((wins / totalMatches).toFixed(3));
}

/**
 * Format ranking data with calculated fields
 * @param {Object} ranking - Raw ranking object
 * @returns {Object} Formatted ranking with win rate
 */
export function formatRanking(ranking) {
    return {
        rank: ranking.rank,
        points: ranking.points,
        wins: ranking.wins,
        losses: ranking.losses,
        winRate: calculateWinRate(ranking.wins, ranking.losses),
        lastUpdated: ranking.updatedAt || ranking.lastUpdated
    };
}

/**
 * Format leaderboard with pagination
 * @param {Array} rankings - Array of ranking objects
 * @param {Object} pagination - Pagination info
 * @returns {Object} Formatted leaderboard
 */
export function formatLeaderboard(rankings, pagination = {}) {
    const formattedRankings = rankings.map(formatRanking);

    return {
        rankings: formattedRankings,
        pagination,
        lastUpdated: rankings.length > 0
            ? rankings[0].updatedAt || rankings[0].lastUpdated || new Date()
            : new Date()
    };
}

export default {
    calculateWinRate,
    formatRanking,
    formatLeaderboard
};
