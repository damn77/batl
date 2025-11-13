import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../utils/AuthContext';
import { register as registerAPI } from '../services/authService';

const RegisterModal = ({ show, onHide, onSwitchToLogin }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [profileLinked, setProfileLinked] = useState(false);

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
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Name validation
    if (!formData.name) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = 'Password must contain a lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Password must contain an uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain a number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setProfileLinked(false);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const { confirmPassword, ...registrationData } = formData;
      const data = await registerAPI(registrationData);

      // Check if profile was linked to existing tournament history
      if (data.profileLinked) {
        setProfileLinked(true);
        // Show success message briefly before auto-login and navigation
        setTimeout(() => {
          // Close modal BEFORE navigation to prevent stale state
          handleClose();
          login(data.user);
        }, 2000);
      } else {
        // Close modal BEFORE navigation to prevent stale state
        handleClose();
        // Auto-login after successful registration
        login(data.user);
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.error?.message || 'Registration failed';
      const errorCode = err.code || err.response?.data?.error?.code;
      const errorDetails = err.details || err.response?.data?.error?.details;

      // Handle email-specific errors
      if (errorDetails?.field === 'email' ||
          (errorCode === 'CONFLICT' && errorMessage.toLowerCase().includes('email'))) {
        setValidationErrors({ email: errorMessage });
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form state on close
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: ''
    });
    setError('');
    setValidationErrors({});
    setLoading(false);
    setProfileLinked(false);
    onHide();
  };

  const handleSwitchToLogin = () => {
    handleClose();
    onSwitchToLogin();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Player Registration</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {profileLinked && (
          <Alert variant="success">
            Your account has been linked to your existing player profile and tournament history!
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="registerName">
            <Form.Label>Full Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              placeholder="John Smith"
              isInvalid={!!validationErrors.name}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="registerEmail">
            <Form.Label>Email *</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              autoComplete="email"
              placeholder="player@example.com"
              isInvalid={!!validationErrors.email}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.email}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="registerPhone">
            <Form.Label>Phone (optional)</Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              placeholder="+421901234567"
            />
            <Form.Text className="text-muted">
              Format: +421901234567
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3" controlId="registerPassword">
            <Form.Label>Password *</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              autoComplete="new-password"
              isInvalid={!!validationErrors.password}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.password}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Must be at least 8 characters with uppercase, lowercase, and number
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3" controlId="registerConfirmPassword">
            <Form.Label>Confirm Password *</Form.Label>
            <Form.Control
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              autoComplete="new-password"
              isInvalid={!!validationErrors.confirmPassword}
            />
            <Form.Control.Feedback type="invalid">
              {validationErrors.confirmPassword}
            </Form.Control.Feedback>
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="w-100"
            disabled={loading}
          >
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </Form>

        <div className="mt-3 text-center">
          <button
            type="button"
            className="btn btn-link text-decoration-none p-0"
            onClick={handleSwitchToLogin}
            disabled={loading}
          >
            Already have an account? Login
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default RegisterModal;
