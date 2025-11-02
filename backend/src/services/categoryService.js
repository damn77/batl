// T020: Category Service - Business logic for category management
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';

const prisma = new PrismaClient();

/**
 * T022: Generate category display name from type, age group, and gender
 * Examples:
 * - SINGLES, AGE_35, MEN -> "Men's Singles 35+"
 * - DOUBLES, ALL_AGES, MIXED -> "Mixed Doubles (All ages)"
 */
export function generateCategoryName(type, ageGroup, gender) {
  // Format gender
  const genderLabel = {
    MEN: "Men's",
    WOMEN: "Women's",
    MIXED: 'Mixed'
  }[gender];

  // Format age group
  const ageLabel = ageGroup === 'ALL_AGES'
    ? '(All ages)'
    : ageGroup.replace('AGE_', '') + '+';

  // Format type
  const typeLabel = type === 'SINGLES' ? 'Singles' : 'Doubles';

  // Combine: "Gender's Type Age"
  return `${genderLabel} ${typeLabel} ${ageLabel}`;
}

/**
 * T023: Check if category with same [type, ageGroup, gender] exists
 * Returns existing category or null
 */
export async function findDuplicateCategory(type, ageGroup, gender) {
  return await prisma.category.findUnique({
    where: {
      type_ageGroup_gender: { type, ageGroup, gender }
    }
  });
}

/**
 * T020: Create a new category
 * Implements FR-001 to FR-005
 */
export async function createCategory(data) {
  const { type, ageGroup, gender, description } = data;

  // T023: Check for duplicate (FR-005)
  const existing = await findDuplicateCategory(type, ageGroup, gender);
  if (existing) {
    throw createHttpError(409, 'Category with this type, age group, and gender combination already exists', {
      code: 'DUPLICATE_CATEGORY',
      existingCategoryId: existing.id
    });
  }

  // T022: Generate name
  const name = generateCategoryName(type, ageGroup, gender);

  // Create category
  return await prisma.category.create({
    data: {
      type,
      ageGroup,
      gender,
      name,
      description: description || null
    }
  });
}

/**
 * Get all categories with optional filtering
 * Implements FR-014, FR-015
 */
export async function listCategories(filters = {}) {
  const { type, ageGroup, gender, page = 1, limit = 20 } = filters;

  const where = {};
  if (type) where.type = type;
  if (ageGroup) where.ageGroup = ageGroup;
  if (gender) where.gender = gender;

  const skip = (page - 1) * limit;
  const take = Math.min(limit, 100); // Max 100 per page

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: {
            tournaments: true,
            registrations: true,
            rankings: true
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { ageGroup: 'asc' },
        { gender: 'asc' }
      ]
    }),
    prisma.category.count({ where })
  ]);

  return {
    categories,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take)
    }
  };
}

/**
 * Get category by ID
 * Implements FR-014
 */
export async function getCategoryById(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          tournaments: true,
          registrations: true,
          rankings: true
        }
      }
    }
  });

  if (!category) {
    throw createHttpError(404, 'Category not found', { code: 'CATEGORY_NOT_FOUND' });
  }

  return category;
}

/**
 * Update category (description only - type/age/gender immutable)
 * Implements FR-014
 */
export async function updateCategory(id, data) {
  // Verify category exists
  await getCategoryById(id);

  // Only allow description updates
  return await prisma.category.update({
    where: { id },
    data: {
      description: data.description
    }
  });
}

/**
 * Delete category (only if no tournaments assigned)
 * Implements FR-005
 */
export async function deleteCategory(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { tournaments: true, registrations: true }
      }
    }
  });

  if (!category) {
    throw createHttpError(404, 'Category not found', { code: 'CATEGORY_NOT_FOUND' });
  }

  // Check if category is in use
  if (category._count.tournaments > 0 || category._count.registrations > 0) {
    throw createHttpError(409, 'Cannot delete category with active tournaments or registrations', {
      code: 'CATEGORY_IN_USE',
      tournamentCount: category._count.tournaments,
      registrationCount: category._count.registrations
    });
  }

  await prisma.category.delete({ where: { id } });
}

/**
 * Get category statistics
 * Implements FR-014, FR-015, FR-016
 */
export async function getCategoryStats(id) {
  const category = await getCategoryById(id);

  const [tournamentStats, registrationStats, topRankings] = await Promise.all([
    // Tournament counts by status
    prisma.tournament.groupBy({
      by: ['status'],
      where: { categoryId: id },
      _count: true
    }),
    // Registration counts by status
    prisma.categoryRegistration.groupBy({
      by: ['status'],
      where: { categoryId: id },
      _count: true
    }),
    // Top players
    prisma.categoryRanking.findMany({
      where: { categoryId: id },
      take: 10,
      orderBy: { rank: 'asc' },
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  ]);

  return {
    categoryId: id,
    categoryName: category.name,
    tournaments: {
      total: tournamentStats.reduce((sum, s) => sum + s._count, 0),
      scheduled: tournamentStats.find(s => s.status === 'SCHEDULED')?._count || 0,
      inProgress: tournamentStats.find(s => s.status === 'IN_PROGRESS')?._count || 0,
      completed: tournamentStats.find(s => s.status === 'COMPLETED')?._count || 0
    },
    registrations: {
      total: registrationStats.reduce((sum, s) => sum + s._count, 0),
      active: registrationStats.find(s => s.status === 'ACTIVE')?._count || 0,
      withdrawn: registrationStats.find(s => s.status === 'WITHDRAWN')?._count || 0,
      suspended: registrationStats.find(s => s.status === 'SUSPENDED')?._count || 0
    },
    rankings: {
      total: topRankings.length,
      topPlayers: topRankings.map(r => ({
        rank: r.rank,
        playerId: r.player.id,
        playerName: r.player.name,
        points: r.points,
        wins: r.wins,
        losses: r.losses
      }))
    }
  };
}
