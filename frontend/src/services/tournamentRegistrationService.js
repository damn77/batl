import apiClient from './apiClient';

/**
 * Tournament Registration Service - API calls for tournament registrations
 * Backend endpoints: /api/tournaments (003-tournament-registration)
 */

/**
 * Register current user (or specific player if organizer) for a tournament
 * @param {string} tournamentId - Tournament UUID
 * @param {string} [playerId] - Optional Player UUID (ORGANIZER/ADMIN only)
 * @param {string} [demoteRegistrationId] - Optional Registration ID to demote (ORGANIZER/ADMIN only)
 * @returns {Promise} Registration result with tournament and category info
 */
export const registerForTournament = async (tournamentId, playerId = null, demoteRegistrationId = null) => {
  const data = {};
  if (playerId) data.playerId = playerId;
  if (demoteRegistrationId) data.demoteRegistrationId = demoteRegistrationId;

  const response = await apiClient.post(`/tournaments/${tournamentId}/register`, data);
  return response.data.data;
};

/**
 * T032: Unregister current user from a tournament
 * @param {string} tournamentId - Tournament UUID
 * @returns {Promise} Unregistration result with promotion and cleanup info
 */
export const unregisterFromTournament = async (tournamentId) => {
  const response = await apiClient.delete(`/tournaments/${tournamentId}/register`);
  return response.data.data;
};

/**
 * Get current user's registration for a specific tournament
 * @param {string} tournamentId - Tournament UUID
 * @returns {Promise} Registration object or null if not registered
 */
export const getMyRegistration = async (tournamentId) => {
  try {
    const response = await apiClient.get(`/tournaments/${tournamentId}/registration`);
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Not registered
    }
    throw error;
  }
};

/**
 * Get all registrations for a tournament (ORGANIZER/ADMIN only)
 * @param {string} tournamentId - Tournament UUID
 * @param {string} status - Optional filter by status (REGISTERED, WAITLISTED, WITHDRAWN, CANCELLED)
 * @returns {Promise} List of registrations
 */
export const getTournamentRegistrations = async (tournamentId, status = null) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const query = params.toString();
  const url = query
    ? `/tournaments/${tournamentId}/registrations?${query}`
    : `/tournaments/${tournamentId}/registrations`;

  const response = await apiClient.get(url);
  return response.data.data;
};

/**
 * Get all tournaments a player is registered for
 * @param {string} playerId - Player UUID
 * @param {string} status - Optional filter by status
 * @returns {Promise} List of tournament registrations
 */
export const getPlayerTournaments = async (playerId, status = null) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const query = params.toString();
  const url = query
    ? `/tournaments/players/${playerId}/tournaments?${query}`
    : `/tournaments/players/${playerId}/tournaments`;

  const response = await apiClient.get(url);
  return response.data.data;
};

// Tournament Registration Status enum
export const TOURNAMENT_REGISTRATION_STATUS = {
  REGISTERED: 'REGISTERED',
  WAITLISTED: 'WAITLISTED',
  WITHDRAWN: 'WITHDRAWN',
  CANCELLED: 'CANCELLED'
};

// Status labels for display
export const STATUS_LABELS = {
  REGISTERED: 'Registered',
  WAITLISTED: 'Waitlisted',
  WITHDRAWN: 'Withdrawn',
  CANCELLED: 'Cancelled'
};

// Status badge variants for React Bootstrap
export const STATUS_VARIANTS = {
  REGISTERED: 'success',
  WAITLISTED: 'warning',
  WITHDRAWN: 'secondary',
  CANCELLED: 'danger'
};

// Status descriptions
export const STATUS_DESCRIPTIONS = {
  REGISTERED: 'You have a confirmed spot in this tournament',
  WAITLISTED: 'Tournament is at capacity. You will be notified if a spot opens up.',
  WITHDRAWN: 'You have withdrawn from this tournament',
  CANCELLED: 'This tournament has been cancelled'
};
