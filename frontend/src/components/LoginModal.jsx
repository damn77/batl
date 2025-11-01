import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../utils/AuthContext';
import { login as loginAPI } from '../services/authService';

const LoginModal = ({ show, onHide, onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form state whenever modal visibility changes
  useEffect(() => {
    if (!show) {
      // Clear form when modal closes
      setEmail('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [show]);

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
      setError(err.message || 'Login failed. Please check your credentials.');
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
        <Modal.Title>Battle Login</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="loginEmail">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              placeholder="Enter your email"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="loginPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              placeholder="Enter your password"
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
                Logging in...
              </>
            ) : (
              'Login'
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
            New player? Create an account
          </button>
        </div>

        <div className="mt-3 text-center">
          <small className="text-muted">
            Default admin credentials:<br />
            admin@battle.example.com / ChangeMe123!
          </small>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default LoginModal;
