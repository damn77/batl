import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Badge, Alert, Spinner, Form, Modal, Table } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import NavBar from '../components/NavBar';
import {
  listTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  TOURNAMENT_STATUS,
  STATUS_LABELS,
  STATUS_VARIANTS
} from '../services/tournamentService';
import { listCategories } from '../services/categoryService';

const TournamentSetupPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    description: '',
    location: '',
    startDate: new Date(),
    endDate: new Date()
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load data
  useEffect(() => {
    loadCategories();
    loadTournaments();
  }, [categoryFilter, statusFilter]);

  const loadCategories = async () => {
    try {
      const data = await listCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {};
      if (categoryFilter) filters.categoryId = categoryFilter;
      if (statusFilter) filters.status = statusFilter;

      const data = await listTournaments(filters);
      setTournaments(data.tournaments || []);
    } catch (err) {
      setError(err.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    setFormData({
      name: '',
      categoryId: '',
      description: '',
      location: '',
      startDate: tomorrow,
      endDate: nextWeek
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.categoryId) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (formData.endDate < formData.startDate) {
      setFormError('End date must be after start date');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      await createTournament({
        ...formData,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString()
      });

      setShowCreateModal(false);
      loadTournaments();
    } catch (err) {
      setFormError(err.message || 'Failed to create tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h2>Tournament Setup</h2>
            <p className="text-muted">Create and manage tournaments</p>
          </Col>
          <Col xs="auto">
            <Button variant="primary" onClick={handleCreateClick}>
              Create Tournament
            </Button>
          </Col>
        </Row>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        {/* Filters */}
        <Card className="mb-3">
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    {Object.keys(TOURNAMENT_STATUS).map(status => (
                      <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Tournaments Table */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : tournaments.length === 0 ? (
          <Alert variant="info">No tournaments found. Create your first tournament to get started.</Alert>
        ) : (
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Dates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map(tournament => (
                    <tr key={tournament.id}>
                      <td><strong>{tournament.name}</strong></td>
                      <td>{tournament.category?.name}</td>
                      <td>{tournament.location || '-'}</td>
                      <td className="small">
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </td>
                      <td>
                        <Badge bg={STATUS_VARIANTS[tournament.status]}>
                          {STATUS_LABELS[tournament.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {/* Create Modal */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Create Tournament</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitCreate}>
            <Modal.Body>
              {formError && <Alert variant="danger">{formError}</Alert>}

              <Form.Group className="mb-3">
                <Form.Label>Tournament Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Summer Championship 2025"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Category *</Form.Label>
                <Form.Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date *</Form.Label>
                    <DatePicker
                      selected={formData.startDate}
                      onChange={(date) => setFormData({ ...formData, startDate: date })}
                      minDate={new Date()}
                      className="form-control"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Date *</Form.Label>
                    <DatePicker
                      selected={formData.endDate}
                      onChange={(date) => setFormData({ ...formData, endDate: date })}
                      minDate={formData.startDate}
                      className="form-control"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Tennis Club Bratislava"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional tournament description..."
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Tournament'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </>
  );
};

export default TournamentSetupPage;
