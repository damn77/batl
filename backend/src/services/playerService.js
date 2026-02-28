import { PrismaClient } from '@prisma/client';
import { createConflictError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

// Find player profile by ID
export const findPlayerById = async (id, isPublic = false) => {
  if (isPublic) {
    // Public access - return only name and hasAccount flag
    const profile = await prisma.playerProfile.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        userId: true // Just to check if account exists
      }
    });

    if (!profile) return null;

    // Transform to public format
    return {
      id: profile.id,
      name: profile.name,
      hasAccount: !!profile.userId
    };
  }

  // Authenticated access - return full details
  return await prisma.playerProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      },
      creator: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });
};

// Create new player profile
export const createPlayerProfile = async ({ name, email, phone, birthDate, gender, createdBy }) => {
  const profile = await prisma.playerProfile.create({
    data: {
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : null,
      phone: phone || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      gender: gender || null,
      createdBy
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      }
    }
  });

  return profile;
};

// Update player profile
export const updatePlayerProfile = async (id, updates) => {
  // Prepare update data
  const data = {};
  if (updates.name !== undefined) data.name = updates.name.trim();
  if (updates.email !== undefined) data.email = updates.email ? updates.email.toLowerCase().trim() : null;
  if (updates.phone !== undefined) data.phone = updates.phone || null;
  if (updates.birthDate !== undefined) data.birthDate = updates.birthDate ? new Date(updates.birthDate) : null;
  if (updates.gender !== undefined) data.gender = updates.gender || null;

  const profile = await prisma.playerProfile.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      },
      creator: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });

  return profile;
};

