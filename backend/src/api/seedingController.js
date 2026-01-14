import * as seedingService from '../services/seedingService.js';
import * as seedingPlacementService from '../services/seedingPlacementService.js';
import { generateBracketSchema } from './validators/seedingValidator.js';
import { logAudit, AuditActions } from '../services/auditService.js';

/**
 * GET /api/v1/seeding-score/:entityType/:entityId/category/:categoryId
 *
 * Retrieves the seeding score for a specific player or pair in a category.
 * Seeding score is calculated from the top N tournament results (default 7).
 * Integrates with Feature 008 (tournament-rankings) for score calculation.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.entityType - Entity type ('PLAYER' or 'PAIR')
 * @param {string} req.params.entityId - Player or pair ID
 * @param {string} req.params.categoryId - Category ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @returns {Promise<void>} JSON response with seeding score
 *
 * @example
 * // GET /api/v1/seeding-score/PLAYER/p123/category/cat-456
 * // Response:
 * // {
 * //   success: true,
 * //   data: { seedingScore: 750 }
 * // }
 *
 * Retrieves the seeding score for a specific player or pair in a category.
 * Seeding score is calculated from the top N tournament results (default 7).
 * Integrates with Feature 008 (tournament-rankings) for score calculation.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.entityType - Entity type ('PLAYER' or 'PAIR')
 * @param {string} req.params.entityId - Player or pair ID
 * @param {string} req.params.categoryId - Category ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @returns {Promise<void>} JSON response with seeding score
 *
 * @example
 * // GET /api/v1/seeding-score/PLAYER/p123/category/cat-456
 * // Response:
 * // {
 * //   success: true,
 * //   data: { seedingScore: 750 }
 * // }
 */
