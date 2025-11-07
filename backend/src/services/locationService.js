import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Find or create a location by clubName and address
 * @param {Object} locationData - { clubName, address }
 * @returns {Promise<Object>} Location record
 */
export async function findOrCreateLocation({ clubName, address }) {
  if (!clubName) {
    throw new Error('clubName is required');
  }

  // Normalize address (null if empty string or undefined)
  const normalizedAddress = address?.trim() || null;

  // Try to find existing location with exact match
  let location = await prisma.location.findFirst({
    where: {
      clubName: clubName.trim(),
      address: normalizedAddress
    }
  });

  // If not found, create new location
  if (!location) {
    location = await prisma.location.create({
      data: {
        clubName: clubName.trim(),
        address: normalizedAddress
      }
    });
  }

  return location;
}

/**
 * Get location by ID
 * @param {string} id - Location ID
 * @returns {Promise<Object|null>} Location record or null
 */
export async function getLocationById(id) {
  return await prisma.location.findUnique({
    where: { id }
  });
}

/**
 * List all locations
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of locations
 */
export async function listLocations({ search, limit = 100, offset = 0 } = {}) {
  const where = search ? {
    OR: [
      { clubName: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const locations = await prisma.location.findMany({
    where,
    orderBy: { clubName: 'asc' },
    take: limit,
    skip: offset
  });

  const total = await prisma.location.count({ where });

  return { locations, total };
}

/**
 * Update location
 * @param {string} id - Location ID
 * @param {Object} updateData - { clubName?, address? }
 * @returns {Promise<Object>} Updated location
 */
export async function updateLocation(id, updateData) {
  const data = {};
  if (updateData.clubName !== undefined) {
    data.clubName = updateData.clubName.trim();
  }
  if (updateData.address !== undefined) {
    data.address = updateData.address?.trim() || null;
  }

  return await prisma.location.update({
    where: { id },
    data
  });
}

/**
 * Delete location (only if not referenced by any tournaments)
 * @param {string} id - Location ID
 * @returns {Promise<Object>} Deleted location
 */
export async function deleteLocation(id) {
  // Check if location is referenced by any tournaments
  const tournamentsCount = await prisma.tournament.count({
    where: {
      OR: [
        { locationId: id },
        { backupLocationId: id }
      ]
    }
  });

  if (tournamentsCount > 0) {
    throw new Error(`Cannot delete location: ${tournamentsCount} tournament(s) reference this location`);
  }

  return await prisma.location.delete({
    where: { id }
  });
}
