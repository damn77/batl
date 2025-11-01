import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Badge, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { getUser, updateUser } from '../services/userService';

const UserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    role: 'ORGANIZER',
    isActive: true,
    emailVerified: false
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUser(id);
      setUser(data.user);
      setFormData({
        email: data.user.email,
        role: data.user.role,
        isActive: data.user.isActive,
        emailVerified: data.user.emailVerified
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
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

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
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
      if (formData.email !== user.email) updates.email = formData.email;
      if (formData.role !== user.role) updates.role = formData.role;
      if (formData.isActive !== user.isActive) updates.isActive = formData.isActive;
      if (formData.emailVerified !== user.emailVerified) updates.emailVerified = formData.emailVerified;

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        return;
      }

      await updateUser(id, updates);
      setSuccessMessage('User updated successfully');

      // Reload user data
      await loadUser();
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to update user';
      const errorDetails = err.response?.data?.error?.details;

      if (errorDetails?.field === 'email') {
        setValidationErrors({ email: errorDetails.message || errorMessage });
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/users');
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'ORGANIZER': return 'primary';
      case 'PLAYER': return 'success';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
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

  if (error && !user) {
    return (
      <>
        <NavBar />
        <Container className="mt-4">
          <Alert variant="danger">{error}</Alert>
          <Button variant="secondary" onClick={handleBack}>
            Back to Users
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
          <h2>User Details</h2>
          <Button variant="secondary" onClick={handleBack}>
            Back to Users
          </Button>
        </div>

        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <Row>
          <Col md={8}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Edit User</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email *</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      isInvalid={!!validationErrors.email}
                      disabled={saving}
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Role *</Form.Label>
                    <Form.Select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="ORGANIZER">Organizer</option>
                      <option value="PLAYER">Player</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      name="isActive"
                      label="Active"
                      checked={formData.isActive}
                      onChange={handleChange}
                      disabled={saving}
                    />
                    <Form.Text className="text-muted">
                      Inactive users cannot log in
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      name="emailVerified"
                      label="Email Verified"
                      checked={formData.emailVerified}
                      onChange={handleChange}
                      disabled={saving}
                    />
                    <Form.Text className="text-muted">
                      Mark email as verified
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
                      onClick={loadUser}
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
                <h5 className="mb-0">User Information</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>User ID:</strong>
                  <div className="text-muted small">{user.id}</div>
                </div>

                <div className="mb-3">
                  <strong>Current Role:</strong>
                  <div>
                    <Badge bg={getRoleBadgeVariant(user.role)} className="mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <div className="mb-3">
                  <strong>Status:</strong>
                  <div>
                    <Badge bg={user.isActive ? 'success' : 'secondary'} className="mt-1">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="mb-3">
                  <strong>Email Verified:</strong>
                  <div>
                    <Badge bg={user.emailVerified ? 'success' : 'warning'} className="mt-1">
                      {user.emailVerified ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>

                <div className="mb-3">
                  <strong>Created:</strong>
                  <div className="text-muted small">{formatDate(user.createdAt)}</div>
                </div>

                <div className="mb-3">
                  <strong>Last Updated:</strong>
                  <div className="text-muted small">{formatDate(user.updatedAt)}</div>
                </div>

                <div className="mb-3">
                  <strong>Last Login:</strong>
                  <div className="text-muted small">{formatDate(user.lastLoginAt)}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default UserDetailPage;
