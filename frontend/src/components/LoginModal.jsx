import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../utils/AuthContext';
import { login as loginAPI } from '../services/authService';

const LoginModal = ({ show, onHide, onSwitchToRegister }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginAPI(email, password);
      // Close modal BEFORE navigation to prevent stale state
      onHide();
      // Then trigger login and navigation
      login(data.user);
    } catch (err) {
      setError(err.message || t('errors.loginFailed'));
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form state on close
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
    onHide();
  };

  const handleSwitchToRegister = () => {
    handleClose();
    onSwitchToRegister();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('auth.loginTitle')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="loginEmail">
            <Form.Label>{t('auth.email')}</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              placeholder={t('placeholders.email')}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="loginPassword">
            <Form.Label>{t('auth.password')}</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              placeholder={t('placeholders.password')}
            />
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
                {t('auth.loggingIn')}
              </>
            ) : (
              t('nav.login')
            )}
          </Button>
        </Form>

        <div className="mt-3 text-center">
          <button
            type="button"
            className="btn btn-link text-decoration-none p-0"
            onClick={handleSwitchToRegister}
            disabled={loading}
          >
            {t('auth.newPlayerPrompt')}
          </button>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-3 text-center">
            <small className="text-muted">
              {t('auth.defaultCredentials')}
            </small>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default LoginModal;
