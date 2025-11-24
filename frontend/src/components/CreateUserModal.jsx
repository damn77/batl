import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { createUser } from '../services/userService';

const CreateUserModal = ({ show, onHide, onUserCreated }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'ORGANIZER'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

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

    // Email validation
    if (!formData.email) {
      errors.email = t('errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('errors.invalidEmail');
    }

    // Password validation
    if (!formData.password) {
      errors.password = t('errors.passwordRequired');
    } else if (formData.password.length < 8) {
      errors.password = t('errors.passwordMinLength');
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = t('errors.passwordLowercase');
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = t('errors.passwordUppercase');
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = t('errors.passwordNumber');
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = t('errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('errors.passwordsNoMatch');
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

      const { confirmPassword: _confirmPassword, ...userData } = formData;
      await createUser(userData);

      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'ORGANIZER'
      });
      setValidationErrors({});

      // Notify parent component
      onUserCreated();
    } catch (err) {
      // Error can come in two structures:
      // 1. Direct from apiClient interceptor: { status, code, message, details }
      // 2. Raw axios error: { response: { data: { error: {...} } } }
      const errorMessage = err.message || err.response?.data?.error?.message || t('errors.createUserFailed');
      const errorCode = err.code || err.response?.data?.error?.code;
      const errorDetails = err.details || err.response?.data?.error?.details;

      // Handle email-specific errors
      if (errorDetails?.field === 'email' ||
        (errorCode === 'CONFLICT' && errorMessage.toLowerCase().includes('email'))) {
        setValidationErrors({ email: errorMessage });
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Reset form on close
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'ORGANIZER'
      });
      setValidationErrors({});
      setError(null);
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop={loading ? 'static' : true}>
      <Modal.Header closeButton={!loading}>
        <Modal.Title>{t('modals.createUser.title')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>{t('auth.email')} {t('common.required')}</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              isInvalid={!!validationErrors.email}
              disabled={loading}
              placeholder={t('placeholders.email')}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.email}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('form.labels.role')} {t('common.required')}</Form.Label>
            <Form.Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="ORGANIZER">{t('form.options.organizer')}</option>
              <option value="ADMIN">{t('form.options.admin')}</option>
            </Form.Select>
            <Form.Text className="text-muted">
              {t('modals.createUser.roleHelp')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('auth.password')} {t('common.required')}</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              isInvalid={!!validationErrors.password}
              disabled={loading}
              placeholder={t('placeholders.password')}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.password}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {t('auth.passwordRequirements')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('auth.confirmPassword')} {t('common.required')}</Form.Label>
            <Form.Control
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              isInvalid={!!validationErrors.confirmPassword}
              disabled={loading}
              placeholder={t('placeholders.confirmPassword')}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.confirmPassword}
            </Form.Control.Feedback>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
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
              {t('modals.createUser.creating')}
            </>
          ) : (
            t('modals.createUser.submit')
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateUserModal;
