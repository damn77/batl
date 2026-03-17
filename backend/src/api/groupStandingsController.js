/**
 * Group Standings Controller
 *
 * HTTP handlers for group standings with tiebreaker support:
 *   GET    standings — public, returns computed standings with tiebreaker metadata
 *   POST   override  — save manual position override (organizer/admin only)
 *   DELETE override  — clear manual override, return recalculated standings
 *
 * Feature: 29-group-standings-and-tiebreakers, Plan 02
 * Requirements: GSTAND-04, GSTAND-05
 */

import { getGroupStandings } from '../services/groupStandingsService.js';
import prisma from '../lib/prisma.js';

/**
 * GET /api/v1/tournaments/:tournamentId/groups/:groupId/standings
 *
 * Public endpoint — returns standings with tiebreaker metadata for a group.
 */
export const getStandings = async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = await getGroupStandings(groupId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.message && err.message.startsWith('Group not found')) {
      return res.status(404).json({
        success: false,
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
};

/**
 * POST /api/v1/tournaments/:tournamentId/groups/:groupId/standings/override
 *
 * Save a manual tie-resolution override. Validates that all entityIds belong to
 * the group and that position numbers are unique. Upserts GroupTieResolution.
 *
 * Authorization: ORGANIZER or ADMIN (isAuthenticated + authorize('update', 'Tournament'))
 */
export const saveOverride = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { positions } = req.body;

    // Validate group exists and fetch participants
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        groupParticipants: {
          select: { playerId: true, pairId: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' }
      });
    }

    // Build set of valid entity IDs (playerId or pairId) for this group
    const validEntityIds = new Set();
    for (const gp of group.groupParticipants) {
      if (gp.pairId) validEntityIds.add(gp.pairId);
      if (gp.playerId) validEntityIds.add(gp.playerId);
    }

    // Check all entityIds in positions belong to this group
    for (const pos of positions) {
      if (!validEntityIds.has(pos.entityId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ENTITY',
            message: `Entity ${pos.entityId} does not belong to group ${groupId}`
          }
        });
      }
    }

    // Check position numbers are unique
    const positionNums = positions.map(p => p.position);
    const uniquePositions = new Set(positionNums);
    if (uniquePositions.size !== positionNums.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_POSITIONS', message: 'Position numbers must be unique' }
      });
    }

    // Find latest completedAt among completed matches for this group
    const latestMatch = await prisma.match.findFirst({
      where: { groupId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true }
    });

    const resultSnapshotAt = latestMatch?.completedAt ?? new Date();

    // Upsert the GroupTieResolution record
    await prisma.groupTieResolution.upsert({
      where: { groupId },
      create: {
        groupId,
        positions: JSON.stringify(positions),
        resultSnapshotAt
      },
      update: {
        positions: JSON.stringify(positions),
        resultSnapshotAt
      }
    });

    // Return updated standings
    const result = await getGroupStandings(groupId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
};

/**
 * DELETE /api/v1/tournaments/:tournamentId/groups/:groupId/standings/override
 *
 * Clear the manual tie-resolution override for a group and return recalculated standings.
 *
 * Authorization: ORGANIZER or ADMIN (isAuthenticated + authorize('update', 'Tournament'))
 */
export const deleteOverride = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Validate group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' }
      });
    }

    // deleteMany avoids error if record does not exist
    await prisma.groupTieResolution.deleteMany({ where: { groupId } });

    // Return recalculated standings without override
    const result = await getGroupStandings(groupId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
};
