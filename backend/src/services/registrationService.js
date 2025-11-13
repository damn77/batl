// T053-T060: Registration Service - Player eligibility validation and registration management
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import * as categoryService from './categoryService.js';

const prisma = new PrismaClient();

/**
 * T055: Calculate player's age from birthDate
 * Returns age in years based on calendar year only
 *
 * Tournament rule: Players are eligible from January 1st of the year they turn the required age.
 * Example: Player born Dec 31, 1988 is considered 37 years old for entire 2025 calendar year.
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;

  const currentYear = new Date().getFullYear();
  const birthYear = new Date(birthDate).getFullYear();

  // Age = current year - birth year (no month/day consideration)
  return currentYear - birthYear;
}

/**
 * T058: Check if player profile has required fields for registration
 * FR-007: Player must have birthDate and gender set
 */
function checkProfileCompleteness(player) {
  const missingFields = [];

  if (!player.birthDate) {
    missingFields.push('birthDate');
  }

  if (!player.gender) {
    missingFields.push('gender');
  }

  if (missingFields.length > 0) {
    throw createHttpError(400, 'Player profile is missing required information', {
      code: 'INCOMPLETE_PROFILE',
      missingFields,
      message: 'Please complete your profile before registering for categories'
    });
  }
}

/**
 * T056: Validate player age meets category requirements
 * FR-008: Player must meet minimum age for category
 * FR-010: ALL_AGES bypasses age validation (FR-012)
 */
function validateAge(player, category) {
  // FR-010, FR-012: ALL_AGES categories bypass age validation
  if (category.ageGroup === 'ALL_AGES') {
    return { valid: true };
  }

  const playerAge = calculateAge(player.birthDate);

  // Extract minimum age from category age group (e.g., "AGE_35" -> 35)
  const minAge = parseInt(category.ageGroup.replace('AGE_', ''));

  // FR-008: Player age must be >= minimum age for category
  if (playerAge < minAge) {
    throw createHttpError(400, 'Player does not meet age requirements', {
      code: 'INELIGIBLE_AGE',
      playerAge,
      requiredMinimumAge: minAge,
      categoryName: category.name,
      categoryAgeGroup: category.ageGroup
    });
  }

  return { valid: true, playerAge, minAge };
}

/**
 * T057: Validate player gender matches category requirements
 * FR-011: Player gender must match category gender (or category is MIXED)
 */
function validateGender(player, category) {
  // MIXED categories allow all genders
  if (category.gender === 'MIXED') {
    return { valid: true };
  }

  // Player gender must match category gender
  if (player.gender !== category.gender) {
    throw createHttpError(400, 'Player gender does not match category requirements', {
      code: 'INELIGIBLE_GENDER',
      playerGender: player.gender,
      requiredGender: category.gender,
      categoryName: category.name
    });
  }

  return { valid: true };
}

/**
 * T059: Check if player is already registered for this category
 * FR-007: Players can only register once per category
 */
async function checkDuplicateRegistration(playerId, categoryId) {
  const existing = await prisma.categoryRegistration.findFirst({
    where: {
      playerId,
      categoryId,
      status: {
        in: ['ACTIVE', 'SUSPENDED'] // Don't count WITHDRAWN registrations
      }
    }
  });

  if (existing) {
    throw createHttpError(409, 'Player is already registered for this category', {
      code: 'ALREADY_REGISTERED',
      existingRegistrationId: existing.id,
      registeredAt: existing.registeredAt,
      status: existing.status
    });
  }
}

/**
 * T060: Comprehensive eligibility validation
 * Combines all validation rules: profile completeness, age, gender, duplicates
 */
async function validateEligibility(playerId, categoryId) {
  // Fetch player profile with required fields
  const player = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      name: true,
      birthDate: true,
      gender: true
    }
  });

  if (!player) {
    throw createHttpError(404, 'Player profile not found', {
      code: 'PLAYER_NOT_FOUND'
    });
  }

  // Fetch category details
  const category = await categoryService.getCategoryById(categoryId);

  // Run validations in order
  // 1. Profile completeness (T058)
  checkProfileCompleteness(player);

  // 2. Check for duplicate registration (T059)
  await checkDuplicateRegistration(playerId, categoryId);

  // 3. Age validation (T056)
  const ageValidation = validateAge(player, category);

  // 4. Gender validation (T057)
  const genderValidation = validateGender(player, category);

  return {
    eligible: true,
    player: {
      id: player.id,
      name: player.name,
      age: calculateAge(player.birthDate),
      gender: player.gender
    },
    category: {
      id: category.id,
      name: category.name,
      type: category.type,
      ageGroup: category.ageGroup,
      gender: category.gender
    },
    validations: {
      age: ageValidation,
      gender: genderValidation
    }
  };
}

/**
 * T053: Register player for a category
 * Validates eligibility and creates registration record
 */
