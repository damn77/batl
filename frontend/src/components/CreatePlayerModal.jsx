import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { createPlayer, checkDuplicates } from '../services/playerService';

const CreatePlayerModal = ({ show, onHide, onPlayerCreated }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: ''
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
      errors.name = t('errors.nameMinLength');
    }

    // Birth Date validation (optional)
    // if (!formData.birthDate) {
    //   errors.birthDate = 'Date of birth is required';
    // }

    // Gender validation
    if (!formData.gender) {
      errors.gender = t('errors.genderRequired');
    }

    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('errors.invalidEmail');
    }

    // Phone validation (optional) - more lenient frontend validation
    if (formData.phone) {
      const phoneDigitsOnly = formData.phone.replace(/\D/g, '');
      if (!formData.phone.startsWith('+')) {
        errors.phone = t('errors.phoneStartPlus');
      } else if (phoneDigitsOnly.length < 7 || phoneDigitsOnly.length > 15) {
        errors.phone = t('errors.phoneDigits');
      } else if (!/^\+[1-9]\d+$/.test(formData.phone)) {
        errors.phone = t('errors.phoneFormat');
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
        gender: formData.gender,
        ...(formData.birthDate && { birthDate: new Date(formData.birthDate).toISOString() }),
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
        phone: '',
        birthDate: '',
        gender: ''
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
      let errorMessage = err.message || err.response?.data?.error?.message || t('errors.createPlayerFailed');

      // Check for validation errors
      if (errorCode === 'VALIDATION_ERROR' && errorDetails) {
        const validationErrors = Array.isArray(errorDetails)
          ? errorDetails.map(d => d.message).join(', ')
          : errorMessage;
        errorMessage = t('errors.validationFailed', { details: validationErrors });
      }

      // Check for unique constraint errors (duplicate email)
      if (errorCode === 'CONFLICT' && errorDetails?.field === 'email') {
        setValidationErrors({ email: errorMessage });
        return; // Don't set generic error
      }

      // Add helpful hints for common errors
      if (errorMessage.includes('phone')) {
        errorMessage += ` (${t('modals.createPlayer.phoneHint')})`;
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
        phone: '',
        birthDate: '',
        gender: ''
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
        <Modal.Title>{t('modals.createPlayer.title')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        {duplicates.length > 0 && (
          <Alert variant="warning" className="border-warning">
            <Alert.Heading>
              <span className="me-2">⚠️</span>
              {t('modals.createPlayer.duplicatesFound', {
                count: duplicates.length,
                plural: duplicates.length > 1 ? 's' : ''
              })}
            </Alert.Heading>
            <p className="mb-2">
              <strong>{t('modals.createPlayer.similarProfiles', {
                plural: duplicates.length > 1 ? 's' : '',
                verb: duplicates.length === 1 ? 's' : ''
              })}</strong>
            </p>
            <ListGroup variant="flush" className="mb-2">
              {duplicates.map((dup) => (
                <ListGroup.Item key={dup.id} className="bg-transparent border-warning">
                  <div className="d-flex align-items-start">
                    <span className="badge bg-warning text-dark me-2">{t('badges.match')}</span>
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
              <strong>⚡ {t('common.note')}:</strong> {t('modals.createPlayer.duplicateNote')}
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>{t('form.labels.name')} {t('common.required')}</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              isInvalid={!!validationErrors.name}
              disabled={loading}
              placeholder={t('placeholders.playerName')}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.name}
            </Form.Control.Feedback>
            {checkingDuplicates && (
              <Form.Text className="text-muted">
                <Spinner animation="border" size="sm" className="me-1" />
                {t('modals.createPlayer.checkingDuplicates')}
              </Form.Text>
            )}
          </Form.Group>

          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.dateOfBirth')}</Form.Label>
                <Form.Control
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  isInvalid={!!validationErrors.birthDate}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.birthDate}
                </Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.gender')} {t('common.required')}</Form.Label>
                <Form.Select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  isInvalid={!!validationErrors.gender}
                  disabled={loading}
                >
                  <option value="">{t('form.options.selectGender')}</option>
                  <option value="MEN">{t('form.options.male')}</option>
                  <option value="WOMEN">{t('form.options.female')}</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {validationErrors.gender}
                </Form.Control.Feedback>
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>{t('form.labels.email')}</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              isInvalid={!!validationErrors.email}
              disabled={loading}
              placeholder={`${t('placeholders.email')} (${t('common.optional').toLowerCase()})`}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.email}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {t('modals.createPlayer.emailHint')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('form.labels.phone')}</Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              isInvalid={!!validationErrors.phone}
              disabled={loading}
              placeholder={`${t('placeholders.phone')} (${t('common.optional').toLowerCase()})`}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.phone}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {t('modals.createPlayer.phoneHint')}
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
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
              {t('modals.createPlayer.creating')}
            </>
          ) : (
            t('modals.createPlayer.submit')
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreatePlayerModal;
