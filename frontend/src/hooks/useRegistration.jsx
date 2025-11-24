// Custom hook for tournament registration logic
import { useState } from 'react';
import { registerForTournament } from '../services/tournamentRegistrationService';
import { registerPairForTournament } from '../services/pairService';

/**
 * useRegistration - Custom hook to handle tournament registration logic
 * Abstracts common patterns for both singles and doubles registration
 * 
 * @param {Object} tournament - Tournament object
 * @param {Function} onSuccess - Callback after successful registration
 * @returns {Object} Registration state and handlers
 */
export const useRegistration = (tournament, onSuccess) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const isDoubles = tournament?.category?.type === 'DOUBLES';

    /**
     * Perform registration for either singles or doubles
     * @param {string} entityId - Player ID or Pair ID
     * @param {string|null} demoteRegistrationId - Optional registration to demote
     */
    const performRegistration = async (entityId, demoteRegistrationId = null) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            let result;

            if (isDoubles) {
                // Register pair
                result = await registerPairForTournament(
                    tournament.id,
                    entityId,
                    false,
                    null,
                    demoteRegistrationId
                );
            } else {
                // Register player
                result = await registerForTournament(
                    tournament.id,
                    entityId,
                    demoteRegistrationId
                );
            }

            setSuccess(`${isDoubles ? 'Pair' : 'Player'} registered successfully!`);

            // Call success callback
            if (onSuccess) {
                onSuccess(result);
            }

            // Auto-clear success after 5 seconds
            setTimeout(() => setSuccess(null), 5000);

            return result;
        } catch (err) {
            // Handle error formatting
            let errorMessage = err.message || 'An error occurred';

            // Check for violations in details (from normalized error)
            if (err.details?.violations && Array.isArray(err.details.violations)) {
                errorMessage = (
                    <div>
                        {errorMessage}
                        <ul className="mb-0 mt-2">
                            {err.details.violations.map((violation, index) => (
                                <li key={index}>{violation}</li>
                            ))}
                        </ul>
                    </div>
                );
            }
            // Fallback for raw axios errors
            else if (err.response?.data?.error?.details?.violations) {
                const violations = err.response.data.error.details.violations;
                if (Array.isArray(violations)) {
                    errorMessage = (
                        <div>
                            {err.response.data.error.message || errorMessage}
                            <ul className="mb-0 mt-2">
                                {violations.map((violation, index) => (
                                    <li key={index}>{violation}</li>
                                ))}
                            </ul>
                        </div>
                    );
                }
            }

            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    return {
        loading,
        error,
        success,
        isDoubles,
        performRegistration,
        clearMessages,
        setError,
    };
};

export default useRegistration;
