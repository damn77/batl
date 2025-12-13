import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Badge, Alert, Spinner, Form, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import { useAuth } from '../utils/AuthContext';
import { listPlayers } from '../services/playerService';
import { listCategories } from '../services/categoryService';
import {
  checkEligibility,
  bulkRegisterPlayer,
  getPlayerRegistrations,
  STATUS_VARIANTS
} from '../services/registrationService';

const PlayerRegistrationPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [eligibilityResults, setEligibilityResults] = useState({});
  const [currentRegistrations, setCurrentRegistrations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerRegistrations();
      // Only check eligibility if we don't already have it from the initial load
      if (Object.keys(eligibilityResults).length === 0) {
        checkAllEligibility();
      }
    } else {
      setCurrentRegistrations([]);
      setEligibilityResults({});
      setSelectedCategories([]);
    }
  }, [selectedPlayer]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load players (for organizers/admins)
      const playersData = await listPlayers({ limit: 100 });
      setPlayers(playersData.profiles || []);

      // If user is a PLAYER, find their profile ID and load categories with eligibility
      let playerIdToUse = null;
      if (user?.role === 'PLAYER') {
        const userProfile = playersData.profiles?.find(p => p.userId === user.id);
        if (userProfile) {
          playerIdToUse = userProfile.id;
          setSelectedPlayer(userProfile.id);
        }
      }

      // Load categories with eligibility info if we have a player ID
      const categoriesData = await listCategories(
        playerIdToUse ? { playerId: playerIdToUse } : {}
      );
      setCategories(categoriesData.categories || []);

      // If categories include eligibility, populate eligibilityResults
      if (playerIdToUse && categoriesData.categories) {
        const results = {};
        categoriesData.categories.forEach(cat => {
          if (cat.eligibility) {
            results[cat.id] = cat.eligibility;
          }
        });
        setEligibilityResults(results);
      }
    } catch (err) {
      setError(err.message || t('errors.failedToLoad', { resource: t('common.data') }));
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerRegistrations = async () => {
    try {
      const data = await getPlayerRegistrations(selectedPlayer);
      setCurrentRegistrations(data.registrations || []);
    } catch (err) {
      console.error('Failed to load registrations:', err);
    }
  };

  const checkAllEligibility = async () => {
    if (!selectedPlayer || categories.length === 0) return;

    setCheckingEligibility(true);
    const results = {};

    for (const category of categories) {
      try {
        const result = await checkEligibility(selectedPlayer, category.id);
        results[category.id] = result;
      } catch (err) {
        results[category.id] = { eligible: false, validations: [] };
      }
    }

    setEligibilityResults(results);
    setCheckingEligibility(false);
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleBulkRegister = async () => {
    if (!selectedPlayer || selectedCategories.length === 0) {
      setError(t('validation.selectAtLeastOneCategory'));
      return;
    }

    try {
      setRegistering(true);
      setError(null);

      const result = await bulkRegisterPlayer(selectedPlayer, selectedCategories);

      if (result.successful.length > 0) {
        setSuccess(t('messages.registrationSuccess', { count: result.successful.length }));
        setSelectedCategories([]);
        loadPlayerRegistrations();
      }

      if (result.failed.length > 0) {
        setError(
          t('errors.registrationFailed', {
            count: result.failed.length,
            categories: result.failed.map(f => f.categoryName).join(', ')
          })
        );
      }
    } catch (err) {
      // Display backend error message first, fallback to generic
      setError(err.message || t('errors.failedToRegisterPlayer'));
    } finally {
      setRegistering(false);
    }
  };

  const isAlreadyRegistered = (categoryId) => {
    return currentRegistrations.some(
      reg => reg.categoryId === categoryId && reg.status === 'ACTIVE'
    );
  };

  const getPlayerName = () => {
    const player = players.find(p => p.id === selectedPlayer);
    return player ? player.name : '';
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <Container className="mt-4">
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h2>{t('pages.registration.title')}</h2>
            <p className="text-muted">{t('pages.registration.description')}</p>
          </Col>
        </Row>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

        <Row>
          <Col md={4}>
            {/* Only show player selector for ORGANIZER and ADMIN roles */}
            {user?.role !== 'PLAYER' && (
              <Card className="mb-3">
                <Card.Body>
                  <Form.Group>
                    <Form.Label>{t('form.labels.selectPlayer')} *</Form.Label>
                    <Form.Select
                      value={selectedPlayer}
                      onChange={(e) => setSelectedPlayer(e.target.value)}
                      size="lg"
                    >
                      <option value="">{t('form.placeholders.choosePlayer')}</option>
                      {players.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.name} {player.birthDate && player.gender ? '✓' : '⚠️'}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      {t('help.profileCompleteness')}
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>
            )}

            {selectedPlayer && currentRegistrations.length > 0 && (
              <Card>
                <Card.Header>
                  <strong>{t('pages.registration.currentRegistrations')}</strong>
                </Card.Header>
                <ListGroup variant="flush">
                  {currentRegistrations.map(reg => (
                    <ListGroup.Item key={reg.id} className="d-flex justify-content-between align-items-center">
                      <span>{reg.category?.name}</span>
                      <Badge bg={STATUS_VARIANTS[reg.status]}>
                        {t(`status.${reg.status.toLowerCase()}`)}
                      </Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            )}
          </Col>

          <Col md={8}>
            {!selectedPlayer ? (
              <Alert variant="info">{t('messages.selectPlayerFirst')}</Alert>
            ) : checkingEligibility ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="mt-2">{t('messages.checkingEligibility')}</p>
              </div>
            ) : (
              <>
                <Card className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <strong>{t('pages.registration.availableCategories')}</strong>
                    {selectedCategories.length > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleBulkRegister}
                        disabled={registering}
                      >
                        {registering ? t('common.registering') : t('buttons.registerForCategories', { count: selectedCategories.length })}
                      </Button>
                    )}
                  </Card.Header>
                  <ListGroup variant="flush">
                    {categories.map(category => {
                      const eligibility = eligibilityResults[category.id];
                      const alreadyRegistered = isAlreadyRegistered(category.id);
                      const isEligible = eligibility?.eligible;
                      const canSelect = isEligible && !alreadyRegistered;

                      return (
                        <ListGroup.Item
                          key={category.id}
                          className="d-flex justify-content-between align-items-start"
                        >
                          <div className="flex-grow-1">
                            <Form.Check
                              type="checkbox"
                              label={<strong>{category.name}</strong>}
                              checked={selectedCategories.includes(category.id)}
                              onChange={() => handleCategoryToggle(category.id)}
                              disabled={!canSelect}
                            />

                            {alreadyRegistered && (
                              <Badge bg="success" className="ms-4">{t('status.alreadyRegistered')}</Badge>
                            )}

                            {!isEligible && !alreadyRegistered && eligibility && (
                              <div className="ms-4 mt-2">
                                {eligibility.validations?.map((validation, idx) => (
                                  <div key={idx} className="small text-danger">
                                    • {validation.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {alreadyRegistered ? (
                            <Badge bg="info">{t('status.registered')}</Badge>
                          ) : isEligible ? (
                            <Badge bg="success">{t('status.eligible')}</Badge>
                          ) : (
                            <Badge bg="danger">{t('status.ineligible')}</Badge>
                          )}
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </Card>

                {selectedCategories.length === 0 && (
                  <Alert variant="info">
                    {t('messages.selectCategoriesToRegister')}
                  </Alert>
                )}
              </>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default PlayerRegistrationPage;
