import axios from 'axios';

// Determine API base URL
// - Production: Use VITE_API_URL (e.g., https://batl-backend.onrender.com/api)
// - Development: Use relative URL for Vite proxy
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, use relative URL so Vite proxy works
  return '/api';
};

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// Request interceptor - add any auth tokens, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handle errors globally
 *
 * Error structure returned to components:
 * {
 *   status: number,           // HTTP status code
 *   code: string,             // Error code from backend or 'ERROR'/'NETWORK_ERROR'/'REQUEST_ERROR'
 *   message: string,          // Human-readable error message from backend
 *   details: object           // Additional error details (e.g., violations array)
 * }
 *
 * Usage in components:
 * catch (err) {
 *   // Display backend error message: err.message
 *   // Check for violations: err.details?.violations
 *   setError(err.message || t('errors.genericFallback'));
 * }
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (import.meta.env.DEV) {
      console.log(`[API] Response:`, response.data);
    }
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;

      // Log error in development
      if (import.meta.env.DEV) {
        console.error(`[API] Error ${status}:`, data);
      }

      // Handle session expiration (401)
      if (status === 401) {
        // Dispatch session expired event
        window.dispatchEvent(new CustomEvent('session-expired'));
      }

      // Handle forbidden (403)
      if (status === 403) {
        console.warn('[API] Access denied:', data.error?.message);
      }

      // Handle rate limiting (429)
      if (status === 429) {
        console.warn('[API] Rate limit exceeded:', data.error?.message);
      }

      // Return error response for component handling
      return Promise.reject({
        status,
        code: data.error?.code || 'ERROR',
        message: data.error?.message || 'An error occurred',
        details: data.error?.details
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('[API] No response received:', error.message);
      return Promise.reject({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Unable to reach server. Please check your connection.'
      });
    } else {
      // Error setting up request
      console.error('[API] Request error:', error.message);
      return Promise.reject({
        status: 0,
        code: 'REQUEST_ERROR',
        message: error.message
      });
    }
  }
);

export default apiClient;
