import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for bracket templates
let bracketCache = null;

/**
 * Load bracket templates from JSON file
 * @returns {Promise<Array>} Array of bracket templates
 * @throws {Error} If file cannot be loaded or parsed
 */
async function loadBracketTemplates() {
  if (bracketCache) {
    return bracketCache;
  }

  try {
    const filePath = path.join(__dirname, '../../../docs/bracket-templates-all.json');
    const data = await readFile(filePath, 'utf-8');
    bracketCache = JSON.parse(data);
    return bracketCache;
  } catch (error) {
    throw new Error(`Failed to load bracket templates: ${error.message}`);
  }
}

/**
 * Calculate bracket size (next power of 2 >= player count)
 * @param {number} playerCount - Number of players
 * @returns {number} Bracket size
 */
function calculateBracketSize(playerCount) {
  return Math.pow(2, Math.ceil(Math.log2(playerCount)));
}

/**
 * Calculate number of preliminary matches from structure
 * Each "0" represents one preliminary match (a bracket pair where 2 players compete)
 * @param {string} structure - Bracket structure string
 * @returns {number} Number of preliminary matches
 */
function calculatePreliminaryMatches(structure) {
  const cleanStructure = structure.replace(/\s/g, '');
  const matchCount = cleanStructure.split('').filter(c => c === '0').length;
  return matchCount;
}

/**
 * Calculate number of byes from structure
 * Each "1" represents one bye (a bracket pair where 1 player advances automatically)
 * @param {string} structure - Bracket structure string
 * @returns {number} Number of byes
 */
function calculateByes(structure) {
  const cleanStructure = structure.replace(/\s/g, '');
  return cleanStructure.split('').filter(c => c === '1').length;
}

/**
 * Validate player count
 * @param {number} playerCount - Player count to validate
 * @throws {Error} If player count is invalid
 */
function validatePlayerCount(playerCount) {
  // Check if it's a number
  if (typeof playerCount !== 'number' || isNaN(playerCount)) {
    throw new Error('Player count must be a number');
  }

  // Check if it's an integer
  if (!Number.isInteger(playerCount)) {
    throw new Error('Player count must be an integer');
  }

  // Check range
  if (playerCount < 4) {
    throw new Error('Player count must be at least 4');
  }

  if (playerCount > 128) {
    throw new Error('Player count cannot exceed 128');
  }
}

/**
 * Get bracket structure and calculated fields for a given player count
 * @param {number} playerCount - Number of players (4-128)
 * @returns {Promise<Object>} Bracket information with calculated fields
 * @throws {Error} If player count is invalid or template not found
 */
export async function getBracketByPlayerCount(playerCount) {
  // Validate input
  validatePlayerCount(playerCount);

  // Load templates
  const templates = await loadBracketTemplates();

  // Find template for this player count
  const template = templates.find(t => t.key === String(playerCount));

  if (!template) {
    throw new Error(`No bracket template found for ${playerCount} players`);
  }

  // Calculate derived fields
  const bracketSize = calculateBracketSize(playerCount);
  const preliminaryMatches = calculatePreliminaryMatches(template.value);
  const byes = calculateByes(template.value);

  return {
    playerCount,
    structure: template.value,
    preliminaryMatches,
    byes,
    bracketSize
  };
}

/**
 * Seeding configuration ranges based on player count
 * Source: notes/009-knockout-bracket-generation.md
 *
 * - 4-9 players: 2 seeded
 * - 10-19 players: 4 seeded
 * - 20-39 players: 8 seeded
 * - 40-128 players: 16 seeded
 */
const SEEDING_RANGES = [
  { min: 4, max: 9, seededPlayers: 2 },
  { min: 10, max: 19, seededPlayers: 4 },
  { min: 20, max: 39, seededPlayers: 8 },
  { min: 40, max: 128, seededPlayers: 16 }
];

/**
 * Get seeding configuration for a given player count
 * Returns the number of players that should be seeded based on tournament size
 * @param {number} playerCount - Number of players (4-128)
 * @returns {Object} Seeding configuration with range information
 * @throws {Error} If player count is invalid
 */
export function getSeedingConfig(playerCount) {
  // Validate input
  validatePlayerCount(playerCount);

  // Find the appropriate seeding range
  const seedingRange = SEEDING_RANGES.find(
    range => playerCount >= range.min && playerCount <= range.max
  );

  if (!seedingRange) {
    // This should never happen if validation is correct, but defensive programming
    throw new Error(`No seeding configuration found for ${playerCount} players`);
  }

  return {
    playerCount,
    seededPlayers: seedingRange.seededPlayers,
    range: {
      min: seedingRange.min,
      max: seedingRange.max
    },
    note: 'Seeding positions within the bracket are determined manually by organizers'
  };
}

// Export all functions for testing
export {
  loadBracketTemplates,
  calculateBracketSize,
  calculatePreliminaryMatches,
  calculateByes,
  validatePlayerCount
};
