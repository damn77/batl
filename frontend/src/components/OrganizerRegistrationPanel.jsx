// Organizer Registration Panel - Allow organizers to register players/pairs for tournaments
import { useState, useEffect } from 'react';
import { Card, Button, Spinner, Modal, Badge } from 'react-bootstrap';
import { useAuth } from '../utils/AuthContext';
import { useRegistration } from '../hooks/useRegistration.jsx';
import RegistrationForm from './RegistrationForm';
import apiClient from '../services/apiClient';

/**
 * OrganizerRegistrationPanel - Allows organizers to register players/pairs for tournaments
 * Includes capacity management and waitlist selection
 */
const OrganizerRegistrationPanel = ({ tournament, onRegistrationComplete }) => {
    const { user } = useAuth();
    const [entities, setEntities] = useState([]); // Players or Pairs
    const [selectedId, setSelectedId] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [entityToWaitlist, setEntityToWaitlist] = useState(null);

    const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

    // Use the custom registration hook
    const {
        loading,
        error,
        success,
        isDoubles,
        performRegistration,
        clearMessages,
        setError,
    } = useRegistration(tournament, async () => {
        // On success callback
        setSelectedId('');
        await loadData();
        if (onRegistrationComplete) {
            onRegistrationComplete();
        }
    });

    // Calculate if tournament is full based on actual registrations
    const registeredCount = registrations.filter((r) => r.status === 'REGISTERED').length;
    const isFull = tournament?.capacity && registeredCount >= tournament.capacity;

    useEffect(() => {
        if (tournament?.id && isOrganizer) {
            loadData();
        }
    }, [tournament?.id, isOrganizer]);

    const loadData = async () => {
        try {
            setLoadingData(true);
            clearMessages();

            if (isDoubles) {
                // Load pairs for this category (including soft-deleted ones)
                const pairsResponse = await apiClient.get(
                    `/v1/pairs?categoryId=${tournament.category.id}&includeDeleted=true`
                );
                setEntities(pairsResponse.data.data.pairs || []);
            } else {
                // Load ALL players so organizers can register anyone
                const playersResponse = await apiClient.get('/players?limit=100');
                setEntities(playersResponse.data.profiles || []);
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
        if (!selectedId) {
            setError(`Please select a ${isDoubles ? 'pair' : 'player'}`);
            return;
        }

        // Check if tournament is full
        if (isFull) {
            // Reload registrations to get the most current list before showing modal
            await loadData();
            setShowWaitlistModal(true);
            return;
        }

        await performRegistration(selectedId);
    };

    const handleWaitlistSelection = (registrationId) => {
        setEntityToWaitlist(registrationId);
    };

    const confirmWaitlistSwap = async () => {
        if (!entityToWaitlist) {
            setError('Please select an option');
            return;
        }

        try {
            // If 'NEW_ENTITY' is selected, pass null to add new entity to waitlist
            // Otherwise, pass the registration ID to demote that registration
            const demoteId = entityToWaitlist === 'NEW_ENTITY' ? null : entityToWaitlist;
            await performRegistration(selectedId, demoteId);
        } finally {
            setShowWaitlistModal(false);
            setEntityToWaitlist(null);
        }
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
                        {isFull && <Badge bg="warning" text="dark">Tournament Full</Badge>}
                    </div>

                    <RegistrationForm
                        entities={entities}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onSubmit={handleRegister}
                        loading={loading}
                        disabled={false}
                        isDoubles={isDoubles}
                        categoryName={tournament.category?.name}
                        error={error}
                        success={success}
                        onClearError={clearMessages}
                        onClearSuccess={clearMessages}
                        isFull={isFull}
                    />
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
                        {/* Option to add new entity to waitlist */}
                        <button
                            type="button"
                            className={`list-group-item list-group-item-action ${entityToWaitlist === 'NEW_ENTITY' ? 'active' : ''
                                }`}
                            onClick={() => handleWaitlistSelection('NEW_ENTITY')}
                        >
                            <div>
                                <strong>✓ Add new {isDoubles ? 'pair' : 'player'} to waitlist</strong>
                                <br />
                                <small className="text-muted">
                                    Keep all current registrations and add the new {isDoubles ? 'pair' : 'player'} to
                                    the waitlist
                                </small>
                            </div>
                        </button>

                        {/* Divider */}
                        <div className="list-group-item disabled bg-light">
                            <small className="text-muted">— OR move an existing registration to waitlist —</small>
                        </div>

                        {/* Existing registered entities */}
                        {registrations
                            .filter((r) => r.status === 'REGISTERED')
                            .map((reg) => (
                                <button
                                    key={reg.id}
                                    type="button"
                                    className={`list-group-item list-group-item-action ${entityToWaitlist === reg.id ? 'active' : ''
                                        }`}
                                    onClick={() => handleWaitlistSelection(reg.id)}
                                >
                                    {isDoubles ? (
                                        <div>
                                            <strong>
                                                {reg.pair?.player1?.name} & {reg.pair?.player2?.name}
                                            </strong>
                                            <br />
                                            <small>
                                                Seed: {reg.seedPosition || '-'} | Score: {reg.pair?.seedingScore || 0}
                                            </small>
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
                        disabled={!entityToWaitlist || loading}
                    >
                        {loading ? 'Processing...' : 'Confirm and Register'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default OrganizerRegistrationPanel;
