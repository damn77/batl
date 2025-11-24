// T035-T037: Tournament Rules Setup Page - Configure format and scoring rules
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import TournamentFormatSelector from '../components/TournamentFormatSelector';
import MatchScoringRulesForm from '../components/MatchScoringRulesForm';
import FormatConfigPanel from '../components/FormatConfigPanel';
import RuleChangeWarningModal from '../components/RuleChangeWarningModal';
import { setTournamentFormat, setDefaultScoringRules, getTournamentFormat } from '../services/tournamentRulesService';
import apiClient from '../services/apiClient';

const TournamentRulesSetupPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formatType, setFormatType] = useState('KNOCKOUT');
  const [formatConfig, setFormatConfig] = useState({
    formatType: 'KNOCKOUT',
    matchGuarantee: 'MATCH_1'
  });
  const [scoringRules, setScoringRules] = useState({
    formatType: 'SETS',
    winningSets: 2,
    advantageRule: 'ADVANTAGE',
    tiebreakTrigger: '6-6'
  });

  const [hasMatches, setHasMatches] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [registrationStats, setRegistrationStats] = useState({
    registered: 0,
    capacity: null,
    waitlisted: 0
  });

  // T102-T103: Rule change warning modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);
  const [changeImpact, setChangeImpact] = useState(null);

  useEffect(() => {
    loadTournamentRules();
  }, [id]);

  const loadTournamentRules = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getTournamentFormat(id);

      if (response.success) {
        const {
          name,
          formatType: ft,
          formatConfig: fc,
          defaultScoringRules: dsr,
          capacity,
          registeredCount,
          waitlistedCount
        } = response.data;

        setTournamentName(name);
        setFormatType(ft);
        setFormatConfig(fc);
        setScoringRules(dsr);
        setRegistrationStats({
          registered: registeredCount || 0,
          capacity: capacity,
          waitlisted: waitlistedCount || 0
        });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || t('errors.failedToLoadTournamentRules'));
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = (newType, newConfig) => {
    setFormatType(newType);
    setFormatConfig(newConfig);
  };

  const handleScoringRulesChange = (newRules) => {
    setScoringRules(newRules);
  };

  // T102-T103: Check for rule change impact before saving
  const checkRuleChangeImpact = async (changeType) => {
    try {
      const response = await apiClient.get(`/v1/tournament-rules/${id}/validate-change`, {
        params: { changeType }
      });
      return response.data;
    } catch (err) {
      // If validation endpoint doesn't exist or fails, assume no impact
      return null;
    }
  };

  const handleSaveFormat = async (skipWarning = false) => {
    // T102-T103: Check for impact and show warning if tournament is active
    if (!skipWarning) {
      const impact = await checkRuleChangeImpact('format');
      if (impact && (impact.completedMatches > 0 || impact.inProgressMatches > 0 || impact.scheduledMatches > 0)) {
        setPendingChange({ type: 'format', action: () => handleSaveFormat(true) });
        setChangeImpact(impact);
        setShowWarningModal(true);
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await setTournamentFormat(id, formatType, formatConfig);

      if (response.success) {
        setSuccess(t('messages.formatSavedSuccess'));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || t('errors.failedToSaveTournamentFormat');
      setError(errorMsg);

      // If format change not allowed, mark as having matches
      if (err.response?.data?.error?.code === 'FORMAT_CHANGE_NOT_ALLOWED') {
        setHasMatches(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScoringRules = async (skipWarning = false) => {
    // T102-T103: Check for impact and show warning if tournament is active
    if (!skipWarning) {
      const impact = await checkRuleChangeImpact('default-rules');
      if (impact && (impact.completedMatches > 0 || impact.inProgressMatches > 0 || impact.scheduledMatches > 0)) {
        setPendingChange({ type: 'default-rules', action: () => handleSaveScoringRules(true) });
        setChangeImpact(impact);
        setShowWarningModal(true);
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await setDefaultScoringRules(id, scoringRules);

      if (response.success) {
        setSuccess(t('messages.scoringRulesSavedSuccess'));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || t('errors.failedToSaveScoringRules'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    await handleSaveFormat();
    if (!error) {
      await handleSaveScoringRules();
    }
  };

  // T102-T103: Modal confirmation handlers
  const handleConfirmRuleChange = () => {
    setShowWarningModal(false);
    if (pendingChange && pendingChange.action) {
      pendingChange.action();
    }
    setPendingChange(null);
    setChangeImpact(null);
  };

  const handleCancelRuleChange = () => {
    setShowWarningModal(false);
    setPendingChange(null);
    setChangeImpact(null);
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">{t('common.loading')}</span>
        </Spinner>
        <p className="mt-2">{t('messages.loadingTournamentRules')}</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>{t('pages.tournamentRulesSetup.title')}</h2>
          <p className="text-muted mb-1">{tournamentName}</p>
          <p className="text-muted mb-0">
            <strong>{t('table.headers.players')}:</strong> {registrationStats.registered} / {registrationStats.capacity || '∞'}
            {registrationStats.waitlisted > 0 && ` (${registrationStats.waitlisted} ${t('status.waitlisted').toLowerCase()})`}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Row>
        <Col lg={6} className="mb-4">
          <TournamentFormatSelector
            value={{ formatType, formatConfig }}
            onChange={handleFormatChange}
            disabled={hasMatches}
          />
        </Col>

        <Col lg={6} className="mb-4">
          <MatchScoringRulesForm
            value={scoringRules}
            onChange={handleScoringRulesChange}
            disabled={false}
          />
        </Col>
      </Row>

      {/* T068: Format-specific configuration panel */}
      <Row className="mt-3">
        <Col className="mb-4">
          <FormatConfigPanel
            formatType={formatType}
            formatConfig={formatConfig}
            onChange={(newConfig) => setFormatConfig(newConfig)}
            disabled={hasMatches}
            playerCount={registrationStats.registered}
          />
        </Col>
      </Row>

      <Row className="mt-3">
        <Col md={6} className="mb-3">
          <div className="d-grid">
            <Button
              variant="primary"
              onClick={handleSaveFormat}
              disabled={saving || hasMatches}
            >
              {saving ? t('common.saving') : t('buttons.saveFormatConfig')}
            </Button>
          </div>
        </Col>
        <Col md={6} className="mb-3">
          <div className="d-grid">
            <Button
              variant="primary"
              onClick={handleSaveScoringRules}
              disabled={saving}
            >
              {saving ? t('common.saving') : t('buttons.saveScoringRules')}
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <div className="d-grid">
            <Button
              variant="success"
              size="lg"
              onClick={handleSaveAll}
              disabled={saving || hasMatches}
            >
              {saving ? 'Saving...' : 'Save All Rules'}
            </Button>
          </div>
        </Col>
      </Row>

      {/* T090-T092: Rule Cascading Section */}
      <Row className="mt-5">
        <Col>
          <h3 className="mb-3">Rule Cascading & Overrides</h3>
          <Alert variant="info">
            <h6>How Rule Cascading Works:</h6>
            <p className="mb-2">
              Tournament rules cascade down through the hierarchy. More specific levels can override
              rules from parent levels:
            </p>
            <div className="ms-3 mb-2">
              <strong>Tournament (Default Rules)</strong>
              <div className="ms-3">
                → <strong>Group/Bracket Level</strong>
                <div className="ms-3">
                  → <strong>Round Level</strong> (e.g., Finals use best-of-3 sets)
                  <div className="ms-3">
                    → <strong>Match Level</strong> (highest priority)
                  </div>
                </div>
              </div>
            </div>
            <p className="mb-0">
              <strong>Example:</strong> You can set tournament defaults to &quot;Best of 1 set&quot;, but override
              the Finals round to use &quot;Best of 3 sets&quot;. Individual matches can have their own specific rules
              if needed.
            </p>
          </Alert>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col>
          <Alert variant="warning">
            <h6>Rule Overrides</h6>
            <p className="mb-0">
              <strong>Note:</strong> Rule overrides at group, bracket, round, and match levels will be
              available once bracket generation is implemented. The tournament default rules set above
              will serve as the baseline for all matches.
            </p>
          </Alert>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Alert variant="info">
            <h6>Quick Guide:</h6>
            <ul className="mb-0">
              <li><strong>Format Type:</strong> Determines the tournament structure (knockout, groups, swiss, or combined)</li>
              <li><strong>Scoring Rules:</strong> Sets the default match rules for all matches in this tournament</li>
              <li><strong>Format Lock:</strong> Format cannot be changed once matches have started</li>
              <li><strong>Rule Changes:</strong> Scoring rules can be updated anytime and apply to future matches</li>
              <li><strong>Rule Cascading:</strong> Overrides at lower levels take precedence over tournament defaults</li>
            </ul>
          </Alert>
        </Col>
      </Row>

      {/* T102-T103: Rule Change Warning Modal */}
      <RuleChangeWarningModal
        show={showWarningModal}
        onConfirm={handleConfirmRuleChange}
        onCancel={handleCancelRuleChange}
        changeImpact={changeImpact}
        changeType={pendingChange?.type || 'default-rules'}
      />
    </Container>
  );
};

export default TournamentRulesSetupPage;
