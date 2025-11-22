// T018-T031: Tournament Registration Controller
// HTTP handlers for tournament registration endpoints (003-tournament-registration)
import * as tournamentRegistrationService from '../services/tournamentRegistrationService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * T018: POST /api/tournaments/:tournamentId/register
 * Register authenticated player for a tournament
 * Authorization: PLAYER or ORGANIZER
 */
export async function registerForTournament(req, res, next) {
  try {
    const { tournamentId } = req.params;
    let playerId = req.user.playerId;

    // Allow organizers/admins to register other players
    if ((req.user.role === 'ORGANIZER' || req.user.role === 'ADMIN') && req.body.playerId) {
      playerId = req.body.playerId;
    }

    // Extract demoteRegistrationId for organizer-controlled waitlist management
    const demoteRegistrationId = req.body.demoteRegistrationId;

    console.log('[registerForTournament] Request received:', {
      tournamentId,
      playerId,
      demoteRegistrationId,
      hasDemoteId: !!demoteRegistrationId,
    });

    // Ensure user has a player profile (or we have a valid playerId from organizer)
    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_PLAYER_PROFILE',
          message: 'User must have a player profile to register for tournaments'
        }
      });
    }

    // Call service to register player
    const result = await tournamentRegistrationService.registerPlayer(
      playerId,
      tournamentId,
      { demoteRegistrationId }
    );

    // Format response based on API contract
    const response = {
      success: true,
      data: {
        registration: {
          id: result.registration.id,
          playerId: result.registration.playerId,
          tournamentId: result.registration.tournamentId,
          status: result.registration.status,
          registrationTimestamp: result.registration.registrationTimestamp,
          createdAt: result.registration.createdAt
        },
        categoryRegistration: result.categoryRegistration
          ? {
            id: result.categoryRegistration.id,
            playerId: result.categoryRegistration.playerId,
            categoryId: result.categoryRegistration.categoryId,
            status: result.categoryRegistration.status,
            hasParticipated: result.categoryRegistration.hasParticipated,
            isNew: result.categoryRegistration.isNew
          }
          : null,
        tournament: {
          id: result.registration.tournament.id,
          name: result.registration.tournament.name,
          category: {
            id: result.registration.tournament.category.id,
            name: result.registration.tournament.category.name,
            type: result.registration.tournament.category.type,
            ageGroup: result.registration.tournament.category.ageGroup,
            gender: result.registration.tournament.category.gender
          }
        },
        capacityInfo: result.capacityInfo
      },
      message: result.message
    };

    return res.status(201).json(response);
  } catch (err) {
    // Handle specific error codes
    if (err.statusCode === 404 && err.code === 'TOURNAMENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOURNAMENT_NOT_FOUND',
          message: err.message
        }
      });
    }

    if (err.statusCode === 409 && err.code === 'ALREADY_REGISTERED') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_REGISTERED',
          message: err.message,
          details: {
            existingRegistrationId: err.existingRegistrationId,
            status: err.status,
            registeredAt: err.registeredAt
          }
        }
      });
    }

    if (err.statusCode === 400 && err.code === 'REGISTRATION_NOT_OPEN') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_OPEN',
          message: err.message,
          details: {
            opensAt: err.opensAt
          }
        }
      });
    }

    if (err.statusCode === 400 && err.code === 'REGISTRATION_CLOSED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_CLOSED',
          message: err.message,
          details: {
            closedAt: err.closedAt
          }
        }
      });
    }

    if (err.statusCode === 400 && err.code === 'INVALID_TOURNAMENT_STATUS') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOURNAMENT_STATUS',
          message: err.message,
          details: {
            currentStatus: err.currentStatus,
            allowedStatus: err.allowedStatus
          }
        }
      });
    }

    if (err.statusCode === 400 && err.code === 'CATEGORY_REGISTRATION_REQUIRED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORY_REGISTRATION_REQUIRED',
          message: err.message,
          details: {
            categoryId: err.categoryId,
            playerId: err.playerId
          }
        }
      });
    }

    // Handle eligibility errors from category service
    if (err.statusCode === 400 && (
      err.code === 'INELIGIBLE_AGE' ||
      err.code === 'INELIGIBLE_GENDER' ||
      err.code === 'INCOMPLETE_PROFILE'
    )) {
      return res.status(400).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err
        }
      });
    }

    // Pass to error handler middleware
    next(err);
  }
}

/**
 * GET /api/tournaments/:tournamentId/registration
 * Get current user's registration for a tournament
 */
