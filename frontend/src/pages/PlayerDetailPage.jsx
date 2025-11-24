import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Badge, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import { getPlayer, updatePlayer } from '../services/playerService';

const PlayerDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadPlayer();
  }, [id]);

  const loadPlayer = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPlayer(id);
      setPlayer(data.profile);
      setFormData({
        name: data.profile.name,
        email: data.profile.email || '',
        phone: data.profile.phone || '',
        birthDate: data.profile.birthDate ? new Date(data.profile.birthDate).toISOString().split('T')[0] : '',
        gender: data.profile.gender || ''
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load player profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: null
      });
    }
    // Clear success message on edit
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const validateForm = () => {
    const errors = {};

    // Name validation

    // Phone validation (optional) - more lenient frontend validation
    if (formData.phone) {
      const phoneDigitsOnly = formData.phone.replace(/\D/g, '');
      if (!formData.phone.startsWith('+')) {
        errors.phone = 'Phone must start with + (e.g., +1234567890)';
      } else if (phoneDigitsOnly.length < 7 || phoneDigitsOnly.length > 15) {
        errors.phone = 'Phone must have 7-15 digits after the + sign';
      } else if (!/^\+[1-9]\d+$/.test(formData.phone)) {
        errors.phone = 'Phone must be in international format: +CountryCodeNumber (e.g., +12345678901)';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // Only send changed fields
      const updates = {};
      if (formData.name !== player.name) updates.name = formData.name.trim();
      if (formData.email !== (player.email || '')) updates.email = formData.email.trim() || null;
      if (formData.phone !== (player.phone || '')) updates.phone = formData.phone.trim() || null;

      // Handle birthDate update
      const currentBirthDate = player.birthDate ? new Date(player.birthDate).toISOString().split('T')[0] : '';
      if (formData.birthDate !== currentBirthDate) {
        updates.birthDate = formData.birthDate ? new Date(formData.birthDate).toISOString() : null;
      }

      if (formData.gender !== (player.gender || '')) updates.gender = formData.gender || null;

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        return;
      }

      await updatePlayer(id, updates);
      setSuccessMessage('Player profile updated successfully');

      // Reload player data
      await loadPlayer();
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to update player profile';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/organizer/players');
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('common.never');
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <Container className="mt-4">
          <div className="text-center my-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        </Container>
      </>
    );
  }

  if (error && !player) {
    return (
      <>
        <NavBar />
        <Container className="mt-4">
          <Alert variant="danger">{error}</Alert>
          <Button variant="secondary" onClick={handleBack}>
            Back to Players
          </Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('pages.playerProfile.title')}</h2>
          <Button variant="secondary" onClick={handleBack}>
            {t('common.backToPlayers')}
          </Button>
        </div>

        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <Row>
          <Col md={8}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Edit Player Information</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      isInvalid={!!validationErrors.name}
                      disabled={saving}
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.name}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Date of Birth</Form.Label>
                        <Form.Control
                          type="date"
                          name="birthDate"
                          value={formData.birthDate}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.birthDate}
                          disabled={saving}
                        />
                        <Form.Control.Feedback type="invalid">
                          {validationErrors.birthDate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Gender *</Form.Label>
                        <Form.Select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.gender}
                          disabled={saving}
                        >
                          <option value="">Select Gender</option>
                          <option value="MEN">Male</option>
                          <option value="WOMEN">Female</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {validationErrors.gender}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      isInvalid={!!validationErrors.email}
                      disabled={saving}
                      placeholder="player@example.com"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.email}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Used for linking player accounts
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      isInvalid={!!validationErrors.phone}
                      disabled={saving}
                      placeholder="+1234567890"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.phone}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      International format starting with +
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={loadPlayer}
                      disabled={saving}
                    >
                      Reset
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Profile Information</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>Player ID:</strong>
                  <div className="text-muted small">{player.id}</div>
                </div>

                <div className="mb-3">
                  <strong>Account Status:</strong>
                  <div className="mt-1">
                    {player.userId ? (
                      <>
                        <Badge bg="success">Has Account</Badge>
                        {player.user && (
                          <div className="text-muted small mt-1">
                            {player.user.email} ({player.user.role})
                          </div>
                        )}
                      </>
                    ) : (
                      <Badge bg="secondary">No Account</Badge>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <strong>Created:</strong>
                  <div className="text-muted small">{formatDate(player.createdAt)}</div>
                </div>

                <div className="mb-3">
                  <strong>Last Updated:</strong>
                  <div className="text-muted small">{formatDate(player.updatedAt)}</div>
                </div>

                {player.creator && (
                  <div className="mb-3">
                    <strong>Created By:</strong>
                    <div className="text-muted small">{player.creator.email}</div>
                  </div>
                )}
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h5 className="mb-0">Tournament History</h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted">
                  Tournament participation tracking will be available in a future release.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default PlayerDetailPage;
