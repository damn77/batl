import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Find or create organizer for a user
 * @param {string} userId - User ID
 * @param {Object} organizerData - { name?, email?, phone? }
 * @returns {Promise<Object>} Organizer record
 */
export async function findOrCreateOrganizer(userId, organizerData = {}) {
  if (!userId) {
    throw new Error('userId is required');
  }

  // Try to find existing organizer for this user
  let organizer = await prisma.organizer.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          email: true,
          playerProfile: {
            select: {
              name: true,
              phone: true
            }
          }
        }
      }
    }
  });

  // If organizer exists, return it (no update)
  if (organizer) {
    return organizer;
  }

  // Get user data to populate defaults
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      playerProfile: {
        select: {
          name: true,
          phone: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Create new organizer with data from user profile or provided data
  organizer = await prisma.organizer.create({
    data: {
      userId,
      name: organizerData.name || user.playerProfile?.name || user.email.split('@')[0],
      email: organizerData.email || user.email,
      phone: organizerData.phone || user.playerProfile?.phone || null
    },
    include: {
      user: {
        select: {
          email: true,
          playerProfile: {
            select: {
              name: true,
              phone: true
            }
          }
        }
      }
    }
  });

  return organizer;
}

/**
 * Get organizer by ID
 * @param {string} id - Organizer ID
 * @returns {Promise<Object|null>} Organizer record or null
 */
export async function getOrganizerById(id) {
  return await prisma.organizer.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });
}

/**
 * Get organizer by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Organizer record or null
 */
export async function getOrganizerByUserId(userId) {
  return await prisma.organizer.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });
}

/**
 * List all organizers
 * @param {Object} options - Query options
 * @returns {Promise<Object>} { organizers, total }
 */
export async function listOrganizers({ limit = 100, offset = 0 } = {}) {
  const organizers = await prisma.organizer.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      }
    },
    orderBy: { name: 'asc' },
    take: limit,
    skip: offset
  });

  const total = await prisma.organizer.count();

  return { organizers, total };
}

/**
 * Update organizer contact information
 * @param {string} id - Organizer ID
 * @param {Object} updateData - { name?, email?, phone? }
 * @returns {Promise<Object>} Updated organizer
 */
export async function updateOrganizer(id, updateData) {
  const data = {};
  if (updateData.name !== undefined) {
    data.name = updateData.name.trim();
  }
  if (updateData.email !== undefined) {
    data.email = updateData.email.trim();
  }
  if (updateData.phone !== undefined) {
    data.phone = updateData.phone?.trim() || null;
  }

  return await prisma.organizer.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });
}

/**
 * Delete organizer (only if not referenced by any tournaments)
 * @param {string} id - Organizer ID
 * @returns {Promise<Object>} Deleted organizer
 */
export async function deleteOrganizer(id) {
  // Check if organizer is referenced by any tournaments
  const tournamentsCount = await prisma.tournament.count({
    where: {
      OR: [
        { organizerId: id },
        { deputyOrganizerId: id }
      ]
    }
  });

  if (tournamentsCount > 0) {
    throw new Error(`Cannot delete organizer: ${tournamentsCount} tournament(s) reference this organizer`);
  }

  return await prisma.organizer.delete({
    where: { id }
  });
}