// List player profiles with pagination and search
export const listPlayerProfiles = async ({
  page = 1,
  limit = 20,
  search = null,
  hasAccount = null,
  isPublic = false
}) => {
  const where = {};

  // Search by name only for public (don't search email for privacy)
  if (search) {
    if (isPublic) {
      where.name = { contains: search };
    } else {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }
  }

  // Filter by account status
  if (hasAccount !== null) {
    if (hasAccount) {
      where.userId = { not: null };
    } else {
      where.userId = null;
    }
  }

  if (isPublic) {
    // Public access - return only name and hasAccount flag
    const [profiles, total] = await Promise.all([
      prisma.playerProfile.findMany({
        where,
        select: {
          id: true,
          name: true,
          userId: true // Just to check if account exists
        },
        orderBy: { name: 'asc' }, // Sort by name for public
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.playerProfile.count({ where })
    ]);

    // Transform to public format
    const publicProfiles = profiles.map(p => ({
      id: p.id,
      name: p.name,
      hasAccount: !!p.userId
    }));

    return {
      profiles: publicProfiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Authenticated access - return full details
  const [profiles, total] = await Promise.all([
    prisma.playerProfile.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.playerProfile.count({ where })
  ]);

  return {
    profiles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Check for duplicate player profiles (fuzzy matching)
// Note: SQLite doesn't support case-insensitive mode, so we do case-sensitive matching
export const findDuplicates = async ({ name, email }) => {
  const potentialDuplicates = [];

  // Exact name match (case-sensitive for SQLite compatibility)
  if (name) {
    const nameMatches = await prisma.playerProfile.findMany({
      where: {
        name: {
          equals: name.trim()
        }
      },
      take: 5
    });
    potentialDuplicates.push(...nameMatches);
  }

  // Exact email match (normalized to lowercase)
  if (email) {
    const emailMatches = await prisma.playerProfile.findMany({
      where: {
        email: {
          equals: email.toLowerCase().trim()
        }
      },
      take: 5
    });
    potentialDuplicates.push(...emailMatches);
  }

  // Similar name match (contains) - SQLite LIKE is case-insensitive by default
  if (name && name.length >= 3) {
    const nameParts = name.trim().split(' ');
    const similarNameMatches = await prisma.playerProfile.findMany({
      where: {
        OR: nameParts.map(part => ({
          name: {
            contains: part
          }
        }))
      },
      take: 5
    });
    potentialDuplicates.push(...similarNameMatches);
  }

  // Remove duplicates from results array and limit to 5
  const uniqueDuplicates = Array.from(
    new Map(potentialDuplicates.map(item => [item.id, item])).values()
  ).slice(0, 5);

  return uniqueDuplicates;
};

// Link player profile to user account
export const linkProfileToUser = async (profileId, userId) => {
  // Check if user already has a profile
  const existingProfile = await prisma.playerProfile.findUnique({
    where: { userId }
  });

  if (existingProfile) {
    throw createConflictError('User already has a linked profile', 'userId');
  }

  const profile = await prisma.playerProfile.update({
    where: { id: profileId },
    data: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      }
    }
  });

  return profile;
};

// Find profile by user ID
export const findProfileByUserId = async (userId) => {
  return await prisma.playerProfile.findUnique({
    where: { userId },
    include: {
      creator: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });
};

// Search for matching profile by name and email (for auto-linking during registration)
export const findMatchingProfile = async ({ name, email }) => {
  if (!name || !email) {
    return null;
  }

  // Look for exact match on both name and email
  const match = await prisma.playerProfile.findFirst({
    where: {
      AND: [
        {
          name: {
            equals: name.trim()
          }
        },
        {
          email: {
            equals: email.toLowerCase().trim()
          }
        },
        {
          userId: null // Only match profiles without linked accounts
        }
      ]
    }
  });

  return match;
};

// Format match score from player's perspective
const formatMatchScore = (result, isPlayer1) => {
  if (result === null) return '-';
  let parsed;
  try {
    parsed = JSON.parse(result);
  } catch {
    return '-';
  }
  if (parsed.outcome) {
    const labels = { WALKOVER: 'Walkover', FORFEIT: 'Forfeit', NO_SHOW: 'No-show' };
    return labels[parsed.outcome] || '-';
  }
  if (parsed.sets && parsed.sets.length > 0) {
    return parsed.sets.map(set => {
      const scoreStr = isPlayer1
        ? `${set.player1Score}-${set.player2Score}`
        : `${set.player2Score}-${set.player1Score}`;
      return set.tiebreakScore !== undefined && set.tiebreakScore !== null
        ? `${scoreStr}(${set.tiebreakScore})`
        : scoreStr;
    }).join(', ');
  }
  return '-';
};

// Determine match outcome (W/L) from player's perspective
const determineMatchOutcome = (result, isPlayer1) => {
  if (result === null) return null;
  let parsed;
  try {
    parsed = JSON.parse(result);
  } catch {
    return null;
  }
  if (!parsed.winner) return null;
  const won = (parsed.winner === 'PLAYER1') === isPlayer1;
  return won ? 'W' : 'L';
};

// Get match history for a player with pagination
export const getPlayerMatchHistory = async ({ playerId, page = 1, limit = 20, categoryId = null }) => {
  // Verify player exists
  const player = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    select: { id: true }
  });
  if (!player) return null;

  // Build where clause
  const where = {
    OR: [{ player1Id: playerId }, { player2Id: playerId }],
    isBye: false,
    NOT: { status: 'CANCELLED' }
  };
  if (categoryId) {
    where.tournament = { categoryId };
  }

  // Count total matches
  const total = await prisma.match.count({ where });

  // Fetch matches with related data
  const matches = await prisma.match.findMany({
    where,
    include: {
      player1: { select: { id: true, name: true } },
      player2: { select: { id: true, name: true } },
      pair1: { include: { player1: { select: { id: true, name: true } }, player2: { select: { id: true, name: true } } } },
      pair2: { include: { player1: { select: { id: true, name: true } }, player2: { select: { id: true, name: true } } } },
      tournament: { select: { id: true, name: true, endDate: true, category: { select: { id: true, name: true } } } }
    },
    orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    skip: (page - 1) * limit,
    take: limit
  });

  // Map matches to display rows
  const rows = matches.map(match => {
    const isPlayer1 = match.player1Id === playerId;
    const opponent = isPlayer1 ? match.player2 : match.player1;
    const opponentPair = isPlayer1 ? match.pair2 : match.pair1;
    const opponentName = opponentPair
      ? `${opponentPair.player1.name} / ${opponentPair.player2.name}`
      : (opponent?.name || 'TBD');

    const score = formatMatchScore(match.result, isPlayer1);
    const outcome = determineMatchOutcome(match.result, isPlayer1);

    return {
      matchId: match.id,
      tournamentId: match.tournament.id,
      tournamentName: match.tournament.name,
      category: match.tournament.category,
      opponentName,
      score,
      outcome,
      completedAt: match.completedAt
    };
  });

  return {
    matches: rows,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
  };
};

export default {
  findPlayerById,
  createPlayerProfile,
  updatePlayerProfile,
  listPlayerProfiles,
  findDuplicates,
  linkProfileToUser,
  findProfileByUserId,
  findMatchingProfile,
  getPlayerMatchHistory
};
