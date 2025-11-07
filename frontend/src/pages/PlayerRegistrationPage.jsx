import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Badge, Alert, Spinner, Form, ListGroup } from 'react-bootstrap';
import NavBar from '../components/NavBar';
import { useAuth } from '../utils/AuthContext';
import { listPlayers } from '../services/playerService';
import { listCategories } from '../services/categoryService';
import {
  checkEligibility,
  bulkRegisterPlayer,
  getPlayerRegistrations,
  STATUS_LABELS,
  STATUS_VARIANTS
} from '../services/registrationService';

const PlayerRegistrationPage = () => {
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

  // Auto-select player for PLAYER role users
  useEffect(() => {
    if (user?.role === 'PLAYER' && user?.playerId) {
      setSelectedPlayer(user.playerId);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerRegistrations();
      checkAllEligibility();
    } else {
      setCurrentRegistrations([]);
      setEligibilityResults({});
      setSelectedCategories([]);
    }
  }, [selectedPlayer]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [playersData, categoriesData] = await Promise.all([
        listPlayers({ limit: 100 }),
        listCategories()
      ]);

      setPlayers(playersData.profiles || []);
      setCategories(categoriesData.categories || []);
    } catch (err) {
      setError('Failed to load data');
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
      setError('Please select at least one category');
      return;
    }

    try {
      setRegistering(true);
      setError(null);

      const result = await bulkRegisterPlayer(selectedPlayer, selectedCategories);

      if (result.successful.length > 0) {
        setSuccess(`Successfully registered for ${result.successful.length} category(ies)`);
        setSelectedCategories([]);
        loadPlayerRegistrations();
      }

      if (result.failed.length > 0) {
        setError(
          `Failed to register for ${result.failed.length} category(ies): ${
            result.failed.map(f => f.categoryName).join(', ')
          }`
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to register player');
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
            <h2>Player Registration</h2>
            <p className="text-muted">Register players for tournament categories</p>
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
                    <Form.Label>Select Player *</Form.Label>
                    <Form.Select
                      value={selectedPlayer}
                      onChange={(e) => setSelectedPlayer(e.target.value)}
                      size="lg"
                    >
                      <option value="">Choose a player...</option>
                      {players.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.name} {player.birthDate && player.gender ? '✓' : '⚠️'}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      ✓ = Complete profile | ⚠️ = Missing birthDate/gender
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>
            )}

            {selectedPlayer && currentRegistrations.length > 0 && (
              <Card>
                <Card.Header>
                  <strong>Current Registrations</strong>
                </Card.Header>
                <ListGroup variant="flush">
                  {currentRegistrations.map(reg => (
                    <ListGroup.Item key={reg.id} className="d-flex justify-content-between align-items-center">
                      <span>{reg.category?.name}</span>
                      <Badge bg={STATUS_VARIANTS[reg.status]}>
                        {STATUS_LABELS[reg.status]}
                      </Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            )}
          </Col>

          <Col md={8}>
            {!selectedPlayer ? (
              <Alert variant="info">Please select a player to view available categories</Alert>
            ) : checkingEligibility ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="mt-2">Checking eligibility...</p>
              </div>
            ) : (
              <>
                <Card className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <strong>Available Categories</strong>
                    {selectedCategories.length > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleBulkRegister}
                        disabled={registering}
                      >
                        {registering ? 'Registering...' : `Register for ${selectedCategories.length} categories`}
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
                              <Badge bg="success" className="ms-4">Already Registered</Badge>
                            )}

                            {!isEligible && eligibility && (
                              <div className="ms-4 mt-2">
                                {eligibility.validations?.map((validation, idx) => (
                                  <div key={idx} className="small text-danger">
                                    • {validation.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {isEligible ? (
                            <Badge bg="success">Eligible</Badge>
                          ) : (
                            <Badge bg="danger">Ineligible</Badge>
                          )}
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </Card>

                {selectedCategories.length === 0 && (
                  <Alert variant="info">
                    Select categories to register for. Only eligible categories can be selected.
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
