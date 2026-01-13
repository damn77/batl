import * as bracketService from '../services/bracketService.js';

/**
 * GET /api/v1/brackets/seeding/:playerCount - Get seeding configuration
 * User Story: P2 - Determine Seeding Requirements
 *
 * Returns the number of players that should be seeded based on tournament size.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export async function getSeedingConfiguration(req, res, next) {
  try {
    // Extract and convert playerCount from route params (validated by middleware)
    const { playerCount } = req.params;
    const numericPlayerCount = Number(playerCount);

    // Get seeding configuration from service
    const seedingConfig = bracketService.getSeedingConfig(numericPlayerCount);

    // Return success response with seeding configuration
    return res.status(200).json({
      success: true,
      data: seedingConfig
    });
  } catch (err) {
    // Handle validation errors
    if (err.statusCode === 400 || err.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PLAYER_COUNT',
          message: err.message,
          details: {
            playerCount: req.params.playerCount,
            validRange: { min: 4, max: 128 }
          }
        }
      });
    }

    // Handle configuration errors
    if (err.message.includes('No seeding configuration found')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SEEDING_CONFIG_ERROR',
          message: 'Failed to calculate seeding configuration',
          details: {
            reason: err.message
          }
        }
      });
    }

    // Pass other errors to error handler middleware
    next(err);
  }
}

/**
 * GET /api/v1/brackets/structure/:playerCount - Get bracket structure
 * User Story: P1 - Retrieve Bracket Structure
 *
 * Returns bracket structure pattern and derived fields for a given player count.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export async function getBracketStructure(req, res, next) {
  try {
    // Extract and convert playerCount from route params (validated by middleware)
    const { playerCount } = req.params;
    const numericPlayerCount = Number(playerCount);

    // Get bracket information from service
    const bracketInfo = await bracketService.getBracketByPlayerCount(numericPlayerCount);

    // Return success response with bracket data and interpretation (P3 user story)
    return res.status(200).json({
      success: true,
      data: {
        playerCount: bracketInfo.playerCount,
        structure: bracketInfo.structure,
        preliminaryMatches: bracketInfo.preliminaryMatches,
        byes: bracketInfo.byes,
        bracketSize: bracketInfo.bracketSize,
        interpretation: {
          '0': 'Preliminary match required',
          '1': 'Bye (automatic advancement to next round)'
        }
      }
    });
  } catch (err) {
    // Handle validation errors
    if (err.statusCode === 400 || err.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code || 'INVALID_PLAYER_COUNT',
          message: err.message,
          details: {
            playerCount: req.params.playerCount,
            validRange: { min: 4, max: 128 }
          }
        }
      });
    }

    // Handle not found errors
    if (err.message.includes('No bracket template found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BRACKET_NOT_FOUND',
          message: err.message,
          details: {
            playerCount: Number(req.params.playerCount),
            validRange: { min: 4, max: 128 }
          }
        }
      });
    }

    // Handle template loading errors
    if (err.message.includes('Failed to load bracket templates')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_LOAD_ERROR',
          message: 'Failed to load bracket templates from file',
          details: {
            reason: err.message
          }
        }
      });
    }

    // Pass other errors to error handler middleware
    next(err);
  }
}
