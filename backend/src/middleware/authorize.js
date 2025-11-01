import { AbilityBuilder, createMongoAbility } from '@casl/ability';

// Define abilities based on user role
export const defineAbilitiesFor = (user) => {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (!user) {
    // Public/unauthenticated users
    can('read', 'Tournament', { isPublic: true });
    can('read', 'Ranking', { isPublic: true });
    can('read', 'PlayerProfile', ['name', 'hasAccount']); // Limited fields only
  } else {
    switch (user.role) {
      case 'ADMIN':
        // Admin has full access to everything
        can('manage', 'all');
        break;

      case 'ORGANIZER':
        // Organizer permissions
        can(['create', 'read', 'update'], 'Tournament');
        can('manage', 'PlayerProfile'); // Full access to player profiles
        can('read', 'User', { role: 'ORGANIZER' }); // Can view other organizers
        can('read', 'User', { role: 'PLAYER' });
        cannot('delete', 'Tournament'); // Preserve data integrity
        break;

      case 'PLAYER':
        // Player permissions
        can('read', 'Tournament');
        can('read', 'Ranking');
        can('read', 'PlayerProfile', { userId: user.id }); // Own profile only
        can('update', 'PlayerProfile', { userId: user.id }); // Own profile only
        can('read', 'User', { id: user.id }); // Own account only
        can('update', 'User', { id: user.id }); // Own account only
        break;

      default:
        // No permissions for unknown roles
        break;
    }
  }

  return build();
};

// Middleware to check if user can perform action on subject
export const authorize = (action, subject) => {
  return (req, res, next) => {
    const ability = defineAbilitiesFor(req.user);

    if (ability.can(action, subject)) {
      next();
    } else {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Insufficient permissions.',
          details: {
            action,
            subject,
            userRole: req.user?.role || 'PUBLIC'
          }
        }
      });
    }
  };
};

// Middleware to attach user's abilities to request object
export const attachAbilities = (req, res, next) => {
  req.ability = defineAbilitiesFor(req.user);
  next();
};

export default {
  defineAbilitiesFor,
  authorize,
  attachAbilities
};
