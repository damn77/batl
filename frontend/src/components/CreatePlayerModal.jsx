import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { createPlayer, checkDuplicates } from '../services/playerService';

const CreatePlayerModal = ({ show, onHide, onPlayerCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Check for duplicates when name or email changes
  useEffect(() => {
    if (!show) return;

    const timer = setTimeout(async () => {
      if (formData.name || formData.email) {
        try {
          setCheckingDuplicates(true);
          console.log('Checking for duplicates:', { name: formData.name, email: formData.email });
          const result = await checkDuplicates(formData.name, formData.email);
          console.log('Duplicate check result:', result);
          setDuplicates(result.duplicates || []);

          if (result.duplicates && result.duplicates.length > 0) {
            console.log(`⚠️ Found ${result.duplicates.length} potential duplicate(s)`);
          }
        } catch (err) {
          // Ignore errors in duplicate checking but log them
          console.error('Duplicate check failed:', err);
          console.error('Error details:', err.response?.data || err.message);
          setDuplicates([]);
        } finally {
          setCheckingDuplicates(false);
        }
      } else {
        setDuplicates([]);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [formData.name, formData.email, show]);

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
  };

  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

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

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const playerData = {
        name: formData.name.trim(),
        ...(formData.email && { email: formData.email.trim() }),
        ...(formData.phone && { phone: formData.phone.trim() })
      };

      const response = await createPlayer(playerData);

      // Show info if duplicates were detected but creation succeeded
      if (response.duplicates && response.duplicates.length > 0) {
        console.log(`Player profile created despite ${response.duplicates.length} similar profile(s) existing`);
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: ''
      });
      setValidationErrors({});
      setDuplicates([]);

      // Notify parent component
      onPlayerCreated();
    } catch (err) {
      console.error('Error creating player profile:', err);

      // Error can come in two structures:
      // 1. Direct from apiClient interceptor: { status, code, message, details }
      // 2. Raw axios error: { response: { data: { error: {...} } } }
      const errorCode = err.code || err.response?.data?.error?.code;
      const errorDetails = err.details || err.response?.data?.error?.details;
      let errorMessage = err.message || err.response?.data?.error?.message || 'Failed to create player profile';

      // Check for validation errors
      if (errorCode === 'VALIDATION_ERROR' && errorDetails) {
        const validationErrors = Array.isArray(errorDetails)
          ? errorDetails.map(d => d.message).join(', ')
          : errorMessage;
        errorMessage = `Validation failed: ${validationErrors}`;
      }

      // Check for unique constraint errors (duplicate email)
      if (errorCode === 'CONFLICT' && errorDetails?.field === 'email') {
        setValidationErrors({ email: errorMessage });
        return; // Don't set generic error
      }

      // Add helpful hints for common errors
      if (errorMessage.includes('phone')) {
        errorMessage += ' (Phone must be in international format: +1234567890)';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Reset form on close
      setFormData({
        name: '',
        email: '',
        phone: ''
      });
      setValidationErrors({});
      setError(null);
      setDuplicates([]);
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop={loading ? 'static' : true} size="lg">
      <Modal.Header closeButton={!loading}>
        <Modal.Title>Create New Player Profile</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        {duplicates.length > 0 && (
          <Alert variant="warning" className="border-warning">
            <Alert.Heading>
              <span className="me-2">⚠️</span>
              {duplicates.length} Potential Duplicate{duplicates.length > 1 ? 's' : ''} Found
            </Alert.Heading>
            <p className="mb-2">
              <strong>Similar player profile{duplicates.length > 1 ? 's' : ''} already exist{duplicates.length === 1 ? 's' : ''}:</strong>
            </p>
            <ListGroup variant="flush" className="mb-2">
              {duplicates.map((dup) => (
                <ListGroup.Item key={dup.id} className="bg-transparent border-warning">
                  <div className="d-flex align-items-start">
                    <span className="badge bg-warning text-dark me-2">Match</span>
                    <div>
                      <strong>{dup.name}</strong>
                      {dup.email && (
                        <div className="text-muted small">
                          <span className="me-1">✉️</span>
                          {dup.email}
                        </div>
                      )}
                      {dup.phone && (
                        <div className="text-muted small">
                          <span className="me-1">📱</span>
                          {dup.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <div className="alert alert-light border-warning mb-0">
              <strong>⚡ Note:</strong> You can still create this profile if you&apos;re sure it&apos;s a different person.
              Please verify the name and contact information to avoid duplicate entries.
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              isInvalid={!!validationErrors.name}
              disabled={loading}
              placeholder="Enter player name"
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.name}
            </Form.Control.Feedback>
            {checkingDuplicates && (
              <Form.Text className="text-muted">
                <Spinner animation="border" size="sm" className="me-1" />
                Checking for duplicates...
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              isInvalid={!!validationErrors.email}
              disabled={loading}
              placeholder="player@example.com (optional)"
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.email}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Optional. Used for linking player accounts later.
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
              disabled={loading}
              placeholder="+1234567890 (optional)"
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.phone}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Optional. International format starting with +.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading || checkingDuplicates}>
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Creating...
            </>
          ) : (
            'Create Player Profile'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreatePlayerModal;
