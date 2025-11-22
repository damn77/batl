// Organizer Registration Panel - Allow organizers to register players/pairs for tournaments
import { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { useAuth } from '../utils/AuthContext';
import { registerForTournament } from '../services/tournamentRegistrationService';
import { registerPairForTournament } from '../services/pairService';
import apiClient from '../services/apiClient';

/**
 * OrganizerRegistrationPanel - Allows organizers to register players/pairs for tournaments
 * Includes capacity management and waitlist selection
 */
const OrganizerRegistrationPanel = ({ tournament, onRegistrationComplete }) => {
    const { user } = useAuth();
    const [players, setPlayers] = useState([]);
    const [pairs, setPairs] = useState([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState('');
    const [selectedPairId, setSelectedPairId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [playerToWaitlist, setPlayerToWaitlist] = useState(null);

    const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
    const isDoubles = tournament?.category?.type === 'DOUBLES';

    // Calculate if tournament is full based on actual registrations
    const registeredCount = registrations.filter(r => r.status === 'REGISTERED').length;
    const isFull = tournament?.capacity && registeredCount >= tournament.capacity;

    useEffect(() => {
        if (tournament?.id && isOrganizer) {
            loadData();
        }
    }, [tournament?.id, isOrganizer]);

    const loadData = async () => {
        try {
            setLoadingData(true);
            setError(null);

            if (isDoubles) {
                // Load pairs for this category (including soft-deleted ones)
                const pairsResponse = await apiClient.get(`/v1/pairs?categoryId=${tournament.category.id}&includeDeleted=true`);
                setPairs(pairsResponse.data.data.pairs || []);
            } else {
                // Load ALL players so organizers can register anyone (even if not in category yet)
                const playersResponse = await apiClient.get('/players?limit=100');
                // Map players to expected structure or use directly
                setPlayers(playersResponse.data.profiles || []);
            }

            // Load current tournament registrations
            const regsResponse = await apiClient.get(`/tournaments/${tournament.id}/registrations`);
            setRegistrations(regsResponse.data.data.registrations || []);
        } catch (err) {
            setError(`Failed to load data: ${err.message}`);
        } finally {
            setLoadingData(false);
        }
    };

    const handleRegister = async () => {
        if (isDoubles && !selectedPairId) {
            setError('Please select a pair');
            return;
        }
        if (!isDoubles && !selectedPlayerId) {
            setError('Please select a player');
            return;
        }

        // Check if tournament is full
        if (isFull) {
            // Reload registrations to get the most current list before showing modal
            await loadData();
            setShowWaitlistModal(true);
            return;
        }

        await performRegistration();
    };

    const performRegistration = async (demoteRegistrationId = null) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            console.log('[OrganizerRegistrationPanel] performRegistration called with:', {
                demoteRegistrationId,
                isDoubles,
                selectedPairId,
                selectedPlayerId,
                tournamentId: tournament.id,
            });

            let newRegistration = null;

            if (isDoubles) {
                console.log('[OrganizerRegistrationPanel] Registering pair with demoteRegistrationId:', demoteRegistrationId);

                // Register pair
                const result = await registerPairForTournament(
                    tournament.id,
                    selectedPairId,
                    false,
                    null,
                    demoteRegistrationId
                );
                newRegistration = result.registration || result; // Adjust based on actual response structure

                console.log('[OrganizerRegistrationPanel] Pair registration result:', result);

                setSuccess('Pair registered successfully!');
                setSelectedPairId('');
            } else {
                // Register player
                const result = await registerForTournament(
                    tournament.id,
                    selectedPlayerId,
                    demoteRegistrationId
                );
                newRegistration = result.registration || result;

                setSuccess('Player registered successfully!');
                setSelectedPlayerId('');
            }

            // Reload data
            await loadData();
            if (onRegistrationComplete) {
                onRegistrationComplete();
            }

            // Auto-clear success after 5 seconds
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            // apiClient interceptor returns a normalized error object
            // { status, code, message, details }
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
            // Fallback for raw axios errors if interceptor didn't catch it (unlikely but safe)
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
        } finally {
            setLoading(false);
            setShowWaitlistModal(false);
            setPlayerToWaitlist(null);
        }
    };

    const handleWaitlistSelection = (registrationId) => {
        setPlayerToWaitlist(registrationId);
    };

    const confirmWaitlistSwap = () => {
        if (!playerToWaitlist) {
            setError('Please select an option');
            return;
        }
        // If 'NEW_PAIR' is selected, pass null to add new pair to waitlist
        // Otherwise, pass the registration ID to demote that registration
        const demoteId = playerToWaitlist === 'NEW_PAIR' ? null : playerToWaitlist;
        performRegistration(demoteId);
    };

    if (!isOrganizer) {
        return null;
    }

    if (loadingData) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 mb-0 text-muted">Loading...</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">Organizer: Register {isDoubles ? 'Pair' : 'Player'}</h5>
                        {isFull && (
                            <Badge bg="warning" text="dark">Tournament Full</Badge>
                        )}
                    </div>

                    {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                    {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

                    <Form>
                        {isDoubles ? (
                            <Form.Group className="mb-3">
                                <Form.Label>Select Pair</Form.Label>
                                <Form.Select
                                    value={selectedPairId}
                                    onChange={(e) => setSelectedPairId(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Choose a pair...</option>
                                    {pairs.map((pair) => (
                                        <option key={pair.id} value={pair.id}>
                                            {pair.player1?.name} & {pair.player2?.name} (Score: {pair.seedingScore || 0})
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Only pairs in the {tournament.category?.name} category are shown
                                </Form.Text>
                            </Form.Group>
                        ) : (
                            <Form.Group className="mb-3">
                                <Form.Label>Select Player</Form.Label>
                                <Form.Select
                                    value={selectedPlayerId}
                                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Choose a player...</option>
                                    {players.map((player) => (
                                        <option key={player.id} value={player.id}>
                                            {player.name}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Showing all players in the system
                                </Form.Text>
                            </Form.Group>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleRegister}
                            disabled={loading || (isDoubles ? !selectedPairId : !selectedPlayerId)}
                        >
                            {loading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Registering...
                                </>
                            ) : (
                                `Register ${isDoubles ? 'Pair' : 'Player'}`
                            )}
                        </Button>

                        {isFull && (
                            <Form.Text className="d-block mt-2 text-warning">
                                <strong>Note:</strong> Tournament is at capacity. You'll be asked to select who to move to waitlist.
                            </Form.Text>
                        )}
                    </Form>
                </Card.Body>
            </Card>

            {/* Waitlist Selection Modal */}
            <Modal show={showWaitlistModal} onHide={() => setShowWaitlistModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Tournament is Full - Select Option</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        The tournament is at capacity ({tournament.capacity} {isDoubles ? 'pairs' : 'players'}).
                        Please choose an option:
                    </p>

                    <div className="list-group">
                        {/* Option to add new pair to waitlist */}
                        <button
                            type="button"
                            className={`list-group-item list-group-item-action ${playerToWaitlist === 'NEW_PAIR' ? 'active' : ''}`}
                            onClick={() => handleWaitlistSelection('NEW_PAIR')}
                        >
                            <div>
                                <strong>✓ Add new {isDoubles ? 'pair' : 'player'} to waitlist</strong>
                                <br />
                                <small className="text-muted">Keep all current registrations and add the new {isDoubles ? 'pair' : 'player'} to the waitlist</small>
                            </div>
                        </button>

                        {/* Divider */}
                        <div className="list-group-item disabled bg-light">
                            <small className="text-muted">— OR move an existing registration to waitlist —</small>
                        </div>

                        {/* Existing registered pairs/players */}
                        {registrations
                            .filter(r => r.status === 'REGISTERED')
                            .map((reg) => (
                                <button
                                    key={reg.id}
                                    type="button"
                                    className={`list-group-item list-group-item-action ${playerToWaitlist === reg.id ? 'active' : ''}`}
                                    onClick={() => handleWaitlistSelection(reg.id)}
                                >
                                    {isDoubles ? (
                                        <div>
                                            <strong>{reg.pair?.player1?.name} & {reg.pair?.player2?.name}</strong>
                                            <br />
                                            <small>Seed: {reg.seedPosition || '-'} | Score: {reg.pair?.seedingScore || 0}</small>
                                        </div>
                                    ) : (
                                        <div>
                                            <strong>{reg.player?.name}</strong>
                                            <br />
                                            <small>Seed: {reg.seedPosition || '-'}</small>
                                        </div>
                                    )}
                                </button>
                            ))}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowWaitlistModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={confirmWaitlistSwap}
                        disabled={!playerToWaitlist || loading}
                    >
                        {loading ? 'Processing...' : 'Confirm and Register'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default OrganizerRegistrationPanel;
