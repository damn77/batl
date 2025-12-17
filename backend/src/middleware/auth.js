import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configure Passport local strategy for email/password authentication
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check if account is active
      if (!user.isActive) {
        return done(null, false, { message: 'Account is deactivated' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Authentication successful
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize user for session storage
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        playerProfile: {
          select: {
            id: true
          }
        }
      }
    });

    if (!user) {
      // User no longer exists (e.g., deleted or database was reset)
      // Return null to clear the invalid session instead of throwing error
      console.warn(`Session references non-existent user ID: ${id}`);
      return done(null, false);
    }

    // Check if account is still active
    if (!user.isActive) {
      console.warn(`Session for deactivated user: ${user.email}`);
      return done(null, false);
    }

    // Flatten playerProfile.id to playerId for easier access
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      playerId: user.playerProfile?.id || null
    };

    done(null, userData);
  } catch (error) {
    done(error);
  }
});

// Middleware to check if user is authenticated
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    }
  });
};

// Middleware to check if user has specific role
export const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Insufficient permissions.',
          details: {
            requiredRole: roles,
            userRole: req.user.role
          }
        }
      });
    }

    next();
  };
};

// Alias for hasRole (for consistency with route files)
export const authorize = hasRole;

export default passport;
