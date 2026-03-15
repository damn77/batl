// Phase 3 - STATS-02: Player profile page — public view + own-profile edit
// Route: /players/:id (public) | redirected from /player/profile (own profile)
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Tab, Nav, Spinner, Alert, Button, Row, Col } from 'react-bootstrap';
import NavBar from '../components/NavBar';
import MatchHistoryTab from '../components/MatchHistoryTab';
import { getPublicPlayerProfile } from '../services/playerService';
import { useAuth } from '../utils/AuthContext';
import apiClient from '../services/apiClient';

const PlayerPublicProfilePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isOwnProfile = user?.playerId === id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Edit state — only used when isOwnProfile
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', birthDate: '', gender: '' });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await getPublicPlayerProfile(id);
        if (!cancelled) {
          setProfile(data);
          if (isOwnProfile) {
            setFormData({
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || '',
              birthDate: data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : '',
              gender: data.gender || ''
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err.status === 404) setNotFound(true);
          else setError(err.message || 'Failed to load player profile.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [id, isOwnProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.birthDate) errors.birthDate = 'Birth date is required for tournament registration';
    else if (new Date(formData.birthDate) >= new Date()) errors.birthDate = 'Birth date must be in the past';
    if (!formData.gender) errors.gender = 'Gender is required for tournament registration';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      const response = await apiClient.patch(`/players/${profile.id}`, formData);
      const updated = response.data.profile;
      setProfile(updated);
      setFormData({
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
        birthDate: updated.birthDate ? new Date(updated.birthDate).toISOString().split('T')[0] : '',
        gender: updated.gender || ''
      });
      setEditing(false);
      setSaveSuccess('Profile updated successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      if (err.details?.field) setValidationErrors({ [err.details.field]: err.message });
      else setSaveError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
      gender: profile.gender || ''
    });
    setValidationErrors({});
    setSaveError(null);
  };

  const renderProfileView = () => (
    <div className="mt-3">
      <Row>
        <Col md={8}>
          {saveSuccess && <Alert variant="success" dismissible onClose={() => setSaveSuccess(null)}>{saveSuccess}</Alert>}
          {saveError && <Alert variant="danger" dismissible onClose={() => setSaveError(null)}>{saveError}</Alert>}

          {isOwnProfile && (
            <div className="d-flex justify-content-end mb-3">
              <Button variant="primary" size="sm" onClick={() => setEditing(true)}>Edit Profile</Button>
            </div>
          )}

          <div className="mb-2">
            <label className="form-label text-muted">Name</label>
            <p className="fs-6">{profile.name}</p>
          </div>

          {isOwnProfile ? (
            <>
              <div className="mb-2">
                <label className="form-label text-muted">Email</label>
                <p className="fs-6">{profile.email || <span className="text-muted">Not provided</span>}</p>
              </div>
              <div className="mb-2">
                <label className="form-label text-muted">Phone</label>
                <p className="fs-6">{profile.phone || <span className="text-muted">Not provided</span>}</p>
              </div>
              <div className="mb-2">
                <label className="form-label text-muted">Account Email</label>
                <p className="fs-6">{user.email}</p>
              </div>
              <div className="mb-2">
                <label className="form-label text-muted">Date of Birth</label>
                <p className="fs-6">
                  {profile.birthDate
                    ? new Date(profile.birthDate).toLocaleDateString()
                    : <span className="text-muted">Not provided ⚠️</span>}
                </p>
              </div>
              <div className="mb-2">
                <label className="form-label text-muted">Gender</label>
                <p className="fs-6">
                  {profile.gender
                    ? (profile.gender === 'MEN' ? 'Male' : 'Female')
                    : <span className="text-muted">Not provided ⚠️</span>}
                </p>
              </div>
              {profile.userId && (
                <Alert variant="info">Your profile is linked to your account</Alert>
              )}
            </>
          ) : (
            <div className="mb-2">
              <label className="form-label text-muted">Linked account</label>
              <p className="fs-6">{profile.hasAccount ? 'Yes' : 'No'}</p>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );

  const renderEditForm = () => (
    <div className="mt-3">
      <Row>
        <Col md={8}>
          {saveError && <Alert variant="danger" dismissible onClose={() => setSaveError(null)}>{saveError}</Alert>}

          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name *</label>
            <input
              type="text"
              className={`form-control ${validationErrors.name ? 'is-invalid' : ''}`}
              id="name" name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={saving}
            />
            {validationErrors.name && <div className="invalid-feedback">{validationErrors.name}</div>}
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
              id="email" name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={saving}
              placeholder="player@example.com"
            />
            {validationErrors.email && <div className="invalid-feedback">{validationErrors.email}</div>}
          </div>

          <div className="mb-3">
            <label htmlFor="phone" className="form-label">Phone</label>
            <input
              type="tel"
              className="form-control"
              id="phone" name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={saving}
              placeholder="+421901234567"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="birthDate" className="form-label">Date of Birth *</label>
            <input
              type="date"
              className={`form-control ${validationErrors.birthDate ? 'is-invalid' : ''}`}
              id="birthDate" name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              disabled={saving}
              max={new Date().toISOString().split('T')[0]}
            />
            {validationErrors.birthDate && <div className="invalid-feedback">{validationErrors.birthDate}</div>}
            <div className="form-text">Required for age-based tournament eligibility</div>
          </div>

          <div className="mb-3">
            <label htmlFor="gender" className="form-label">Gender *</label>
            <select
              className={`form-select ${validationErrors.gender ? 'is-invalid' : ''}`}
              id="gender" name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={saving}
            >
              <option value="">Select gender...</option>
              <option value="MEN">Male</option>
              <option value="WOMEN">Female</option>
            </select>
            {validationErrors.gender && <div className="invalid-feedback">{validationErrors.gender}</div>}
            <div className="form-text">Required for gender-based tournament eligibility</div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Saving...</>
                : 'Save Changes'}
            </Button>
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>Cancel</Button>
          </div>
        </Col>
      </Row>
    </div>
  );

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {notFound && !loading && <Alert variant="warning">Player not found.</Alert>}
        {error && !loading && <Alert variant="danger">{error}</Alert>}

        {!loading && !notFound && !error && profile && (
          <>
            <h2 className="mb-3 fs-4">{isOwnProfile ? 'My Profile' : profile.name}</h2>

            <Tab.Container defaultActiveKey="profile">
              <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                  <Nav.Link eventKey="profile">Profile</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="matches">Match History</Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content>
                <Tab.Pane eventKey="profile">
                  {isOwnProfile && editing ? renderEditForm() : renderProfileView()}
                </Tab.Pane>
                <Tab.Pane eventKey="matches">
                  <div className="mt-3">
                    <MatchHistoryTab playerId={id} />
                  </div>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </>
        )}
      </Container>
    </>
  );
};

export default PlayerPublicProfilePage;