export async function registerPlayer(playerId, categoryId) {
  // Run comprehensive eligibility validation
  await validateEligibility(playerId, categoryId);

  // Create registration with ACTIVE status
  const registration = await prisma.categoryRegistration.create({
    data: {
      playerId,
      categoryId,
      status: 'ACTIVE',
      registeredAt: new Date()
    },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          birthDate: true,
          gender: true
        }
      },
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          ageGroup: true,
          gender: true
        }
      }
    }
  });

  return {
    ...registration,
    player: {
      ...registration.player,
      age: calculateAge(registration.player.birthDate)
    }
  };
}

/**
 * Check eligibility without creating registration
 * Useful for preview/validation before actual registration
 */
export async function checkEligibility(playerId, categoryId) {
  return await validateEligibility(playerId, categoryId);
}

/**
 * Get all registrations for a specific player
 */
export async function getPlayerRegistrations(playerId, filters = {}) {
  const { status, includeCategory, includeRanking } = filters;

  const where = { playerId };
  if (status) {
    where.status = status;
  }

  const include = {};
  if (includeCategory) {
    include.category = {
      select: {
        id: true,
        name: true,
        type: true,
        ageGroup: true,
        gender: true
      }
    };
  }
  if (includeRanking) {
    include.ranking = {
      select: {
        rank: true,
        points: true,
        wins: true,
        losses: true
      }
    };
  }

  const [registrations, counts] = await Promise.all([
    prisma.categoryRegistration.findMany({
      where,
      include,
      orderBy: { registeredAt: 'desc' }
    }),
    prisma.categoryRegistration.groupBy({
      by: ['status'],
      where: { playerId },
      _count: true
    })
  ]);

  // Convert counts array to object
  const statusCounts = {
    total: 0,
    active: 0,
    withdrawn: 0,
    suspended: 0
  };

  counts.forEach(({ status, _count }) => {
    statusCounts.total += _count;
    statusCounts[status.toLowerCase()] = _count;
  });

  return {
    registrations,
    counts: statusCounts
  };
}

/**
 * Get all registrations for a specific category
 */
export async function getCategoryRegistrations(categoryId, filters = {}) {
  const { status, page = 1, limit = 50 } = filters;

  const where = { categoryId };
  if (status) {
    where.status = status;
  }

  const skip = (page - 1) * limit;
  const take = Math.min(limit, 100);

  const [registrations, total] = await Promise.all([
    prisma.categoryRegistration.findMany({
      where,
      skip,
      take,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            gender: true
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    }),
    prisma.categoryRegistration.count({ where })
  ]);

  // Add calculated age to players
  const registrationsWithAge = registrations.map(reg => ({
    ...reg,
    player: {
      ...reg.player,
      age: calculateAge(reg.player.birthDate)
    }
  }));

  return {
    registrations: registrationsWithAge,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take)
    }
  };
}

/**
 * Withdraw player from category (soft delete)
 * Sets status to WITHDRAWN instead of deleting
 */
export async function withdrawRegistration(registrationId) {
  const registration = await prisma.categoryRegistration.findUnique({
    where: { id: registrationId }
  });

  if (!registration) {
    throw createHttpError(404, 'Registration not found', {
      code: 'REGISTRATION_NOT_FOUND'
    });
  }

  if (registration.status === 'WITHDRAWN') {
    throw createHttpError(400, 'Registration is already withdrawn', {
      code: 'ALREADY_WITHDRAWN'
    });
  }

  return await prisma.categoryRegistration.update({
    where: { id: registrationId },
    data: {
      status: 'WITHDRAWN',
      withdrawnAt: new Date()
    },
    include: {
      player: {
        select: { id: true, name: true }
      },
      category: {
        select: { id: true, name: true }
      }
    }
  });
}

/**
 * Reactivate a withdrawn registration
 * Re-validates eligibility before reactivating
 */
export async function reactivateRegistration(registrationId) {
  const registration = await prisma.categoryRegistration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      playerId: true,
      categoryId: true,
      status: true
    }
  });

  if (!registration) {
    throw createHttpError(404, 'Registration not found', {
      code: 'REGISTRATION_NOT_FOUND'
    });
  }

  if (registration.status !== 'WITHDRAWN') {
    throw createHttpError(400, 'Only withdrawn registrations can be reactivated', {
      code: 'NOT_WITHDRAWN',
      currentStatus: registration.status
    });
  }

  // Re-validate eligibility (player may have changed or aged)
  // Temporarily set to ACTIVE to bypass duplicate check, then validate
  await prisma.categoryRegistration.update({
    where: { id: registrationId },
    data: { status: 'TEMP' }
  });

  try {
    await validateEligibility(registration.playerId, registration.categoryId);

    // Validation passed, reactivate
    return await prisma.categoryRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'ACTIVE',
        withdrawnAt: null
      },
      include: {
        player: {
          select: { id: true, name: true }
        },
        category: {
          select: { id: true, name: true }
        }
      }
    });
  } catch (error) {
    // Validation failed, revert to WITHDRAWN
    await prisma.categoryRegistration.update({
      where: { id: registrationId },
      data: { status: 'WITHDRAWN' }
    });
    throw error;
  }
}

// Export for testing
export { calculateAge, checkProfileCompleteness, validateAge, validateGender };
