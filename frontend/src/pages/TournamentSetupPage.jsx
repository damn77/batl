import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Card, Badge, Alert, Spinner, Form, Modal, Table } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import NavBar from '../components/NavBar';
import {
  listTournaments,
  createTournament,
  updateTournament,
  TOURNAMENT_STATUS,
  STATUS_LABELS,
  STATUS_VARIANTS
} from '../services/tournamentService';
import { listCategories } from '../services/categoryService';
import { recalculateCategorySeeding } from '../services/pairService';

const TournamentSetupPage = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState(''); // T121: Format filter

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    description: '',
    clubName: '',
    address: '',
    capacity: '',
    startDate: new Date(),
    endDate: new Date()
  });
  const [isSingleDay, setIsSingleDay] = useState(true);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // T064: Seeding recalculation state
  const [recalculatingCategory, setRecalculatingCategory] = useState(null);
  const [seedingSuccess, setSeedingSuccess] = useState(null);

  // Load data
  useEffect(() => {
    loadCategories();
    loadTournaments();
  }, [categoryFilter, statusFilter, formatFilter]); // T121: Added formatFilter dependency

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
      if (formatFilter) filters.formatType = formatFilter; // T121: Format filter

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

    setFormData({
      name: '',
      categoryId: '',
      description: '',
      clubName: '',
      address: '',
      capacity: '',
      startDate: tomorrow,
      endDate: tomorrow
    });
    setIsSingleDay(true);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.categoryId || !formData.clubName) {
      setFormError('Please fill in all required fields (Name, Category, Club Name)');
      return;
    }

    if (formData.endDate < formData.startDate) {
      setFormError('End date must be after start date');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      // Use startDate for endDate if single day tournament
      const endDate = isSingleDay ? formData.startDate : formData.endDate;

      await createTournament({
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        startDate: formData.startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      setShowCreateModal(false);
      loadTournaments();
    } catch (err) {
      setFormError(err.message || 'Failed to create tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleDayToggle = (checked) => {
    setIsSingleDay(checked);
    if (checked) {
      // Auto-match end date to start date
      setFormData({ ...formData, endDate: formData.startDate });
    }
  };

  const handleEditClick = (tournament) => {
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);
    const isSameDay = startDate.toDateString() === endDate.toDateString();

    setSelectedTournament(tournament);
    setFormData({
      name: tournament.name,
      categoryId: tournament.categoryId,
      description: tournament.description || '',
      clubName: tournament.clubName || '',
      address: tournament.address || '',
      capacity: tournament.capacity || '',
      startDate: startDate,
      endDate: endDate
    });
    setIsSingleDay(isSameDay);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.categoryId || !formData.clubName) {
      setFormError('Please fill in all required fields (Name, Category, Club Name)');
      return;
    }

    if (formData.endDate < formData.startDate) {
      setFormError('End date must be after start date');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const endDate = isSingleDay ? formData.startDate : formData.endDate;

      await updateTournament(selectedTournament.id, {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        startDate: formData.startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      setShowEditModal(false);
      setSelectedTournament(null);
      loadTournaments();
    } catch (err) {
      setFormError(err.message || 'Failed to update tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // T064: Handle seeding recalculation for DOUBLES categories
  const handleRecalculateSeeding = async (categoryId, categoryName) => {
    try {
      setRecalculatingCategory(categoryId);
      setSeedingSuccess(null);
      setError(null);

      const result = await recalculateCategorySeeding(categoryId);
      setSeedingSuccess(`Seeding recalculated for ${categoryName}: ${result.pairsUpdated} pairs updated`);
    } catch (err) {
      setError(`Failed to recalculate seeding: ${err.message}`);
    } finally {
      setRecalculatingCategory(null);
    }
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
        {seedingSuccess && <Alert variant="success" dismissible onClose={() => setSeedingSuccess(null)}>{seedingSuccess}</Alert>}

        {/* Filters */}
        <Card className="mb-3">
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
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
              <Col md={4}>
                {/* T121: Format filter */}
                <Form.Group>
                  <Form.Label>Format</Form.Label>
                  <Form.Select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}>
                    <option value="">All Formats</option>
                    <option value="KNOCKOUT">Knockout</option>
                    <option value="GROUP">Group Stage</option>
                    <option value="SWISS">Swiss</option>
                    <option value="COMBINED">Combined</option>
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
                    <th>Players</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map(tournament => (
                    <tr key={tournament.id}>
                      <td>
                        <Link
                          to={`/tournaments/${tournament.id}`}
                          className="text-decoration-none fw-bold"
                        >
                          {tournament.name}
                        </Link>
                      </td>
                      <td>{tournament.category?.name}</td>
                      <td>
                        <div>{tournament.clubName || '-'}</div>
                        {tournament.address && <small className="text-muted">{tournament.address}</small>}
                      </td>
                      <td className="small">
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </td>
                      <td>
                        {tournament.registeredCount || 0} / {tournament.capacity || '∞'}
                        {tournament.waitlistedCount > 0 && ` (${tournament.waitlistedCount} waitlisted)`}
                      </td>
                      <td>
                        <Badge bg={STATUS_VARIANTS[tournament.status]}>
                          {STATUS_LABELS[tournament.status]}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEditClick(tournament)}
                          className="me-2"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => navigate(`/organizer/tournament/${tournament.id}/rules`)}
                          className="me-2"
                        >
                          Configure Rules
                        </Button>
                        {/* T064: Recalculate seeding button for DOUBLES categories */}
                        {tournament.category?.type === 'DOUBLES' && (
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleRecalculateSeeding(tournament.categoryId, tournament.category.name)}
                            disabled={recalculatingCategory === tournament.categoryId}
                            title="Recalculate seeding scores for all pairs in this category"
                          >
                            {recalculatingCategory === tournament.categoryId ? 'Recalculating...' : 'Recalc Seeding'}
                          </Button>
                        )}
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
                  {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Single day tournament"
                  checked={isSingleDay}
                  onChange={(e) => handleSingleDayToggle(e.target.checked)}
                />
              </Form.Group>

              <Row>
                <Col md={isSingleDay ? 12 : 6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date *</Form.Label>
                    <DatePicker
                      selected={formData.startDate}
                      onChange={(date) => {
                        setFormData({
                          ...formData,
                          startDate: date,
                          endDate: isSingleDay ? date : formData.endDate
                        });
                      }}
                      minDate={new Date()}
                      className="form-control"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </Form.Group>
                </Col>
                {!isSingleDay && (
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
                )}
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Club Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  placeholder="e.g. Tennis Club Bratislava"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Address (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Vajnorská 21, 831 04 Bratislava"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Maximum Players (Optional)</Form.Label>
                <Form.Control
                  type="number"
                  min="2"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
                <Form.Text className="text-muted">
                  Maximum number of registered players. Leave empty for no limit.
                </Form.Text>
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

        {/* Edit Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Edit Tournament</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitEdit}>
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
                  {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Single day tournament"
                  checked={isSingleDay}
                  onChange={(e) => handleSingleDayToggle(e.target.checked)}
                />
              </Form.Group>

              <Row>
                <Col md={isSingleDay ? 12 : 6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date *</Form.Label>
                    <DatePicker
                      selected={formData.startDate}
                      onChange={(date) => {
                        setFormData({
                          ...formData,
                          startDate: date,
                          endDate: isSingleDay ? date : formData.endDate
                        });
                      }}
                      minDate={new Date()}
                      className="form-control"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </Form.Group>
                </Col>
                {!isSingleDay && (
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
                )}
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Club Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  placeholder="e.g. Tennis Club Bratislava"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Address (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Vajnorská 21, 831 04 Bratislava"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Maximum Players (Optional)</Form.Label>
                <Form.Control
                  type="number"
                  min="2"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
                <Form.Text className="text-muted">
                  Maximum number of registered players. Leave empty for no limit.
                </Form.Text>
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
              <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </>
  );
};

export default TournamentSetupPage;
