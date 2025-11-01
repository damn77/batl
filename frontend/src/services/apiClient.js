import axios from 'axios';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

// Response interceptor - handle errors globally
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
