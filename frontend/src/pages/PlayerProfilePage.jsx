import { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import apiClient from '../services/apiClient';

const PlayerProfilePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current user's player profile directly
      const response = await apiClient.get(`/players/${user.playerId}`);
      const userProfile = response.data.profile;

      if (userProfile) {
        setProfile(userProfile);
        setFormData({
          name: userProfile.name || '',
          email: userProfile.email || '',
          phone: userProfile.phone || '',
          birthDate: userProfile.birthDate ? new Date(userProfile.birthDate).toISOString().split('T')[0] : '',
          gender: userProfile.gender || ''
        });
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

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
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Birth Date validation (required for tournament registration)
    if (!formData.birthDate) {
      errors.birthDate = 'Birth date is required for tournament registration';
    } else {
      const birthDate = new Date(formData.birthDate);
      const now = new Date();
      if (birthDate >= now) {
        errors.birthDate = 'Birth date must be in the past';
      }
    }

    // Gender validation (required for tournament registration)
    if (!formData.gender) {
      errors.gender = 'Gender is required for tournament registration';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      console.log('Frontend - Form data before save:', formData); // Debug log
      const response = await apiClient.patch(`/players/${profile.id}`, formData);
      console.log('Frontend - Response from backend:', response.data); // Debug log
      setProfile(response.data.profile);
      setEditing(false);
      setSuccess('Profile updated successfully!');

      // Refresh profile data to ensure we have the latest
      await fetchProfile();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.error?.message || 'Failed to update profile';
      const errorCode = err.code || err.response?.data?.error?.code;
      const errorDetails = err.details || err.response?.data?.error?.details;

      // Handle field-specific errors
      if (errorDetails?.field) {
        setValidationErrors({ [errorDetails.field]: errorMessage });
      } else {
        setError(errorMessage);
      }
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
    setError(null);
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="container mt-5">
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <NavBar />
        <div className="container mt-5">
          <Alert variant="danger">
            {error || 'Profile not found'}
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container mt-4">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <div className="card shadow">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="mb-0">My Profile</h3>
              {!editing && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="card-body">
              {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
                  {success}
                </Alert>
              )}

              {editing ? (
                // Edit mode
                <div>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">Name *</label>
                    <input
                      type="text"
                      className={`form-control ${validationErrors.name ? 'is-invalid' : ''}`}
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={saving}
                    />
                    {validationErrors.name && (
                      <div className="invalid-feedback">{validationErrors.name}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="player@example.com"
                    />
                    {validationErrors.email && (
                      <div className="invalid-feedback">{validationErrors.email}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="phone" className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="phone"
                      name="phone"
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
                      id="birthDate"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      disabled={saving}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {validationErrors.birthDate && (
                      <div className="invalid-feedback">{validationErrors.birthDate}</div>
                    )}
                    <div className="form-text">Required for age-based tournament eligibility</div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="gender" className="form-label">Gender *</label>
                    <select
                      className={`form-select ${validationErrors.gender ? 'is-invalid' : ''}`}
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="">Select gender...</option>
                      <option value="MEN">Male</option>
                      <option value="WOMEN">Female</option>
                    </select>
                    {validationErrors.gender && (
                      <div className="invalid-feedback">{validationErrors.gender}</div>
                    )}
                    <div className="form-text">Required for gender-based tournament eligibility</div>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div>
                  <div className="mb-3">
                    <label className="form-label text-muted">Name</label>
                    <p className="fs-5">{profile.name}</p>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Email</label>
                    <p className="fs-5">{profile.email || <span className="text-muted">Not provided</span>}</p>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Phone</label>
                    <p className="fs-5">{profile.phone || <span className="text-muted">Not provided</span>}</p>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Account Email</label>
                    <p className="fs-5">{user.email}</p>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Date of Birth</label>
                    <p className="fs-5">
                      {profile.birthDate ? (
                        <span>{new Date(profile.birthDate).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-muted">Not provided ⚠️</span>
                      )}
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Gender</label>
                    <p className="fs-5">
                      {profile.gender ? (
                        <span>{profile.gender === 'MEN' ? 'Male' : 'Female'}</span>
                      ) : (
                        <span className="text-muted">Not provided ⚠️</span>
                      )}
                    </p>
                  </div>

                  {profile.userId && (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      Your profile is linked to your account
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tournament History Placeholder */}
          <div className="card shadow mt-4">
            <div className="card-header">
              <h4 className="mb-0">Tournament History</h4>
            </div>
            <div className="card-body">
              <p className="text-muted">
                Your tournament participation history will appear here once tournament management features are implemented.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default PlayerProfilePage;
