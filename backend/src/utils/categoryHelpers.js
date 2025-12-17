/**
 * Determine which ranking types to create based on category type and gender
 * @param {Object} category - Category object with type and gender
 * @returns {Array<string>} List of ranking types (SINGLES, PAIR, MEN, WOMEN)
 */
export function getRankingTypesForCategory(category) {
    const rankingTypes = [];

    if (category.type === 'SINGLES') {
        rankingTypes.push('SINGLES');
    } else if (category.type === 'DOUBLES') {
        // Always create pair ranking for doubles
        rankingTypes.push('PAIR');

        // Add individual rankings based on gender
        if (category.gender === 'MEN') {
            rankingTypes.push('MEN');
        } else if (category.gender === 'WOMEN') {
            rankingTypes.push('WOMEN');
        } else if (category.gender === 'MIXED') {
            rankingTypes.push('MEN', 'WOMEN');
        }
    }

    return rankingTypes;
}