export async function getMyRegistration(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const playerId = req.user.playerId;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_PLAYER_PROFILE',
          message: 'User must have a player profile'
        }
      });
    }

    const registration = await tournamentRegistrationService.getPlayerRegistration(
      playerId,
      tournamentId
    );

    return res.status(200).json({
      success: true,
      data: {
        registration: {
          id: registration.id,
          playerId: registration.playerId,
          tournamentId: registration.tournamentId,
          status: registration.status,
          registrationTimestamp: registration.registrationTimestamp,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt
        },
        player: {
          id: registration.player.id,
          name: registration.player.name,
          email: registration.player.email
        },
        tournament: {
          id: registration.tournament.id,
          name: registration.tournament.name,
          startDate: registration.tournament.startDate,
          endDate: registration.tournament.endDate,
          category: registration.tournament.category
        }
      }
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'No registration found for this tournament'
        }
      });
    }

    next(err);
  }
}

/**
 * T030: DELETE /api/tournaments/:tournamentId/register
 * Unregister authenticated player from a tournament
 * Authorization: PLAYER (self only) or ORGANIZER/ADMIN
 */
export async function unregisterFromTournament(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const playerId = req.user.playerId;

    // Ensure user has a player profile
    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_PLAYER_PROFILE',
          message: 'User must have a player profile to unregister from tournaments'
        }
      });
    }

    // Check if tournament is DOUBLES type
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { category: true }
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOURNAMENT_NOT_FOUND',
          message: 'Tournament not found'
        }
      });
    }

    // Handle DOUBLES tournament unregistration
    if (tournament.category?.type === 'DOUBLES') {
      // Find the pair registration where player is a member
      const pairRegistration = await prisma.pairRegistration.findFirst({
        where: {
          tournamentId,
          status: { in: ['REGISTERED', 'WAITLISTED'] },
          pair: {
            OR: [
              { player1Id: playerId },
              { player2Id: playerId }
            ]
          }
        },
        include: {
          pair: {
            include: {
              player1: { select: { id: true, name: true } },
              player2: { select: { id: true, name: true } }
            }
          }
        }
      });

      if (!pairRegistration) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REGISTRATION_NOT_FOUND',
            message: 'No pair registration found for this tournament'
          }
        });
      }

      // Call service to withdraw pair registration (includes auto-promotion logic)
      const { withdrawPairRegistration } = await import('../services/pairRegistrationService.js');
      const result = await withdrawPairRegistration(pairRegistration.id);

      return res.status(200).json({
        success: true,
        data: {
          registration: {
            id: result.id,
            pairId: result.pairId,
            tournamentId: result.tournamentId,
            status: result.status
          },
          pair: pairRegistration.pair,
          promotedPair: result.promotedPair,
          pairDeleted: result.pairDeleted
        },
        message: result.message
      });
    }

    // Call service to unregister individual player (SINGLES)
    const result = await tournamentRegistrationService.unregisterPlayer(playerId, tournamentId);

    // Format response
    const response = {
      success: true,
      data: {
        registration: {
          id: result.registration.id,
          playerId: result.registration.playerId,
          tournamentId: result.registration.tournamentId,
          status: result.registration.status,
          withdrawnAt: result.registration.withdrawnAt
        },
        promotedPlayer: result.promotedPlayer,
        categoryCleanup: result.categoryCleanup
      },
      message: result.message
    };

    return res.status(200).json(response);
  } catch (err) {
    // Handle specific error codes
    if (err.statusCode === 404 && err.code === 'REGISTRATION_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: err.message
        }
      });
    }

    if (err.statusCode === 400 && err.code === 'ALREADY_WITHDRAWN') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_WITHDRAWN',
          message: err.message,
          details: {
            currentStatus: err.currentStatus
          }
        }
      });
    }

    // Pass to error handler middleware
    next(err);
  }
}

/**
 * GET /api/tournaments/:tournamentId/registrations
 * Get all registrations for a tournament
 * Authorization: ORGANIZER or ADMIN
 */
