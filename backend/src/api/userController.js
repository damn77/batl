import { createUser, listUsers, findUserById, updateUser, deleteUser } from '../services/userService.js';
import { logAudit, AuditActions } from '../services/auditService.js';

// Create new user (ADMIN only - for creating organizers)
export const createUserHandler = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    // Create user
    const user = await createUser({ email, password, role });

    // Log user creation
    await logAudit({
      userId: req.user.id,
      action: AuditActions.USER_CREATED,
      entityType: 'User',
      entityId: user.id,
      changes: { email, role },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

// List all users with pagination and filters
export const listUsersHandler = async (req, res, next) => {
  try {
    // Use validatedQuery from validation middleware
    const { page = 1, limit = 20, role, isActive } = req.validatedQuery || req.query;

    const result = await listUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      isActive: isActive !== undefined ? isActive === 'true' : null
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get specific user by ID
export const getUserHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Update user
export const updateUserHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if user exists
    const existingUser = await findUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Update user
    const user = await updateUser(id, updates);

    // Log user update
    await logAudit({
      userId: req.user.id,
      action: AuditActions.USER_UPDATED,
      entityType: 'User',
      entityId: id,
      changes: updates,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Delete user (soft delete)
export const deleteUserHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (id === req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot delete your own account'
        }
      });
    }

    // Check if user exists
    const existingUser = await findUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Prevent deleting the last admin
    if (existingUser.role === 'ADMIN') {
      const adminList = await listUsers({ role: 'ADMIN', isActive: true });
      if (adminList.users.length <= 1) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete the last admin account'
          }
        });
      }
    }

    // Soft delete user
    await deleteUser(id);

    // Log user deletion
    await logAudit({
      userId: req.user.id,
      action: AuditActions.USER_DELETED,
      entityType: 'User',
      entityId: id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export default {
  createUserHandler,
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler
};
