import createError from 'http-errors';

// Not Found handler - catches 404 errors
export const notFoundHandler = (req, res, next) => {
  next(createError(404, 'Resource not found'));
};

// Global error handler
export const errorHandler = (err, req, res, next) => {
  // Set locals, only providing error in development
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || getErrorCode(status);
  let details = err.details || null;

  // Handle Prisma unique constraint violations
  if (err.code === 'P2002' && err.meta?.target) {
    status = 409;
    code = 'CONFLICT';
    const field = Array.isArray(err.meta.target) ? err.meta.target[0] : err.meta.target;

    if (field === 'email') {
      message = 'Email already registered';
      details = { field: 'email' };
    } else {
      message = `A record with this ${field} already exists`;
      details = { field };
    }
  }

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      status,
      message,
      code,
      details,
      stack: err.stack,
      url: req.url,
      method: req.method
    });
  }

  // Prepare error response
  const errorResponse = {
    error: {
      code,
      message
    }
  };

  // Always include field-level validation details (for proper form error display)
  if (details) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Send error response
  res.status(status).json(errorResponse);
};

// Helper function to get error code based on status
const getErrorCode = (status) => {
  const codes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR'
  };
  return codes[status] || 'ERROR';
};

// Create custom error with details
export const createValidationError = (field, reason) => {
  const error = createError(400, 'Invalid request data');
  error.code = 'VALIDATION_ERROR';
  error.details = { field, reason };
  return error;
};

// Create authentication error
export const createAuthError = (message = 'Authentication required') => {
  const error = createError(401, message);
  error.code = 'UNAUTHORIZED';
  return error;
};

// Create authorization error
export const createForbiddenError = (message = 'Access denied') => {
  const error = createError(403, message);
  error.code = 'FORBIDDEN';
  return error;
};

// Create conflict error
export const createConflictError = (message, field) => {
  const error = createError(409, message);
  error.code = 'CONFLICT';
  if (field) {
    error.details = { field };
  }
  return error;
};

export default {
  notFoundHandler,
  errorHandler,
  createValidationError,
  createAuthError,
  createForbiddenError,
  createConflictError
};