export async function getTournamentRegistrations(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const { status } = req.query;

    // Check if tournament is DOUBLES type
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { category: true }
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOURNAMENT_NOT_FOUND',
          message: 'Tournament not found'
        }
      });
    }

    // For DOUBLES tournaments, return pair registrations
    if (tournament.category?.type === 'DOUBLES') {
      const whereClause = { tournamentId };
      if (status) {
        whereClause.status = status;
      }

      const pairRegistrations = await prisma.pairRegistration.findMany({
        where: whereClause,
        include: {
          pair: {
            include: {
              player1: { select: { id: true, name: true, email: true } },
              player2: { select: { id: true, name: true, email: true } }
            }
          }
        },
        orderBy: { registrationTimestamp: 'asc' }
      });

      return res.status(200).json({
        success: true,
        data: {
          tournamentId,
          type: 'DOUBLES',
          registrations: pairRegistrations.map(reg => ({
            id: reg.id,
            status: reg.status,
            registrationTimestamp: reg.registrationTimestamp,
            seedPosition: reg.seedPosition,
            pair: {
              id: reg.pair.id,
              seedingScore: reg.pair.seedingScore,
              player1: reg.pair.player1,
              player2: reg.pair.player2
            }
          })),
          count: pairRegistrations.length
        }
      });
    }

    // For SINGLES tournaments, return individual registrations
    const registrations = await tournamentRegistrationService.getTournamentRegistrations(
      tournamentId,
      status
    );

    return res.status(200).json({
      success: true,
      data: {
        tournamentId,
        type: 'SINGLES',
        registrations: registrations.map(reg => ({
          id: reg.id,
          status: reg.status,
          registrationTimestamp: reg.registrationTimestamp,
          player: {
            id: reg.player.id,
            name: reg.player.name,
            email: reg.player.email
          }
        })),
        count: registrations.length
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/players/:playerId/tournaments
 * Get all tournaments a player is registered for
 * Authorization: PLAYER (self only) or ORGANIZER/ADMIN
 */
export async function getPlayerTournaments(req, res, next) {
  try {
    const { playerId } = req.params;
    const { status } = req.query;

    // Authorization: Players can only view their own registrations
    if (req.user.role === 'PLAYER' && req.user.playerId !== playerId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Players can only view their own tournament registrations'
        }
      });
    }

    const registrations = await tournamentRegistrationService.getPlayerTournaments(
      playerId,
      status
    );

    return res.status(200).json({
      success: true,
      data: {
        playerId,
        registrations: registrations.map(reg => ({
          id: reg.id,
          status: reg.status,
          registrationTimestamp: reg.registrationTimestamp,
          tournament: {
            id: reg.tournament.id,
            name: reg.tournament.name,
            startDate: reg.tournament.startDate,
            endDate: reg.tournament.endDate,
            location: reg.tournament.location,
            status: reg.tournament.status,
            category: reg.tournament.category
          }
        })),
        count: registrations.length
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/tournaments/registrations/:registrationId
 * Withdraw a specific tournament registration (organizer/admin only)
 * Authorization: ORGANIZER or ADMIN
 */
export async function withdrawTournamentRegistration(req, res, next) {
  try {
    const { registrationId } = req.params;

    // Get the registration to verify it exists
    const registration = await prisma.tournamentRegistration.findUnique({
      where: { id: registrationId }
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'Tournament registration not found'
        }
      });
    }

    // Call service to withdraw
    const result = await tournamentRegistrationService.withdrawPlayerByRegistrationId(registrationId);

    return res.status(200).json({
      success: true,
      data: {
        registration: {
          id: result.registration.id,
          playerId: result.registration.playerId,
          tournamentId: result.registration.tournamentId,
          status: result.registration.status,
          withdrawnAt: result.registration.withdrawnAt
        },
        promotedPlayer: result.promotedPlayer,
        categoryCleanup: result.categoryCleanup
      },
      message: result.message
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: err.message
        }
      });
    }

    next(err);
  }
}

/**
 * PATCH /api/tournaments/registrations/:registrationId
 * Update a specific tournament registration (organizer/admin only)
 * Authorization: ORGANIZER or ADMIN
 */
export async function updateTournamentRegistration(req, res, next) {
  try {
    const { registrationId } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatuses = ['REGISTERED', 'WAITLISTED', 'WITHDRAWN', 'CANCELLED'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Status must be one of: ${allowedStatuses.join(', ')}`
        }
      });
    }

    // Try to find as Singles Registration first
    let registration = await prisma.tournamentRegistration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: {
          include: { category: true }
        }
      }
    });

    let isDoubles = false;

    // If not found, try as Pair Registration (Doubles)
    if (!registration) {
      registration = await prisma.pairRegistration.findUnique({
        where: { id: registrationId },
        include: {
          tournament: {
            include: { category: true }
          }
        }
      });
      isDoubles = true;
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'Registration not found'
        }
      });
    }

    let updatedRegistration;

    if (isDoubles) {
      updatedRegistration = await prisma.pairRegistration.update({
        where: { id: registrationId },
        data: {
          status: status || registration.status
        }
      });
    } else {
      updatedRegistration = await prisma.tournamentRegistration.update({
        where: { id: registrationId },
        data: {
          status: status || registration.status
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        registration: {
          id: updatedRegistration.id,
          tournamentId: updatedRegistration.tournamentId,
          status: updatedRegistration.status,
          updatedAt: updatedRegistration.updatedAt,
          type: isDoubles ? 'DOUBLES' : 'SINGLES'
        }
      },
      message: 'Registration updated successfully'
    });
  } catch (err) {
    next(err);
  }
}
