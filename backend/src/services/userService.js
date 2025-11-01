import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createConflictError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// Find user by email
export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
};

// Find user by ID
export const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true
    }
  });
};

// Create new user
export const createUser = async ({ email, password, role }) => {
  // Check if email already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw createConflictError('Email already registered', 'email');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role,
      isActive: true,
      emailVerified: false
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true
    }
  });

  return user;
};

// Update user
export const updateUser = async (id, updates) => {
  // Check if email is being updated and if it's already taken
  if (updates.email) {
    const existingUser = await findUserByEmail(updates.email);
    if (existingUser && existingUser.id !== id) {
      throw createConflictError('Email already in use', 'email');
    }
    updates.email = updates.email.toLowerCase();
    // Reset email verification if email is changed
    updates.emailVerified = false;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      emailVerified: true,
      updatedAt: true
    }
  });

  return user;
};

// Soft delete user (set isActive to false)
export const deleteUser = async (id) => {
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false }
  });

  return user;
};

// List users with pagination and filters
export const listUsers = async ({ page = 1, limit = 20, role = null, isActive = null }) => {
  const where = {};

  if (role) {
    where.role = role;
  }

  if (isActive !== null) {
    where.isActive = isActive;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Verify password
export const verifyPassword = async (plainPassword, passwordHash) => {
  return await bcrypt.compare(plainPassword, passwordHash);
};

// Change password
export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash }
  });

  return true;
};

// Register new player (create user + link or create profile)
export const registerPlayer = async ({ email, password, name, phone }) => {
  // Import playerService functions
  const { findMatchingProfile, linkProfileToUser } = await import('./playerService.js');

  // Check if email already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw createConflictError('Email already registered', 'email');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user with PLAYER role
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role: 'PLAYER',
      isActive: true,
      emailVerified: false
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true
    }
  });

  // Search for matching player profile
  const matchingProfile = await findMatchingProfile({ name, email });

  let profile;
  if (matchingProfile) {
    // Link to existing profile (preserves tournament history)
    profile = await linkProfileToUser(matchingProfile.id, user.id);
  } else {
    // Create new player profile linked to user
    profile = await prisma.playerProfile.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || null,
        userId: user.id,
        createdBy: user.id // Self-created profile
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
  }

  return {
    user,
    profile,
    profileLinked: !!matchingProfile // Indicates if profile was linked vs created new
  };
};

export default {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  verifyPassword,
  changePassword,
  registerPlayer
};
