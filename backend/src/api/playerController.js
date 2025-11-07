import {
  createPlayerProfile,
  listPlayerProfiles,
  findPlayerById,
  updatePlayerProfile,
  findDuplicates
} from '../services/playerService.js';
import { logAudit, AuditActions } from '../services/auditService.js';

// Create new player profile (ORGANIZER/ADMIN only)
export const createPlayerHandler = async (req, res, next) => {
  try {
    const { name, email, phone, birthDate, gender } = req.body;
    const createdBy = req.user.id;

    // Check for potential duplicates
    const duplicates = await findDuplicates({ name, email });

    // Create player profile
    const profile = await createPlayerProfile({
      name,
      email,
      phone,
      birthDate,
      gender,
      createdBy
    });

    // Log profile creation
    await logAudit({
      userId: req.user.id,
      action: AuditActions.PLAYER_PROFILE_CREATED || 'PLAYER_PROFILE_CREATED',
      entityType: 'PlayerProfile',
      entityId: profile.id,
      changes: { name, email, phone, birthDate, gender },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      profile,
      duplicates: duplicates.length > 0 ? duplicates : undefined
    });
  } catch (error) {
    next(error);
  }
};

// List all player profiles with pagination and search
export const listPlayersHandler = async (req, res, next) => {
  try {
    // Use validatedQuery from validation middleware
    const { page = 1, limit = 20, search, hasAccount } = req.validatedQuery || req.query;

    // Check if user is authenticated
    const isPublic = !req.user;

    const result = await listPlayerProfiles({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      hasAccount: hasAccount !== undefined ? hasAccount === 'true' : null,
      isPublic // Pass to service for field filtering
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get specific player profile by ID
export const getPlayerHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user is authenticated
    const isPublic = !req.user;

    const profile = await findPlayerById(id, isPublic);

    if (!profile) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Player profile not found'
        }
      });
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

// Update player profile
export const updatePlayerHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('Backend - Received updates:', updates); // Debug log

    // Check if profile exists
    const existingProfile = await findPlayerById(id);
    if (!existingProfile) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Player profile not found'
        }
      });
    }

    // Authorization check: PLAYER can only update their own linked profile
    if (req.user.role === 'PLAYER') {
      if (!existingProfile.userId || existingProfile.userId !== req.user.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own profile'
          }
        });
      }
    }
    // ADMIN and ORGANIZER can update any profile (already checked by route middleware)

    // Update profile
    const profile = await updatePlayerProfile(id, updates);
    
    console.log('Backend - Updated profile:', profile); // Debug log

    // Log profile update
    await logAudit({
      userId: req.user.id,
      action: AuditActions.PLAYER_PROFILE_UPDATED || 'PLAYER_PROFILE_UPDATED',
      entityType: 'PlayerProfile',
      entityId: id,
      changes: updates,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

// Check for duplicate player profiles
export const checkDuplicatesHandler = async (req, res, next) => {
  try {
    const { name, email } = req.query;

    const duplicates = await findDuplicates({ name, email });

    res.json({ duplicates });
  } catch (error) {
    next(error);
  }
};

export default {
  createPlayerHandler,
  listPlayersHandler,
  getPlayerHandler,
  updatePlayerHandler,
  checkDuplicatesHandler
};
