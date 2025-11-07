import passport from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import { logAudit, AuditActions } from '../services/auditService.js';
import { registerPlayer } from '../services/userService.js';

const prisma = new PrismaClient();

// Login handler
export const login = async (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      // Log failed login attempt
      await logAudit({
        userId: null,
        action: AuditActions.LOGIN_FAILED,
        entityType: 'Auth',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      });

      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: info?.message || 'Invalid email or password'
        }
      });
    }

    // Establish session
    req.logIn(user, async (err) => {
      if (err) {
        return next(err);
      }

      // Update last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Get player profile ID if user is a PLAYER
      let playerId = null;
      if (user.role === 'PLAYER') {
        const playerProfile = await prisma.playerProfile.findFirst({
          where: { userId: user.id },
          select: { id: true }
        });
        playerId = playerProfile?.id || null;
      }

      // Log successful login
      await logAudit({
        userId: user.id,
        action: AuditActions.LOGIN_SUCCESS,
        entityType: 'Auth',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      });

      // Return user data (without password)
      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          playerId: playerId
        },
        session: {
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        }
      });
    });
  })(req, res, next);
};

// Logout handler
export const logout = async (req, res) => {
  const userId = req.user?.id;

  // Log logout event
  if (userId) {
    await logAudit({
      userId,
      action: AuditActions.LOGOUT,
      entityType: 'Auth',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  }

  // Destroy session
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Failed to logout'
        }
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          error: {
            code: 'SESSION_ERROR',
            message: 'Failed to destroy session'
          }
        });
      }

      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });
};

// Check session status
export const checkSession = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'No active session'
      }
    });
  }

  // Get player profile ID if user is a PLAYER
  let playerId = null;
  if (req.user.role === 'PLAYER') {
    const playerProfile = await prisma.playerProfile.findFirst({
      where: { userId: req.user.id },
      select: { id: true }
    });
    playerId = playerProfile?.id || null;
  }

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      emailVerified: req.user.emailVerified,
      playerId: playerId
    },
    session: {
      expiresAt: new Date(req.session.cookie.expires || Date.now() + 30 * 60 * 1000)
    }
  });
};

// Player registration handler (public)
export const register = async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required',
          details: {
            fields: {
              email: !email ? 'Email is required' : null,
              password: !password ? 'Password is required' : null,
              name: !name ? 'Name is required' : null
            }
          }
        }
      });
    }

    // Register player (creates user + links/creates profile)
    const { user, profile, profileLinked } = await registerPlayer({
      email,
      password,
      name,
      phone
    });

    // Log registration
    await logAudit({
      userId: user.id,
      action: AuditActions.USER_CREATED,
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    // Auto-login after registration
    req.logIn(user, async (err) => {
      if (err) {
        return next(err);
      }

      // Update last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Return user data, profile info, and session
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified
        },
        profile: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone
        },
        profileLinked, // Indicates if existing profile was linked
        session: {
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

export default {
  login,
  logout,
  checkSession,
  register
};
