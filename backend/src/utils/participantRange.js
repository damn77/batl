/**
 * Participant Range Utility
 * Determines which point table range to use based on tournament participant count
 * Feature: 008-tournament-rankings
 */

/**
 * Get the participant range category for a given number of participants
 * @param {number} participantCount - Number of participants in the tournament
 * @returns {string} Range string (e.g., "2-4", "5-8", "9-16", "17-32")
 * @throws {Error} If participant count is invalid
 */
export function getParticipantRange(participantCount) {
    if (!participantCount || participantCount < 2) {
        throw new Error('Tournament must have at least 2 participants');
    }

    if (participantCount <= 4) return '2-4';
    if (participantCount <= 8) return '5-8';
    if (participantCount <= 16) return '9-16';
    if (participantCount <= 32) return '17-32';

    // For tournaments larger than 32, use the 17-32 table
    return '17-32';
}

/**
 * Get all available participant ranges
 * @returns {string[]} Array of range strings
 */
export function getAllParticipantRanges() {
    return ['2-4', '5-8', '9-16', '17-32'];
}

/**
 * Parse a participant range string into min and max values
 * @param {string} range - Range string (e.g., "9-16")
 * @returns {{min: number, max: number}} Object with min and max values
 */
export function parseParticipantRange(range) {
    const [min, max] = range.split('-').map(Number);
    return { min, max };
}