export async function getSeedingScore(req, res, next) {
    try {
        const { entityType, entityId, categoryId } = req.params;
        const score = await seedingService.getSeedingScore(entityType.toUpperCase(), entityId, categoryId);
        return res.status(200).json({ success: true, data: { seedingScore: score } });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/seeding-score/bulk
 *
 * Calculates seeding scores for multiple players or pairs in batch.
 * Useful for bracket generation and tournament setup where multiple
 * seeding scores are needed simultaneously.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.categoryId - Category ID for score calculation
 * @param {Array<Object>} req.body.entities - Array of entities to score
 * @param {string} req.body.entities[].entityType - Entity type ('PLAYER' or 'PAIR')
 * @param {string} req.body.entities[].entityId - Entity ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @returns {Promise<void>} JSON response with array of seeding scores
 *
 * @example
 * // POST /api/v1/seeding-score/bulk
 * // Request:
 * // {
 * //   categoryId: "cat-123",
 * //   entities: [
 * //     { entityType: "PLAYER", entityId: "p1" },
 * //     { entityType: "PLAYER", entityId: "p2" },
 * //     { entityType: "PAIR", entityId: "pair-5" }
 * //   ]
 * // }
 * // Response:
 * // {
 * //   success: true,
 * //   data: [
 * //     { entityType: "PLAYER", entityId: "p1", seedingScore: 750 },
 * //     { entityType: "PLAYER", entityId: "p2", seedingScore: 680 },
 * //     { entityType: "PAIR", entityId: "pair-5", seedingScore: 820 }
 * //   ]
 * // }
 *
 * Calculates seeding scores for multiple players or pairs in batch.
 * Useful for bracket generation and tournament setup where multiple
 * seeding scores are needed simultaneously.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.categoryId - Category ID for score calculation
 * @param {Array<Object>} req.body.entities - Array of entities to score
 * @param {string} req.body.entities[].entityType - Entity type ('PLAYER' or 'PAIR')
 * @param {string} req.body.entities[].entityId - Entity ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @returns {Promise<void>} JSON response with array of seeding scores
 *
 * @example
 * // POST /api/v1/seeding-score/bulk
 * // Request:
 * // {
 * //   categoryId: "cat-123",
 * //   entities: [
 * //     { entityType: "PLAYER", entityId: "p1" },
 * //     { entityType: "PLAYER", entityId: "p2" },
 * //     { entityType: "PAIR", entityId: "pair-5" }
 * //   ]
 * // }
 * // Response:
 * // {
 * //   success: true,
 * //   data: [
 * //     { entityType: "PLAYER", entityId: "p1", seedingScore: 750 },
 * //     { entityType: "PLAYER", entityId: "p2", seedingScore: 680 },
 * //     { entityType: "PAIR", entityId: "pair-5", seedingScore: 820 }
 * //   ]
 * // }
 */
export async function bulkCalculateSeedingScores(req, res, next) {
    try {
        const { categoryId, entities } = req.body;
        const scores = await seedingService.bulkCalculateSeedingScores(categoryId, entities);
        return res.status(200).json({ success: true, data: scores });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/seeding/generate-bracket
 *
 * Generate a seeded tournament bracket with optimal placement.
 *
 * This is the main API endpoint for Feature 010-seeding-placement. It orchestrates
 * the entire bracket generation process by:
 * 1. Validating the request (categoryId, playerCount, optional randomSeed)
 * 2. Retrieving bracket structure from Feature 009
 * 3. Fetching top N ranked players/pairs from Feature 008
 * 4. Applying appropriate seeding algorithm (2, 4, 8, or 16-seed)
 * 5. Returning complete bracket with positions and metadata
 *
 * Supports tournaments with 4-128 players using recursive seeding algorithms
 * with fair randomization for lower seeds.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.categoryId - Category ID for ranking/seeding lookup
 * @param {number} req.body.playerCount - Total participants (4-128)
 * @param {string} [req.body.randomSeed] - Optional deterministic seed for testing
 * @param {Object} res - Express response object
 *
 * @returns {Promise<void>} JSON response with generated bracket
 *
 * @throws {400} VALIDATION_ERROR - Invalid request parameters
 * @throws {400} INVALID_PLAYER_COUNT - Player count outside 4-128 range
 * @throws {404} CATEGORY_NOT_FOUND - No rankings found for category
 * @throws {404} INSUFFICIENT_RANKINGS - Not enough ranked players for seeding
 * @throws {500} INTERNAL_ERROR - Unexpected server error
 *
 * @example
 * // POST /api/v1/seeding/generate-bracket
 * // Request:
 * // {
 * //   categoryId: "cat-123",
 * //   playerCount: 11
 * // }
 * // Response:
 * // {
 * //   success: true,
 * //   data: {
 * //     bracket: {
 * //       categoryId: "cat-123",
 * //       playerCount: 11,
 * //       bracketSize: 16,
 * //       structure: "1110 0101",
 * //       seedCount: 4,
 * //       positions: [
 * //         { positionNumber: 1, seed: 1, entityId: "p1", entityName: "Alice", isBye: true, ... },
 * //         { positionNumber: 2, seed: null, entityId: null, isBye: true, ... },
 * //         ...
 * //       ],
 * //       randomSeed: "a3f5c8b9d2e1f4a6...",
 * //       generatedAt: "2026-01-14T12:00:00.000Z"
 * //     },
 * //     seedingInfo: {
 * //       seedCount: 4,
 * //       seedRange: { min: 10, max: 19 },
 * //       note: "Seeding positions are determined by category rankings..."
 * //     }
 * //   }
 * // }
 *
 * @example
 * // Error response: Insufficient rankings
 * // {
 * //   success: false,
 * //   error: {
 * //     code: "INSUFFICIENT_RANKINGS",
 * //     message: "Not enough ranked players for seeding",
 * //     details: {
 * //       categoryId: "cat-123",
 * //       requiredSeeds: 4,
 * //       availableRankings: 2
 * //     }
 * //   }
 * // }
 */
export async function generateBracket(req, res) {
    // Implementation in T025 (User Story 1)
    try {
        // Validate request
        const { error, value } = generateBracketSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: {
                        violations: error.details.map(detail => ({
                            field: detail.path.join('.'),
                            message: detail.message
                        }))
                    }
                }
            });
        }

        const { categoryId, playerCount, randomSeed } = value;

        // Generate seeded bracket using seeding placement service
        const result = await seedingPlacementService.generateSeededBracket(
            categoryId,
            playerCount,
            randomSeed
        );

        // Log audit event for bracket generation (T111)
        logAudit({
            userId: req.user?.id || null,
            action: AuditActions.BRACKET_GENERATED,
            entityType: 'BRACKET',
            entityId: categoryId,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent'),
            metadata: {
                categoryId,
                playerCount,
                bracketSize: result.bracket.bracketSize,
                seedCount: result.bracket.seedCount,
                randomSeed: result.bracket.randomSeed
            }
        }).catch(error => {
            // Don't fail request if audit logging fails
            console.error('Audit logging failed:', error);
        });

        // Return success response
        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (err) {
        console.error('Error generating seeded bracket:', err);

        // T026: Specific error handling
        const errorMessage = err.message || 'Failed to generate seeded bracket';

        // CATEGORY_NOT_FOUND: No rankings found for category
        if (errorMessage.includes('No rankings found for category')) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CATEGORY_NOT_FOUND',
                    message: errorMessage,
                    details: { categoryId: req.body.categoryId }
                }
            });
        }

        // INSUFFICIENT_RANKINGS: Not enough ranked players
        if (errorMessage.includes('Insufficient rankings')) {
            const match = errorMessage.match(/(\d+) available, (\d+) required/);
            return res.status(404).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_RANKINGS',
                    message: 'Not enough ranked players for seeding',
                    details: {
                        categoryId: req.body.categoryId,
                        requiredSeeds: match ? parseInt(match[2]) : null,
                        availableRankings: match ? parseInt(match[1]) : null
                    }
                }
            });
        }

        // INVALID_PLAYER_COUNT: Player count validation error
        if (errorMessage.includes('Player count must be between')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_PLAYER_COUNT',
                    message: errorMessage,
                    details: {
                        playerCount: req.body.playerCount,
                        validRange: { min: 4, max: 128 }
                    }
                }
            });
        }

        // Generic internal error
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to generate seeded bracket',
                details: {
                    reason: errorMessage
                }
            }
        });
    }
}
