/**
 * Ranking Calculator Utility
 * Implements multi-level tiebreaker logic for ranking entries
 * Feature: 008-tournament-rankings
 * 
 * Tiebreaker hierarchy (FR-005):
 * 1. Total points (descending)
 * 2. Most recent tournament date (more recent = higher rank)
 * 3. Fewest tournaments played (fewer = higher rank)
 * 4. Alphabetical by entity name (A-Z)
 */

/**
 * Compare two ranking entries and return sort order
 * @param {Object} a - First ranking entry
 * @param {Object} b - Second ranking entry
 * @param {Function} getEntityName - Function to get entity name (player or pair)
 * @returns {number} -1 if a ranks higher, 1 if b ranks higher, 0 if equal
 */
export function compareRankingEntries(a, b, getEntityName) {
    // 1. Compare total points (higher is better)
    if (a.totalPoints !== b.totalPoints) {
        return b.totalPoints - a.totalPoints; // Descending order
    }

    // 2. Compare most recent tournament date (more recent is better)
    const aDate = a.lastTournamentDate ? new Date(a.lastTournamentDate).getTime() : 0;
    const bDate = b.lastTournamentDate ? new Date(b.lastTournamentDate).getTime() : 0;

    if (aDate !== bDate) {
        return bDate - aDate; // More recent first
    }

    // 3. Compare tournament count (fewer is better - rewards consistency)
    if (a.tournamentCount !== b.tournamentCount) {
        return a.tournamentCount - b.tournamentCount; // Ascending order
    }

    // 4. Alphabetical by entity name (A-Z)
    const aName = getEntityName(a);
    const bName = getEntityName(b);
    return aName.localeCompare(bName);
}

/**
 * Sort and assign ranks to ranking entries
 * @param {Array} entries - Array of ranking entries
 * @param {Function} getEntityName - Function to get entity name for tiebreaking
 * @returns {Array} Sorted entries with assigned ranks
 */
export function calculateRanks(entries, getEntityName) {
    if (!entries || entries.length === 0) {
        return [];
    }

    // Sort entries using tiebreaker logic
    const sortedEntries = [...entries].sort((a, b) =>
        compareRankingEntries(a, b, getEntityName)
    );

    // Assign ranks (1-indexed)
    return sortedEntries.map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));
}

/**
 * Calculate seeding score from best N tournament results
 * @param {Array} tournamentResults - Array of tournament result objects with pointsAwarded
 * @param {number} countedTournamentsLimit - Number of best tournaments to count (default: 7)
 * @returns {number} Sum of top N tournament points
 */
export function calculateSeedingScore(tournamentResults, countedTournamentsLimit = 7) {
    if (!tournamentResults || tournamentResults.length === 0) {
        return 0;
    }

    // Sort by points awarded (descending) and take top N
    const topResults = tournamentResults
        .sort((a, b) => b.pointsAwarded - a.pointsAwarded)
        .slice(0, countedTournamentsLimit);

    // Sum the points
    return topResults.reduce((sum, result) => sum + result.pointsAwarded, 0);
}

/**
 * Get entity name for ranking entry (player or pair)
 * @param {Object} entry - Ranking entry with player or pair populated
 * @returns {string} Entity name for sorting
 */
export function getEntityNameFromEntry(entry) {
    if (entry.player) {
        return entry.player.name;
    }

    if (entry.pair) {
        // For pairs, combine both player names alphabetically
        const player1Name = entry.pair.player1?.name || '';
        const player2Name = entry.pair.player2?.name || '';
        return `${player1Name} / ${player2Name}`;
    }

    return ''; // Fallback for entries without populated relations
}
