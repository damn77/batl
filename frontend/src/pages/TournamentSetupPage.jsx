import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Card, Badge, Alert, Spinner, Form, Modal, Table, Dropdown } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import {
  listTournaments,
  createTournament,
  updateTournament,
  copyTournament,
  deleteTournament,
  revertTournament,
  TOURNAMENT_STATUS,
  STATUS_VARIANTS
} from '../services/tournamentService';
import { listCategories } from '../services/categoryService';
import { recalculateCategorySeeding } from '../services/pairService';
import { useToast } from '../utils/ToastContext';

const TournamentSetupPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
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

  // Copy mode: track source tournament when copying
  const [copySource, setCopySource] = useState(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteTournament, setPendingDeleteTournament] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Revert confirmation state
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [pendingRevertTournament, setPendingRevertTournament] = useState(null);
  const [reverting, setReverting] = useState(false);

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
      setError(err.message || t('errors.failedToLoad', { resource: t('common.tournaments') }));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    const today = new Date();

    setFormData({
      name: '',
      categoryId: '',
      description: '',
      clubName: '',
      address: '',
      capacity: '',
      startDate: today,
      endDate: today
    });
    setIsSingleDay(true);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleCopyClick = (tournament) => {
    const today = new Date();

    setCopySource({ id: tournament.id, name: tournament.name });
    setFormData({
      name: '',
      categoryId: tournament.categoryId,
      description: tournament.description || '',
      clubName: tournament.clubName || '',
      address: tournament.address || '',
      capacity: tournament.capacity || '',
      startDate: today,
      endDate: today
    });
    setIsSingleDay(true);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.categoryId || !formData.clubName) {
      setFormError(t('validation.requiredFields', { fields: t('validation.nameAndCategoryAndClub') }));
      return;
    }

    if (formData.endDate < formData.startDate) {
      setFormError(t('validation.endDateAfterStartDate'));
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      // Use startDate for endDate if single day tournament
      const endDate = isSingleDay ? formData.startDate : formData.endDate;

      const payload = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        startDate: formData.startDate.toISOString(),
        endDate: endDate.toISOString()
      };

      if (copySource) {
        await copyTournament(copySource.id, payload);
      } else {
        await createTournament(payload);
      }

      setCopySource(null);
      setShowCreateModal(false);
      loadTournaments();
    } catch (err) {
      setFormError(err.message || t('errors.failedToCreate', { resource: t('common.tournament') }));
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
      setFormError(t('validation.requiredFields', { fields: t('validation.nameAndCategoryAndClub') }));
      return;
    }

    if (formData.endDate < formData.startDate) {
      setFormError(t('validation.endDateAfterStartDate'));
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
      setFormError(err.message || t('errors.failedToUpdate', { resource: t('common.tournament') }));
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
      setSeedingSuccess(t('alerts.seedingRecalculated', { categoryName, pairsUpdated: result.pairsUpdated }));
    } catch (err) {
      setError(`${t('alerts.failedToRecalculateSeeding')}: ${err.message}`);
    } finally {
      setRecalculatingCategory(null);
    }
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return check < today;
  };

  const handleDeleteClick = (tournament) => {
    setPendingDeleteTournament(tournament);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteTournament(pendingDeleteTournament.id);
      showSuccess(`Tournament "${pendingDeleteTournament.name}" deleted successfully.`);
      setShowDeleteConfirm(false);
      setPendingDeleteTournament(null);
      loadTournaments();
    } catch (err) {
      showError(err.message || 'Failed to delete tournament');
    } finally {
      setDeleting(false);
    }
  };

  const handleRevertClick = (tournament) => {
    setPendingRevertTournament(tournament);
    setShowRevertConfirm(true);
  };

  const handleConfirmRevert = async () => {
    setReverting(true);
    try {
      await revertTournament(pendingRevertTournament.id);
      showSuccess(`Tournament "${pendingRevertTournament.name}" reverted to SCHEDULED.`);
      setShowRevertConfirm(false);
      setPendingRevertTournament(null);
      loadTournaments();
    } catch (err) {
      showError(err.message || 'Failed to revert tournament');
    } finally {
      setReverting(false);
    }
  };

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h2>{t('pages.tournamentSetup.title')}</h2>
            <p className="text-muted">{t('pages.tournamentSetup.description')}</p>
          </Col>
          <Col xs="auto">
            <Button variant="primary" onClick={handleCreateClick}>
              {t('buttons.createTournament')}
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
                  <Form.Label>{t('form.labels.category')}</Form.Label>
                  <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">{t('filters.allCategories')}</option>
                    {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('form.labels.status')}</Form.Label>
                  <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">{t('filters.allStatuses')}</option>
                    {Object.keys(TOURNAMENT_STATUS).map(status => (
                      <option key={status} value={status}>{t(`tournament.statuses.${status}`)}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                {/* T121: Format filter */}
                <Form.Group>
                  <Form.Label>{t('form.labels.format')}</Form.Label>
                  <Form.Select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}>
                    <option value="">{t('filters.allFormats')}</option>
                    <option value="KNOCKOUT">{t('tournament.formats.knockout')}</option>
                    <option value="GROUP">{t('tournament.formats.groupStage')}</option>
                    <option value="SWISS">{t('tournament.formats.swiss')}</option>
                    <option value="COMBINED">{t('tournament.formats.combined')}</option>
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
          <Alert variant="info">{t('messages.noTournamentsFound')}</Alert>
        ) : (
          <Card>
            <Card.Body>
              {/* Desktop table */}
              <div className="d-none d-sm-block">
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>{t('table.headers.name')}</th>
                      <th>{t('table.headers.category')}</th>
                      <th>{t('table.headers.location')}</th>
                      <th>{t('table.headers.dates')}</th>
                      <th>{t('table.headers.players')}</th>
                      <th>{t('table.headers.status')}</th>
                      <th>{t('table.headers.actions')}</th>
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
                          {tournament.waitlistedCount > 0 && ` ${t('common.waitlistedCount', { count: tournament.waitlistedCount })}`}
                        </td>
                        <td>
                          <Badge bg={STATUS_VARIANTS[tournament.status]}>
                            {t(`tournament.statuses.${tournament.status}`)}
                          </Badge>
                        </td>
                        <td>
                          <Dropdown align="end">
                            <Dropdown.Toggle variant="link" className="text-dark p-0 border-0" bsPrefix="p-0">
                              &#8942;
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => handleEditClick(tournament)}>
                                {t('buttons.edit')}
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => navigate(`/organizer/tournament/${tournament.id}/rules`)}>
                                {t('buttons.configureRules')}
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => navigate(`/organizer/tournament/${tournament.id}/points`)}>
                                {t('buttons.configurePoints')}
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item onClick={() => handleCopyClick(tournament)}>
                                {t('buttons.copyTournament')}
                              </Dropdown.Item>
                              {tournament.category?.type === 'DOUBLES' && (
                                <Dropdown.Item
                                  onClick={() => handleRecalculateSeeding(tournament.categoryId, tournament.category.name)}
                                  disabled={recalculatingCategory === tournament.categoryId}
                                >
                                  {recalculatingCategory === tournament.categoryId ? t('common.recalculating') : t('buttons.recalcSeeding')}
                                </Dropdown.Item>
                              )}
                              {/* Revert — only when tournament has draw or is IN_PROGRESS */}
                              {(tournament.status === 'IN_PROGRESS' ||
                                (tournament.status === 'SCHEDULED' && tournament.registrationClosed)) && (
                                <Dropdown.Item onClick={() => handleRevertClick(tournament)}>
                                  Revert to Scheduled
                                </Dropdown.Item>
                              )}
                              <Dropdown.Divider />
                              <Dropdown.Item className="text-danger" onClick={() => handleDeleteClick(tournament)}>
                                Delete Tournament
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="d-sm-none">
                {tournaments.map(tournament => (
                  <Card key={tournament.id} className="mb-2 border">
                    <Card.Body className="py-2 px-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <Link to={`/tournaments/${tournament.id}`} className="fw-bold text-decoration-none">
                            {tournament.name}
                          </Link>
                          <div className="small text-muted">
                            {tournament.category?.name} &middot; {formatDate(tournament.startDate)}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Badge bg={STATUS_VARIANTS[tournament.status]}>
                            {t(`tournament.statuses.${tournament.status}`)}
                          </Badge>
                          <Dropdown align="end">
                            <Dropdown.Toggle variant="link" className="text-dark p-0 border-0" bsPrefix="p-0">
                              &#8942;
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => handleEditClick(tournament)}>{t('buttons.edit')}</Dropdown.Item>
                              <Dropdown.Item onClick={() => navigate(`/organizer/tournament/${tournament.id}/rules`)}>{t('buttons.configureRules')}</Dropdown.Item>
                              <Dropdown.Item onClick={() => navigate(`/organizer/tournament/${tournament.id}/points`)}>{t('buttons.configurePoints')}</Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item onClick={() => handleCopyClick(tournament)}>{t('buttons.copyTournament')}</Dropdown.Item>
                              {tournament.category?.type === 'DOUBLES' && (
                                <Dropdown.Item
                                  onClick={() => handleRecalculateSeeding(tournament.categoryId, tournament.category.name)}
                                  disabled={recalculatingCategory === tournament.categoryId}
                                >
                                  {recalculatingCategory === tournament.categoryId ? t('common.recalculating') : t('buttons.recalcSeeding')}
                                </Dropdown.Item>
                              )}
                              {(tournament.status === 'IN_PROGRESS' || (tournament.status === 'SCHEDULED' && tournament.registrationClosed)) && (
                                <Dropdown.Item onClick={() => handleRevertClick(tournament)}>Revert to Scheduled</Dropdown.Item>
                              )}
                              <Dropdown.Divider />
                              <Dropdown.Item className="text-danger" onClick={() => handleDeleteClick(tournament)}>Delete Tournament</Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-1 small text-muted">
                        <span>{tournament.registeredCount || 0}/{tournament.capacity || '---'} players</span>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Create Modal */}
        <Modal show={showCreateModal} onHide={() => { setShowCreateModal(false); setCopySource(null); }} size="lg" fullscreen="sm-down">
          <Modal.Header closeButton>
            <Modal.Title>{copySource ? t('modals.copyTournament.title') : t('modals.createTournament.title')}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitCreate}>
            <Modal.Body>
              {copySource && (
                <Alert variant="info" className="mb-3">
                  {t('alerts.copyingFrom', { name: copySource.name })}
                </Alert>
              )}
              {formError && <Alert variant="danger">{formError}</Alert>}

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.tournamentName')} *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('form.placeholders.tournamentName')}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.category')} *</Form.Label>
                <Form.Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="">{t('form.placeholders.selectCategory')}</option>
                  {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label={t('form.labels.singleDayTournament')}
                  checked={isSingleDay}
                  onChange={(e) => handleSingleDayToggle(e.target.checked)}
                />
              </Form.Group>

              <Row>
                <Col md={isSingleDay ? 12 : 6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('form.labels.startDate')} *</Form.Label>
                    <DatePicker
                      selected={formData.startDate}
                      onChange={(date) => {
                        setFormData({
                          ...formData,
                          startDate: date,
                          endDate: isSingleDay ? date : formData.endDate
                        });
                      }}
                      className="form-control"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </Form.Group>
                </Col>
                {!isSingleDay && (
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('form.labels.endDate')} *</Form.Label>
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

              {isPastDate(formData.startDate) && (
                <Alert variant="warning">
                  {t('warnings.pastStartDate')}
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.clubName')} *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  placeholder={t('form.placeholders.clubName')}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.addressOptional')}</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('form.placeholders.address')}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.maximumPlayers')}</Form.Label>
                <Form.Control
                  type="number"
                  min="2"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder={t('form.placeholders.leaveEmptyForUnlimited')}
                />
                <Form.Text className="text-muted">
                  {t('help.maximumPlayersHint')}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.description')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('form.placeholders.tournamentDescription')}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                {t('buttons.cancel')}
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? t('common.creating') : t('buttons.createTournament')}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Edit Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" fullscreen="sm-down">
          <Modal.Header closeButton>
            <Modal.Title>{t('modals.editTournament.title')}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitEdit}>
            <Modal.Body>
              {formError && <Alert variant="danger">{formError}</Alert>}

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.tournamentName')} *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('form.placeholders.tournamentName')}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.category')} *</Form.Label>
                <Form.Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="">{t('form.placeholders.selectCategory')}</option>
                  {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label={t('form.labels.singleDayTournament')}
                  checked={isSingleDay}
                  onChange={(e) => handleSingleDayToggle(e.target.checked)}
                />
              </Form.Group>

              <Row>
                <Col md={isSingleDay ? 12 : 6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('form.labels.startDate')} *</Form.Label>
                    <DatePicker
                      selected={formData.startDate}
                      onChange={(date) => {
                        setFormData({
                          ...formData,
                          startDate: date,
                          endDate: isSingleDay ? date : formData.endDate
                        });
                      }}
                      className="form-control"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </Form.Group>
                </Col>
                {!isSingleDay && (
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('form.labels.endDate')} *</Form.Label>
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

              {isPastDate(formData.startDate) && (
                <Alert variant="warning">
                  {t('warnings.pastStartDate')}
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.clubName')} *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  placeholder={t('form.placeholders.clubName')}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.addressOptional')}</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('form.placeholders.address')}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.maximumPlayers')}</Form.Label>
                <Form.Control
                  type="number"
                  min="2"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder={t('form.placeholders.leaveEmptyForUnlimited')}
                />
                <Form.Text className="text-muted">
                  {t('help.maximumPlayersHint')}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('form.labels.description')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('form.placeholders.tournamentDescription')}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
                {t('buttons.cancel')}
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? t('common.saving') : t('buttons.saveChanges')}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Delete Tournament</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to delete <strong>{pendingDeleteTournament?.name}</strong>?</p>
            <p className="text-muted mb-2">
              Status: <Badge bg={STATUS_VARIANTS[pendingDeleteTournament?.status]}>
                {pendingDeleteTournament?.status}
              </Badge>
              {' '}&middot; {pendingDeleteTournament?.registeredCount || 0} registered player(s)
            </p>
            {(pendingDeleteTournament?.status === 'IN_PROGRESS' ||
              pendingDeleteTournament?.status === 'COMPLETED') && (
              <Alert variant="danger" className="mb-0">
                <Alert.Heading as="h6">Warning</Alert.Heading>
                {pendingDeleteTournament?.status === 'IN_PROGRESS'
                  ? 'This tournament has matches in progress. All match data will be permanently deleted.'
                  : 'This tournament is completed. All results and ranking points will be permanently removed and rankings will be recalculated.'}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Revert Confirmation Modal */}
        <Modal show={showRevertConfirm} onHide={() => setShowRevertConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Revert to Scheduled</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to revert <strong>{pendingRevertTournament?.name}</strong> to SCHEDULED?</p>
            <p>This will:</p>
            <ul>
              <li>Delete the tournament draw (bracket, rounds, matches)</li>
              <li>Reopen player registration</li>
            </ul>
            <p className="text-muted">Registrations will be preserved.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRevertConfirm(false)} disabled={reverting}>
              Cancel
            </Button>
            <Button variant="warning" onClick={handleConfirmRevert} disabled={reverting}>
              {reverting ? 'Reverting...' : 'Revert to Scheduled'}
            </Button>
          </Modal.Footer>
        </Modal>

      </Container>
    </>
  );
};

export default TournamentSetupPage;
